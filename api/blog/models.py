from django.conf import settings
from django.db import models
from django.utils import text, timezone


class Category(models.Model):
    name = models.CharField(max_length=100)

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
        constraints = [
            models.UniqueConstraint(fields=("user", "post"), name="unique_post_vote")
        ]

    def __str__(self):
        return f"{self.user} voted {self.value} on {self.post}"