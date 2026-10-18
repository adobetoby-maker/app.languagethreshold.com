import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

test("actual missionary speech hook cancels delayed starts, stale phrase callbacks and fade timers across scope/actor/unmount", async () => {
  const dir = mkdtempSync(resolve("node_modules/.cache/missionary-speech-"));
  const saved = Object.fromEntries(
    ["window", "localStorage", "setTimeout", "clearTimeout"].map((k) => [
      k,
      Object.getOwnPropertyDescriptor(globalThis, k),
    ]),
  );
  const timers = new Map();
  let timerId = 0;
  globalThis.window = {};
  globalThis.localStorage = { getItem: () => null, setItem: () => {} };
  globalThis.setTimeout = (fn) => {
    timers.set(++timerId, fn);
    return timerId;
  };
  globalThis.clearTimeout = (id) => timers.delete(id);
  try {
    const out = join(dir, "hook.mjs");
    await build({
      stdin: {
        contents: `export {useMissionarySpeech} from './src/components/missionary/useMissionarySpeech';export {c} from 'fixture';`,
        resolveDir: process.cwd(),
      },
      outfile: out,
      bundle: true,
      format: "esm",
      platform: "node",
      logLevel: "silent",
      plugins: [
        {
          name: "missionary-lifecycle",
          setup(b) {
            b.onResolve(
              { filter: /^(fixture|react|@\/state\/(auth|speech)-state|@\/lib\/tts)$/ },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `
        export const c={actor:'a',remote:false,voice:null,host:null,requests:[],stateWrites:0};
        const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
        export const useRef=initial=>{const h=c.host,i=h.cursor++;if(!(i in h.slots))h.slots[i]={current:initial};return h.slots[i];};
        export const useState=initial=>{const h=c.host,i=h.cursor++;if(!(i in h.slots))h.slots[i]=initial;return [h.slots[i],value=>{c.stateWrites++;h.slots[i]=typeof value==='function'?value(h.slots[i]):value;}];};
        export const useCallback=(fn,deps)=>{const h=c.host,i=h.cursor++,old=h.slots[i];if(!old||changed(old.deps,deps))h.slots[i]={fn,deps};return h.slots[i].fn;};
        export const useEffect=(fn,deps)=>{const h=c.host,i=h.cursor++,old=h.slots[i];if(!old||changed(old.deps,deps))h.effects.push(()=>{old?.cleanup?.();h.slots[i]={deps,cleanup:fn()};});};
        const isCurrentUser=id=>c.actor===id;
        export const useAuth=()=>({user:c.actor?{id:c.actor}:null,isCurrentUser});
        export const useSpeech=()=>({accent:'es-CR',voiceURI:c.voice});
        export const needsRemoteTTS=()=>c.remote;
        export const speakRemote=(text,locale,opts)=>{c.requests.push({text,locale,opts});return Promise.resolve();};
      `,
            }));
          },
        },
      ],
    });
    const { useMissionarySpeech, c } = await import(out);
    const host = { slots: [], cursor: 0, effects: [] };
    const render = (context) => {
      c.host = host;
      host.cursor = 0;
      const value = useMissionarySpeech(context);
      for (const f of host.effects.splice(0)) f();
      return value;
    };
    const unmount = () => {
      for (const s of host.slots) s?.cleanup?.();
    };
    const fire = () => {
      const entries = [...timers];
      timers.clear();
      for (const [, fn] of entries) fn();
    };
    let view = render();
    view.speak("same", "uno dos", "Spanish");
    const delayed = [...timers.values()][0];
    unmount();
    assert.equal(timers.size, 0);
    const writes = c.stateWrites;
    delayed();
    assert.equal(c.requests.length, 0, "captured cancelled timer cannot start playback");
    assert.equal(c.stateWrites, writes);
    host.slots = [];
    view = render();
    view.speak("same", "uno dos", "Spanish");
    fire();
    assert.equal(c.requests.at(-1).text, "uno");
    const first = c.requests.at(-1);
    first.opts.onend();
    assert.equal(c.requests.at(-1).text, "dos");
    const second = c.requests.at(-1),
      count = c.requests.length;
    first.opts.onend();
    assert.equal(c.requests.length, count, "duplicate end cannot advance twice");
    second.opts.onend();
    const oldFade = [...timers.values()][0];
    view.speak("same", "nuevo texto", "Spanish");
    assert.equal(second.opts.signal.aborted, true);
    oldFade();
    assert.equal(
      render().speaking.fading,
      false,
      "old fade cannot clear a replacement with the same id",
    );
    fire();
    const failure = c.requests.at(-1);
    failure.opts.onerror();
    failure.opts.onend();
    assert.equal(render().speaking, null);
    assert.equal(c.requests.at(-1), failure, "failure cannot continue to the next word");
    c.remote = true;
    view = render();
    view.speak("remote", "frase completa", "Spanish");
    const remote = c.requests.at(-1);
    c.voice = "new-voice";
    view = render();
    assert.equal(remote.opts.signal.aborted, true, "voice scope change aborts only owned playback");
    const beforeLate = c.stateWrites;
    remote.opts.onend();
    remote.opts.onerror();
    assert.equal(c.stateWrites, beforeLate);
    view.speak("actor", "old actor phrase", "Spanish");
    const actorRequest = c.requests.at(-1),
      beforeActor = c.requests.length;
    c.actor = "b";
    actorRequest.opts.onend();
    view.speak("late", "ignored", "Spanish");
    assert.equal(c.requests.length, beforeActor);
    view = render();
    assert.equal(actorRequest.opts.signal.aborted, true);
    view.cycleRate();
    view.cycleRate();
    view = render();
    assert.equal(
      view.rate,
      0.75,
      "rapid rate changes use the current value without replayed updater side effects",
    );
    view.speak("context", "previous lesson phrase", "Spanish");
    const previousLesson = c.requests.at(-1);
    view = render("next-lesson");
    assert.equal(previousLesson.opts.signal.aborted, true);
    const contextWrites = c.stateWrites;
    previousLesson.opts.onend();
    assert.equal(c.stateWrites, contextWrites, "previous lesson cannot update a new context");
    view.speak("last", "new actor phrase", "Spanish");
    const last = c.requests.at(-1);
    unmount();
    const afterUnmount = c.stateWrites;
    last.opts.onend();
    last.opts.onerror();
    assert.equal(c.stateWrites, afterUnmount);
    assert.equal(timers.size, 0);
  } finally {
    for (const [k, d] of Object.entries(saved)) {
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
    }
    rmSync(dir, { recursive: true, force: true });
  }
});
