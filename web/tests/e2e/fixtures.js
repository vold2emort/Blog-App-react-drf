import { test as base, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const RUN_ID = process.env.PW_RUN_ID;
const DJANGO = "http://127.0.0.1:8000";
const APP_ORIGIN = "http://localhost:5173";

export const PASSWORD = "Str0ng-Passw0rd!pw";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";
export const CSRF_COOKIE = "csrftoken";
const AUTH_COOKIES = [ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE];

const SCREENSHOT_ROOT = path.resolve(import.meta.dirname, "../../screenshots");

let counter = 0;
// Playwright starts a fresh worker per spec file, which reloads this module and
// resets `counter`. The salt keeps ids unique across those module reloads.
const SALT = Math.random().toString(36).slice(2, 6);
const CATEGORY_PREFIX = "PWTest ";
const tag = (label) =>
  `${RUN_ID}-${String(label).toLowerCase()}-${SALT}-${(counter += 1)}`;

async function json(result, what) {
  if (!result.ok) {
    throw new Error(`${what} failed -> ${result.status}: ${result.text.slice(0, 400)}`);
  }
  return result.text ? JSON.parse(result.text) : null;
}

/**
 * Harvest the auth cookies from a response's Set-Cookie headers.
 *
 * Tokens are no longer returned in the response body, so seeding has to read
 * them off the wire and replay them by hand: a single Playwright context holds
 * one cookie jar, but a test may seed as several different users.
 */
function captureCookies(response) {
  const jar = {};
  for (const { name, value } of response.headersArray()) {
    if (name.toLowerCase() !== "set-cookie") continue;
    // Tolerate headers that arrive comma-joined. A cookie's own value never
    // looks like ", <key>=", and neither does the "21 Oct 2026" of an Expires.
    for (const chunk of value.split(/,\s*(?=[A-Za-z0-9_-]+=)/)) {
      const eq = chunk.indexOf("=");
      if (eq < 0) continue;
      const key = chunk.slice(0, eq).trim();
      if (AUTH_COOKIES.includes(key)) {
        jar[key] = chunk.slice(eq + 1).split(";")[0].trim();
      }
    }
  }
  return jar;
}

/**
 * Headers that reproduce a session. The CSRF cookie must travel *and* be echoed
 * in the header, because Django compares the two.
 *
 * Origin is the app's real origin rather than the address being seeded: these
 * requests skip the Vite proxy, so Django is relying on CSRF_TRUSTED_ORIGINS to
 * accept a cross-origin write.
 */
function authHeaders(cookies) {
  const sent = AUTH_COOKIES.filter((key) => cookies[key]);
  return {
    cookie: sent.map((key) => `${key}=${cookies[key]}`).join("; "),
    "X-CSRFToken": cookies[CSRF_COOKIE],
    origin: APP_ORIGIN,
  };
}

/**
 * Send one request on a throwaway context.
 *
 * A shared context would accumulate one cookie jar, which cannot hold two users
 * at once and would also merge its own cookies with the explicit Cookie header.
 * A fresh context per request makes the session headers the single source.
 */
async function send(playwright, method, url, { headers, data } = {}) {
  const context = await playwright.request.newContext();
  try {
    const response = await context[method](`${DJANGO}${url}`, { headers, data });
    return {
      ok: response.ok(),
      status: response.status(),
      text: await response.text(),
      cookies: captureCookies(response),
    };
  } finally {
    await context.dispose();
  }
}

async function bootstrapCsrf(playwright) {
  const res = await send(playwright, "get", "/api/auth/csrf/");
  await json(res, "csrf");
  return res.cookies;
}

async function register(playwright, label = "user") {
  const t = tag(label);
  const email = `pwtest+${t}@example.test`;
  // user_name is capped at 24 characters, which is too short to carry the run
  // id, label, salt and counter — the tail was being truncated away, making
  // unrelated users collide. Lead with the parts that make it unique.
  const user_name = `pw${SALT}${(counter += 1)}`;
  const csrf = await bootstrapCsrf(playwright);
  const res = await send(playwright, "post", "/api/user/register/", {
    headers: authHeaders(csrf),
    data: { email, user_name, password: PASSWORD, password_confirm: PASSWORD },
  });
  const body = await json(res, `register ${email}`);
  // Django only re-sends csrftoken when it rotates, so on a successful write the
  // CSRF cookie is absent here and has to be carried over from the bootstrap.
  return { ...body, email, user_name, password: PASSWORD, cookies: { ...csrf, ...res.cookies } };
}

async function login(playwright, email, password = PASSWORD) {
  const csrf = await bootstrapCsrf(playwright);
  const res = await send(playwright, "post", "/api/auth/login/", {
    headers: authHeaders(csrf),
    data: { email, password },
  });
  await json(res, `login ${email}`);
  return { email, password, cookies: { ...csrf, ...res.cookies } };
}

// Categories have no run id of their own, so they are tagged by name. Without
// this they outlive the run: deleting a test user cascades their posts but
// leaves the category behind.
async function createCategory(playwright, name, user) {
  return json(
    await send(playwright, "post", "/api/categories/", {
      headers: authHeaders(user.cookies),
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

async function createPost(playwright, user, { title, category, status = "published", content, excerpt }) {
  return json(
    await send(playwright, "post", "/api/posts/", {
      headers: authHeaders(user.cookies),
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

async function createComment(playwright, user, slug, content, parent = null) {
  return json(
    await send(playwright, "post", `/api/posts/${slug}/comments/`, {
      headers: authHeaders(user.cookies),
      data: { content, ...(parent ? { parent } : {}) },
    }),
    `create comment on ${slug}`,
  );
}

async function vote(playwright, user, slug, value) {
  return json(
    await send(playwright, "post", `/api/posts/${slug}/vote/`, {
      headers: authHeaders(user.cookies),
      data: { value },
    }),
    `vote ${value} on ${slug}`,
  );
}

function toBrowserCookie(name, value) {
  return {
    name,
    value,
    url: APP_ORIGIN,
    httpOnly: name !== CSRF_COOKIE,
    sameSite: "Lax",
  };
}

/** Install a session's cookies into the browser, then load the app. */
export async function signIn(page, user) {
  const cookies = AUTH_COOKIES.filter((name) => user.cookies[name]).map((name) =>
    toBrowserCookie(name, user.cookies[name]),
  );
  await page.context().addCookies(cookies);
  await page.goto("/");
}

/** Drop the session, leaving any localStorage preferences alone. */
export async function signOut(page) {
  await page.context().clearCookies();
  await page.goto("/");
}

/** Replace one cookie of the live session, to simulate an expired token. */
export async function corruptCookie(page, name, value) {
  await page.context().addCookies([toBrowserCookie(name, value)]);
}

export const test = base.extend({
  api: async ({ playwright }, use) => {
    await use({
      playwright,
      register: (label) => register(playwright, label),
      login: (email, password) => login(playwright, email, password),
      createCategory: (name, user) => createCategory(playwright, name, user),
      createPost: (user, options) => createPost(playwright, user, options),
      createComment: (user, slug, content, parent) =>
        createComment(playwright, user, slug, content, parent),
      vote: (user, slug, value) => vote(playwright, user, slug, value),
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