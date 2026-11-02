import { defineConfig, devices } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encodeReplyWav } from "./src/lib/reply-audio";

// Actual browser recording and decoding, synthetic sound, mocked cloud transcription.
process.env.E2E_RECORDED_AUDIO = "1";
const wave = join(tmpdir(), "lt-synthetic-recording.wav");
const samples = Float32Array.from(
  { length: 48000 * 4 },
  (_, i) => 0.2 * Math.sin((i * 2 * Math.PI * 330) / 48000),
);
writeFileSync(
  wave,
  new Uint8Array(
    encodeReplyWav({
      sampleRate: 48000,
      length: samples.length,
      numberOfChannels: 1,
      getChannelData: () => samples,
    }),
  ),
);
const { defaultBrowserType: _ignored, ...phone } = devices["iPhone 15"];
export default defineConfig({
  testDir: "e2e",
  testMatch: /speaking-continuity.spec.ts/,
  grep: /recorded audio/,
  timeout: 120000,
  expect: { timeout: 15000 },
  workers: 1,
  reporter: "list",
  use: {
    ...phone,
    browserName: "chromium",
    channel: "chrome",
    baseURL: "http://localhost:3210",
    permissions: ["microphone"],
    launchOptions: {
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
        `--use-file-for-fake-audio-capture=${wave}`,
      ],
    },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npx vite dev --port 3210 --strictPort",
    url: "http://localhost:3210",
    reuseExistingServer: true,
  },
});
