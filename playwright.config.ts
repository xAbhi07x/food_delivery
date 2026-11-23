import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

// Lets the test process (provisioning helpers) read the same local settings as the app.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const isCI = !!process.env.CI;
const port = 3000;

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "on-first-retry",
  },
  // Customer and rider interfaces are mobile-first (SRS §9.3).
  projects: [{ name: "mobile-chromium", use: { ...devices["Pixel 7"] } }],
  webServer: {
    // CI serves the production build created by an earlier step.
    command: isCI
      ? `npm run start -- --hostname 127.0.0.1 --port ${port}`
      : `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}/api/health`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
