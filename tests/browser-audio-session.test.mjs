import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
const out = await build({
  entryPoints: ["src/lib/browser-audio-session.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { beginBrowserRecordingSession, prepareBrowserPlayback } = await import(
  "data:text/javascript;base64," + Buffer.from(out.outputFiles[0].text).toString("base64")
);
test("repeated recording hands audio back to playback; stale cleanup cannot alter newer input", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const changes = [];
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      audioSession: {
        set type(value) {
          changes.push(value);
        },
      },
    },
  });
  try {
    for (let i = 0; i < 12; i++) {
      const end = beginBrowserRecordingSession();
      assert.equal(prepareBrowserPlayback(), false);
      end();
      assert.equal(prepareBrowserPlayback(), true);
      assert.equal(changes.at(-1), "playback");
    }
    const old = beginBrowserRecordingSession();
    const current = beginBrowserRecordingSession();
    old();
    assert.equal(prepareBrowserPlayback(), false);
    assert.equal(changes.at(-1), "play-and-record");
    current();
    assert.equal(prepareBrowserPlayback(), true);
  } finally {
    if (previous) Object.defineProperty(globalThis, "navigator", previous);
    else delete globalThis.navigator;
  }
});
test("missing or restricted Audio Session API does not break recording or playback", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  try {
    for (const nav of [
      {},
      {
        get audioSession() {
          throw new Error("restricted");
        },
      },
    ]) {
      Object.defineProperty(globalThis, "navigator", { configurable: true, value: nav });
      beginBrowserRecordingSession()();
      assert.equal(prepareBrowserPlayback(), true);
    }
  } finally {
    if (previous) Object.defineProperty(globalThis, "navigator", previous);
    else delete globalThis.navigator;
  }
});
