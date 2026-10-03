import { test, expect, signIn, testCategoryName } from "./fixtures";

const token = () => `fq${Math.random().toString(36).slice(2, 9)}`;

test.describe("Creating a post", () => {
  test("publishes a post and lands on it", async ({ page, api, shot }) => {
    const author = await api.register("author");
    await signIn(page, author);
    const title = `Fresh post ${token()}`;
    await page.goto("/posts/new");

    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Excerpt").fill("One line excerpt.");
    await page.getByLabel("Content").fill("## Section\n\nSome body text.");
    await page.getByLabel("Category").selectOption({ index: 1 });
    await shot("form-filled");

    await page.getByRole("button", { name: "Publish post" }).click();

    await expect(page).toHaveURL(/\/posts\//);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Section" })).toBeVisible();
    await shot("form-published");
  });

  test("saves a draft and shows the draft badge", async ({ page, api, shot }) => {
    const author = await api.register("author");
    await signIn(page, author);
    const title = `Draft post ${token()}`;
    await page.goto("/posts/new");

    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Content").fill("Private notes.");
    await page.getByLabel("Category").selectOption({ index: 1 });
    await page.getByLabel("Status").selectOption("draft");
    await page.getByRole("button", { name: "Publish post" }).click();

    await expect(page).toHaveURL(/\/posts\//);
    await expect(page.getByText("Draft", { exact: true }).first()).toBeVisible();
    await shot("form-saved-draft");
  });

  test("toggles a markdown preview", async ({ page, api, shot }) => {
    const author = await api.register("author");
    await signIn(page, author);
    await page.goto("/posts/new");

    await page.getByLabel("Content").fill("**Previewed** text");
    await page.getByRole("button", { name: "Preview" }).click();

    await expect(page.getByRole("strong").filter({ hasText: "Previewed" })).toBeVisible();
    await expect(page.getByText("Nothing to preview yet.")).toHaveCount(0);
    await shot("form-preview-mode");

    await page.getByRole("button", { name: "Write" }).click();
    await expect(page.getByRole("textbox", { name: "Content" })).toBeVisible();
  });

  test("shows an empty preview before anything is typed", async ({ page, api, shot }) => {
    const author = await api.register("author");
    await signIn(page, author);
    await page.goto("/posts/new");

    await page.getByRole("button", { name: "Preview" }).click();
    await expect(page.getByText("Nothing to preview yet.")).toBeVisible();
    await shot("form-empty-preview");
  });

  test("creates a category from the form", async ({ page, api, shot }) => {
    const author = await api.register("author");
    await signIn(page, author);
    const name = testCategoryName(`Fresh cat ${token()}`);
    await page.goto("/posts/new");

    await page.getByRole("button", { name: "+ New category" }).click();
    await page.getByLabel("New category").fill(name);
    await shot("form-new-category-open");

    await page.getByRole("button", { name: "Add", exact: true }).click();
    // The model title-cases on save, so compare without case sensitivity.
    await expect(page.getByRole("combobox", { name: "Category" })).toContainText(
      new RegExp(name, "i"),
    );

    await page.getByLabel("Title").fill(`Post in ${token()}`);
    await page.getByLabel("Content").fill("Body.");
    await page.getByRole("button", { name: "Publish post" }).click();
    await expect(page).toHaveURL(/\/posts\//);

    await page.goto("/categories");
    await expect(page.getByRole("link", { name: new RegExp(name, "i") })).toBeVisible();
    await shot("form-category-created");
  });

  test("blocks submission and shows field errors", async ({ page, api, shot }) => {
    const author = await api.register("author");
    await signIn(page, author);
    await page.goto("/posts/new");

    await page.getByRole("button", { name: "Publish post" }).click();

    await expect(page.locator("#title-error")).toBeVisible();
    await expect(page.locator("#content-error")).toBeVisible();
    await expect(page).toHaveURL("/posts/new");
    await shot("form-validation-errors");
  });

  test("reuses the existing category when the name already exists", async ({ page, api, shot }) => {
    const author = await api.register("author");
    await signIn(page, author);
    const existing = await api.createCategory(`Dup ${token()}`, author);
    await page.goto("/posts/new");

    await page.getByRole("button", { name: "+ New category" }).click();
    await page.getByLabel("New category").fill(existing.name);
    await shot("form-duplicate-category-error");

    // The API treats create as idempotent: 201 with the existing row, so no
    // second category appears and the dropdown selects the one we already had.
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("combobox", { name: "Category" })).toContainText(existing.name);
  });
});

test.describe("Editing a post", () => {
  test("sends a non-owner back to the post", async ({ page, api, shot }) => {
    const owner = await api.register("owner");
    const category = await api.createCategory(`Edit ${token()}`, owner);
    const post = await api.createPost(owner, {
      title: `Owned ${token()}`,
      category: category.id,
    });

    const stranger = await api.register("stranger");
    await signIn(page, stranger);
    await page.goto(`/posts/${post.slug}/edit`);

    await expect(page).toHaveURL(`/posts/${post.slug}`);
    await shot("form-edit-non-owner-redirected");
  });

  test("updates the title from the edit form", async ({ page, api, shot }) => {
    const owner = await api.register("owner");
    const category = await api.createCategory(`Edit ${token()}`, owner);
    const post = await api.createPost(owner, {
      title: `Before ${token()}`,
      category: category.id,
    });
    const renamed = `After ${token()}`;

    await signIn(page, owner);
    await page.goto(`/posts/${post.slug}/edit`);
    await expect(page.getByLabel("Title")).toHaveValue(post.title);

    await page.getByLabel("Title").fill(renamed);
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("heading", { name: renamed })).toBeVisible();
    await shot("form-edit-saved");
  });
});