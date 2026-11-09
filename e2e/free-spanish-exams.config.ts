import { defineConfig, devices } from "@playwright/test";

// Guest-only flow: no authentication setup or real exam sessions.
export default defineConfig({
  testDir: ".",
  testMatch: "free-spanish-exams.spec.ts",
  timeout: 120_000,
  workers: 1,
  expect: { timeout: 30_000 },
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3478" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "phone", use: { ...devices["iPhone 13"], browserName: "chromium" } },
  ],
});
