from django.urls import path

from .views import (
    CategoryListCreateView,
    CommentDetailView,
    CommentListCreateView,
    PostDetailView,
    PostListCreateView,
    PostVoteView,
)

app_name = "blog_api"

urlpatterns = [
    path("comments/<int:pk>/", CommentDetailView.as_view(), name="comment_detail"),
    path("<slug:slug>/comments/", CommentListCreateView.as_view(), name="post_comments"),
    path("<slug:slug>/vote/", PostVoteView.as_view(), name="post_vote"),
    path("<slug:slug>/", PostDetailView.as_view(), name="post_detail"),
    path("", PostListCreateView.as_view(), name="post_list"),
]

category_urlpatterns = [
    path("", CategoryListCreateView.as_view(), name="category_list"),
]