"""Cookie-backed JWT transport.

Tokens live in httpOnly cookies so browser JavaScript cannot read or replay
them. SimpleJWT still signs, validates and resolves users; only the transport
changes here, from the ``Authorization`` header to the cookie.

This module deliberately imports nothing from ``rest_framework.views``. DRF
resolves ``DEFAULT_AUTHENTICATION_CLASSES`` while ``rest_framework.views`` is
still being imported, so importing a view from here would be circular.
"""

from django.conf import settings
from django.middleware.csrf import CsrfViewMiddleware
from rest_framework import HTTP_HEADER_ENCODING
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.authentication import AUTH_HEADER_TYPES, JWTAuthentication
from rest_framework_simplejwt.settings import api_settings

ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"
CSRF_COOKIE = "csrftoken"

UNSAFE_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})


def enforce_csrf(request):
    """Run Django's CSRF checks against a request DRF marked as csrf_exempt.

    ``rest_framework.views.APIView.as_view`` returns ``csrf_exempt(view)``, so
    ``CsrfViewMiddleware`` skips every view under ``/api``. The checks are
    therefore driven from here instead: from the authenticator for writes that
    carry an access cookie, and from the auth views, which declare no
    authentication classes and so never reach the authenticator.
    """
    check = CsrfViewMiddleware(lambda _request: None)
    check.process_request(request)
    failure = check.process_view(request, None, (), {})
    if failure:
        raise PermissionDenied(f"CSRF Failed: {failure.reason_phrase}")


def cookie_secure():
    return settings.JWT_COOKIE_SECURE


def set_auth_cookies(response, access, refresh=None):
    """Attach the token cookies to ``response``."""
    common = {
        "httponly": True,
        "secure": cookie_secure(),
        "samesite": "Lax",
        "path": "/",
    }
    response.set_cookie(
        ACCESS_COOKIE,
        str(access),
        max_age=int(api_settings.ACCESS_TOKEN_LIFETIME.total_seconds()),
        **common,
    )
    if refresh is not None:
        response.set_cookie(
            REFRESH_COOKIE,
            str(refresh),
            max_age=int(api_settings.REFRESH_TOKEN_LIFETIME.total_seconds()),
            **common,
        )


def clear_auth_cookies(response):
    for name in (ACCESS_COOKIE, REFRESH_COOKIE):
        response.delete_cookie(name, path="/", samesite="Lax")


class CookieJWTAuthentication(JWTAuthentication):
    """Authenticate from the access cookie rather than the request header."""

    def get_header(self, request):
        token = request.COOKIES.get(ACCESS_COOKIE)
        if not token:
            return None
        return f"{AUTH_HEADER_TYPES[0]} {token}".encode(HTTP_HEADER_ENCODING)

    def authenticate(self, request):
        if request.method in UNSAFE_METHODS:
            enforce_csrf(request)
        return super().authenticate(request)