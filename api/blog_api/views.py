from blog.models import Post
from rest_framework import generics, permissions

from .serializers import PostSerializer


# custom permission so that only author can write the put/patch/delete post
class PostUserWritePermission(permissions.BasePermission):
    message = "Editing post is restricted to author only."

    def has_object_permission(self, request, view, obj):

        if request.method in permissions.SAFE_METHODS:
            return True

        return obj.author == request.user


class PostList(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly] # noqa: RUF012
    queryset = Post.postobjects.all()
    serializer_class = PostSerializer


class PostDetail(
    generics.RetrieveUpdateDestroyAPIView, PostUserWritePermission
):
    permission_classes = [PostUserWritePermission]  # noqa: RUF012
    queryset = Post.postobjects.all()
    serializer_class = PostSerializer
