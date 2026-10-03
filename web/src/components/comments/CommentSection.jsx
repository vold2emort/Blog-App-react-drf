import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/auth-context";
import { EmptyState, LoadingBlock } from "@/components/ui/8bit/States";
import { pluralize } from "@/lib/format";

import CommentForm from "./CommentForm";
import CommentNode from "./CommentNode";
import { buildCommentTree } from "./buildCommentTree";

export default function CommentSection({ slug, postAuthorId, commentsQuery }) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  const { data, isPending, isError } = commentsQuery;

  function requireLogin() {
    navigate(`/login?returnTo=${encodeURIComponent(pathname + search)}`);
  }

  const total = data?.length ?? 0;
  const tree = buildCommentTree(data ?? []);

  return (
    <section id="comments" className="mt-10">
      <h2 className="pixel-title text-sm sm:text-base mb-4">
        Comments {total > 0 && <span className="text-ink-muted">({total})</span>}
      </h2>

      {isAuthenticated ? (
        <div className="panel p-4 sm:p-5">
          <CommentForm slug={slug} />
        </div>
      ) : (
        <div className="panel-inset p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-ink-muted text-sm">
            Log in to leave a comment.
          </p>
          <button type="button" className="btn btn-sm" onClick={requireLogin}>
            Log In
          </button>
        </div>
      )}

      <div className="mt-6">
        {isPending && <LoadingBlock label="Loading comments" />}

        {isError && (
          <div className="panel p-6" role="alert">
            <p className="pixel-label">Could not load comments</p>
          </div>
        )}

        {!isPending && !isError && total === 0 && (
          <EmptyState title="No comments yet">
            <p>Be the first to say something.</p>
          </EmptyState>
        )}

        {!isPending && !isError && total > 0 && (
          <>
            <p className="text-sm text-ink-subtle mb-3">
              {pluralize(total, "comment")}
            </p>
            <ul className="flex flex-col">
              {tree.map((comment) => (
                <CommentNode
                  key={comment.id}
                  slug={slug}
                  postAuthorId={postAuthorId}
                  comment={comment}
                  depth={0}
                  currentUserId={user?.id ?? null}
                  onRequireLogin={requireLogin}
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}