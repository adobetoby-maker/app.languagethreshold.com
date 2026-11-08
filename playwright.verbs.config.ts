import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "e2e",
  testMatch: "verbs-hub.spec.ts",
  timeout: 90000,
  expect: { timeout: 20000 },
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3499",
    screenshot: "only-on-failure",
    actionTimeout: 15000,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 900 } } },
    { name: "phone", use: { ...devices["iPhone 15"], browserName: "chromium" } },
  ],
});
