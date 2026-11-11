import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "e2e",
  testMatch: "speaking-roles-or-cleaning.spec.ts",
  timeout: 180000,
  expect: { timeout: 25000 },
  workers: 2,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3502",
    screenshot: "only-on-failure",
    channel: "chrome",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 900 } } },
    { name: "phone", use: { ...devices["iPhone 15"], browserName: "chromium" } },
  ],
});
