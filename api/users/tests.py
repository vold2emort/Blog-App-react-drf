from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

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

class CurrentUserApiTest(APITestCase):
    def me_url(self):
        return reverse("users:current_user")

    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email="me@example.com", user_name="meuser", password="Sup3rSecret!"
        )
        self.other = CustomUser.objects.create_user(
            email="other@example.com", user_name="otheruser", password="Sup3rSecret!"
        )

    def test_me_requires_authentication(self):
        response = self.client.get(self.me_url(), format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_current_user(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        response = client.get(self.me_url(), format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.user.pk)
        self.assertEqual(response.data["email"], "me@example.com")
        self.assertEqual(response.data["user_name"], "meuser")

    def test_me_does_not_leak_password(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        response = client.get(self.me_url(), format="json")
        self.assertNotIn("password", response.data)


class RegisterAuthApiTest(APITestCase):
    def register_url(self):
        return reverse("users:create_user")

    def test_register_returns_tokens_for_auto_login(self):
        response = self.client.post(
            self.register_url(),
            {
                "email": "new@example.com",
                "user_name": "newuser",
                "password": "Sup3rSecret!",
                "password_confirm": "Sup3rSecret!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "new@example.com")
        self.assertEqual(response.data["user"]["user_name"], "newuser")

    def test_register_accepts_matching_confirm(self):
        response = self.client.post(
            self.register_url(),
            {
                "email": "ok@example.com",
                "user_name": "okuser",
                "password": "Sup3rSecret!",
                "password_confirm": "Sup3rSecret!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_register_rejects_mismatched_confirm(self):
        response = self.client.post(
            self.register_url(),
            {
                "email": "bad@example.com",
                "user_name": "baduser",
                "password": "Sup3rSecret!",
                "password_confirm": "Different1!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password_confirm", response.data)
        self.assertFalse(CustomUser.objects.filter(email="bad@example.com").exists())

    def test_register_rejects_short_password(self):
        response = self.client.post(
            self.register_url(),
            {"email": "s@example.com", "user_name": "shorty", "password": "abc"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)
