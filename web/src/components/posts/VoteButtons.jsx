import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";

import { keys, votePost } from "@/api/endpoints";
import Button from "@/components/ui/8bit/Button";
import { useAuth } from "@/auth/auth-context";

/**
 * Patch one post wherever it appears in a cached collection. Handles both the
 * plain paginated shape ({ results: [...] }) and the infinite-query shape
 * ({ pages: [{ results: [...] }] }).
 */
function patchCollection(cache, patchPost) {
  if (!cache) return cache;

  if (Array.isArray(cache.results)) {
    return { ...cache, results: cache.results.map(patchPost) };
  }

  if (Array.isArray(cache.pages)) {
    return {
      ...cache,
      pages: cache.pages.map((page) =>
        Array.isArray(page?.results)
          ? { ...page, results: page.results.map(patchPost) }
          : page,
      ),
    };
  }

  return cache;
}

export default function VoteButtons({ post, size = "sm", showCount = true }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  const isDraft = post.status === "draft";

  const mutation = useMutation({
    mutationFn: (value) => votePost(post.slug, value),
    onMutate: async (value) => {
      const nextVote = post.my_vote === value ? 0 : value;
      const delta = nextVote - post.my_vote;

      await queryClient.cancelQueries({ queryKey: ["posts"] });
      await queryClient.cancelQueries({ queryKey: keys.post(post.slug) });

      const listSnapshots = queryClient.getQueriesData({ queryKey: ["posts"] });
      const detailSnapshot = queryClient.getQueryData(keys.post(post.slug));

      const patch = (candidate) =>
        candidate.slug === post.slug
          ? { ...candidate, my_vote: nextVote, score: candidate.score + delta }
          : candidate;

      queryClient.setQueriesData({ queryKey: ["posts"] }, (old) =>
        patchCollection(old, patch),
      );
      queryClient.setQueryData(keys.post(post.slug), patch);

      return { listSnapshots, detailSnapshot };
    },
    onError: (_error, _value, context) => {
      context?.listSnapshots.forEach(([key, data]) =>
        queryClient.setQueryData(key, data),
      );
      if (context?.detailSnapshot !== undefined) {
        queryClient.setQueryData(keys.post(post.slug), context.detailSnapshot);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: keys.post(post.slug) });
    },
  });

  function cast(value) {
    if (!isAuthenticated) {
      navigate(`/login?returnTo=${encodeURIComponent(pathname + search)}`);
      return;
    }
    if (isDraft || mutation.isPending) return;
    mutation.mutate(value);
  }

  const disabled = isDraft || mutation.isPending;
  const title = isDraft ? "Drafts cannot be voted on" : undefined;

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="vote"
        size={size}
        onClick={() => cast(1)}
        aria-pressed={post.my_vote === 1}
        aria-label="Upvote"
        title={title ?? "Upvote"}
        disabled={disabled}
      >
        <ChevronUp size={16} aria-hidden="true" />
      </Button>

      {showCount && (
        <span
          className="pixel-label tabular-nums min-w-10 text-center text-ink"
          aria-live="polite"
          data-testid="vote-score"
        >
          {post.score}
        </span>
      )}

      <Button
        variant="vote"
        size={size}
        onClick={() => cast(-1)}
        aria-pressed={post.my_vote === -1}
        aria-label="Downvote"
        title={title ?? "Downvote"}
        disabled={disabled}
      >
        <ChevronDown size={16} aria-hidden="true" />
      </Button>
    </div>
  );
}