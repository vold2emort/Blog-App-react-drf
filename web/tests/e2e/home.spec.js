import { test, expect, signIn } from "./fixtures";

const token = () => `zq${Math.random().toString(36).slice(2, 9)}`;

async function seedPosts(api, author, count, titlePrefix) {
  const category = await api.createCategory(`Cat ${titlePrefix}`, author);
  const posts = [];
  for (let i = 0; i < count; i += 1) {
    posts.push(
      await api.createPost(author, {
        title: `${titlePrefix} post ${i}`,
        category: category.id,
        excerpt: `excerpt for ${titlePrefix} ${i}`,
      }),
    );
  }
  return posts;
}

test.describe("Home feed", () => {
  test("lists published posts", async ({ page, api, shot }) => {
    const author = await api.register("feed");
    const prefix = token();
    await seedPosts(api, author, 3, prefix);

    await page.goto("/");
    await expect(page.getByRole("article").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: `${prefix} post 0` })).toBeVisible();
    await shot("home-lists-posts");
  });

  test("filters by search term and shows a reset control", async ({ page, api, shot }) => {
    const author = await api.register("search");
    const prefix = token();
    await seedPosts(api, author, 3, prefix);

    await page.goto("/");
    await page.getByRole("searchbox", { name: "Search" }).fill(prefix);
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page.getByRole("heading", { name: `${prefix} post 1` })).toBeVisible();
    await expect(page.getByRole("heading", { name: `${prefix} post 2` })).toBeVisible();
    await shot("home-search-results");

    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByRole("searchbox", { name: "Search" })).toHaveValue("");
  });

  test("shows an empty state when nothing matches", async ({ page, shot }) => {
    await page.goto("/");
    await page.getByRole("searchbox", { name: "Search" }).fill("zzz-no-such-post-zzz");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page.getByText("No matches")).toBeVisible();
    await shot("home-no-matches-empty-state");
  });

  test("filters by category", async ({ page, api, shot }) => {
    const author = await api.register("cat");
    const prefix = token();
    const wanted = await api.createCategory(`Wanted ${prefix}`, author);
    const other = await api.createCategory(`Other ${prefix}`, author);
    await api.createPost(author, { title: `${prefix} wanted`, category: wanted.id });
    await api.createPost(author, { title: `${prefix} other`, category: other.id });

    await page.goto("/");
    await page.getByLabel("Category").selectOption(String(wanted.id));
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page.getByRole("heading", { name: `${prefix} wanted` })).toBeVisible();
    await expect(page.getByRole("heading", { name: `${prefix} other` })).toHaveCount(0);
    await shot("home-category-filter");
  });

  test("sorts by top score", async ({ page, api, shot }) => {
    const author = await api.register("sort");
    const prefix = token();
    const posts = await seedPosts(api, author, 2, prefix);
    const voter = await api.register("sortvoter");
    await api.vote(voter, posts[1].slug, 1);

    await page.goto("/");
    await page.getByRole("searchbox", { name: "Search" }).fill(prefix);
    await page.getByLabel("Sort by").selectOption("score");
    await page.getByRole("button", { name: "Search" }).click();

    const first = page.getByRole("article").first();
    await expect(first.getByRole("heading", { name: `${prefix} post 1` })).toBeVisible();
    await shot("home-sort-by-top");
  });

  test("loads the next page of results", async ({ page, api, shot }) => {
    const author = await api.register("paging");
    const prefix = token();
    await seedPosts(api, author, 12, prefix);

    await page.goto("/");
    await page.getByRole("searchbox", { name: "Search" }).fill(prefix);
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page.getByRole("article")).toHaveCount(10);
    await page.getByRole("button", { name: "Load more" }).click();
    await expect(page.getByRole("article")).toHaveCount(12);
    await shot("home-load-more-pagination");
  });

  test("shows an error state with a working retry", async ({ page, shot }) => {
    await page.route("**/api/posts/**", (route) => route.abort("failed"));
    await page.goto("/");

    await expect(page.getByRole("alert")).toContainText("Could not load posts");
    await shot("home-error-state");

    await page.unroute("**/api/posts/**");
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByRole("article").first()).toBeVisible();
    await shot("home-error-recovered");
  });

  test("shows the signed-in navigation for an author", async ({ page, api, shot }) => {
    const user = await api.register("nav");
    await signIn(page, user);
    await page.goto("/");

    const nav = page.getByRole("navigation", { name: "Primary" }).first();
    await expect(nav.getByRole("link", { name: "My Posts" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "New Post" })).toBeVisible();
    await shot("home-signed-in-nav");
  });
});