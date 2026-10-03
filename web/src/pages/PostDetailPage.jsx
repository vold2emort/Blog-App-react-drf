import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, PenSquare, Trash2 } from "lucide-react";

import { deletePost, fetchComments, fetchPost, keys } from "@/api/endpoints";
import Button from "@/components/ui/8bit/Button";
import ButtonLink from "@/components/ui/8bit/ButtonLink";
import CommentSection from "@/components/comments/CommentSection";
import MarkdownBody from "@/lib/MarkdownBody";
import PostForm from "@/components/posts/PostForm";
import VoteButtons from "@/components/posts/VoteButtons";
import { ErrorState, LoadingBlock } from "@/components/ui/8bit/States";
import { formatDate, pluralize } from "@/lib/format";
import { useAuth } from "@/auth/auth-context";

export default function PostDetailPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const postQuery = useQuery({
    queryKey: keys.post(slug),
    queryFn: () => fetchPost(slug),
    retry: false,
  });

  const commentsQuery = useQuery({
    queryKey: keys.comments(slug),
    queryFn: () => fetchComments(slug),
    retry: false,
  });

  const deletion = useMutation({
    mutationFn: () => deletePost(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      navigate("/");
    },
  });

  if (postQuery.isPending) return <LoadingBlock label="Loading post" />;

  if (postQuery.isError) {
    return (
      <div className="flex flex-col gap-4">
        <ErrorState
          title="Post not found"
          onRetry={() => postQuery.refetch()}
        />
        <div>
          <Link to="/" className="link text-sm">
            Back to all posts
          </Link>
        </div>
      </div>
    );
  }

  const post = postQuery.data;
  const isOwner = Boolean(user) && user.id === post.author_id;
  const isDraft = post.status === "draft";

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {isDraft && <span className="tag tag-muted">Draft</span>}
          {isDraft && (
            <span className="text-sm text-ink-muted">
              Only you can see this.
            </span>
          )}
        </div>

        <h1 className="pixel-title text-base sm:text-xl leading-relaxed">
          {post.title}
        </h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-muted">
          <span className="text-ink">{post.author}</span>
          <span>{formatDate(post.published)}</span>
          <Link to={`/categories?category=${post.category}`} className="link-quiet">
            View category
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t-2 border-line">
          <VoteButtons post={post} size="default" />

          <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <MessageSquare size={14} aria-hidden="true" />
            {pluralize(post.comment_count, "comment")}
          </span>

          <a href="#comments" className="link-quiet text-sm">
            Jump to comments
          </a>

          <div className="ml-auto flex items-center gap-2">
            {isOwner && !editing && (
              <>
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                  <PenSquare size={12} aria-hidden="true" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmingDelete(true)}
                >
                  <Trash2 size={12} aria-hidden="true" />
                  Delete
                </Button>
              </>
            )}
            {!isOwner && (
              <ButtonLink to="/" variant="ghost" size="sm">
                All posts
              </ButtonLink>
            )}
          </div>
        </div>
      </header>

      {post.thumbnail && (
        <img
          src={post.thumbnail}
          alt=""
          className="thumb w-full object-cover max-h-96"
        />
      )}

      {confirmingDelete && (
        <div className="panel p-4" role="alertdialog" aria-label="Confirm delete">
          <p className="pixel-label">Delete this post permanently?</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              disabled={deletion.isPending}
              onClick={() => deletion.mutate()}
            >
              {deletion.isPending ? "Deleting" : "Yes, delete"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingDelete(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {editing ? (
        <section className="panel p-4 sm:p-6">
          <h2 className="pixel-title text-sm mb-5">Edit post</h2>
          <PostForm
            post={post}
            onSaved={() => {
              setEditing(false);
              postQuery.refetch();
            }}
          />
        </section>
      ) : (
        <MarkdownBody>{post.content}</MarkdownBody>
      )}

      <CommentSection
        slug={slug}
        postAuthorId={post.author_id}
        commentsQuery={commentsQuery}
      />
    </article>
  );
}