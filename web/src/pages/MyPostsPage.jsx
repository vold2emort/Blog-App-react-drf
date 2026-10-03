import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchPosts } from "@/api/endpoints";
import Button from "@/components/ui/8bit/Button";
import PostList from "@/components/posts/PostList";
import ButtonLink from "@/components/ui/8bit/ButtonLink";
import { useAuth } from "@/auth/auth-context";
import LoginRedirect from "@/auth/LoginRedirect";

const FILTERS = [
  { value: "", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
];

export default function MyPostsPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [status, setStatus] = useState("");

  const query = useQuery({
    queryKey: ["posts", { mine: true, status }],
    queryFn: () =>
      fetchPosts({ mine: true, ...(status ? { status } : {}) }),
    enabled: isAuthenticated,
  });

  if (isLoading) return null;
  if (!isAuthenticated) return <LoginRedirect />;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="pixel-title text-base sm:text-lg">My posts</h1>
          <p className="mt-3 text-ink-muted">
            Everything you have written, {user?.user_name}.
          </p>
        </div>
        <ButtonLink to="/posts/new" variant="primary" size="sm">
          New post
        </ButtonLink>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Button
            key={filter.value}
            variant={filter.value === status ? "primary" : "ghost"}
            size="sm"
            aria-pressed={filter.value === status}
            onClick={() => setStatus(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      <PostList query={query} emptyTitle="Nothing here yet" />
    </div>
  );
}