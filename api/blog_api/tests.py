from blog.models import Category, Post
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class PostTest(APITestCase):
    def test_view_posts(self):
        url = reverse("blog_api:listcreate")

        response = self.client.get(url, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_post(self):
        url = reverse("blog_api:listcreate")
        test_category = Category.objects.create(name="django")
        test_user = User.objects.create_user(username="username", password="123456789")

        data = {
            "title": "new",
            "excerpt": "new excerpt",
            "author": test_user.pk,
            "content": "new",
            "category": test_category.pk,
        }
        response = self.client.post(url, data, format="json")

        print(response.json())

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
