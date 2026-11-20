// The real audio router (src/lib/tts.ts + src/lib/mission-tts.ts) with the real recording
// manifests. Only the network, the audio element, device speech and the session are stand-ins.
import assert from "node:assert/strict";
import nodeTest from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const tick = () => new Promise((r) => setImmediate(r));
// A routing regression usually leaves playback waiting forever; fail instead of hanging the suite.
const test = (name, fn) => nodeTest(name, { timeout: 30_000 }, fn);

async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/listening-routing-"));
  const saved = Object.fromEntries(
    ["fetch", "Audio", "window", "SpeechSynthesisUtterance", "setTimeout", "clearTimeout"].map(
      (k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)],
    ),
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
          name: "listening-routing",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(fixture|@\/integrations\/supabase\/client|@\/lib\/(voices|pwa-install)|sonner)$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `export const c={sessions:[],requests:[],audio:[],utterances:[],warnings:[]};export const supabase={auth:{getSession:()=>new Promise(resolve=>c.sessions.push(resolve))}};export const configureUtterance=()=>{},getVoicesForLocale=()=>[{voiceURI:'device',lang:'es-CR'}],isIosDevice=()=>false,toast={warning:(title,opts)=>c.warnings.push({title,opts}),message(){},dismiss(){}};`,
            }));
          },
        },
      ],
    });
    const m = await import(join(dir, "case.mjs")),
      c = m.c;
    c.timers = new Map();
    c.play = () => Promise.resolve();
    globalThis.setTimeout = (fn, ms) => {
      const id = { unref() {} };
      c.timers.set(id, { fn, ms });
      return id;
    };
    globalThis.clearTimeout = (id) => c.timers.delete(id);
    globalThis.fetch = (url, opts) =>
      new Promise((resolve, reject) => c.requests.push({ url, opts, resolve, reject }));
    URL.createObjectURL = () => "blob:fixture";
    URL.revokeObjectURL = () => {};
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
        return c.play();
      }
    };
    globalThis.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
      }
    };
    globalThis.window = { speechSynthesis: { cancel() {}, speak: (u) => c.utterances.push(u) } };
    let current = true;
    await run({
      m,
      c,
      member: { userId: "a", isCurrent: () => current },
      guest: { userId: "", isCurrent: () => current },
      setCurrent: (v) => (current = v),
      hd: (name = "Aoede", locale = "es-US") =>
        m.encodeGoogleVoicePreference({
          name: `${locale}-Chirp3-HD-${name}`,
          languageCodes: [locale],
        }),
      /** The audio element currently holding a recorded clip. */
      clip: () => c.audio.find((el) => String(el.src ?? "").startsWith("/audio/")),
      session: (id = "a") =>
        c.sessions.shift()({
          data: { session: { user: { id }, access_token: `synthetic-${id}` } },
        }),
    });
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

const failed = (status, headers = {}) =>
  Response.json({ error: "Synthetic provider answer" }, { status, headers });
const rendered = () => ({ ok: true, headers: new Headers(), blob: async () => new Blob(["mp3"]) });
const NOT_RECORDED = "frase sintética sin grabación zzqx";

test("a public recording plays for a signed-out learner: no session, sign-in or synthesis request", () =>
  fixture(async ({ m, c, guest, clip }) => {
    for (const [text, gender, file] of [
      ["conecto", "female", /^\/audio\/spanish-next\/es-next-[a-f0-9]{20}-female\.mp3$/],
      ["Conectan.", "male", /^\/audio\/spanish-next\/es-next-[a-f0-9]{20}-male\.mp3$/],
    ]) {
      const started = [],
        ended = [];
      let failures = 0;
      const work = m.speakRemote(text, "es-CR", {
        voiceURI: "device:default",
        recordedGender: gender,
        owner: guest,
        onPlaybackStart: (source) => started.push(source),
        onend: (source) => ended.push(source),
        onerror: () => failures++,
      });
      const el = clip();
      assert.match(el.src, file);
      el.onplaying();
      el.onended();
      await work;
      assert.deepEqual(started, ["recording"]);
      assert.deepEqual(ended, ["recording"]);
      assert.equal(failures, 0);
    }
    assert.equal(c.sessions.length, 0, "no session was read");
    assert.equal(c.requests.length, 0, "no cloud endpoint was called");
    assert.equal(c.utterances.length, 0, "no device voice was used");
  }));

