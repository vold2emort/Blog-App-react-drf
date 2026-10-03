from users.models import CustomUser
from django.test import TestCase

from blog.models import Category, Post


class Test_Category_Normalization(TestCase):
    def test_capitalises_words_that_have_no_capitals(self):
        for raw, expected in (
            ("django", "Django"),
            ("career-advice", "Career-Advice"),
            ("  technology  ", "Technology"),
            ("machine   learning", "Machine Learning"),
            ("web3 basics", "Web3 Basics"),
        ):
            with self.subTest(raw=raw):
                self.assertEqual(Category.objects.create(name=raw).name, expected)

    def test_preserves_capitals_that_were_typed_deliberately(self):
        for raw, expected in (
            ("AI Agent", "AI Agent"),
            ("iOS Tips", "iOS Tips"),
            ("Django", "Django"),
            ("CSS basics", "CSS Basics"),
            ("machine LEARNING", "Machine LEARNING"),
        ):
            with self.subTest(raw=raw):
                self.assertEqual(Category.objects.create(name=raw).name, expected)

    def test_saving_again_does_not_further_change_the_name(self):
        category = Category.objects.create(name="ai agent")
        self.assertEqual(category.name, "Ai Agent")
        category.save()
        self.assertEqual(category.name, "Ai Agent")


class Test_Create_Post(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.test_category = Category.objects.create(name="django")
        cls.test_user = CustomUser.objects.create_user(
            email="test@email.com", password="123456789", user_name="test_user1"
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
        self.assertEqual(str(category), "Django")
