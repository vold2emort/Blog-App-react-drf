import { test, expect } from "./fixtures";

test.describe("Theme", () => {
  test("starts light for a first-time visitor", async ({ page, shot }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.getByRole("button", { name: "Switch to dark theme" })).toBeVisible();
    await shot("theme-default-light");
  });

  test("switches to dark and back to light", async ({ page, shot }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();
    await shot("theme-dark");

    await page.getByRole("button", { name: "Switch to light theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await shot("theme-back-to-light");
  });

  test("persists the chosen theme across a reload", async ({ page, shot }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();
    await shot("theme-persists-after-reload");
  });

  test("applies the persisted theme before first paint", async ({ page }) => {
    const html = await (await page.request.get("/")).text();
    expect(html).toContain("blog:theme");
    expect(html).toMatch(/data-theme/);
  });

  test("falls back to light when the stored theme is cleared", async ({ page, shot }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.evaluate(() => localStorage.removeItem("blog:theme"));
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await shot("theme-cleared-falls-back-to-light");
  });

  test("honours an explicit dark preference set before the app boots", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("blog:theme", "dark"));
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});