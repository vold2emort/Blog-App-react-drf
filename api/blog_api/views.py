from blog.models import Category, Comment, Post, Vote
from django.db.models import Count, OuterRef, Q, Subquery, Sum, Value
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
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
    queryset = Post.objects.all().select_related("author", "category").annotate(
        score=Coalesce(Sum("votes__value"), Value(0)),
        comment_count=Coalesce(
            Subquery(
                Comment.objects.filter(post=OuterRef("pk"), is_active=True)
                .values("post")
                .annotate(total=Count("id"))
                .values("total")
            ),
            Value(0),
        ),
    )

    if not user.is_authenticated:
        return queryset.filter(status="published").annotate(my_vote=Value(0))

    return queryset.filter(Q(status="published") | Q(author=user)).annotate(
        my_vote=Coalesce(
            Subquery(
                Vote.objects.filter(post=OuterRef("pk"), user=user).values("value")[:1]
            ),
            Value(0),
        )
    )


class CategoryListCreateView(ListCreateAPIView):
    serializer_class = CategorySerializer
    queryset = Category.objects.all()

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]


class PostListCreateView(ListCreateAPIView):
    serializer_class = PostSerializer
    pagination_class = PostPagination
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    permission_classes = [  # noqa: RUF012
        permissions.IsAuthenticatedOrReadOnly,
        PostUserWritePermission,
    ]

    def get_queryset(self):
        queryset = visible_posts(self.request.user)
        params = self.request.query_params

        search = params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(excerpt__icontains=search)
                | Q(content__icontains=search)
            )

        category = params.get("category", "").strip()
        if category:
            if category.isdigit():
                queryset = queryset.filter(category_id=int(category))
            else:
                queryset = queryset.filter(category__name__iexact=category)

        if params.get("mine") in ("1", "true", "True") and self.request.user.is_authenticated:
            queryset = queryset.filter(author=self.request.user)

        status = params.get("status", "").strip()
        if status in ("draft", "published"):
            queryset = queryset.filter(status=status)

        if params.get("ordering") == "score":
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
                {"value": "Must be 1, 0 or -1."}, status=status.HTTP_400_BAD_REQUEST
            )
        if value not in (1, 0, -1):
            return Response(
                {"value": "Must be 1, 0 or -1."}, status=status.HTTP_400_BAD_REQUEST
            )

        existing = Vote.objects.filter(user=request.user, post=post).first()

        if value == 0 or (existing is not None and existing.value == value):
            if existing is not None:
                existing.delete()
            my_vote = 0
        elif existing is not None:
            existing.value = value
            existing.save(update_fields=["value"])
            my_vote = value
        else:
            Vote.objects.create(user=request.user, post=post, value=value)
            my_vote = value

        score = post.votes.aggregate(score=Coalesce(Sum("value"), Value(0)))["score"]
        return Response({"score": score, "my_vote": my_vote})
