from django.middleware.csrf import get_token
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import (
    TokenBlacklistView,
    TokenObtainPairView,
    TokenRefreshView,
)

from .auth import (
    CSRF_COOKIE,
    REFRESH_COOKIE,
    clear_auth_cookies,
    enforce_csrf,
    set_auth_cookies,
)
from .serializers import RegisterUserSerializer, UserSerializer


class CustomUserRegisterView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = RegisterUserSerializer(data=request.data)
        if serializer.is_valid():
            new_user = serializer.save()
            refresh = RefreshToken.for_user(new_user)
            response = Response(
                {"user": UserSerializer(new_user).data},
                status=status.HTTP_201_CREATED,
            )
            set_auth_cookies(response, refresh.access_token, refresh)
            return response

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CookieTokenObtainPairView(TokenObtainPairView):
    """Exchange credentials for cookies."""

    def post(self, request, *args, **kwargs):
        enforce_csrf(request)
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            set_auth_cookies(
                response,
                response.data["access"],
                response.data.get("refresh"),
            )
            response.data = {}
        return response


class CookieTokenRefreshView(TokenRefreshView):
    """Rotate the token cookies.

    ``ROTATE_REFRESH_TOKENS`` and ``BLACKLIST_AFTER_ROTATION`` are both on, so
    the rotated refresh token has to be written back or the next refresh would
    present a blacklisted token.
    """

    def post(self, request, *args, **kwargs):
        enforce_csrf(request)
        if not request.COOKIES.get(REFRESH_COOKIE):
            return Response(
                {"detail": "Refresh token is missing."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            set_auth_cookies(
                response,
                response.data["access"],
                response.data.get("refresh"),
            )
            response.data = {}
        return response

    def get_serializer(self, *args, **kwargs):
        kwargs["data"] = dict(kwargs.get("data") or self.request.data or {})
        kwargs["data"]["refresh"] = self.request.COOKIES.get(REFRESH_COOKIE)
        return super().get_serializer(*args, **kwargs)


class CookieTokenBlacklistView(TokenBlacklistView):
    """Blacklist the refresh token and expire both cookies."""

    def post(self, request, *args, **kwargs):
        enforce_csrf(request)
        raw = request.COOKIES.get(REFRESH_COOKIE)
        if raw:
            try:
                RefreshToken(raw).blacklist()
            except TokenError:
                pass
        response = Response(status=status.HTTP_204_NO_CONTENT)
        clear_auth_cookies(response)
        return response


class CsrfTokenView(APIView):
    """Hand the SPA the CSRF token it must echo back in a header."""

    authentication_classes = ()
    permission_classes = (AllowAny,)

    def get(self, request):
        return Response({CSRF_COOKIE: get_token(request)})


class CurrentUserView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response(UserSerializer(request.user).data)