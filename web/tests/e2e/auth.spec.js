import { test, expect, PASSWORD, runEmail, signIn } from "./fixtures";

const stamp = () => `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;

test.describe("Registration", () => {
  test("creates an account and signs the user in automatically", async ({ page, shot }) => {
    const user_name = `newcomer${stamp().slice(-6)}`;
    await page.goto("/register");

    await page.getByLabel("Username").fill(user_name);
    await page.getByLabel("Email").fill(`${runEmail("new")}`);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Confirm password").fill(PASSWORD);
    await shot("auth-register-filled");

    await page.getByRole("button", { name: "Register" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("navigation", { name: "Primary" }).first()).toContainText(
      "My Posts",
    );
    await expect(page.getByRole("button", { name: "Log Out" })).toBeVisible();
    await shot("auth-register-success");
  });

  test("rejects an email that is already registered", async ({ page, api, shot }) => {
    const existing = await api.register("dupe");
    await page.goto("/register");

    await page.getByLabel("Username").fill(`other${stamp().slice(-6)}`);
    await page.getByLabel("Email").fill(existing.email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Confirm password").fill(PASSWORD);
    await page.getByRole("button", { name: "Register" }).click();

    await expect(page.locator("#email-error")).toBeVisible();
    await expect(page).toHaveURL("/register");
    await shot("auth-register-duplicate-email-failure");
  });

  test("rejects a username that is already taken", async ({ page, api, shot }) => {
    const existing = await api.register("dupe");
    await page.goto("/register");

    await page.getByLabel("Username").fill(existing.user_name);
    await page.getByLabel("Email").fill(`${runEmail("fresh")}`);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Confirm password").fill(PASSWORD);
    await page.getByRole("button", { name: "Register" }).click();

    await expect(page.locator("#user_name-error")).toBeVisible();
    await shot("auth-register-duplicate-username-failure");
  });

  test("rejects a password shorter than eight characters", async ({ page, shot }) => {
    await page.goto("/register");

    await page.getByLabel("Username").fill(`shorty${stamp().slice(-6)}`);
    await page.getByLabel("Email").fill(`${runEmail("short")}`);
    await page.getByLabel("Password", { exact: true }).fill("Ab3!xy");
    await page.getByLabel("Confirm password").fill("Ab3!xy");
    await page.getByRole("button", { name: "Register" }).click();

    await expect(page.locator("#password-error")).toContainText("8");
    await shot("auth-register-short-password-failure");
  });

  test("rejects a confirmation that does not match", async ({ page, shot }) => {
    await page.goto("/register");

    await page.getByLabel("Username").fill(`mismatch${stamp().slice(-6)}`);
    await page.getByLabel("Email").fill(`${runEmail("mm")}`);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Confirm password").fill("Totally-Different-9!");
    await page.getByRole("button", { name: "Register" }).click();

    await expect(page.locator("#password_confirm-error")).toBeVisible();
    await shot("auth-register-password-mismatch-failure");
  });

  test("blocks submission when required fields are empty", async ({ page, shot }) => {
    await page.goto("/register");
    await page.getByRole("button", { name: "Register" }).click();

    await expect(page.locator("#user_name-error")).toBeVisible();
    await expect(page.locator("#password-error")).toBeVisible();
    await expect(page).toHaveURL("/register");
    await shot("auth-register-empty-form-failure");
  });
});

test.describe("Login", () => {
  test("signs in with valid credentials", async ({ page, api, shot }) => {
    const user = await api.register("login");
    await page.goto("/login");

    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await shot("auth-login-filled");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("button", { name: "Log Out" })).toBeVisible();
    await shot("auth-login-success");
  });

  test("shows an error for a wrong password", async ({ page, api, shot }) => {
    const user = await api.register("badpw");
    await page.goto("/login");

    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill("Wr0ng-Password!");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page.getByText(/no active account|credentials|invalid/i)).toBeVisible();
    await expect(page).toHaveURL("/login");
    await shot("auth-login-wrong-password-failure");
  });

  test("returns the user to the page they came from", async ({ page, api, shot }) => {
    const user = await api.register("returnto");
    await page.goto("/posts/new");
    await expect(page).toHaveURL(/\/login\?returnTo=/);

    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await shot("auth-login-returnto-guard");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL("/posts/new");
    await expect(page.getByRole("heading", { name: "New post" })).toBeVisible();
    await shot("auth-login-returnto-success");
  });

  test("signs the user out and clears the session", async ({ page, api, shot }) => {
    const user = await api.register("signout");
    await signIn(page, user);
    await page.goto("/");

    await page.getByRole("button", { name: "Log Out" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("link", { name: "Log In" }).first()).toBeVisible();
    const cookies = await page.context().cookies();
    const names = cookies.map((cookie) => cookie.name);
    expect(names).not.toContain("access_token");
    expect(names).not.toContain("refresh_token");
    const stored = await page.evaluate(() =>
      Object.keys({ ...window.localStorage }).filter((key) => key.startsWith("blog:")),
    );
    expect(stored).not.toContain("blog:access");
    expect(stored).not.toContain("blog:refresh");
    await shot("auth-logout-success");
  });
});

test.describe("Protected routes", () => {
  for (const [path, expected] of [
    ["/me", "/me"],
    ["/posts/new", "/posts/new"],
  ]) {
    test(`redirects an anonymous visitor from ${path} to login and back`, async ({
      page,
      api,
      shot,
    }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/login\\?returnTo=${encodeURIComponent(expected)}`));
      await shot(`auth-guard-${path.replace(/\//g, "_")}`);

      const user = await api.register("guard");
      await page.getByLabel("Email").fill(user.email);
      await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
      await page.getByRole("button", { name: "Log in" }).click();

      await expect(page).toHaveURL(expected);
    });
  }
});