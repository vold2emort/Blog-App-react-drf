from django.contrib.auth.models import User
from django.test import TestCase

from blog.models import Category, Post


class Test_Create_Post(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.test_category = Category.objects.create(name="django")
        cls.test_user = User.objects.create_user(
            username="test_user1", password="123456789"
        )
        cls.test_post = Post.objects.create(
            category=cls.test_category,
            title="Post Title",
            excerpt="Post Excerpt",
            content="Post Content",
            slug="post-title",
            author=cls.test_user,
            status="published",
        )

    def test_blog_content(self):
        post = Post.objects.get(id=self.test_post.pk)
        category = Category.objects.get(id=self.test_category.pk)
        author = f"{post.author}"
        excerpt = f"{post.excerpt}"
        title = f"{post.title}"
        content = f"{post.content}"
        status = f"{post.status}"

        self.assertEqual(author, "test_user1")
        self.assertEqual(excerpt, "Post Excerpt")
        self.assertEqual(content, "Post Content")
        self.assertEqual(status, "published")
        self.assertEqual(title, "Post Title")
        self.assertEqual(str(post), "Post Title")
        self.assertEqual(str(category), "django")
