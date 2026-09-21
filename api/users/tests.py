from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import CustomUser


class UserAuthTest(APITestCase):
    def register_url(self):
        return reverse("users:create_user")

    def token_url(self):
        return reverse("token_obtain_pair")

    def test_register_creates_active_user(self):
        response = self.client.post(
            self.register_url(),
            {
                "email": "test@example.com",
                "user_name": "tester",
                "password": "Sup3rSecret!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = CustomUser.objects.get(email="test@example.com")
        self.assertTrue(user.check_password("Sup3rSecret!"))
        self.assertTrue(user.is_active)

    def test_register_duplicate_email_returns_400(self):
        CustomUser.objects.create_user(
            email="dup@example.com", user_name="first", password="Sup3rSecret!"
        )
        response = self.client.post(
            self.register_url(),
            {
                "email": "dup@example.com",
                "user_name": "second",
                "password": "Sup3rSecret!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_duplicate_username_returns_400(self):
        CustomUser.objects.create_user(
            email="first@example.com", user_name="same", password="Sup3rSecret!"
        )
        response = self.client.post(
            self.register_url(),
            {
                "email": "second@example.com",
                "user_name": "same",
                "password": "Sup3rSecret!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_returns_tokens(self):
        CustomUser.objects.create_user(
            email="login@example.com",
            user_name="loginuser",
            password="Sup3rSecret!",
        )
        response = self.client.post(
            self.token_url(),
            {"email": "login@example.com", "password": "Sup3rSecret!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_with_wrong_password_returns_401(self):
        CustomUser.objects.create_user(
            email="login@example.com",
            user_name="loginuser",
            password="Sup3rSecret!",
        )
        response = self.client.post(
            self.token_url(),
            {"email": "login@example.com", "password": "wrong"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)