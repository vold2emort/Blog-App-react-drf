import { test, expect, PASSWORD, signIn } from "./fixtures";

const token = () => `cq${Math.random().toString(36).slice(2, 9)}`;

async function target(api) {
  const author = await api.register("author");
  const category = await api.createCategory(`Cmt ${token()}`, author.access);
  const post = await api.createPost(author, {
    title: `Comment target ${token()}`,
    category: category.id,
  });
  return { author, post };
}

const fillComment = async (page, text) => {
  const box = page.getByRole("textbox", { name: "Add a comment" });
  await box.fill(text);
};

test.describe("Comments", () => {
  test("shows an empty state when there are no comments", async ({ page, api, shot }) => {
    const { post } = await target(api);
    const user = await api.register("reader");
    await signIn(page, user);
    await page.goto(`/posts/${post.slug}`);

    await expect(page.getByText("No comments yet")).toBeVisible();
    await expect(page.getByRole("button", { name: "Post Comment" })).toBeDisabled();
    await shot("comments-empty-state");
  });

  test("posts a top-level comment", async ({ page, api, shot }) => {
    const { post } = await target(api);
    const user = await api.register("commenter");
    await signIn(page, user);
    await page.goto(`/posts/${post.slug}`);

    await fillComment(page, "First! **Bold** opinion.");
    await expect(page.getByRole("button", { name: "Post Comment" })).toBeEnabled();
    await page.getByRole("button", { name: "Post Comment" }).click();

    await expect(page.getByText("First!", { exact: false })).toBeVisible();
    await expect(page.getByRole("strong").filter({ hasText: "Bold" })).toBeVisible();
    await shot("comments-posted");
  });

  test("nests a reply under its parent", async ({ page, api, shot }) => {
    const { post } = await target(api);
    const user = await api.register("replier");
    await signIn(page, user);
    await page.goto(`/posts/${post.slug}`);

    await fillComment(page, "Parent comment");
    await page.getByRole("button", { name: "Post Comment" }).click();
    await expect(page.getByText("Parent comment")).toBeVisible();

    await page.getByRole("button", { name: "Reply" }).first().click();
    await page.getByRole("textbox", { name: "Reply" }).fill("Nested reply");
    await page.getByRole("button", { name: "Post Reply" }).click();

    await expect(page.getByText("Nested reply")).toBeVisible();
    await shot("comments-nested-reply");
  });

  test("badges comments written by the post author", async ({ page, api, shot }) => {
    const { author, post } = await target(api);
    await signIn(page, author);
    await page.goto(`/posts/${post.slug}`);

    await fillComment(page, "Written by the author");
    await page.getByRole("button", { name: "Post Comment" }).click();

    await expect(page.getByText("Author", { exact: true })).toBeVisible();
    await shot("comments-author-badge");
  });

  test("edits your own comment", async ({ page, api, shot }) => {
    const { post } = await target(api);
    const user = await api.register("editor");
    await signIn(page, user);
    await page.goto(`/posts/${post.slug}`);

    await fillComment(page, "Original text");
    await page.getByRole("button", { name: "Post Comment" }).click();
    await expect(page.getByText("Original text")).toBeVisible();

    await page.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Edit comment").fill("Edited text");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Edited text")).toBeVisible();
    await expect(page.getByText("Original text")).toHaveCount(0);
    await shot("comments-edited");
  });

  test("soft-deletes a comment but keeps its replies", async ({ page, api, shot }) => {
    const { post } = await target(api);
    const parent = await api.register("parent");
    const replier = await api.register("replier");
    const parentComment = await api.createComment(parent, post.slug, "I will be deleted");
    await api.createComment(replier, post.slug, "Reply survives", parentComment.id);

    await signIn(page, parent);
    await page.goto(`/posts/${post.slug}`);

    await expect(page.getByText("I will be deleted")).toBeVisible();
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Delete this comment?")).toBeVisible();
    await page.getByRole("button", { name: "Yes, delete" }).click();

    await expect(page.getByText("[deleted]")).toBeVisible();
    await expect(page.getByText("Reply survives")).toBeVisible();
    await shot("comments-deleted-tombstone");
  });

  test("updates the comment count in the header", async ({ page, api, shot }) => {
    const { post } = await target(api);
    const user = await api.register("counter");
    await signIn(page, user);
    await page.goto(`/posts/${post.slug}`);

    await expect(page.getByText("0 comments")).toBeVisible();
    await fillComment(page, "Counted");
    await page.getByRole("button", { name: "Post Comment" }).click();

    await expect(page.locator("#comments").getByText("1 comment")).toBeVisible();
    await shot("comments-count-updated");
  });

  test("asks an anonymous visitor to log in", async ({ page, api, shot }) => {
    const { post } = await target(api);
    await page.goto(`/posts/${post.slug}`);

    await expect(page.getByText("Log in to leave a comment.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Log In" })).toBeVisible();
    await shot("comments-anonymous-prompt");
  });

  test("returns an anonymous visitor to the post after logging in", async ({
    page,
    api,
    shot,
  }) => {
    const { post } = await target(api);
    await page.goto(`/posts/${post.slug}`);
    await page.getByRole("button", { name: "Log In" }).click();

    await expect(page).toHaveURL(
      new RegExp(`/login\\?returnTo=${encodeURIComponent(`/posts/${post.slug}`)}`),
    );
    const user = await api.register("commenter");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(`/posts/${post.slug}`);
    await expect(page.getByRole("textbox", { name: "Add a comment" })).toBeVisible();
    await shot("comments-after-login");
  });

  test("hides edit and delete on someone else's comment", async ({ page, api, shot }) => {
    const { post } = await target(api);
    const other = await api.register("other");
    await api.createComment(other, post.slug, "Not yours");

    const viewer = await api.register("viewer");
    await signIn(page, viewer);
    await page.goto(`/posts/${post.slug}`);

    await expect(page.getByText("Not yours")).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
    await shot("comments-no-edit-on-others");
  });
});