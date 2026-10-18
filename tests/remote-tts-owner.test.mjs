import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
const tick = () => new Promise((r) => setImmediate(r));
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/remote-owner-"));
  const saved = Object.fromEntries(
    ["fetch", "Audio", "window", "SpeechSynthesisUtterance"].map((k) => [
      k,
      Object.getOwnPropertyDescriptor(globalThis, k),
    ]),
  );
  const urls = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  try {
    await build({
      stdin: {
        contents: `export * from './src/lib/mission-tts';export * from './src/lib/tts';export {encodeGoogleVoicePreference} from './src/data/mission-tts';export {c} from 'fixture';`,
        resolveDir: process.cwd(),
      },
      outfile: join(dir, "case.mjs"),
      bundle: true,
      format: "esm",
      platform: "node",
      logLevel: "silent",
      plugins: [
        {
          name: "remote-owner",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(fixture|@\/integrations\/supabase\/client|@\/lib\/(voices|pwa-install)|sonner)$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `export const c={sessions:[],requests:[],audio:[],utterances:[],created:[],revoked:[]};export const supabase={auth:{getSession:()=>new Promise(resolve=>c.sessions.push(resolve))}};export const configureUtterance=()=>{},getVoicesForLocale=()=>[{voiceURI:'device',lang:'es-CR'}],isIosDevice=()=>false,toast={warning:()=>{}};`,
            }));
          },
        },
      ],
    });
    const m = await import(join(dir, "case.mjs")),
      c = m.c;
    let current = true;
    const owner = { userId: "a", isCurrent: () => current };
    globalThis.fetch = (url, opts) =>
      new Promise((resolve) => c.requests.push({ url, opts, resolve }));
    URL.createObjectURL = () => {
      const url = "blob:fixture-" + c.created.length;
      c.created.push(url);
      return url;
    };
    URL.revokeObjectURL = (url) => c.revoked.push(url);
    globalThis.Audio = class {
      constructor() {
        c.audio.push(this);
      }
      pause() {
        this.paused = true;
      }
      removeAttribute() {
        this.src = "";
      }
      load() {}
      play() {
        return Promise.resolve();
      }
    };
    globalThis.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
      }
    };
    globalThis.window = { speechSynthesis: { cancel() {}, speak: (u) => c.utterances.push(u) } };
    const opts = {
      text: "Synthetic nonlearner audio",
      voiceName: "fixture",
      languageCode: "es-CR",
      speakingRate: 1,
      owner,
    };
    const preference = m.encodeGoogleVoicePreference({ name: "fixture", languageCodes: ["es-CR"] });
    await run({ m, c, owner, opts, preference, setCurrent: (v) => (current = v) });
    m.stopRemoteTTS();
  } finally {
    for (const [k, d] of Object.entries(saved)) {
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
    }
    URL.createObjectURL = urls.create;
    URL.revokeObjectURL = urls.revoke;
    rmSync(dir, { recursive: true, force: true });
  }
}
const auth = (id = "a") => ({
  data: { session: { user: { id }, access_token: `synthetic-${id}` } },
});
const reply = (blob = async () => new Blob(["fixture"])) => ({
  ok: true,
  headers: new Headers(),
  blob,
});
test("remote TTS rejects mismatched SDK before provider request and keeps the current request body", () =>
  fixture(async ({ m, c, opts }) => {
    const denied = m.speakMissionTts(opts),
      rejected = assert.rejects(denied, /Sign in/);
    c.sessions.shift()(auth("b"));
    await tick();
    assert.equal(c.requests.length, 0);
    await rejected;
    assert.equal(c.created.length, 0);
    const work = m.speakMissionTts(opts);
    c.sessions.shift()(auth());
    await tick();
    assert.deepEqual(JSON.parse(c.requests[0].opts.body), {
      text: opts.text,
      voiceName: "fixture",
      languageCode: "es-CR",
      speakingRate: 1,
      usage: "mission",
    });
    c.requests[0].resolve(reply());
    await tick();
    c.audio[0].onended();
    await work;
    assert.deepEqual(c.revoked, c.created);
  }));
