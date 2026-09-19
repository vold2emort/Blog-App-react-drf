from blog.models import Post
from django.shortcuts import get_object_or_404
from rest_framework import permissions, viewsets

from .serializers import PostSerializer


# custom permission so that only author can write the put/patch/delete post
class PostUserWritePermission(permissions.BasePermission):
    message = "Editing post is restricted to author only."

    def has_object_permission(self, request, view, obj):

        if request.method in permissions.SAFE_METHODS:
            return True

        return obj.author == request.user


class PostList(viewsets.ModelViewSet):
    permission_classes = [PostUserWritePermission]  # noqa: RUF012
    serializer_class = PostSerializer
    queryset = Post.objects.all()

    def get_object(self, queryset=None, **kwargs):
        item = self.kwargs.get("pk")
        return get_object_or_404(Post, slug=item)