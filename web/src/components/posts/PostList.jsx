import PostCard from "./PostCard";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/8bit/States";

export default function PostList({ query, emptyTitle = "No posts yet" }) {
  const { data, isPending, isError, refetch } = query;

  if (isPending) return <LoadingBlock label="Loading posts" />;

  if (isError) {
    return <ErrorState title="Could not load posts" onRetry={() => refetch()} />;
  }

  const posts = data?.results ?? [];
  if (posts.length === 0) {
    return (
      <EmptyState title={emptyTitle}>
        <p>Nothing here yet. Try another filter, or write the first post.</p>
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}