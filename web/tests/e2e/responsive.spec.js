import { test, expect, signIn } from "./fixtures";

const token = () => "rq" + Math.random().toString(36).slice(2, 9);

async function overflow(page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
}

test.describe("Responsive layout", () => {
  test("opens the mobile menu and navigates", async ({ page, shot }) => {
    await page.goto("/");

    const menu = page.getByRole("button", { name: "Open menu" });
    await expect(menu).toBeVisible();
    await shot("responsive-menu-closed");

    await menu.click();
    const nav = page.getByRole("navigation", { name: "Primary" }).last();
    await expect(page.getByRole("button", { name: "Close menu" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Log In" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Register" })).toBeVisible();
    await shot("responsive-menu-open");

    await nav.getByRole("link", { name: "Categories" }).click();
    await expect(page).toHaveURL("/categories");
    await shot("responsive-menu-navigated");
  });

  test("shows signed-in actions inside the mobile menu", async ({ page, api, shot }) => {
    const author = await api.register("mobile");
    await signIn(page, author);
    await page.goto("/");

    await page.getByRole("button", { name: "Open menu" }).click();
    const nav = page.getByRole("navigation", { name: "Primary" }).last();
    await expect(nav.getByRole("link", { name: "My Posts" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "New Post" })).toBeVisible();
    await expect(nav.getByText(`Signed in as ${author.user_name}`)).toBeVisible();
    await shot("responsive-menu-signed-in");
  });

  test("does not scroll sideways on the home page", async ({ page, shot }) => {
    await page.goto("/");
    const { scrollWidth, clientWidth } = await overflow(page);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    await shot("responsive-home-no-overflow");
  });

  test("does not scroll sideways on a post with a long title", async ({ page, api, shot }) => {
    const author = await api.register("long");
    const category = await api.createCategory(`Long ${token()}`, author);
    const post = await api.createPost(author, {
      title: `Extremely long unbreakable ${"x".repeat(60)}`,
      category: category.id,
      content: "Body.",
    });
    await page.goto(`/posts/${post.slug}`);

    const { scrollWidth, clientWidth } = await overflow(page);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    await shot("responsive-detail-no-overflow");
  });

  test("stacks the post form fields on a small screen", async ({ page, api, shot }) => {
    const author = await api.register("form");
    await signIn(page, author);
    await page.goto("/posts/new");

    await expect(page.getByLabel("Title")).toBeVisible();
    await expect(page.getByRole("button", { name: "Publish post" })).toBeVisible();
    const { scrollWidth, clientWidth } = await overflow(page);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    await shot("responsive-post-form");
  });

  test("keeps the theme toggle reachable on a small screen", async ({ page, shot }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await shot("responsive-dark-theme");
  });
});