import { defineConfig, devices } from "@playwright/test";

// Click tests that drive the real AI features end to end. They call the live
// Anthropic API, so the dev server needs ANTHROPIC_API_KEY in its environment.
const PORT = Number(process.env.E2E_PORT ?? 3210);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
const channel = process.env.E2E_CHANNEL ?? "chrome";
const STATE = "e2e/.auth/state.json";

// iPhone 15 screen, touch and user agent, run on Chromium so no extra browser
// download is needed. It does not exercise Safari's own engine.
const { defaultBrowserType: _ignored, ...iPhone } = devices["iPhone 15"];

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  expect: { timeout: 60_000 },
  fullyParallel: true,
  workers: 2,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL,
    channel,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { viewport: { width: 1440, height: 900 } },
    },
    {
      name: "desktop",
      testMatch:
        /(owner-admin|exam-bank|desktop-navigation|flashcards-layout|learning-cleanup|ai-features|auth-modal|core30|core30-plan|core60-path|foundation|lesson-content|lesson-write|dictionary-roofing|cognate-bridge|grammar-quiz|microphone-test|watch-talk|app-demo|verb-games|voice-switch|word-match-pack|sentence-conjugation-pack|ga-events|practice-bar|tts-cache|exams2)\.spec\.ts/,
      dependencies: ["setup"],
      use: { viewport: { width: 1440, height: 900 }, storageState: STATE },
    },
    {
      name: "iphone-pwa",
      testMatch:
        /(owner-admin|exam-bank|desktop-navigation|flashcards-layout|learning-cleanup|voice-switch|pwa-iphone|auth-modal|core30|core30-plan|core60-path|lesson-content|lesson-write|dictionary-roofing|cognate-bridge|grammar-quiz|microphone-test|watch-talk|app-demo|verb-games|word-match-pack|sentence-conjugation-pack|practice-bar|exams2)\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...iPhone, browserName: "chromium", storageState: STATE },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npx vite dev --port ${PORT} --strictPort`,
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
