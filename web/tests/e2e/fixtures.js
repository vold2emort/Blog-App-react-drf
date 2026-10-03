import { test as base, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const RUN_ID = process.env.PW_RUN_ID;
const DJANGO = "http://127.0.0.1:8000";

export const PASSWORD = "Str0ng-Passw0rd!pw";
const SCREENSHOT_ROOT = path.resolve(import.meta.dirname, "../../screenshots");

let counter = 0;
// Playwright starts a fresh worker per spec file, which reloads this module and
// resets `counter`. The salt keeps ids unique across those module reloads.
const SALT = Math.random().toString(36).slice(2, 6);
const CATEGORY_PREFIX = "PWTest ";
const tag = (label) =>
  `${RUN_ID}-${String(label).toLowerCase()}-${SALT}-${(counter += 1)}`;

async function json(res, what) {
  const text = await res.text();
  if (!res.ok()) {
    throw new Error(`${what} failed -> ${res.status()}: ${text.slice(0, 400)}`);
  }
  return text ? JSON.parse(text) : null;
}

async function register(request, label = "user") {
  const t = tag(label);
  const email = `pwtest+${t}@example.test`;
  // user_name is capped at 24 characters, which is too short to carry the run
  // id, label, salt and counter — the tail was being truncated away, making
  // unrelated users collide. Lead with the parts that make it unique.
  const user_name = `pw${SALT}${(counter += 1)}`;
  const body = await json(
    await request.post(`${DJANGO}/api/user/register/`, {
      data: { email, user_name, password: PASSWORD, password_confirm: PASSWORD },
    }),
    `register ${email}`,
  );
  return { ...body, email, user_name, password: PASSWORD };
}

async function login(request, email, password = PASSWORD) {
  const body = await json(
    await request.post(`${DJANGO}/api/auth/login/`, { data: { email, password } }),
    `login ${email}`,
  );
  return { ...body, email, password };
}

// Categories have no run id of their own, so they are tagged by name. Without
// this they outlive the run: deleting a test user cascades their posts but
// leaves the category behind.
async function createCategory(request, name, auth) {
  return json(
    await request.post(`${DJANGO}/api/categories/`, {
      headers: auth ? { Authorization: `Bearer ${auth}` } : undefined,
      data: { name: `${CATEGORY_PREFIX}${name}` },
    }),
    `create category ${name}`,
  );
}

/** Name a category so teardown recognises it, however it was created. */
export function testCategoryName(label) {
  return `${CATEGORY_PREFIX}${label}`;
}

/** An address that teardown will recognise as belonging to this run. */
export function runEmail(label) {
  return `pwtest+${RUN_ID}-${label}@example.test`;
}

async function createPost(request, user, { title, category, status = "published", content, excerpt }) {
  return json(
    await request.post(`${DJANGO}/api/posts/`, {
      headers: { Authorization: `Bearer ${user.access}` },
      data: {
        title,
        content: content ?? `# ${title}\n\nSeeded body for **${title}**.`,
        category,
        status,
        ...(excerpt ? { excerpt } : {}),
      },
    }),
    `create post ${title}`,
  );
}

async function createComment(request, user, slug, content, parent = null) {
  return json(
    await request.post(`${DJANGO}/api/posts/${slug}/comments/`, {
      headers: { Authorization: `Bearer ${user.access}` },
      data: { content, ...(parent ? { parent } : {}) },
    }),
    `create comment on ${slug}`,
  );
}

async function vote(request, user, slug, value) {
  return json(
    await request.post(`${DJANGO}/api/posts/${slug}/vote/`, {
      headers: { Authorization: `Bearer ${user.access}` },
      data: { value },
    }),
    `vote ${value} on ${slug}`,
  );
}

/**
 * Set the session for the app origin. Written straight into localStorage rather
 * than via addInitScript: init scripts accumulate for the life of the page, so
 * signing in twice in one test replayed both and the first identity won.
 */
export async function signIn(page, user) {
  await page.goto("/");
  await page.evaluate(
    ([access, refresh]) => {
      localStorage.setItem("blog:access", access);
      localStorage.setItem("blog:refresh", refresh);
    },
    [user.access, user.refresh],
  );
}

export async function signOut(page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
}

export const test = base.extend({
  api: async ({ request }, use) => {
    await use({
      request,
      register: (label) => register(request, label),
      login: (email, password) => login(request, email, password),
      createCategory: (name, auth) => createCategory(request, name, auth),
      createPost: (user, options) => createPost(request, user, options),
      createComment: (user, slug, content, parent) =>
        createComment(request, user, slug, content, parent),
      vote: (user, slug, value) => vote(request, user, slug, value),
      json: (response, what) => json(response, what),
    });
  },

  shot: async ({ page }, use, testInfo) => {
    const dir = path.join(SCREENSHOT_ROOT, testInfo.project.name);
    await use(async (name) => {
      fs.mkdirSync(dir, { recursive: true });
      await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
      return path.join(dir, `${name}.png`);
    });
  },
});

export { DJANGO, expect };