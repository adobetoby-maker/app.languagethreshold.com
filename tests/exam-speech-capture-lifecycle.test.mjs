import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
const tick = () => new Promise((r) => setImmediate(r));
function nodes(n, out = []) {
  if (Array.isArray(n)) n.forEach((v) => nodes(v, out));
  else if (n && typeof n === "object") {
    out.push(n);
    nodes(n.props?.children, out);
  }
  return out;
}
async function fixture(action, realClient = false) {
  const dir = mkdtempSync(resolve("node_modules/.cache/exam-listening-"));
  const old = Object.fromEntries(
    ["fetch", "Audio", "URL", "window", "navigator", "MediaRecorder", "performance"].map((k) => [
      k,
      Object.getOwnPropertyDescriptor(globalThis, k),
    ]),
  );
  try {
    const out = join(dir, "component.mjs");
    await build({
      stdin: {
        contents: `export {ExamSpeechQuestion} from './src/components/exams/ExamSpeechQuestion';export * from './src/lib/assessments/speech-device';export {c} from 'fixture';`,
        resolveDir: process.cwd(),
      },
      outfile: out,
      bundle: true,
      format: "esm",
      platform: "node",
      external: ["react/jsx-runtime"],
      logLevel: "silent",
      plugins: [
        {
          name: "listening-fixture",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(fixture|react|@\/state\/(auth|speech)-state|@\/lib\/(assessments\/client|voices|tts)|@\/integrations\/supabase\/client)$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              resolveDir: process.cwd(),
              contents: `
 import {examAudioRequest as realAudio,examHistoryExport as realExport,uploadExamSpeech as realUpload,examRequest as realAction,ExamRequestError} from "./src/lib/assessments/client.ts";
 export {ExamRequestError};
 export const supabase={auth:{getSession:()=>new Promise(resolve=>c.sessions.push(resolve))}};
 export const c={sessions:[],fetches:[],slots:[],cursor:0,effects:[],actor:'a',requests:[],actions:[],uploads:[],tts:[],answers:[],writes:0};const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export const useRef=initial=>{const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i];};
 export const useState=initial=>{const i=c.cursor++;if(!(i in c.slots))c.slots[i]=typeof initial==='function'?initial():initial;return [c.slots[i],v=>{c.writes++;c.slots[i]=typeof v==='function'?v(c.slots[i]):v;}];};
 export const useSyncExternalStore=(subscribe,read)=>read();
 export const useCallback=(fn,deps)=>{const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={fn,deps};return c.slots[i].fn;};
 export const useEffect=(fn,deps)=>{const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();c.slots[i]={deps,cleanup:fn()};});};
 const isCurrentUser=id=>c.actor===id;export const useAuth=()=>({user:c.actor?{id:c.actor}:null,isCurrentUser});
 export const examAudioRequest=(url,signal,owner)=>c.realClient?realAudio(url,signal,owner):new Promise((resolve,reject)=>c.requests.push({url,signal,owner,resolve,reject}));
 c.RequestError=ExamRequestError;
 export const uploadExamSpeech=(body,blob,signal,owner)=>c.realClient?realUpload(body,blob,signal,owner):new Promise((resolve,reject)=>c.uploads.push({body,blob,signal,owner,resolve,reject}));
 export const examRequest=(body,signal,owner)=>c.realActions?realAction(body,signal,owner):new Promise((resolve,reject)=>c.actions.push({body,signal,owner,resolve,reject}));
 export const ACCENTS_BY_LANGUAGE={Spanish:[{code:'es-CR'}]},getVoicesForLocale=()=>[{voiceURI:'device-voice'}];
 export const speakRemote=(text,locale,opts)=>new Promise(resolve=>{c.tts.push({text,locale,opts,resolve});opts.signal.addEventListener('abort',resolve,{once:true});});
 `,
            }));
          },
        },
      ],
    });
    const { ExamSpeechQuestion, c, readSpeechTake, saveSpeechTake, clearSpeechForUser } =
        await import(out),
      audios = [],
      revoked = [];
    let cancels = 0;
    c.realClient = realClient;
    globalThis.fetch = (url, opts) =>
      new Promise((resolve) => c.fetches.push({ url, opts, resolve }));
    globalThis.window = { speechSynthesis: { cancel: () => cancels++ } };
    globalThis.URL = {
      createObjectURL: () => `blob:qa-${audios.length}`,
      revokeObjectURL: (url) => revoked.push(url),
    };
    globalThis.Audio = class {
      constructor(src) {
        this.src = src;
        this.paused = false;
        audios.push(this);
      }
      pause() {
        this.paused = true;
      }
      removeAttribute() {
        this.src = "";
      }
      load() {
        this.loaded = true;
      }
      play() {
        return new Promise((resolve, reject) => {
          this.resolvePlay = resolve;
          this.rejectPlay = reject;
        });
      }
    };
    const media = [],
      permissions = [],
      flushes = [],
      reloads = [],
      working = [];
    let now = 0;
    Object.defineProperty(globalThis, "performance", {
      configurable: true,
      value: { now: () => now },
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        mediaDevices: { getUserMedia: () => new Promise((resolve) => permissions.push(resolve)) },
      },
    });
    globalThis.window.addEventListener = () => {};
    globalThis.window.removeEventListener = () => {};
    globalThis.MediaRecorder = class {
      static isTypeSupported() {
        return true;
      }
      constructor(stream) {
        this.stream = stream;
        this.state = "inactive";
        media.push(this);
      }
      start() {
        this.state = "recording";
      }
      stop() {
        this.state = "inactive";
        if (!c.deferStop) this.onstop?.();
      }
    };
    const stream = () => {
      const track = {
        stops: 0,
        stop() {
          this.stops++;
        },
      };
      return { track, getTracks: () => [track] };
    };
    const unmount = () => {
      for (const s of c.slots) s?.cleanup?.();
    };
    const onWorkingChange = (value) => working.push(value);
    let key;
    const render = (itemId = "item-a", attemptId = "attempt-a") => {
      const outer = ExamSpeechQuestion({
        itemId,
        attemptId,
        scope: "personal",
        flush: () => new Promise((resolve) => flushes.push(resolve)),
        revision: () => 12,
        reload: () => new Promise((resolve, reject) => reloads.push({ resolve, reject })),
        onWorkingChange,
      });
      if (key !== outer.key) {
        unmount();
        c.slots = [];
        key = outer.key;
      }
      c.cursor = 0;
      const tree = outer.type(outer.props);
      for (const f of c.effects.splice(0)) f();
      return tree;
    };
    const policy = {
      enabled: true,
      version: "synthetic-policy",
      notice: "fixture only",
      retentionDays: 30,
    };
    const enable = async (item = "item-a") => {
      render(item);
      c.actions.at(-1).resolve(policy);
      await tick();
      const tree = render(item);
      nodes(tree)
        .find((n) => n.type === "input")
        .props.onChange({ target: { checked: true } });
      return render(item);
    };
    const button = (tree, label) =>
      nodes(tree).find((n) => n.type === "button" && n.props.children === label);
    const put = (item = "item-a") =>
      saveSpeechTake(c.actor, "attempt-a", item, {
        blob: new Blob(["synthetic non-speech fixture"]),
        mime: "audio/webm",
        durationMs: 1000,
        policyVersion: policy.version,
      });
    try {
      await action({
        c,
        render,
        unmount,
        enable,
        policy,
        button,
        permissions,
        media,
        stream,
        flushes,
        reloads,
        working,
        put,
        readSpeechTake,
        setTime: (v) => (now = v),
      });
    } finally {
      unmount();
      clearSpeechForUser("a");
      clearSpeechForUser("b");
    }
  } finally {
    for (const [k, d] of Object.entries(old)) {
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
    }
    rmSync(dir, { recursive: true, force: true });
  }
}
test("record permission is single-flight and late microphone streams close on question/account departure", async () => {
  await fixture(
    async ({ c, enable, render, button, policy, permissions, media, stream, unmount }) => {
      let tree = await enable();
      const start = button(tree, "Record my answer");
      start.props.onClick();
      start.props.onClick();
      assert.equal(c.actions.length, 2);
      c.actions[1].resolve(policy);
      await tick();
      assert.equal(permissions.length, 1);
      render("item-b");
      const late = stream();
      permissions[0](late);
      await tick();
      assert.equal(late.track.stops, 1);
      assert.equal(media.length, 0);
      tree = await enable("item-b");
      button(tree, "Record my answer").props.onClick();
      c.actions.at(-1).resolve(policy);
      await tick();
      c.actor = "b";
      const foreign = stream();
      permissions[1](foreign);
      await tick();
      assert.equal(foreign.track.stops, 1);
      assert.equal(media.length, 0);
      render("item-b");
      unmount();
    },
  );
});
test("recording finishes once into its original account/question memory and cancelled capture saves nothing", async () => {
  await fixture(
    async ({
      c,
      enable,
      render,
      button,
      policy,
      permissions,
      media,
      stream,
      readSpeechTake,
      setTime,
    }) => {
      let tree = await enable();
      button(tree, "Record my answer").props.onClick();
      c.actions.at(-1).resolve(policy);
      await tick();
      const input = stream();
      permissions[0](input);
      await tick();
      const rec = media[0],
        end = rec.onstop;
      rec.ondataavailable({ data: new Blob(["x".repeat(40)]) });
      setTime(1000);
      // Leaving a question stops capture, preserving the completed original owned draft.
      render("item-b");
      end();
      assert.equal(rec.onstop, null);
      assert.equal(rec.ondataavailable, null);
      assert.ok(input.track.stops > 0);
      assert.equal(readSpeechTake("a", "attempt-a", "item-a").durationMs, 1000);
      assert.equal(readSpeechTake("a", "attempt-a", "item-b"), undefined);
      tree = await enable("item-b");
      button(tree, "Record my answer").props.onClick();
      c.actions.at(-1).resolve(policy);
      await tick();
      permissions[1](stream());
      await tick();
      media[1].ondataavailable({ data: new Blob(["x".repeat(40)]) });
      setTime(2000);
      button(render("item-b"), "Cancel recording").props.onClick();
      assert.equal(readSpeechTake("a", "attempt-a", "item-b"), undefined);
    },
  );
});
test("upload and reload completions cannot clear or alter another question or departed account", async () => {
  await fixture(
    async ({ c, enable, render, button, put, flushes, reloads, readSpeechTake, unmount }) => {
      let tree = await enable();
      put();
      tree = render();
      const upload = button(tree, "Upload this recording");
      upload.props.onClick();
      upload.props.onClick();
      assert.equal(flushes.length, 1);
      render("item-b");
      flushes[0](true);
      await tick();
      assert.equal(c.uploads.length, 0);
      assert.ok(readSpeechTake("a", "attempt-a", "item-a"));
      tree = await enable();
      tree = render();
      button(tree, "Upload this recording").props.onClick();
      flushes[1](true);
      await tick();
      assert.equal(c.uploads.length, 1);
      c.uploads[0].resolve({ attached: true, evidenceId: "synthetic" });
      await tick();
      assert.equal(reloads.length, 1);
      render("item-b");
      const writes = c.writes;
      reloads[0].resolve({});
      await tick();
      assert.equal(c.writes, writes);
      assert.ok(readSpeechTake("a", "attempt-a", "item-a"));
      tree = await enable();
      tree = render();
      button(tree, "Retry recording upload").props.onClick();
      flushes[2](true);
      await tick();
      assert.equal(c.uploads[1].body.requestId, c.uploads[0].body.requestId);
      c.uploads[1].resolve({ attached: true, evidenceId: "synthetic" });
      await tick();
      reloads[1].resolve({});
      await tick();
      assert.equal(readSpeechTake("a", "attempt-a", "item-a"), undefined);
      put();
      tree = render();
      button(tree, "Discard unsaved recording").props.onClick();
      button(tree, "Discard unsaved recording").props.onClick();
      assert.equal(reloads.length, 3);
      unmount();
      const after = c.writes;
      reloads[2].reject(new Error("late"));
      await tick();
      assert.equal(c.writes, after);
    },
  );
});

