# Japanese 101 browser parity sample — 2026-11-09

Production at `https://app.languagethreshold.com/` passed 14 Japanese lesson checks plus the shared setup test on desktop Chrome and an iPhone 15 Chromium touch viewport. The spec is `e2e/japanese-basics-lessons.spec.ts` and is registered in both Playwright projects.

- Foundation 1, Core 1, and Master 1 opened with Japanese source reading and English support. Each exposed See, Recall, Hear, Type, Say, and Write; the typed and handwritten workspaces opened; Say showed the authored Japanese line; and See handed the same line to the full Reader.
- Foundation 10, Core 30, and Master 20 opened by exact pair and lesson number with their authored titles and Japanese reading.
- Foundation 1 kept mastery disabled for an empty grammar check and enabled it after all three authored answers were correct.

These tests use an isolated synthetic browser session and local profile fixture. They do not establish real account sync, installed offline behavior, iPhone Safari, or independent V4 iPhone/Watch acceptance. They exercise visible navigation and rendered source lines, not Japanese linguistic quality, speech recognition, generated audio, or the other 54 specialty tracks. Keep `reviewed:false` until qualified Japanese review; the recorded audio acceptance ledger covers pilot recordings only.
