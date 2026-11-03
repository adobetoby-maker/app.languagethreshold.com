import { defineConfig, devices } from "@playwright/test";
const { defaultBrowserType: _browser, ...phone } = devices["iPhone 15"];
export default defineConfig({
  testDir: "e2e",
  testMatch: "module-placement.spec.ts",
  timeout: 120_000,
  expect: { timeout: 30_000 },
  workers: 2,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3467",
    channel: "chrome",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    {
      name: "phone",
      use: {
        ...phone,
        browserName: "chromium",
        channel: "chrome",
      },
    },
  ],
});