test("late stopped capture cannot replace a newer take for the same question", async () => {
  await fixture(
    async ({
      c,
      enable,
      render,
      button,
      policy,
      permissions,
      media,
      stream,
      readSpeechTake,
      setTime,
    }) => {
      let tree = await enable();
      button(tree, "Record my answer").props.onClick();
      c.actions.at(-1).resolve(policy);
      await tick();
      permissions[0](stream());
      await tick();
      const old = media[0],
        oldEnd = old.onstop,
        oldError = old.onerror;
      old.ondataavailable({ data: new Blob(["o".repeat(40)]) });
      c.deferStop = true;
      setTime(1000);
      render("item-b");
      tree = await enable();
      button(tree, "Record my answer").props.onClick();
      c.actions.at(-1).resolve(policy);
      await tick();
      permissions[1](stream());
      await tick();
      media[1].ondataavailable({ data: new Blob(["n".repeat(50)]) });
      c.deferStop = false;
      setTime(2000);
      button(render(), "Stop recording").props.onClick();
      const newer = readSpeechTake("a", "attempt-a", "item-a");
      assert.equal(newer.blob.size, 50);
      oldEnd();
      oldError();
      assert.equal(readSpeechTake("a", "attempt-a", "item-a"), newer);
    },
  );
});
test("policy change blocks microphone; conflict reload remains single-flight and ignores departed reply", async () => {
  await fixture(
    async ({ c, enable, render, button, policy, permissions, put, flushes, reloads }) => {
      let tree = await enable();
      button(tree, "Record my answer").props.onClick();
      c.actions.at(-1).resolve({ ...policy, version: "new-policy" });
      await tick();
      assert.equal(permissions.length, 0);
      tree = render();
      assert.equal(nodes(tree).find((n) => n.type === "input").props.checked, false);
      nodes(tree)
        .find((n) => n.type === "input")
        .props.onChange({ target: { checked: true } });
      put();
      tree = render();
      button(tree, "Upload this recording").props.onClick();
      flushes[0](true);
      await tick();
      c.uploads[0].reject(new c.RequestError("conflict", 409));
      await tick();
      tree = render();
      const retry = button(tree, "Load latest saved answers before retry");
      retry.props.onClick();
      retry.props.onClick();
      assert.equal(reloads.length, 1);
      reloads[0].resolve({});
      await tick();
      const pending = c.actions.at(-1);
      render("item-b");
      const writes = c.writes;
      pending.resolve(policy);
      await tick();
      assert.equal(pending.signal.aborted, true);
      assert.equal(c.writes, writes);
    },
  );
});

