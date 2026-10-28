"""JWT auth with access token in response body and refresh token in httpOnly cookie."""

from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.settings import api_settings

REFRESH_COOKIE = "refresh_token"


def cookie_secure():
    return getattr(settings, "JWT_COOKIE_SECURE", False)


def set_refresh_cookie(response, refresh):
    """Attach the refresh token as httpOnly cookie."""
    if refresh is None:
        return
    secure = cookie_secure()
    samesite = "None" if secure else "Lax"
    response.set_cookie(
        REFRESH_COOKIE,
        str(refresh),
        max_age=int(api_settings.REFRESH_TOKEN_LIFETIME.total_seconds()),
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/",
    )


def clear_refresh_cookie(response):
    secure = cookie_secure()
    samesite = "None" if secure else "Lax"
    response.delete_cookie(REFRESH_COOKIE, path="/", samesite=samesite)


class AccessTokenAuthentication(JWTAuthentication):
    """Authenticate using Bearer access token from Authorization header."""

    pass
