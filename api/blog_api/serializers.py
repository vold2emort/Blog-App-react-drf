from blog.models import Comment, Post
from rest_framework import serializers


class PostSerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(source="author.user_name")
    score = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Post
        fields = (
            "id",
            "title",
            "slug",
            "excerpt",
            "content",
            "status",
            "category",
            "author",
            "published",
            "score",
        )
        read_only_fields = ("slug", "published")

    def create(self, validated_data):
        author = self.context["request"].user
        return Post.objects.create(author=author, **validated_data)


class CommentSerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(source="author.user_name")
    post = serializers.PrimaryKeyRelatedField(read_only=True)
    content = serializers.CharField(max_length=4000, allow_blank=False)

    class Meta:
        model = Comment
        fields = ("id", "post", "author", "parent", "content", "is_active", "created")

    def validate(self, attrs):
        attrs = super().validate(attrs)
        parent = attrs.get("parent")
        if parent is not None:
            post = self.context.get("post")
            if post is not None and parent.post_id != post.id:
                raise serializers.ValidationError(
                    {"parent": "Parent comment must belong to the same post."}
                )
        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not instance.is_active:
            data["content"] = None
        return data

    def create(self, validated_data):
        author = self.context["request"].user
        return Comment.objects.create(author=author, **validated_data)

    def update(self, instance, validated_data):
        if not instance.is_active:
            raise serializers.ValidationError(
                {"content": "Deleted comments cannot be edited."}
            )
        return super().update(instance, validated_data)