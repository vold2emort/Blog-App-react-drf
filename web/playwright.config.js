import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

process.env.PW_RUN_ID ||= `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const API_ROOT = path.resolve(import.meta.dirname, "../api");
const DJANGO = "http://127.0.0.1:8000";
const VITE = "http://localhost:5173";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  globalTeardown: "./tests/e2e/global-teardown.js",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: VITE,
    screenshot: "on",
    trace: "on-first-retry",
    video: "off",
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: "desktop",
      testIgnore: /responsive\.spec\.js/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      testMatch: /responsive\.spec\.js/,
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: [
    {
      command: "python manage.py runserver 8000 --noreload",
      cwd: API_ROOT,
      url: `${DJANGO}/api/posts/`,
      reuseExistingServer: true,
      timeout: 60_000,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      command: "pnpm dev",
      cwd: import.meta.dirname,
      url: VITE,
      reuseExistingServer: true,
      timeout: 60_000,
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
});