test("once a signed-out learner has allowed it, a missing recording is read by this device's voice and reported as such", () =>
  fixture(async ({ m, c, guest }) => {
    const ended = [];
    const work = m.speakRemote(NOT_RECORDED, "es-CR", {
      voiceURI: "device:default",
      recordedGender: "female",
      owner: guest,
      onend: (source) => ended.push(source),
    });
    assert.equal(c.utterances.length, 1);
    c.utterances[0].onend();
    await work;
    assert.deepEqual(ended, ["device"], "device speech is reported as device, never as HD");
    assert.equal(c.sessions.length, 0);
    assert.equal(c.requests.length, 0);
  }));

test("recordings follow the accent and gender: Spain and other languages never get these clips", () =>
  fixture(async ({ m, c, member, clip }) => {
    for (const locale of ["es-ES", "fr-FR", "en-US"]) {
      const reasons = [];
      await m.speakRemote("conecto", locale, {
        voiceURI: "device:default",
        recordedGender: "female",
        cloudOnly: true,
        owner: member,
        onerror: (reason) => reasons.push(reason),
      });
      assert.deepEqual(reasons, ["unavailable"], locale);
    }
    assert.equal(clip(), undefined);
    assert.equal(c.utterances.length, 0);
    // Without the caller's permission the gender lookup is not used at all (legacy callers).
    const legacy = m.speakRemote("conecto", "es-CR", { voiceURI: "device:default", owner: member });
    assert.equal(clip(), undefined);
    assert.equal(c.utterances.length, 1);
    c.utterances[0].onend();
    await legacy;
  }));

test("HD only: with no HD audio the learner is told why and nothing else is played", () =>
  fixture(async ({ m, c, member, guest }) => {
    const ask = async (opts) => {
      const reasons = [];
      let ends = 0;
      await m.speakRemote(NOT_RECORDED, "es-CR", {
        voiceURI: "device:default",
        recordedGender: "female",
        cloudOnly: true,
        onend: () => ends++,
        onerror: (reason) => reasons.push(reason),
        ...opts,
      });
      assert.equal(ends, 0);
      return reasons;
    };
    assert.deepEqual(await ask({ owner: member, unavailableReason: "loading" }), ["loading"]);
    assert.deepEqual(await ask({ owner: member }), ["unavailable"]);
    assert.deepEqual(await ask({ owner: guest }), ["sign-in"]);
    assert.equal(c.utterances.length, 0, "no device voice stood in");
    assert.equal(c.requests.length, 0);
    assert.equal(c.sessions.length, 0);
  }));

test("HD only: a failing HD voice is reported by cause and never replaced by a device voice", () =>
  fixture(async ({ m, c, member, guest, hd, session }) => {
    const start = (owner = member) => {
      const reasons = [];
      const work = m.speakRemote(NOT_RECORDED, "es-CR", {
        voiceURI: hd(),
        recordedGender: "female",
        cloudOnly: true,
        owner,
        onerror: (reason) => reasons.push(reason),
      });
      return { reasons, work };
    };
    // Provider error.
    let run = start();
    session();
    await tick();
    assert.equal(c.requests.length, 1);
    assert.equal(JSON.parse(c.requests[0].opts.body).voiceName, "es-US-Chirp3-HD-Aoede");
    assert.equal(c.requests[0].opts.headers.Authorization, "Bearer synthetic-a");
    c.requests[0].resolve(failed(503));
    await run.work;
    assert.deepEqual(run.reasons, ["unavailable"]);

    // Rate limited twice: the existing single retry is kept, then it is reported as busy.
    run = start();
    session();
    await tick();
    c.requests[1].resolve(failed(429, { "Retry-After": "0" }));
    await tick();
    const wait = [...c.timers.values()].find((timer) => timer.ms === 0);
    assert.ok(wait, "the rate-limit retry waits for the server's hint");
    wait.fn();
    await tick();
    session();
    await tick();
    assert.equal(c.requests.length, 3, "exactly one retry");
    c.requests[2].resolve(failed(429, { "Retry-After": "0" }));
    await run.work;
    assert.deepEqual(run.reasons, ["busy"]);

    // The request never arrived.
    run = start();
    session();
    await tick();
    c.requests[3].reject(new TypeError("Failed to fetch"));
    await run.work;
    assert.deepEqual(run.reasons, ["offline"]);

    // The account's session is gone: asked to sign in, nothing sent.
    run = start();
    c.sessions.shift()({ data: { session: null } });
    await run.work;
    assert.deepEqual(run.reasons, ["sign-in"]);
    assert.equal(c.requests.length, 4);

    // A signed-out caller can never reach the cloud endpoint.
    run = start(guest);
    await run.work;
    assert.deepEqual(run.reasons, ["sign-in"]);
    assert.equal(c.sessions.length, 0);
    assert.equal(c.requests.length, 4);

    assert.equal(c.utterances.length, 0, "a device voice never stood in for the HD voice");
    assert.equal(c.warnings.length, 0);
  }));

