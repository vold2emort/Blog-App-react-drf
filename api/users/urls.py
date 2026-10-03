from django.urls import path

from .views import CurrentUserView, CustomUserRegisterView

app_name = "users"

urlpatterns = [
    path("register/", CustomUserRegisterView.as_view(), name="create_user"),
    path("me/", CurrentUserView.as_view(), name="current_user"),
]