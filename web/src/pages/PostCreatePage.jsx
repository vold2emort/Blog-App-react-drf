import { useNavigate } from "react-router-dom";

import PostForm from "@/components/posts/PostForm";
import { useAuth } from "@/auth/auth-context";
import LoginRedirect from "@/auth/LoginRedirect";

export default function PostCreatePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) return null;
  if (!isAuthenticated) return <LoginRedirect />;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="pixel-title text-base sm:text-lg">New post</h1>
        <p className="mt-3 text-ink-muted">
          Write in Markdown. Save as a draft to keep it private.
        </p>
      </header>

      <div className="panel p-4 sm:p-6">
        <PostForm
          onSaved={(created) => {
            navigate(`/posts/${created.slug}`);
          }}
        />
      </div>
    </div>
  );
}