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
    REFRESH_COOKIE,
    clear_refresh_cookie,
    set_refresh_cookie,
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
                {
                    "user": UserSerializer(new_user).data,
                    "access": str(refresh.access_token),
                },
                status=status.HTTP_201_CREATED,
            )
            set_refresh_cookie(response, refresh)
            return response

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CookieTokenObtainPairView(TokenObtainPairView):
    """Exchange credentials for access token in body and refresh token in httpOnly cookie."""

    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            refresh = response.data.get("refresh")
            access = response.data.get("access")
            set_refresh_cookie(response, refresh)
            response.data = {"access": access} if access else {}
        return response


class CookieTokenRefreshView(TokenRefreshView):
    """Get new access token using refresh token from httpOnly cookie."""

    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        if not request.COOKIES.get(REFRESH_COOKIE):
            return Response(
                {"detail": "Refresh token is missing."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            refresh = response.data.get("refresh")
            access = response.data.get("access")
            if refresh is not None:
                set_refresh_cookie(response, refresh)
            response.data = {"access": access} if access else {}
        return response

    def get_serializer(self, *args, **kwargs):
        kwargs["data"] = dict(kwargs.get("data") or self.request.data or {})
        kwargs["data"]["refresh"] = self.request.COOKIES.get(REFRESH_COOKIE)
        return super().get_serializer(*args, **kwargs)


class CookieTokenBlacklistView(TokenBlacklistView):
    """Blacklist the refresh token and expire the cookie."""

    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        raw = request.COOKIES.get(REFRESH_COOKIE)
        if raw:
            try:
                RefreshToken(raw).blacklist()
            except TokenError:
                pass
        response = Response(status=status.HTTP_204_NO_CONTENT)
        clear_refresh_cookie(response)
        return response


class CurrentUserView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response(UserSerializer(request.user).data)
