import re

from django.conf import settings
from django.db import models
from django.db.models.functions import Lower
from django.utils import text, timezone


def normalize_category_name(name):
    """
    Trim, collapse runs of whitespace, then capitalise each run of letters that
    carries no capitalisation of its own.

    `str.title()` is not usable here. It lower-cases the rest of every word, so
    "AI Agent" comes back as "Ai Agent" and an acronym does not survive a round
    trip through the form. A run that already contains a capital is left exactly
    as typed, which keeps "AI", "iOS" and "CSS" intact while still tidying up
    "django" and "career-advice".
    """
    return _LETTER_RUN.sub(_capitalise_run, " ".join(name.split()))


def _capitalise_run(match):
    run = match.group()
    if any(character.isupper() for character in run):
        return run
    return f"{run[:1].upper()}{run[1:]}"


# Letters only, in any script: digits and separators end a run, so "web3" becomes
# "Web3" and "career-advice" becomes "Career-Advice".
_LETTER_RUN = re.compile(r"[^\W\d_]+")


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        constraints = (
            models.UniqueConstraint(Lower("name"), name="unique_category_name_ci"),
        )
        ordering = ("name",)

    def save(self, *args, **kwargs):
        self.name = normalize_category_name(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Post(models.Model):
    class PostObjects(models.Manager):
        def get_queryset(self):
            return super().get_queryset().filter(status="published")

    options = (("draft", "Draft"), ("published", "Published"))

    category = models.ForeignKey(Category, on_delete=models.PROTECT, default=1)
    title = models.CharField(max_length=250)
    excerpt = models.TextField(null=True)
    content = models.TextField()
    slug = models.SlugField(max_length=260, unique=True, blank=True)
    published = models.DateTimeField(default=timezone.now)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="posts"
    )
    status = models.CharField(max_length=10, choices=options, default="published")
    thumbnail = models.ImageField(upload_to="posts/", null=True, blank=True)

    objects = models.Manager()
    postobjects = PostObjects()

    class Meta:
        ordering = ("-published",)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._generate_unique_slug()
        else:
            self.slug = text.slugify(self.slug)
        super().save(*args, **kwargs)

    def _generate_unique_slug(self):
        base = text.slugify(self.title) or "post"
        slug = base
        counter = 1
        while Post.objects.filter(slug=slug).exists():
            counter += 1
            slug = f"{base}-{counter}"
        return slug

    def __str__(self):
        return self.title


class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="comments"
    )
    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True, related_name="replies"
    )
    content = models.TextField(max_length=4000)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(default=timezone.now)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("created",)

    def __str__(self):
        return f"Comment by {self.author} on {self.post}"


class Vote(models.Model):
    class VoteValue(models.IntegerChoices):
        DOWN = -1
        UP = 1

    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="votes")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="votes"
    )
    value = models.SmallIntegerField(choices=VoteValue.choices)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = (
            models.UniqueConstraint(fields=("user", "post"), name="unique_post_vote"),
        )

    def __str__(self):
        return f"{self.user} voted {self.value} on {self.post}"