test("speech upload refuses mismatched SDK credentials and preserves the original take and retry metadata", () =>
  fixture(async ({ c, enable, render, button, put, flushes, reloads, readSpeechTake }) => {
    await enable();
    put();
    button(render(), "Upload this recording").props.onClick();
    flushes.shift()(true);
    await tick();
    const original = readSpeechTake("a", "attempt-a", "item-a");
    c.sessions.shift()({ data: { session: { user: { id: "b" }, access_token: "synthetic-b" } } });
    await tick();
    assert.equal(c.fetches.length, 0);
    assert.equal(reloads.length, 0);
    assert.deepEqual(readSpeechTake("a", "attempt-a", "item-a").upload, original.upload);
    assert.equal(readSpeechTake("a", "attempt-a", "item-a").blob, original.blob);
    button(render(), "Retry recording upload").props.onClick();
    flushes.shift()(true);
    await tick();
    c.sessions.shift()({ data: { session: { user: { id: "a" }, access_token: "synthetic-a" } } });
    await tick();
    assert.equal(c.fetches.length, 1);
    assert.equal(
      JSON.parse(c.fetches[0].opts.headers["X-Assessment-Speech"]).requestId,
      original.upload.requestId,
    );
    c.fetches[0].resolve({
      ok: true,
      json: async () => ({ attached: true, evidenceId: "synthetic-evidence" }),
    });
    await tick();
    assert.equal(reloads.length, 1);
    reloads[0].resolve({});
    await tick();
    assert.equal(readSpeechTake("a", "attempt-a", "item-a"), undefined);
  }, true));

test("speech policy refresh refuses SDK mismatch before microphone permission", () =>
  fixture(async ({ c, enable, render, button, permissions }) => {
    await enable();
    c.realActions = true;
    button(render(), "Record my answer").props.onClick();
    c.sessions.shift()({ data: { session: { user: { id: "b" }, access_token: "synthetic-b" } } });
    await tick();
    assert.equal(c.fetches.length, 0);
    assert.equal(permissions.length, 0);
  }, true));
