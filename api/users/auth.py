"""JWT auth with access token in response body and refresh token in httpOnly cookie."""

from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.settings import api_settings

REFRESH_COOKIE = "refresh_token"

def set_refresh_cookie(response, refresh):
    """Attach the refresh token as httpOnly cookie."""
    if refresh is None:
        return
    response.set_cookie(
        REFRESH_COOKIE,
        str(refresh),
        max_age=int(api_settings.REFRESH_TOKEN_LIFETIME.total_seconds()),
        httponly=True,
        secure=True,
        samesite="None",
        path="/",
    )


def clear_refresh_cookie(response):
    response.delete_cookie(REFRESH_COOKIE, path="/", samesite="None")


class AccessTokenAuthentication(JWTAuthentication):
    """Authenticate using Bearer access token from Authorization header."""

    pass
