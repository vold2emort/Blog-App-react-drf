from blog_api import urls as blog_api_urls
from debug_toolbar.toolbar import debug_toolbar_urls
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from users.views import (
    CookieTokenBlacklistView,
    CookieTokenObtainPairView,
    CookieTokenRefreshView,
    CsrfTokenView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("blog.urls", namespace="blog")),
    path("api/posts/", include("blog_api.urls", namespace="blog_api")),
    path(
        "api/categories/",
        include(
            (blog_api_urls.category_urlpatterns, "blog_api"), namespace="categories"
        ),
    ),
    path("api/user/", include("users.urls", namespace="users")),
    path("api/auth/csrf/", CsrfTokenView.as_view(), name="csrf_token"),
    path(
        "api/auth/login/",
        CookieTokenObtainPairView.as_view(),
        name="token_obtain_pair",
    ),
    path(
        "api/auth/login/refresh/",
        CookieTokenRefreshView.as_view(),
        name="token_refresh",
    ),
    path(
        "api/auth/logout/",
        CookieTokenBlacklistView.as_view(),
        name="token_logout",
    ),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/schema/swagger-ui/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    # Path to load ReDoc (Alternative clean UI)
    path(
        "api/schema/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
] + debug_toolbar_urls()

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
