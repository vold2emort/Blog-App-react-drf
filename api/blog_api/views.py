from blog.models import Category, Comment, Post, Vote
from django.db.models import Q, Sum, Value
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import CategorySerializer, CommentSerializer, PostSerializer


# custom permission so that only author can write the put/patch/delete post
class PostUserWritePermission(permissions.BasePermission):
    message = "Editing post is restricted to author only."

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.author == request.user


class IsCommentAuthorOrReadOnly(permissions.BasePermission):
    message = "Editing comment is restricted to author only."

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.author == request.user


class PostPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


def visible_posts(user):
    queryset = Post.objects.all().annotate(
        score=Coalesce(Sum("votes__value"), Value(0))
    )
    if not user.is_authenticated:
        return queryset.filter(status="published")
    return queryset.filter(Q(status="published") | Q(author=user))


class CategoryListCreateView(ListCreateAPIView):
    serializer_class = CategorySerializer
    queryset = Category.objects.all()

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]  # noqa: RUF012
        return [permissions.AllowAny()]  # noqa: RUF012


class PostListCreateView(ListCreateAPIView):
    serializer_class = PostSerializer
    pagination_class = PostPagination
    permission_classes = [  # noqa: RUF012
        permissions.IsAuthenticatedOrReadOnly,
        PostUserWritePermission,
    ]

    def get_queryset(self):
        queryset = visible_posts(self.request.user)
        ordering = self.request.query_params.get("ordering")
        if ordering == "score":
            return queryset.order_by("-score", "-published")
        return queryset.order_by("-published")


class PostDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = PostSerializer
    lookup_field = "slug"
    lookup_url_kwarg = "slug"
    permission_classes = [  # noqa: RUF012
        permissions.IsAuthenticatedOrReadOnly,
        PostUserWritePermission,
    ]

    def get_queryset(self):
        return visible_posts(self.request.user)


class CommentListCreateView(ListCreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [  # noqa: RUF012
        permissions.IsAuthenticatedOrReadOnly,
        IsCommentAuthorOrReadOnly,
    ]

    def get_queryset(self):
        post = get_object_or_404(Post, slug=self.kwargs["slug"])
        return Comment.objects.filter(post=post)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["post"] = get_object_or_404(Post, slug=self.kwargs["slug"])
        return context

    def perform_create(self, serializer):
        post = self.get_serializer_context()["post"]
        serializer.save(post=post)


class CommentDetailView(RetrieveUpdateDestroyAPIView):
    serializer_class = CommentSerializer
    permission_classes = [  # noqa: RUF012
        permissions.IsAuthenticatedOrReadOnly,
        IsCommentAuthorOrReadOnly,
    ]

    def get_queryset(self):
        return Comment.objects.all()

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.content = ""
        instance.save(update_fields=["is_active", "content", "updated"])


class PostVoteView(APIView):
    permission_classes = [permissions.IsAuthenticated]  # noqa: RUF012

    def post(self, request, slug):
        post = get_object_or_404(Post, slug=slug, status="published")
        try:
            value = int(request.data.get("value"))
        except (TypeError, ValueError):
            return Response(
                {"value": "Must be 1 or -1."}, status=status.HTTP_400_BAD_REQUEST
            )
        if value not in (1, -1):
            return Response(
                {"value": "Must be 1 or -1."}, status=status.HTTP_400_BAD_REQUEST
            )

        vote, created = Vote.objects.get_or_create(
            user=request.user,
            post=post,
            defaults={"value": value},
        )

        if not created:
            if vote.value == value:
                vote.delete()
            else:
                vote.value = value
                vote.save(update_fields=["value"])

        score = post.votes.aggregate(score=Coalesce(Sum("value"), Value(0)))[
            "score"
        ]
        return Response({"score": score})