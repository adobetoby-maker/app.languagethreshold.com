import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { createLearnerDeviceStore } from "../src/lib/learner-device-store.ts";

test("actual SpeechProvider cancels queued text, rejects old actor callbacks, and counts each heard event once outside replayed updaters", async () => {
  const dir = mkdtempSync(resolve("node_modules/.cache/speech-provider-"));
  const saved = {
    window: globalThis.window,
    utterance: globalThis.SpeechSynthesisUtterance,
    set: globalThis.setTimeout,
    clear: globalThis.clearTimeout,
  };
  const timers = new Map(),
    allTimers = [],
    utterances = [];
  let timerId = 0;
  globalThis.setTimeout = (fn) => {
    const id = ++timerId;
    timers.set(id, fn);
    allTimers.push(fn);
    return id;
  };
  globalThis.clearTimeout = (id) => timers.delete(id);
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
    }
  };
  globalThis.window = {
    speechSynthesis: {
      cancel() {},
      speak(u) {
        utterances.push(u);
      },
    },
  };
  try {
    const outfile = join(dir, "provider.mjs");
    await build({
      stdin: {
        contents: `export {SpeechProvider} from './src/state/speech-state';export {controls} from 'fixture';`,
        resolveDir: process.cwd(),
      },
      outfile,
      bundle: true,
      format: "esm",
      platform: "node",
      jsx: "automatic",
      logLevel: "silent",
      plugins: [
        {
          name: "provider-host",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(fixture|react|react\/jsx-runtime|sonner|@\/state\/auth-state|@\/hooks\/use-learner-device-store|@\/lib\/(voices|tts))$/,
              },
              () => ({ path: "host", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `
 export const controls={actor:'a',stores:{},slots:[],cursor:0,effects:[],remote:false,remoteJobs:[],stops:0,toasts:0,begin(){this.cursor=0;},commit(){for(const f of this.effects.splice(0))f();},unmount(){for(const s of this.slots)s?.cleanup?.();this.slots=[];this.effects=[];}};
 const changed=(a,b)=>!a||!b||a.length!==b.length||a.some((v,i)=>v!==b[i]);
 export function useState(initial){const i=controls.cursor++;if(!(i in controls.slots))controls.slots[i]=typeof initial==='function'?initial():initial;return [controls.slots[i],v=>{if(typeof v==='function'){v(controls.slots[i]);controls.slots[i]=v(controls.slots[i]);}else controls.slots[i]=v;}];}
 export function useRef(initial){const i=controls.cursor++;if(!(i in controls.slots))controls.slots[i]={current:initial};return controls.slots[i];}
 export function useMemo(fn,deps){const i=controls.cursor++,old=controls.slots[i];if(!old||changed(old.deps,deps))controls.slots[i]={deps,value:fn()};return controls.slots[i].value;}
 export const useCallback=(fn,deps)=>useMemo(()=>fn,deps);
 export function useEffect(fn,deps){const i=controls.cursor++,old=controls.slots[i];if(!old||changed(old.deps,deps))controls.effects.push(()=>{old?.cleanup?.();controls.slots[i]={deps,cleanup:fn()};});}
 export const createContext=()=>({Provider:'provider'}),useContext=()=>null,jsx=(type,props)=>({type,props}),jsxs=jsx;
 const isCurrentUser=id=>id===controls.actor;export const useAuth=()=>({user:controls.actor?{id:controls.actor}:null,isCurrentUser});
 export const useLearnerDeviceStore=kind=>controls.stores[kind];export const configureUtterance=()=>{};
 export const needsRemoteTTS=()=>controls.remote,speakRemote=(text,locale,opts)=>{controls.remoteJobs.push({text,opts});return Promise.resolve();},stopRemoteTTS=()=>controls.stops++;
 export const toast=()=>controls.toasts++;
 `,
            }));
          },
        },
      ],
    });
    const { SpeechProvider, controls: c } = await import(outfile);
    const records = new Map();
    const storage = {
      getItem: (k) => records.get(k) ?? null,
      setItem: (k, v) => records.set(k, v),
    };
    const setStores = (actor) => {
      c.stores = {
        speech: createLearnerDeviceStore({
          kind: "speech",
          actor,
          storage,
          isCurrent: () => c.actor === actor,
        }),
        heardWords: createLearnerDeviceStore({
          kind: "heardWords",
          actor,
          storage,
          isCurrent: () => c.actor === actor,
        }),
      };
    };
    setStores("a");
    c.stores.speech.write({ listenedCount: 9 });
    let xp = 0,
      achievements = 0;
    const props = {
      children: null,
      language: "Spanish",
      onXp: (n) => (xp += n),
      onAchievement: () => achievements++,
      hasAchievement: () => false,
    };
    const render = () => {
      c.begin();
      const result = SpeechProvider(props).props.value;
      c.commit();
      return result;
    };
    const drain = () => {
      const jobs = [...timers.values()];
      timers.clear();
      jobs.forEach((fn) => fn());
    };
    let v = render();
    v = render();
    assert.equal(v.listenedCount, 9);
    v.speakSentence("Queued A", 0);
    const staleTimer = allTimers.at(-1);
    v.stop();
    drain();
    staleTimer();
    assert.equal(utterances.length, 0);
    v.speakSentence("Actor A", 0);
    drain();
    const staleEnd = utterances.at(-1).onend;
    c.actor = "b";
    staleEnd();
    assert.equal(xp, 0);
    c.actor = "a";
    v.stop();
    v.speakSentence("Heard once", 0);
    drain();
    const end = utterances.at(-1).onend;
    end();
    end();
    v = render();
    assert.equal(xp, 1);
    assert.equal(achievements, 1);
    assert.equal(v.listenedCount, 10);
    v.speakSentence("Failed device", 1);
    drain();
    const failed = utterances.at(-1);
    failed.onerror();
    failed.onend();
    assert.equal(xp, 1);
    c.remote = true;
    v.speakSentence("Failed remote", 1);
    drain();
    const remote = c.remoteJobs.at(-1);
    remote.opts.onerror();
    remote.opts.onend();
    assert.equal(xp, 1);
    v.speakSentence("Remote heard", 1);
    drain();
    const heard = c.remoteJobs.at(-1);
    heard.opts.onend();
    heard.opts.onend();
    assert.equal(xp, 2);
    v = render();
    c.remote = false;
    const before = utterances.length;
    v.speakSentences([{ text: "Stopped by movement", index: 0 }], () => v.stop());
    drain();
    assert.equal(utterances.length, before);
    v.speakWord("Old language");
    const oldLanguageTimer = allTimers.at(-1);
    props.language = "French";
    v = render();
    oldLanguageTimer();
    assert.equal(utterances.length, before);
    v.speakSentence("Unmount queue", 0);
    const oldUnmountTimer = allTimers.at(-1);
    c.unmount();
    oldUnmountTimer();
    assert.equal(utterances.length, before);
    c.actor = "b";
    setStores("b");
    v = render();
    v = render();
    assert.equal(v.listenedCount, 0);
    staleEnd();
    heard.opts.onend();
    assert.equal(xp, 2);
    c.unmount();
    c.actor = "a";
    setStores("a");
    v = render();
    v = render();
    assert.equal(v.listenedCount, 11, "owned counter restored without additional XP");
    assert.equal(xp, 2);
    c.unmount();
  } finally {
    globalThis.window = saved.window;
    globalThis.SpeechSynthesisUtterance = saved.utterance;
    globalThis.setTimeout = saved.set;
    globalThis.clearTimeout = saved.clear;
    rmSync(dir, { recursive: true, force: true });
  }
});
