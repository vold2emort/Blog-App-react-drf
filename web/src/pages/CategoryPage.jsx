import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";

import { fetchCategories, fetchPosts, keys } from "@/api/endpoints";
import PostList from "@/components/posts/PostList";
import Button from "@/components/ui/8bit/Button";
import { ErrorState, LoadingBlock } from "@/components/ui/8bit/States";

export default function CategoryPage() {
  const [searchParams] = useSearchParams();
  const category = searchParams.get("category") ?? "";

  const categoriesQuery = useQuery({
    queryKey: keys.categories(),
    queryFn: fetchCategories,
    staleTime: 5 * 60_000,
  });

  const { data: categories, isPending, isError, refetch } = categoriesQuery;
  const selected = categories?.find((item) => String(item.id) === category);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="pixel-title text-base sm:text-lg">Categories</h1>
      </header>

      {isPending && <LoadingBlock label="Loading categories" />}

      {isError && (
        <ErrorState title="Could not load categories" onRetry={() => refetch()} />
      )}

      {!isPending && !isError && categories.length === 0 && (
        <div className="panel-inset p-6 text-center">
          <p className="pixel-label text-ink-muted">No categories yet</p>
          <p className="mt-3 text-sm text-ink-muted">
            Categories are created when you write a post.
          </p>
        </div>
      )}

      {!isPending && !isError && categories.length > 0 && (
        <>
          <nav aria-label="Categories" className="flex flex-wrap gap-2">
            {categories.map((item) => (
              <Link
                key={item.id}
                to={`?category=${item.id}`}
                className={`tag ${
                  String(item.id) === category ? "tag-invert" : "tag-muted hover:border-ink"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {selected && <CategoryPosts category={String(selected.id)} name={selected.name} />}
        </>
      )}
    </div>
  );
}

function CategoryPosts({ category, name }) {
  const query = useQuery({
    queryKey: ["posts", { category }],
    queryFn: () => fetchPosts({ category }),
  });

  const posts = query.data?.results ?? [];
  const [, setSearchParams] = useSearchParams();

  return (
    <section className="flex flex-col gap-4 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-line pb-3">
        <h2 className="pixel-title text-sm">
          {name}{" "}
          <span className="text-ink-muted">
            ({posts.length} {posts.length === 1 ? "post" : "posts"})
          </span>
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSearchParams({}, { replace: true })}
        >
          Show all
        </Button>
      </div>

      <PostList query={query} emptyTitle="No posts in this category" />
    </section>
  );
}