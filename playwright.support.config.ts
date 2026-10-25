import { defineConfig, devices } from "@playwright/test";
const { defaultBrowserType: _ignored, ...phone } = devices["iPhone 15"];
export default defineConfig({
  testDir: "e2e", testMatch: "owner-admin.spec.ts", retries: 0, workers: 2,
  timeout: 60000, expect: { timeout: 20000 }, reporter: "list",
  use: { baseURL: "http://127.0.0.1:3481", channel: "chrome", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "iphone-pwa", use: { ...phone, browserName: "chromium" } },
  ],
});
