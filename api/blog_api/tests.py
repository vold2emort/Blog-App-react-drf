from blog.models import Category, Post
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient


class PostTest(APITestCase):
    def test_view_posts(self):
        url = reverse("blog_api:listcreate")

        response = self.client.get(url, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_post(self):
        url = reverse("blog_api:listcreate")
        self.test_category = Category.objects.create(name="django")
        self.test_user = User.objects.create_user(
            username="username",
            password="123456789"
        )

        self.client.login(
            username=self.test_user.username,
            password="123456789"
        )

        data = {
            "title": "new",
            "excerpt": "new excerpt",
            "author": self.test_user.pk,
            "content": "new",
            "category": self.test_category.pk,
        }
        response = self.client.post(url, data, format="json")
        data = response.data
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        root = reverse(("blog_api:detailcreate"), kwargs={'pk': data["id"]})
        response = self.client.get(root, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_post_update(self):

        client = APIClient()

        self.test_category = Category.objects.create(name='django')
        self.testuser1 = User.objects.create_user(
            username='test_user1', password='123456789')
        self.testuser2 = User.objects.create_user(
            username='test_user2', password='123456789')
        test_post = Post.objects.create(
            category=self.test_category,
            title='Post Title',
            excerpt='Post Excerpt',
            content='Post Content',
            slug='post-title',
            author=self.testuser1,
            status='published'
        )

        client.login(username=self.testuser1.username,
                     password='123456789')

        url = reverse(('blog_api:detailcreate'), kwargs={'pk': test_post.pk})

        response_test_user1 = client.put(
            url, {
                "title": "New",
                "author": self.testuser1.pk,
                "excerpt": "New",
                "content": "New",
                "status": "published",
                "slug": "new"

            }, format='json')
        print(response_test_user1.data)
        self.assertEqual(response_test_user1.status_code, status.HTTP_200_OK)

        client.login(
            username=self.testuser2,
            password="123456789",
        )

        response_test_user2 = client.put(
            url, {
                "title": "New",
                "author": self.testuser1.pk,
                "excerpt": "New",
                "content": "New",
                "status": "published",
                "slug": "new"

            }, format='json'
        )
        print(response_test_user2.data)
        self.assertEqual(response_test_user2.status_code,
                         status.HTTP_403_FORBIDDEN)
