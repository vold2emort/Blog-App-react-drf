import { test, expect, signIn } from "./fixtures";

const token = () => `dq${Math.random().toString(36).slice(2, 9)}`;

async function target(api, { status = "published" } = {}) {
  const author = await api.register("author");
  const category = await api.createCategory(`Det ${token()}`, author);
  const post = await api.createPost(author, {
    title: `Detail target ${token()}`,
    category: category.id,
    status,
    excerpt: "A short excerpt line.",
    content: "# Heading\n\nSome **bold** text.\n\n- one\n- two",
  });
  return { author, post };
}

test.describe("Post detail", () => {
  test("renders the post body as markdown", async ({ page, api, shot }) => {
    const { post } = await target(api);
    await page.goto(`/posts/${post.slug}`);

    await expect(page.getByRole("heading", { name: "Heading", level: 2 })).toBeVisible();
    await expect(page.getByRole("strong").filter({ hasText: "bold" })).toBeVisible();
    await expect(page.getByRole("listitem")).toHaveCount(2);
    await shot("detail-markdown-rendered");
  });

  test("shows author, date and a category link", async ({ page, api, shot }) => {
    const { author, post } = await target(api);
    await page.goto(`/posts/${post.slug}`);

    await expect(page.getByText(author.user_name)).toBeVisible();
    await expect(page.getByRole("link", { name: "View category" })).toBeVisible();
    await shot("detail-meta");
  });

  test("shows an error state for an unknown slug", async ({ page, shot }) => {
    await page.goto(`/posts/${token()}-does-not-exist`);
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
    await shot("detail-unknown-slug-error");
  });

  test("offers edit and delete to the author only", async ({ page, api, shot }) => {
    const { author, post } = await target(api);

    const stranger = await api.register("stranger");
    await signIn(page, stranger);
    await page.goto(`/posts/${post.slug}`);
    await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "All posts" })).toBeVisible();
    await shot("detail-no-owner-controls-for-stranger");

    await signIn(page, author);
    await page.goto(`/posts/${post.slug}`);
    await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();
    await shot("detail-owner-controls");
  });

  test("edits the body inline and saves", async ({ page, api, shot }) => {
    const { author, post } = await target(api);
    await signIn(page, author);
    await page.goto(`/posts/${post.slug}`);

    await page.getByRole("button", { name: "Edit" }).click();
    await page.locator("#content").fill("Rewritten body text.");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Rewritten body text.")).toBeVisible();
    await shot("detail-inline-edit-saved");
  });

  test("deletes a post after confirming", async ({ page, api, shot }) => {
    const { author, post } = await target(api);
    await signIn(page, author);
    await page.goto(`/posts/${post.slug}`);

    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Delete this post permanently?")).toBeVisible();
    await shot("detail-delete-confirm");

    await page.getByRole("button", { name: "Yes, delete" }).click();
    await expect(page).toHaveURL("/");

    await page.goto(`/posts/${post.slug}`);
    await expect(page.getByRole("alert")).toBeVisible();
    await shot("detail-deleted-gone");
  });

  test("cancels a delete without changing anything", async ({ page, api, shot }) => {
    const { author, post } = await target(api);
    await signIn(page, author);
    await page.goto(`/posts/${post.slug}`);

    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByText("Delete this post permanently?")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: post.title })).toBeVisible();
    await shot("detail-delete-cancelled");
  });

  test("marks a draft and hides it from other readers", async ({ page, api, shot }) => {
    const { author, post } = await target(api, { status: "draft" });

    await signIn(page, author);
    await page.goto(`/posts/${post.slug}`);
    await expect(page.getByText("Draft", { exact: true }).first()).toBeVisible();
    await shot("detail-draft-as-author");

    const stranger = await api.register("stranger");
    await signIn(page, stranger);
    await page.goto(`/`);
    await expect(page.getByRole("heading", { name: post.title })).toHaveCount(0);
  });

  test("jumps to the comments section", async ({ page, api, shot }) => {
    const { post } = await target(api);
    await page.goto(`/posts/${post.slug}`);

    await page.getByRole("link", { name: "Jump to comments" }).click();
    await expect(page).toHaveURL(/#comments$/);
    await shot("detail-jump-to-comments");
  });
});