import { test, expect, PASSWORD, signIn } from "./fixtures";

const token = () => `vq${Math.random().toString(36).slice(2, 9)}`;

async function target(api, { title, status = "published" } = {}) {
  const author = await api.register("author");
  const category = await api.createCategory(`Vote ${token()}`, author);
  const post = await api.createPost(author, {
    title: title ?? `Vote target ${token()}`,
    category: category.id,
    status,
  });
  return { author, post };
}

test.describe("Voting", () => {
  test("upvotes a post and updates the score", async ({ page, api, shot }) => {
    const { post } = await target(api);
    const voter = await api.register("voter");
    await signIn(page, voter);
    await page.goto(`/posts/${post.slug}`);

    await expect(page.getByTestId("vote-score")).toHaveText("0");
    await page.getByRole("button", { name: "Upvote" }).click();

    await expect(page.getByTestId("vote-score")).toHaveText("1");
    await expect(page.getByRole("button", { name: "Upvote" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await shot("voting-upvote");
  });

  test("switches from an upvote to a downvote", async ({ page, api, shot }) => {
    const { post } = await target(api);
    const voter = await api.register("voter");
    await signIn(page, voter);
    await page.goto(`/posts/${post.slug}`);

    await page.getByRole("button", { name: "Upvote" }).click();
    await expect(page.getByTestId("vote-score")).toHaveText("1");

    await page.getByRole("button", { name: "Downvote" }).click();
    await expect(page.getByTestId("vote-score")).toHaveText("-1");
    await expect(page.getByRole("button", { name: "Upvote" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await shot("voting-switch-to-downvote");
  });

  test("clears the vote when the same button is clicked twice", async ({ page, api, shot }) => {
    const { post } = await target(api);
    const voter = await api.register("voter");
    await signIn(page, voter);
    await page.goto(`/posts/${post.slug}`);

    await page.getByRole("button", { name: "Upvote" }).click();
    await expect(page.getByTestId("vote-score")).toHaveText("1");

    await page.getByRole("button", { name: "Upvote" }).click();
    await expect(page.getByTestId("vote-score")).toHaveText("0");
    await expect(page.getByRole("button", { name: "Upvote" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await shot("voting-cleared-by-repeat-click");
  });

  test("keeps the vote after a reload", async ({ page, api, shot }) => {
    const { post } = await target(api);
    const voter = await api.register("voter");
    await signIn(page, voter);
    await page.goto(`/posts/${post.slug}`);

    await page.getByRole("button", { name: "Downvote" }).click();
    await expect(page.getByTestId("vote-score")).toHaveText("-1");

    await page.reload();
    await expect(page.getByTestId("vote-score")).toHaveText("-1");
    await expect(page.getByRole("button", { name: "Downvote" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await shot("voting-persists-after-reload");
  });

  test("sends an anonymous voter to login and back", async ({ page, api, shot }) => {
    const { post } = await target(api);
    await page.goto(`/posts/${post.slug}`);

    await page.getByRole("button", { name: "Upvote" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/login\\?returnTo=${encodeURIComponent(`/posts/${post.slug}`)}`),
    );
    await shot("voting-anonymous-redirected-to-login");

    const voter = await api.register("voter");
    await page.getByLabel("Email").fill(voter.email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(`/posts/${post.slug}`);
    await shot("voting-returns-after-login");
  });

  test("refuses to vote on a draft", async ({ page, api, shot }) => {
    const { author, post } = await target(api, { status: "draft", title: `Draft ${token()}` });
    await signIn(page, author);
    await page.goto(`/posts/${post.slug}`);

    await expect(page.getByRole("button", { name: "Upvote" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Downvote" })).toBeDisabled();
    await shot("voting-disabled-on-draft");
  });

  test("shows the score on the home page card", async ({ page, api, shot }) => {
    const { post } = await target(api);
    const voter = await api.register("voter");
    await api.vote(voter, post.slug, 1);

    await page.goto("/");
    const card = page.getByRole("article").filter({ hasText: post.title });
    await expect(card.getByTestId("vote-score").first()).toHaveText("1");
    await shot("voting-score-on-home-card");
  });
});