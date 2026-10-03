import { test, expect } from "./fixtures";

const token = () => `tq${Math.random().toString(36).slice(2, 9)}`;

async function authorWithPost(api) {
  const author = await api.register("author");
  const category = await api.createCategory(`Tok ${token()}`, author.access);
  const post = await api.createPost(author, {
    title: `Token target ${token()}`,
    category: category.id,
  });
  return { author, post };
}

test.describe("Token refresh", () => {
  test("recovers silently when the access token has expired", async ({ page, api, shot }) => {
    const { author, post } = await authorWithPost(api);

    await page.addInitScript(
      ([access, refresh]) => {
        localStorage.setItem("blog:access", access);
        localStorage.setItem("blog:refresh", refresh);
      },
      [author.access, author.refresh],
    );

    await page.goto("/me");
    await expect(page.getByRole("heading", { name: "My posts" })).toBeVisible();

    await page.route("**/api/posts/**", async (route) => {
      const headers = { ...route.request().headers() };
      if (route.request().url().includes("/api/posts/")) delete headers.authorization;
      await route.continue({ headers });
    });

    await page.goto(`/posts/${post.slug}`);
    await expect(page.getByRole("heading", { level: 1, name: post.title })).toBeVisible();

    const refreshed = await page.evaluate(() => Boolean(localStorage.getItem("blog:access")));
    expect(refreshed).toBe(true);
    await shot("token-refresh-recovered");
  });

  test("signs the user out when the refresh token is no longer valid", async ({ page, shot }) => {
    await page.addInitScript(() => {
      localStorage.setItem("blog:access", "expired.access.token");
      localStorage.setItem("blog:refresh", "revoked.refresh.token");
    });

    await page.goto("/me");

    await expect(page).toHaveURL(/\/login/);
    const access = await page.evaluate(() => localStorage.getItem("blog:access"));
    expect(access).toBeNull();
    await shot("token-refresh-expired-signed-out");
  });

  test("treats a missing session as anonymous", async ({ page, shot }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Log In" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "My Posts" })).toHaveCount(0);
    await shot("token-anonymous-home");
  });
});

test.describe("Cross page navigation", () => {
  test("keeps the session across a hard navigation", async ({ page, api, shot }) => {
    const author = await api.register("nav");
    await page.addInitScript(
      ([access, refresh]) => {
        localStorage.setItem("blog:access", access);
        localStorage.setItem("blog:refresh", refresh);
      },
      [author.access, author.refresh],
    );

    await page.goto("/");
    await expect(page.getByRole("button", { name: "Log Out" })).toBeVisible();
    await page.getByRole("navigation", { name: "Primary" }).first().getByRole("link", { name: "Categories" }).click();
    await expect(page).toHaveURL("/categories");

    await page.getByRole("navigation", { name: "Primary" }).first().getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("button", { name: "Log Out" })).toBeVisible();
    await shot("navigation-session-persists");
  });

  test("renders the not found page for an unknown route", async ({ page, shot }) => {
    await page.goto("/definitely-not-a-route");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(page.getByText("That page does not exist.")).toBeVisible();

    await page.getByRole("link", { name: "Back to home" }).click();
    await expect(page).toHaveURL("/");
    await shot("not-found-page");
  });
});