test("when the learner allowed it, the device voice fills in and the swap is announced once", () =>
  fixture(async ({ m, c, member, hd, session }) => {
    for (let round = 0; round < 2; round++) {
      const ended = [];
      const work = m.speakRemote(NOT_RECORDED, "es-CR", {
        voiceURI: hd(),
        recordedGender: "female",
        owner: member,
        onend: (source) => ended.push(source),
      });
      session();
      await tick();
      c.requests[round].resolve(failed(502));
      await tick();
      assert.equal(c.utterances.length, round + 1);
      c.utterances[round].onend();
      await work;
      assert.deepEqual(ended, ["device"]);
    }
    assert.equal(c.warnings.length, 1, "announced once, not on every word");
    assert.equal(c.warnings[0].title, "HD voice unavailable");
    assert.match(c.warnings[0].opts.description, /device’s voice for now/);
    assert.doesNotMatch(JSON.stringify(c.warnings[0]), /google|chirp/i);
  }));

test("a recording that cannot play is followed by the HD voice, and only then by a report", () =>
  fixture(async ({ m, c, member, hd, session, clip }) => {
    c.play = () => Promise.reject(new Error("synthetic: clip missing"));
    const ended = [];
    const work = m.speakRemote("conecto", "es-CR", {
      voiceURI: hd(),
      recordedGender: "female",
      cloudOnly: true,
      owner: member,
      onend: (source) => ended.push(source),
    });
    assert.match(clip().src, /-female\.mp3$/);
    await tick();
    c.play = () => Promise.resolve();
    session();
    await tick();
    assert.equal(c.requests.length, 1, "the HD voice was asked for the same text");
    assert.equal(JSON.parse(c.requests[0].opts.body).text, "conecto");
    c.requests[0].resolve(rendered());
    await tick();
    c.audio.find((el) => el.src === "blob:fixture").onended();
    await work;
    assert.deepEqual(ended, ["hd"]);

    // No HD voice selected: the unplayable recording is reported, not read by a device voice.
    c.play = () => Promise.reject(new Error("synthetic: clip missing"));
    const reasons = [];
    await m.speakRemote("conecto", "es-CR", {
      voiceURI: "device:default",
      recordedGender: "female",
      cloudOnly: true,
      owner: member,
      onerror: (reason) => reasons.push(reason),
    });
    assert.deepEqual(reasons, ["unavailable"]);
    assert.equal(c.utterances.length, 0);
  }));

