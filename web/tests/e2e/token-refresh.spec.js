import {
  test,
  expect,
  signIn,
  corruptCookie,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  CSRF_COOKIE,
} from "./fixtures";

const token = () => `tq${Math.random().toString(36).slice(2, 9)}`;

async function authorWithPost(api) {
  const author = await api.register("author");
  const category = await api.createCategory(`Tok ${token()}`, author);
  const post = await api.createPost(author, {
    title: `Token target ${token()}`,
    category: category.id,
  });
  return { author, post };
}

test.describe("Token refresh", () => {
  test("recovers silently when the access token has expired", async ({ page, api, shot }) => {
    const { author, post } = await authorWithPost(api);

    await signIn(page, author);
    // Only the access cookie is broken; the refresh cookie is still valid.
    await corruptCookie(page, ACCESS_COOKIE, "expired.access.token");

    await page.goto(`/posts/${post.slug}`);
    await expect(page.getByRole("heading", { level: 1, name: post.title })).toBeVisible();
    await expect(page.getByRole("button", { name: "Log Out" })).toBeVisible();
    await shot("token-refresh-recovered");
  });

  test("refreshes in place when a request 401s mid-session", async ({ page, api, shot }) => {
    const { author, post } = await authorWithPost(api);

    await signIn(page, author);
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Log Out" })).toBeVisible();

    // A client-side navigation keeps AuthProvider mounted, so recovery has to
    // come from the response interceptor rather than the bootstrap refresh.
    await corruptCookie(page, ACCESS_COOKIE, "expired.access.token");
    await page.getByRole("link", { name: post.title }).first().click();

    await expect(page.getByRole("heading", { level: 1, name: post.title })).toBeVisible();
    await expect(page.getByRole("button", { name: "Log Out" })).toBeVisible();
    await shot("token-refresh-mid-session");
  });

  test("signs the user out when the refresh token is no longer valid", async ({ page, shot }) => {
    await page.context().addCookies([
      {
        name: ACCESS_COOKIE,
        value: "expired.access.token",
        url: "http://localhost:5173",
        httpOnly: true,
        sameSite: "Lax",
      },
      {
        name: REFRESH_COOKIE,
        value: "revoked.refresh.token",
        url: "http://localhost:5173",
        httpOnly: true,
        sameSite: "Lax",
      },
      {
        name: CSRF_COOKIE,
        value: "irrelevant",
        url: "http://localhost:5173",
        httpOnly: false,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/me");

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("link", { name: "Log In" }).first()).toBeVisible();
    await shot("token-refresh-expired-signed-out");
  });

  test("treats a missing session as anonymous", async ({ page, shot }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Log In" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "My Posts" })).toHaveCount(0);
    await shot("token-anonymous-home");
  });
});

test.describe("Cross page navigation", () => {
  test("keeps the session across a hard navigation", async ({ page, api, shot }) => {
    const author = await api.register("nav");
    await signIn(page, author);

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