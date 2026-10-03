import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";

import { formatDate, pluralize } from "@/lib/format";
import VoteButtons from "./VoteButtons";

export default function PostCard({ post }) {
  const isDraft = post.status === "draft";

  return (
    <article className="panel p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-5">
      <div className="flex sm:flex-col items-center sm:gap-2 shrink-0 order-2 sm:order-1">
        <VoteButtons post={post} />
      </div>

      <div className="flex-1 min-w-0 order-1 sm:order-2">
        <div className="flex items-start gap-2 flex-wrap">
          <h2 className="pixel-title text-sm sm:text-base flex-1 min-w-0">
            <Link to={`/posts/${post.slug}`} className="hover:underline">
              {post.title}
            </Link>
          </h2>
          {isDraft && <span className="tag tag-muted shrink-0">Draft</span>}
        </div>

        <p className="mt-2 text-sm text-ink-muted flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-ink">{post.author}</span>
          <span aria-hidden="true">&middot;</span>
          <span>{formatDate(post.published)}</span>
          {post.comment_count > 0 && (
            <span className="inline-flex items-center gap-1">
              <MessageSquare size={12} aria-hidden="true" />
              {pluralize(post.comment_count, "comment")}
            </span>
          )}
        </p>

        {post.excerpt && (
          <p className="mt-3 text-ink-muted line-clamp-2">{post.excerpt}</p>
        )}
      </div>
    </article>
  );
}