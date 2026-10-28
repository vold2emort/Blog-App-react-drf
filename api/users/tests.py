from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from .auth import REFRESH_COOKIE
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

    def test_login_returns_access_in_body_and_refresh_cookie_httponly(self):
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
        self.assertNotIn("refresh", response.data)
        self.assertIn(REFRESH_COOKIE, response.cookies)
        self.assertTrue(response.cookies[REFRESH_COOKIE]["httponly"], REFRESH_COOKIE)
        self.assertEqual(response.cookies[REFRESH_COOKIE]["samesite"], "Lax", REFRESH_COOKIE)
        self.assertFalse(response.cookies[REFRESH_COOKIE]["secure"], REFRESH_COOKIE)

    @override_settings(JWT_COOKIE_SECURE=True)
    def test_login_marks_refresh_cookie_secure_when_configured(self):
        CustomUser.objects.create_user(
            email="secure@example.com",
            user_name="secureuser",
            password="Sup3rSecret!",
        )
        response = self.client.post(
            self.token_url(),
            {"email": "secure@example.com", "password": "Sup3rSecret!"},
            format="json",
        )
        self.assertTrue(response.cookies[REFRESH_COOKIE]["secure"], REFRESH_COOKIE)

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

    def test_me_returns_current_user_with_bearer_token(self):
        token = str(RefreshToken.for_user(self.user).access_token)
        response = self.client.get(
            self.me_url(), HTTP_AUTHORIZATION=f"Bearer {token}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.user.pk)
        self.assertEqual(response.data["email"], "me@example.com")
        self.assertEqual(response.data["user_name"], "meuser")

    def test_me_does_not_leak_password(self):
        token = str(RefreshToken.for_user(self.user).access_token)
        response = self.client.get(
            self.me_url(), HTTP_AUTHORIZATION=f"Bearer {token}"
        )
        self.assertNotIn("password", response.data)


class RegisterAuthApiTest(APITestCase):
    def register_url(self):
        return reverse("users:create_user")

    def test_register_returns_access_in_body_and_sets_refresh_cookie(self):
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
        self.assertNotIn("refresh", response.data)
        self.assertIn(REFRESH_COOKIE, response.cookies)
        self.assertTrue(response.cookies[REFRESH_COOKIE]["httponly"])
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


class TokenAuthApiTest(APITestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email="cookie@example.com",
            user_name="cookieuser",
            password="Sup3rSecret!",
        )
        response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": "cookie@example.com", "password": "Sup3rSecret!"},
            format="json",
        )
        self.access = response.data["access"]

    def test_access_token_authenticates_me(self):
        response = self.client.get(
            reverse("users:current_user"),
            HTTP_AUTHORIZATION=f"Bearer {self.access}",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "cookie@example.com")

    def test_me_is_unauthorized_without_token(self):
        self.client.cookies.clear()
        response = self.client.get(reverse("users:current_user"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_returns_new_access_in_body(self):
        previous = self.client.cookies[REFRESH_COOKIE].value
        response = self.client.post(reverse("token_refresh"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertNotIn("refresh", response.data)
        self.assertIn(REFRESH_COOKIE, response.cookies)

    def test_refresh_without_cookie_returns_401(self):
        self.client.cookies.clear()
        response = self.client.post(reverse("token_refresh"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_blacklists_refresh_and_clears_cookie(self):
        response = self.client.post(reverse("token_logout"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(response.cookies[REFRESH_COOKIE].value, "")

        self.client.cookies.clear()
        self.client.cookies[REFRESH_COOKIE] = ""
        replay = self.client.post(reverse("token_refresh"), {}, format="json")
        self.assertEqual(replay.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_without_cookie_still_succeeds(self):
        self.client.cookies.clear()
        response = self.client.post(reverse("token_logout"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
