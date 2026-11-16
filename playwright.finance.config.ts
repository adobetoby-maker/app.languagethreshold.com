import { defineConfig, devices } from "@playwright/test";
const { defaultBrowserType: _browser, ...iPhone } = devices["iPhone 15"];
export default defineConfig({
  testDir: "e2e",
  testMatch: /finance-(courses|navigation)\.spec\.ts/,
  outputDir: "test-results/finance",
  timeout: 120_000,
  expect: { timeout: 60_000 },
  fullyParallel: true,
  workers: 2,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report/finance" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3485",
    channel: "chrome",
    screenshot: "only-on-failure",
    trace: "off",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "iphone", use: { ...iPhone, browserName: "chromium" } },
  ],
});