test("HD only: a known public recording that fails for a signed-out learner asks for a retry, not a sign-in, and requests nothing else", () =>
  fixture(async ({ m, c, guest, member, hd, clip }) => {
    c.play = () => Promise.reject(new Error("synthetic: the clip would not load"));
    /** One HD-only tap, as the listening plan sends it for a signed-out learner. */
    const ask = async (text, opts = {}) => {
      const reasons = [];
      let heard = 0;
      const work = m.speakRemote(text, "es-CR", {
        voiceURI: "device:default",
        recordedGender: "female",
        cloudOnly: true,
        unavailableReason: "sign-in",
        owner: guest,
        onPlaybackStart: () => heard++,
        onend: () => heard++,
        onerror: (reason) => reasons.push(reason),
        ...opts,
      });
      const asked = clip()?.src ?? null;
      await work;
      assert.equal(heard, 0, "nothing was played");
      return { reasons, asked };
    };
    const nothingElseAsked = () => {
      assert.equal(c.sessions.length, 0, "no session was read");
      assert.equal(c.requests.length, 0, "no cloud request was made");
      assert.equal(c.utterances.length, 0, "no device voice was used");
    };

    // The clip exists and was asked for; it only failed to play. Not a reason to sign in.
    let result = await ask("conecto");
    assert.match(result.asked, /^\/audio\/spanish-next\/es-next-[a-f0-9]{20}-female\.mp3$/);
    assert.deepEqual(result.reasons, ["unavailable"], "try again, or the learner's own choice");
    nothingElseAsked();

    // With no connection it is reported as that.
    Object.defineProperty(globalThis.navigator, "onLine", { value: false, configurable: true });
    try {
      result = await ask("conecto");
      assert.deepEqual(result.reasons, ["offline"]);
    } finally {
      delete globalThis.navigator.onLine;
    }
    nothingElseAsked();

    // A word with no recording still needs the HD cloud voice, and that needs an account.
    result = await ask(NOT_RECORDED);
    assert.equal(result.asked, null, "there is no clip to ask for");
    assert.deepEqual(result.reasons, ["sign-in"]);
    nothingElseAsked();

    // The same for a signed-out caller that still carries a cloud voice preference.
    result = await ask("conecto", { voiceURI: hd(), unavailableReason: undefined });
    assert.match(result.asked, /-female\.mp3$/);
    assert.deepEqual(result.reasons, ["unavailable"]);
    result = await ask(NOT_RECORDED, { voiceURI: hd(), unavailableReason: undefined });
    assert.deepEqual(result.reasons, ["sign-in"]);
    nothingElseAsked();

    // Signed in while the HD voice is still loading: a failed clip is a failed clip, and an
    // unrecorded word still says the voice is getting ready.
    result = await ask("conecto", { owner: member, unavailableReason: "loading" });
    assert.deepEqual(result.reasons, ["unavailable"]);
    result = await ask(NOT_RECORDED, { owner: member, unavailableReason: "loading" });
    assert.deepEqual(result.reasons, ["loading"]);
    nothingElseAsked();
  }));

test("cancelling a recording drops its callbacks, and an old cancel cannot stop newer playback", () =>
  fixture(async ({ m, member, clip, setCurrent }) => {
    const calls = [];
    const opts = (name, signal) => ({
      voiceURI: "device:default",
      recordedGender: "female",
      cloudOnly: true,
      owner: member,
      signal,
      onPlaybackStart: () => calls.push(`${name}:start`),
      onend: () => calls.push(`${name}:end`),
      onerror: () => calls.push(`${name}:error`),
    });
    const first = new AbortController();
    const a = m.speakRemote("conecto", "es-CR", opts("a", first.signal));
    const el = clip();
    const lateEnd = el.onended;
    first.abort();
    await a;
    assert.equal(el.src, "", "the cancelled clip was released");
    assert.equal(el.onended, null);
    lateEnd();
    assert.deepEqual(calls, []);

    // A newer playback owns the element; the older signal firing again changes nothing.
    const second = new AbortController();
    const old = new AbortController();
    const stale = m.speakRemote("conectas", "es-CR", opts("stale", old.signal));
    const b = m.speakRemote("conectamos", "es-CR", opts("b", second.signal));
    await stale;
    const src = clip().src;
    old.abort();
    assert.equal(clip().src, src);
    clip().onplaying();
    clip().onended();
    await b;
    assert.deepEqual(calls, ["b:start", "b:end"]);

    // The account changes mid-clip: nothing is reported to the previous learner's surface.
    const c2 = m.speakRemote("conectan", "es-CR", opts("c"));
    setCurrent(false);
    clip().onended();
    await c2;
    setCurrent(true);
    assert.deepEqual(calls, ["b:start", "b:end"]);
  }));
