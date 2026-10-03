import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Search, X } from "lucide-react";

import { fetchCategories, fetchPosts, keys } from "@/api/endpoints";
import Button from "@/components/ui/8bit/Button";
import Input from "@/components/ui/8bit/Input";
import PostList from "@/components/posts/PostList";
import Select from "@/components/ui/8bit/Select";

const ORDERINGS = [
  { value: "", label: "Newest" },
  { value: "score", label: "Top" },
];

function nextPage(lastPage) {
  if (!lastPage?.next) return undefined;
  return new URL(lastPage.next, window.location.origin).searchParams.get("page");
}

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const debounceRef = useRef(null);

  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const ordering = searchParams.get("ordering") ?? "";

  const [draft, setDraft] = useState(search);
  const pushed = useRef(search);

  // Something other than typing can change the URL: Reset, the back button, or
  // a pasted link. Follow it into the box, but ignore the echo of our own
  // debounced write so the caret is never yanked out from under the user.
  useEffect(() => {
    if (search === pushed.current) return;
    pushed.current = search;
    setDraft(search);
  }, [search]);

  function update(patch) {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        for (const [key, value] of Object.entries(patch)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace: true },
    );
  }

  // Debounce keystrokes into the URL rather than firing a request per letter.
  function scheduleSearch(value) {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const term = value.trim();
      pushed.current = term;
      update({ search: term });
    }, 350);
  }

  const { data: categories = [] } = useQuery({
    queryKey: keys.categories(),
    queryFn: fetchCategories,
    staleTime: 5 * 60_000,
  });

  const query = useInfiniteQuery({
    queryKey: ["posts", { search, category, ordering }],
    queryFn: ({ pageParam = 1 }) =>
      fetchPosts({
        ...(search ? { search } : {}),
        ...(category ? { category } : {}),
        ...(ordering ? { ordering } : {}),
        page: pageParam,
      }),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });

  const merged = {
    ...query,
    data: query.data
      ? {
          ...query.data,
          results: query.data.pages.flatMap((page) => page.results),
        }
      : undefined,
  };

  const hasFilters = Boolean(search || category || ordering);

  return (
    <div className="flex flex-col gap-6">
      <div className="panel p-4 flex flex-col gap-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            update({ search: new FormData(event.currentTarget).get("search") });
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Input
            name="search"
            type="search"
            label="Search"
            placeholder="Title, excerpt or body"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              scheduleSearch(event.target.value);
            }}
          />

          <Select
            name="ordering"
            label="Sort by"
            value={ordering}
            onChange={(event) => update({ ordering: event.target.value })}
          >
            {ORDERINGS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select
            name="category"
            label="Category"
            value={category}
            onChange={(event) => update({ category: event.target.value })}
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>

          <div className="flex items-end gap-2 pb-1">
            <Button type="submit" variant="primary" size="sm">
              <Search size={12} aria-hidden="true" />
              Search
            </Button>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchParams({}, { replace: true })}
              >
                <X size={12} aria-hidden="true" />
                Reset
              </Button>
            )}
          </div>
        </form>
      </div>

      <PostList
        query={merged}
        emptyTitle={hasFilters ? "No matches" : "No posts yet"}
      />

      {query.hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button
            variant="primary"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? "Loading" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}