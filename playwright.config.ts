import { defineConfig } from "@playwright/test";

/**
 * Runs against a production build (`pnpm build && pnpm start`, port 3100) on a freshly seeded DB
 * (`pnpm db:reset`). Uses your installed Chrome, so no browser download is needed.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://localhost:3100", channel: "chrome", trace: "retain-on-failure" },
  webServer: { command: "pnpm start", url: "http://localhost:3100", reuseExistingServer: true, timeout: 60_000 },
});
