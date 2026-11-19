import { defineConfig, devices } from "@playwright/test";
const { defaultBrowserType: ignored, ...phone } = devices["iPhone 15"];
export default defineConfig({
  testDir: "e2e",
  testMatch: "interests-spanish.spec.ts",
  outputDir: "test-results/interests",
  timeout: 90000,
  expect: { timeout: 30000 },
  workers: 2,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3465",
    channel: "chrome",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "iphone-pwa", use: { ...phone, browserName: "chromium" } },
  ],
  webServer: {
    command: "npx vite dev --port 3465 --strictPort",
    url: "http://localhost:3465",
    timeout: 120000,
    reuseExistingServer: true,
  },
});
