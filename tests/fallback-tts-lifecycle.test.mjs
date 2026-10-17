import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
const tick = () => new Promise((r) => setImmediate(r));
function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}

test("actual fallback TTS clears learner-text source and rejects stale completion/fallback across stop or replacement", async () => {
  const saved = {
    window: globalThis.window,
    Audio: globalThis.Audio,
    utterance: globalThis.SpeechSynthesisUtterance,
  };
  const plays = [],
    utterances = [];
  let audio;
  let cancellations = 0;
  globalThis.Audio = class {
    constructor() {
      audio = this;
    }
    pause() {}
    removeAttribute() {
      this.src = "";
    }
    load() {}
    play() {
      const p = deferred();
      plays.push(p);
      return p.promise;
    }
  };
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
    }
  };
  globalThis.window = {
    speechSynthesis: {
      cancel() {
        cancellations++;
      },
      speak(u) {
        utterances.push(u);
      },
    },
  };
  const dir = mkdtempSync(resolve("node_modules/.cache/fallback-tts-"));
  try {
    const outfile = join(dir, "tts.mjs");
    await build({
      stdin: {
        contents: `export * from './src/lib/tts';export {controls} from 'fixture';`,
        resolveDir: process.cwd(),
      },
      outfile,
      bundle: true,
      format: "esm",
      platform: "node",
      logLevel: "silent",
      plugins: [
        {
          name: "playback-fixture",
          setup(b) {
            b.onResolve(
              { filter: /^(fixture|@\/lib\/(mission-tts|voices|pwa-install)|sonner)$/ },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `export const controls={requests:[],warnings:0};export const speakMissionTts=()=>new Promise((resolve,reject)=>controls.requests.push({resolve,reject}));export const stopMissionTts=()=>{};export const getVoicesForLocale=()=>[];export const configureUtterance=(u,locale)=>u.lang=locale;export const isIosDevice=()=>false;export const toast={warning:()=>controls.warnings++};`,
            }));
          },
        },
      ],
    });
    const m = await import(outfile);
    let ends = 0,
      failures = 0;
    const start = (text, locale = "ps-AF", voiceURI) =>
      m.speakRemote(text, locale, { voiceURI, onend: () => ends++, onerror: () => failures++ });
    const a = start("Synthetic private A");
    await tick();
    assert.match(audio.src, /Synthetic%20private%20A/);
    const oldEnd = audio.onended;
    const b = start("Synthetic private B");
    await a;
    assert.equal(ends, 0);
    const newEnd = audio.onended;
    oldEnd();
    plays[0].reject(new Error("old rejection"));
    await tick();
    assert.equal(audio.onended, newEnd);
    assert.match(audio.src, /private%20B/);
    assert.equal(ends, 0);
    m.stopRemoteTTS();
    await b;
    assert.equal(audio.src, "");
    assert.equal(audio.onended, null);
    assert.equal(ends, 0);
    newEnd();
    plays[1].resolve();
    await tick();
    assert.equal(ends, 0);
    const c = start("Current");
    const end = audio.onended;
    end();
    end();
    await c;
    assert.equal(ends, 1);
    assert.equal(audio.src, "");
    const device = start("Device A", "en-US");
    await tick();
    const deviceA = utterances.at(-1),
      oldDeviceEnd = deviceA.onend;
    m.stopRemoteTTS();
    await device;
    assert.equal(deviceA.onend, null);
    assert.ok(cancellations > 0);
    oldDeviceEnd();
    assert.equal(ends, 1);
    const deviceB = start("Device B", "en-US");
    await tick();
    const u = utterances.at(-1),
      done = u.onend;
    done();
    done();
    await deviceB;
    assert.equal(ends, 2);
    const broken = start("Failed device", "en-US");
    await tick();
    const failedDevice = utterances.at(-1),
      fail = failedDevice.onerror,
      oldFinish = failedDevice.onend;
    fail();
    oldFinish();
    await broken;
    assert.equal(ends, 2);
    assert.equal(failures, 1);
    const brokenRemote = start("Failed Pashto");
    const failRemote = audio.onerror,
      oldRemoteEnd = audio.onended;
    failRemote();
    oldRemoteEnd();
    await brokenRemote;
    assert.equal(ends, 2);
    assert.equal(failures, 2);
    // Use the real preference encoding accepted by the production decoder.
    const { encodeGoogleVoicePreference } = await import("../src/data/mission-tts.ts");
    const pref = encodeGoogleVoicePreference({ name: "fixture", languageCodes: ["es-CR"] });
    const g = start("Old Google", "es-CR", pref);
    await tick();
    assert.equal(m.controls.requests.length, 1);
    m.stopRemoteTTS();
    m.controls.requests[0].reject(new Error("late network failure"));
    await g;
    assert.equal(utterances.length, 3);
    assert.equal(ends, 2);
    const h = start("Old success", "es-CR", pref);
    await tick();
    m.stopRemoteTTS();
    m.controls.requests[1].resolve();
    await h;
    assert.equal(ends, 2);
    const providerCalls = m.controls.requests.length,
      remotePlays = plays.length;
    for (const voiceURI of [pref, undefined]) {
      const nativeOnly = m.speakRemote("Protected QA sample", "ps-AF", {
        deviceOnly: true,
        voiceURI,
      });
      await tick();
      assert.equal(
        m.controls.requests.length,
        providerCalls,
        "device-only ignores Google preference",
      );
      assert.equal(plays.length, remotePlays, "device-only cannot use remote Pashto fallback");
      utterances.at(-1).onend();
      await nativeOnly;
    }
  } finally {
    globalThis.window = saved.window;
    globalThis.Audio = saved.Audio;
    globalThis.SpeechSynthesisUtterance = saved.utterance;
    rmSync(dir, { recursive: true, force: true });
  }
});
