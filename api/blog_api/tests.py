from blog.models import Category, Comment, Post, Vote
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from users.models import CustomUser


class PostApiTest(APITestCase):
    def setUp(self):
        self.category = Category.objects.create(name="django")
        self.user1 = CustomUser.objects.create_user(
            email="user1@example.com", user_name="user1", password="Sup3rSecret!"
        )
        self.user2 = CustomUser.objects.create_user(
            email="user2@example.com", user_name="user2", password="Sup3rSecret!"
        )
        self.post = Post.objects.create(
            category=self.category,
            title="Post Title",
            excerpt="Post Excerpt",
            content="Post Content",
            author=self.user1,
            status="published",
        )

    def post_list_url(self):
        return reverse("blog_api:post_list")

    def post_detail_url(self, slug):
        return reverse("blog_api:post_detail", kwargs={"slug": slug})

    def post_comments_url(self, slug):
        return reverse("blog_api:post_comments", kwargs={"slug": slug})

    def comment_detail_url(self, pk):
        return reverse("blog_api:comment_detail", kwargs={"pk": pk})

    def post_vote_url(self, slug):
        return reverse("blog_api:post_vote", kwargs={"slug": slug})

    def authorized(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    # --- listing ---

    def test_list_posts_public(self):
        response = self.client.get(self.post_list_url(), format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_create_post_requires_authentication(self):
        response = self.client.post(
            self.post_list_url(),
            {"title": "x", "content": "y", "category": self.category.pk},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --- create ---

    def test_create_post_generates_slug_and_author(self):
        client = self.authorized(self.user1)
        response = client.post(
            self.post_list_url(),
            {
                "title": "Hello World",
                "content": "body",
                "category": self.category.pk,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["slug"], "hello-world")
        self.assertEqual(response.data["author"], "user1")

    def test_create_post_duplicate_title_gets_unique_slug(self):
        client = self.authorized(self.user1)
        data = {
            "title": "Same Title",
            "content": "body",
            "category": self.category.pk,
        }
        client.post(self.post_list_url(), data, format="json")
        response = client.post(self.post_list_url(), data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["slug"], "same-title-2")

    # --- detail / update / delete ---

    def test_detail_retrieves_by_slug(self):
        response = self.client.get(self.post_detail_url(self.post.slug), format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["author"], "user1")

    def test_update_restricted_to_author(self):
        client = self.authorized(self.user1)
        response = client.put(
            self.post_detail_url(self.post.slug),
            {
                "title": "Updated",
                "content": "Updated body",
                "status": "published",
                "category": self.category.pk,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.post.refresh_from_db()
        self.assertEqual(self.post.title, "Updated")

        client2 = self.authorized(self.user2)
        response2 = client2.put(
            self.post_detail_url(self.post.slug),
            {
                "title": "Hijacked",
                "content": "nope",
                "status": "published",
                "category": self.category.pk,
            },
            format="json",
        )
        self.assertEqual(response2.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_restricted_to_author(self):
        client2 = self.authorized(self.user2)
        response = client2.delete(self.post_detail_url(self.post.slug))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        client1 = self.authorized(self.user1)
        response = client1.delete(self.post_detail_url(self.post.slug))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    # --- draft visibility ---

    def test_anonymous_cannot_see_drafts(self):
        draft = Post.objects.create(
            category=self.category,
            title="Draft Post",
            content="hidden",
            author=self.user1,
            status="draft",
        )
        response = self.client.get(self.post_list_url(), format="json")
        self.assertEqual(response.data["count"], 1)

        detail = self.client.get(self.post_detail_url(draft.slug), format="json")
        self.assertEqual(detail.status_code, status.HTTP_404_NOT_FOUND)

    def test_author_sees_own_drafts(self):
        draft = Post.objects.create(
            category=self.category,
            title="Draft Post",
            content="hidden",
            author=self.user1,
            status="draft",
        )
        client = self.authorized(self.user1)
        response = client.get(self.post_list_url(), format="json")
        self.assertEqual(response.data["count"], 2)

        detail = client.get(self.post_detail_url(draft.slug), format="json")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)

    def test_other_user_cannot_see_draft(self):
        draft = Post.objects.create(
            category=self.category,
            title="Draft Post",
            content="hidden",
            author=self.user1,
            status="draft",
        )
        client2 = self.authorized(self.user2)
        detail = client2.get(self.post_detail_url(draft.slug), format="json")
        self.assertEqual(detail.status_code, status.HTTP_404_NOT_FOUND)

    # --- pagination ---

    def test_list_is_paginated(self):
        for i in range(12):
            Post.objects.create(
                category=self.category,
                title=f"Post {i}",
                content="body",
                author=self.user1,
                status="published",
            )
        response = self.client.get(self.post_list_url(), format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 13)
        self.assertEqual(len(response.data["results"]), 10)


class CommentApiTest(APITestCase):
    def setUp(self):
        self.category = Category.objects.create(name="django")
        self.author = CustomUser.objects.create_user(
            email="author@example.com", user_name="author", password="Sup3rSecret!"
        )
        self.user = CustomUser.objects.create_user(
            email="user@example.com", user_name="user", password="Sup3rSecret!"
        )
        self.post = Post.objects.create(
            category=self.category,
            title="Post Title",
            content="body",
            author=self.author,
            status="published",
        )

    def comments_url(self, slug=None):
        return reverse(
            "blog_api:post_comments",
            kwargs={"slug": slug or self.post.slug},
        )

    def comment_detail_url(self, pk):
        return reverse("blog_api:comment_detail", kwargs={"pk": pk})

    def authorized(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    def test_create_comment(self):
        client = self.authorized(self.user)
        response = client.post(
            self.comments_url(), {"content": "nice post"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["author"], "user")
        self.assertEqual(response.data["post"], self.post.pk)

    def test_anonymous_cannot_comment(self):
        response = self.client.post(
            self.comments_url(), {"content": "nice"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_indented_reply_must_belong_to_same_post(self):
        post2 = Post.objects.create(
            category=self.category,
            title="Second",
            content="body",
            author=self.author,
            status="published",
        )
        root = Comment.objects.create(
            post=self.post, author=self.author, content="root"
        )
        other = Comment.objects.create(
            post=post2, author=self.author, content="other post"
        )
        client = self.authorized(self.user)

        ok = client.post(
            self.comments_url(), {"content": "reply", "parent": root.pk}, format="json"
        )
        self.assertEqual(ok.status_code, status.HTTP_201_CREATED)

        bad = client.post(
            self.comments_url(),
            {"content": "reply", "parent": other.pk},
            format="json",
        )
        self.assertEqual(bad.status_code, status.HTTP_400_BAD_REQUEST)

    def test_soft_delete_keeps_replies(self):
        root = Comment.objects.create(
            post=self.post, author=self.author, content="root"
        )
        reply = Comment.objects.create(
            post=self.post, author=self.user, parent=root, content="reply"
        )

        client = self.authorized(self.author)
        response = client.delete(self.comment_detail_url(root.pk))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        root.refresh_from_db()
        self.assertFalse(root.is_active)
        self.assertEqual(root.content, "")

        list_response_author = client.get(self.comments_url(), format="json")
        deleted = next(
            c for c in list_response_author.data if c["id"] == root.pk
        )
        self.assertIsNone(deleted["content"])
        surviving = next(
            c for c in list_response_author.data if c["id"] == reply.pk
        )
        self.assertEqual(surviving["content"], "reply")

    def test_edit_restricted_to_author(self):
        comment = Comment.objects.create(
            post=self.post, author=self.author, content="hi"
        )
        url = self.comment_detail_url(comment.pk)
        client2 = self.authorized(self.user)
        response = client2.put(url, {"content": "x"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        client1 = self.authorized(self.author)
        response = client1.put(url, {"content": "edited"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        comment.refresh_from_db()
        self.assertEqual(comment.content, "edited")

    def test_edit_deleted_comment_rejected(self):
        comment = Comment.objects.create(
            post=self.post, author=self.author, content="hi"
        )
        url = self.comment_detail_url(comment.pk)
        client = self.authorized(self.author)
        client.delete(url)

        response = client.put(url, {"content": "revive"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class VoteApiTest(APITestCase):
    def setUp(self):
        self.category = Category.objects.create(name="django")
        self.user1 = CustomUser.objects.create_user(
            email="user1@example.com", user_name="user1", password="Sup3rSecret!"
        )
        self.user2 = CustomUser.objects.create_user(
            email="user2@example.com", user_name="user2", password="Sup3rSecret!"
        )
        self.post = Post.objects.create(
            category=self.category,
            title="Post Title",
            content="body",
            author=self.user1,
            status="published",
        )

    def vote_url(self, slug=None):
        return reverse(
            "blog_api:post_vote", kwargs={"slug": slug or self.post.slug}
        )

    def post_list_url(self):
        return reverse("blog_api:post_list")

    def authorized(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    def test_vote_up(self):
        client = self.authorized(self.user2)
        response = client.post(self.vote_url(), {"value": 1}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["score"], 1)
        self.assertTrue(
            Vote.objects.filter(user=self.user2, post=self.post, value=1).exists()
        )

    def test_vote_same_value_cancels(self):
        client = self.authorized(self.user2)
        client.post(self.vote_url(), {"value": 1}, format="json")
        response = client.post(self.vote_url(), {"value": 1}, format="json")
        self.assertEqual(response.data["score"], 0)
        self.assertFalse(Vote.objects.filter(user=self.user2, post=self.post).exists())

    def test_vote_flip(self):
        client = self.authorized(self.user2)
        client.post(self.vote_url(), {"value": 1}, format="json")
        response = client.post(self.vote_url(), {"value": -1}, format="json")
        self.assertEqual(response.data["score"], -1)
        vote = Vote.objects.get(user=self.user2, post=self.post)
        self.assertEqual(vote.value, -1)

    def test_one_vote_per_user(self):
        client = self.authorized(self.user2)
        self.assertEqual(Vote.objects.count(), 0)
        client.post(self.vote_url(), {"value": 1}, format="json")
        client.post(self.vote_url(), {"value": -1}, format="json")
        self.assertEqual(Vote.objects.filter(user=self.user2, post=self.post).count(), 1)

    def test_vote_requires_authentication(self):
        response = self.client.post(self.vote_url(), {"value": 1}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invalid_value_rejected(self):
        client = self.authorized(self.user2)
        response = client.post(self.vote_url(), {"value": 5}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_vote_draft(self):
        draft = Post.objects.create(
            category=self.category,
            title="Draft",
            content="hidden",
            author=self.user1,
            status="draft",
        )
        client = self.authorized(self.user2)
        response = client.post(self.vote_url(draft.slug), {"value": 1}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_score_ordering(self):
        post_a = Post.objects.create(
            category=self.category,
            title="Most Voted",
            content="body",
            author=self.user1,
            status="published",
        )
        post_b = Post.objects.create(
            category=self.category,
            title="Least Voted",
            content="body",
            author=self.user1,
            status="published",
        )
        for user in (self.user1, self.user2):
            client = self.authorized(user)
            client.post(self.vote_url(post_a.slug), {"value": 1}, format="json")

        response = self.client.get(self.post_list_url() + "?ordering=score", format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        self.assertEqual(results[0]["title"], "Most Voted")
        self.assertEqual(results[0]["score"], 2)
        scores = [p["score"] for p in results]
        self.assertEqual(scores, sorted(scores, reverse=True))


class CategoryApiTest(APITestCase):
    def setUp(self):
        self.user1 = CustomUser.objects.create_user(
            email="user1@example.com", user_name="user1", password="Sup3rSecret!"
        )
        self.category = Category.objects.create(name="django")

    def category_url(self):
        return reverse("categories:category_list")

    def authorized(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    def test_list_categories_ordered_by_name(self):
        Category.objects.create(name="AI")
        Category.objects.create(name="backend")
        response = self.client.get(self.category_url(), format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [c["name"] for c in response.data]
        self.assertEqual(names, sorted(names))

    def test_create_requires_authentication(self):
        response = self.client.post(
            self.category_url(), {"name": "AI"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_normalizes_to_title_case(self):
        client = self.authorized(self.user1)
        for raw, expected in (
            ("programming", "Programming"),
            ("career-advice", "Career-Advice"),
            ("  technology  ", "Technology"),
        ):
            response = client.post(
                self.category_url(), {"name": raw}, format="json"
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(response.data["name"], expected)

    def test_duplicate_returns_existing_without_new_row(self):
        client = self.authorized(self.user1)
        first = client.post(self.category_url(), {"name": "programming"}, format="json")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(first.data["name"], "Programming")

        count = Category.objects.count()
        second = client.post(
            self.category_url(), {"name": "  PROGRAMMING  "}, format="json"
        )
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.data["id"], first.data["id"])
        self.assertEqual(Category.objects.count(), count)

    def test_duplicate_via_existing_category(self):
        client = self.authorized(self.user1)
        response = client.post(
            self.category_url(), {"name": "Django"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["id"], self.category.id)
        self.assertEqual(Category.objects.count(), 1)