test("remote TTS owner loss during blob delivery or playback suppresses callbacks and releases owned URLs", () =>
  fixture(async ({ m, c, opts, setCurrent }) => {
    let started = 0;
    const work = m.speakMissionTts({ ...opts, onPlaybackStart: () => started++ }),
      denied = assert.rejects(work, { name: "AbortError" });
    c.sessions.shift()(auth());
    await tick();
    let finish;
    c.requests[0].resolve(reply(() => new Promise((r) => (finish = r))));
    await tick();
    setCurrent(false);
    finish(new Blob(["late"]));
    await denied;
    assert.equal(c.created.length, 0);
    assert.equal(started, 0);
    setCurrent(true);
    const playing = m.speakMissionTts(opts),
      late = assert.rejects(playing, { name: "AbortError" });
    c.sessions.shift()(auth());
    await tick();
    c.requests[1].resolve(reply());
    await tick();
    setCurrent(false);
    c.audio[0].onended();
    await late;
    assert.deepEqual(c.revoked, c.created);
  }));
test("shared TTS router forwards original account to Google credentials and keeps guest speech on device", () =>
  fixture(async ({ m, c, owner, preference }) => {
    let ended = 0;
    const work = m.speakRemote("Fixture A", "es-CR", {
      voiceURI: preference,
      owner,
      onend: () => ended++,
    });
    assert.equal(c.sessions.length, 1);
    c.sessions.shift()(auth("b"));
    await tick();
    assert.equal(c.requests.length, 0);
    assert.equal(c.utterances.length, 1, "same current account can use installed device fallback");
    c.utterances[0].onend();
    await work;
    assert.equal(ended, 1);
    const guest = m.speakRemote("Guest fixture", "es-CR", {
      voiceURI: preference,
      owner: { userId: "", isCurrent: () => true },
    });
    assert.equal(c.sessions.length, 0);
    assert.equal(c.requests.length, 0);
    c.utterances[1].onend();
    await guest;
  }));
test("owned abort and identity loss cannot fallback late or cancel newer routed playback", () =>
  fixture(async ({ m, c, owner, preference, setCurrent }) => {
    const abort = new AbortController();
    let ends = 0;
    const first = m.speakRemote("Old fixture", "es-CR", {
      voiceURI: preference,
      owner,
      signal: abort.signal,
      onend: () => ends++,
    });
    const headers = c.sessions.shift();
    setCurrent(false);
    abort.abort();
    headers(auth());
    await first;
    assert.equal(c.requests.length, 0);
    assert.equal(c.utterances.length, 0);
    assert.equal(ends, 0);
    setCurrent(true);
    const current = m.speakRemote("New fixture", "es-CR", { deviceOnly: true, owner });
    const utterance = c.utterances[0];
    abort.abort();
    assert.equal(utterance.onend !== null, true);
    utterance.onend();
    await current;
  }));

test("routed abort cannot stop a newer direct mission voice while old credentials are pending", () =>
  fixture(async ({ m, c, owner, preference, opts }) => {
    const abort = new AbortController();
    const routed = m.speakRemote("Old routed fixture", "es-CR", {
      voiceURI: preference,
      owner,
      signal: abort.signal,
    });
    const oldCredential = c.sessions.shift();
    const direct = m.speakMissionTts(opts);
    void direct.catch(() => undefined);
    c.sessions.shift()(auth());
    await tick();
    c.requests[0].resolve(reply());
    await tick();
    const audio = c.audio[0],
      url = audio.src,
      end = audio.onended;
    abort.abort();
    assert.equal(audio.src, url);
    assert.equal(audio.onended, end);
    assert.equal(c.revoked.includes(url), false);
    oldCredential(auth());
    await routed;
    assert.equal(audio.src, url);
    audio.onended();
    await direct;
  }));
