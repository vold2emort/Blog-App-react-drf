import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { fetchPost, keys } from "@/api/endpoints";
import PostForm from "@/components/posts/PostForm";
import { ErrorState, LoadingBlock } from "@/components/ui/8bit/States";
import { useAuth } from "@/auth/auth-context";
import LoginRedirect from "@/auth/LoginRedirect";

export default function PostEditPage() {
  const { slug } = useParams();
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const { data: post, isPending, isError, refetch } = useQuery({
    queryKey: keys.post(slug),
    queryFn: () => fetchPost(slug),
    retry: false,
  });

  if (isLoading) return null;
  if (!isAuthenticated) return <LoginRedirect />;
  if (isPending) return <LoadingBlock label="Loading post" />;

  if (isError || !post) {
    return <ErrorState title="Post not found" onRetry={() => refetch()} />;
  }

  if (user?.id !== post.author_id) {
    return <Navigate to={`/posts/${slug}`} replace />;
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="pixel-title text-base sm:text-lg">Edit post</h1>
        <p className="mt-3 text-ink-muted">Editing: {post.title}</p>
      </header>

      <div className="panel p-4 sm:p-6">
        <PostForm
          post={post}
          onSaved={(saved) => {
            navigate(`/posts/${saved.slug}`);
          }}
        />
      </div>
    </div>
  );
}