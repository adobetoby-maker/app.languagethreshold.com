import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

// Chrome and simulator Safari can drop a device utterance with no events; the mission mic
// stays locked until speakRemote settles, so device speech must give up on its own.
test("device speech settles when the browser never fires start or end", async () => {
  const dir = mkdtempSync(resolve("node_modules/.cache/device-watchdog-"));
  const saved = Object.fromEntries(
    ["window", "SpeechSynthesisUtterance", "setTimeout", "clearTimeout"].map((k) => [
      k,
      Object.getOwnPropertyDescriptor(globalThis, k),
    ]),
  );
  try {
    await build({
      stdin: { contents: `export * from './src/lib/tts';`, resolveDir: process.cwd() },
      outfile: join(dir, "case.mjs"),
      bundle: true,
      format: "esm",
      platform: "node",
      logLevel: "silent",
      plugins: [
        {
          name: "device-watchdog",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(@\/integrations\/supabase\/client|@\/lib\/(voices|pwa-install|mission-tts)|sonner)$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `export const supabase={auth:{getSession:async()=>({data:{session:null}})}};export const configureUtterance=()=>{},getVoicesForLocale=()=>[{voiceURI:'device',lang:'es-MX'}],isIosDevice=()=>false,toast={warning:()=>{}},stopMissionTts=()=>{},speakMissionTts=()=>{};`,
            }));
          },
        },
      ],
    });
    const timers = [];
    globalThis.setTimeout = (fn, ms) => {
      const t = { fn, ms, cleared: false };
      timers.push(t);
      return t;
    };
    globalThis.clearTimeout = (t) => {
      if (t) t.cleared = true;
    };
    const utterances = [];
    let cancels = 0;
    globalThis.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
        utterances.push(this);
      }
    };
    globalThis.window = {
      speechSynthesis: { speak() {}, cancel: () => cancels++ },
    };
    const m = await import(join(dir, "case.mjs"));
    const fire = () => {
      const live = timers.filter((t) => !t.cleared && !t.fired);
      assert.equal(live.length, 1, "exactly one pending watchdog");
      live[0].fired = true;
      live[0].fn();
    };

    // Never starts: settles after the start limit and reports an error.
    let errors = 0;
    let settled = false;
    const silent = m
      .speakRemote("Hola, ¿cómo está?", "es-MX", { deviceOnly: true, onerror: () => errors++ })
      .then(() => (settled = true));
    await new Promise((r) => setImmediate(r));
    assert.equal(settled, false);
    const before = cancels;
    fire();
    await silent;
    assert.equal(settled, true);
    assert.equal(errors, 1);
    assert.ok(cancels > before, "a stuck utterance is cancelled");

    // Starts but never ends: settles after a text-length limit as heard.
    let ended = 0;
    let started = 0;
    const stuck = m.speakRemote("Sí, buena idea.", "es-MX", {
      deviceOnly: true,
      onend: () => ended++,
      onPlaybackStart: () => started++,
    });
    await new Promise((r) => setImmediate(r));
    utterances.at(-1).onstart();
    assert.equal(started, 1);
    const limit = timers.filter((t) => !t.cleared && !t.fired).at(-1);
    assert.ok(limit.ms > 5000 && limit.ms <= 90_000);
    fire();
    await stuck;
    assert.equal(ended, 1);

    // Normal end: the watchdog is cleared and never fires later.
    const ok = m.speakRemote("Gracias.", "es-MX", { deviceOnly: true });
    await new Promise((r) => setImmediate(r));
    utterances.at(-1).onstart();
    utterances.at(-1).onend();
    await ok;
    assert.equal(timers.filter((t) => !t.cleared && !t.fired).length, 0);
  } finally {
    for (const [k, d] of Object.entries(saved)) {
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
    }
    rmSync(dir, { recursive: true, force: true });
  }
});
