import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Reply, Trash2 } from "lucide-react";

import { deleteComment, keys } from "@/api/endpoints";
import Button from "@/components/ui/8bit/Button";
import MarkdownBody from "@/lib/MarkdownBody";
import { formatDateTime } from "@/lib/format";

import CommentEditForm from "./CommentEditForm";
import CommentForm from "./CommentForm";

const MAX_INDENT = 3;

function CommentNode({
  slug,
  postAuthorId,
  comment,
  depth,
  currentUserId,
  onRequireLogin,
}) {
  const queryClient = useQueryClient();
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isAuthorOfPost = comment.author_id === postAuthorId;
  const isOwn = comment.author_id === currentUserId;
  const isDeleted = !comment.is_active;

  const deletion = useMutation({
    mutationFn: () => deleteComment(comment.id),
    onSuccess: () => {
      setConfirmingDelete(false);
      queryClient.invalidateQueries({ queryKey: keys.comments(slug) });
      queryClient.invalidateQueries({ queryKey: keys.post(slug) });
    },
  });

  const indent = Math.min(depth, MAX_INDENT);

  return (
    <li
      className="border-l-2 border-line pl-3 sm:pl-4"
      style={{ marginLeft: `${indent * 0.75}rem` }}
    >
      <div className={depth > 0 ? "mt-4" : ""}>
        {isDeleted ? (
          <div className="panel-inset px-3 py-2">
            <p className="pixel-label text-ink-subtle">[deleted]</p>
          </div>
        ) : (
          <div className="panel p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="pixel-label">{comment.author}</span>
              {isAuthorOfPost && (
                <span className="tag tag-invert" title="Author of this post">
                  Author
                </span>
              )}
              <span className="text-xs text-ink-subtle">
                {formatDateTime(comment.created)}
              </span>
            </div>

            {editing ? (
              <CommentEditForm
                slug={slug}
                comment={comment}
                onDone={() => setEditing(false)}
              />
            ) : (
              <MarkdownBody>{comment.content}</MarkdownBody>
            )}

            {!editing && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {!isDeleted && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      currentUserId
                        ? setReplying((open) => !open)
                        : onRequireLogin()
                    }
                  >
                    <Reply size={12} aria-hidden="true" />
                    Reply
                  </Button>
                )}

                {isOwn && !isDeleted && (
                  <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                )}

                {isOwn && !isDeleted && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmingDelete(true)}
                  >
                    <Trash2 size={12} aria-hidden="true" />
                    Delete
                  </Button>
                )}
              </div>
            )}

            {confirmingDelete && (
              <div className="mt-3 panel-inset p-3">
                <p className="pixel-label">Delete this comment?</p>
                <div className="mt-3 flex gap-2">
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

            {replying && (
              <div className="mt-4">
                <CommentForm
                  slug={slug}
                  parentId={comment.id}
                  autoFocus
                  submitLabel="Post Reply"
                  onDone={() => setReplying(false)}
                />
              </div>
            )}
          </div>
        )}

        {comment.children.length > 0 && (
          <ul className="mt-4 flex flex-col gap-1">
            {comment.children.map((child) => (
              <CommentNode
                key={child.id}
                slug={slug}
                postAuthorId={postAuthorId}
                comment={child}
                depth={depth + 1}
                currentUserId={currentUserId}
                onRequireLogin={onRequireLogin}
              />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

export default CommentNode;