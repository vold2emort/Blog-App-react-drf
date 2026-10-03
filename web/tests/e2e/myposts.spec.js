import { test, expect, signIn } from "./fixtures";

const token = () => `mq${Math.random().toString(36).slice(2, 9)}`;

test.describe("My posts", () => {
  test("lists only the signed-in author's posts", async ({ page, api, shot }) => {
    const mine = await api.register("mine");
    const category = await api.createCategory(`Mine ${token()}`, mine.access);
    const minePrefix = token();
    await api.createPost(mine, { title: `${minePrefix} mine`, category: category.id });

    const theirs = await api.register("theirs");
    await api.createPost(theirs, { title: `${minePrefix} theirs`, category: category.id });

    await signIn(page, mine);
    await page.goto("/me");

    await expect(page.getByRole("heading", { name: `${minePrefix} mine` })).toBeVisible();
    await expect(page.getByRole("heading", { name: `${minePrefix} theirs` })).toHaveCount(0);
    await shot("myposts-lists-own-posts");
  });

  test("filters between published and drafts", async ({ page, api, shot }) => {
    const author = await api.register("filter");
    const category = await api.createCategory(`Filter ${token()}`, author.access);
    const prefix = token();
    await api.createPost(author, { title: `${prefix} live`, category: category.id });
    await api.createPost(author, {
      title: `${prefix} hidden`,
      category: category.id,
      status: "draft",
    });

    await signIn(page, author);
    await page.goto("/me");

    await expect(page.getByRole("heading", { name: `${prefix} live` })).toBeVisible();
    await expect(page.getByRole("heading", { name: `${prefix} hidden` })).toBeVisible();
    await shot("myposts-all-filter");

    await page.getByRole("button", { name: "Drafts" }).click();
    await expect(page.getByRole("heading", { name: `${prefix} hidden` })).toBeVisible();
    await expect(page.getByRole("heading", { name: `${prefix} live` })).toHaveCount(0);
    await shot("myposts-drafts-filter");

    await page.getByRole("button", { name: "Published" }).click();
    await expect(page.getByRole("heading", { name: `${prefix} live` })).toBeVisible();
    await expect(page.getByRole("heading", { name: `${prefix} hidden` })).toHaveCount(0);
  });

  test("shows an empty state for a new author", async ({ page, api, shot }) => {
    const author = await api.register("empty");
    await signIn(page, author);
    await page.goto("/me");

    await expect(page.getByText("Nothing here yet").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "New post", exact: true })).toBeVisible();
    await shot("myposts-empty-state");
  });

  test("greets the author by name", async ({ page, api, shot }) => {
    const author = await api.register("greet");
    await signIn(page, author);
    await page.goto("/me");

    await expect(page.getByText(`Everything you have written, ${author.user_name}`)).toBeVisible();
    await shot("myposts-greeting");
  });
});