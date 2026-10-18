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
    createObjectURL: URL.createObjectURL,
    revokeObjectURL: URL.revokeObjectURL,
    fetch: globalThis.fetch,
    window: globalThis.window,
    Audio: globalThis.Audio,
    utterance: globalThis.SpeechSynthesisUtterance,
  };
  const plays = [],
    utterances = [];
  const created = [],
    revoked = [];
  URL.createObjectURL = () => {
    const url = `blob:fixture-${created.length}`;
    created.push(url);
    return url;
  };
  URL.revokeObjectURL = (url) => revoked.push(url);
  const requests = [];
  globalThis.fetch = async (url, opts) => {
    requests.push({ url, opts });
    return { ok: true, blob: async () => new Blob(["synthetic audio"]) };
  };
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
              contents: `export const controls={requests:[],warnings:0};export const speakMissionTts=opts=>new Promise((resolve,reject)=>controls.requests.push({resolve,reject,onPlaybackStart:opts.onPlaybackStart}));export const stopMissionTts=()=>{};export const getVoicesForLocale=()=>[];export const configureUtterance=(u,locale)=>u.lang=locale;export const isIosDevice=()=>false;export const toast={warning:()=>controls.warnings++};`,
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
    assert.match(audio.src, /^blob:/);
    assert.equal(requests[0].url, "/api/tts");
    assert.equal(requests[0].opts.method, "POST");
    assert.equal(requests[0].opts.cache, "no-store");
    assert.deepEqual(JSON.parse(requests[0].opts.body), {
      text: "Synthetic private A",
      lang: "ps",
    });
    const oldEnd = audio.onended;
    const b = start("Synthetic private B");
    await a;
    await tick();
    assert.equal(ends, 0);
    const newEnd = audio.onended;
    oldEnd();
    plays[0].reject(new Error("old rejection"));
    await tick();
    assert.equal(audio.onended, newEnd);
    assert.match(audio.src, /^blob:/);
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
    await tick();
    const end = audio.onended;
    end();
    end();
    await c;
    assert.equal(ends, 1);
    assert.equal(audio.src, "");
    assert.deepEqual(revoked, created, "completed and replaced audio URLs released");
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
    await tick();
    const failRemote = audio.onerror,
      oldRemoteEnd = audio.onended;
    failRemote();
    oldRemoteEnd();
    await brokenRemote;
    assert.equal(ends, 2);
    assert.equal(failures, 2);
    // Stop during transport and blob decoding must not create late playback.
    const oldSource = audio.src;
    const transport = deferred();
    globalThis.fetch = (url, opts) => {
      requests.push({ url, opts });
      return transport.promise;
    };
    const late = start("Departed transport");
    m.stopRemoteTTS();
    assert.equal(requests.at(-1).opts.signal.aborted, true);
    transport.resolve(new Response(new Blob(["late"])));
    await late;
    assert.equal(audio.src, oldSource);
    const decoding = deferred();
    globalThis.fetch = async () => ({ ok: true, blob: () => decoding.promise });
    const lateBlob = start("Departed blob");
    await tick();
    m.stopRemoteTTS();
    globalThis.fetch = saved.fetch;
    decoding.resolve(new Blob(["late blob"]));
    await lateBlob;
    assert.equal(audio.src, "");
    const privateBlob = deferred();
    globalThis.fetch = async () => ({ ok: true, blob: () => privateBlob.promise });
    let ownerCurrent = true;
    const createdBefore = created.length;
    const departedOwner = m.speakRemote("Private owner A", "ps-AF", {
      owner: { userId: "synthetic-a", isCurrent: () => ownerCurrent },
      onend: () => ends++,
      onerror: () => failures++,
    });
    await tick();
    ownerCurrent = false;
    privateBlob.resolve(new Blob(["late owner A"]));
    await departedOwner;
    assert.equal(created.length, createdBefore, "late previous-owner blob cannot become playable");
    assert.equal(ends, 2);
    assert.equal(failures, 2);
    globalThis.fetch = saved.fetch;
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
    let starts = 0;
    const timed = m.speakRemote("Device timing", "en-US", {
      deviceOnly: true,
      onPlaybackStart: () => starts++,
    });
    await tick();
    const timingUtterance = utterances.at(-1),
      timingStart = timingUtterance.onstart;
    timingStart();
    timingStart();
    assert.equal(starts, 1);
    m.stopRemoteTTS();
    await timed;
    assert.equal(timingUtterance.onstart, null);
    timingStart();
    assert.equal(starts, 1, "stopped native start cannot update timing");
    const cloudTiming = m.speakRemote("Google timing", "es-CR", {
      voiceURI: pref,
      onPlaybackStart: () => starts++,
    });
    await tick();
    const cloudRequest = m.controls.requests.at(-1),
      cloudStart = cloudRequest.onPlaybackStart;
    cloudStart();
    cloudStart();
    assert.equal(starts, 2);
    m.stopRemoteTTS();
    cloudStart();
    cloudRequest.resolve();
    await cloudTiming;
    assert.equal(starts, 2, "stopped Google start cannot update timing");
  } finally {
    URL.createObjectURL = saved.createObjectURL;
    URL.revokeObjectURL = saved.revokeObjectURL;
    globalThis.fetch = saved.fetch;
    globalThis.window = saved.window;
    globalThis.Audio = saved.Audio;
    globalThis.SpeechSynthesisUtterance = saved.utterance;
    rmSync(dir, { recursive: true, force: true });
  }
});
