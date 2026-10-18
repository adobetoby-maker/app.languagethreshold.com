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
    ["fetch", "Audio", "URL", "window"].map((k) => [
      k,
      Object.getOwnPropertyDescriptor(globalThis, k),
    ]),
  );
  try {
    const out = join(dir, "component.mjs");
    await build({
      stdin: {
        contents: `export {Route} from './src/routes/exam-content';export {c} from 'fixture';`,
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
                  /^(fixture$|react$|@tanstack\/react-router|@\/state\/auth-state|@\/lib\/assessments\/client|@\/data\/(modules|languages)|@\/components\/|@\/integrations\/supabase\/client$)/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              resolveDir: process.cwd(),
              contents: `
 import {examContentRequest as realContent,examReviewerRequest as realReviewer,examRequest as realRequest,ExamRequestError} from "./src/lib/assessments/client.ts";
 export {ExamRequestError};
 export const supabase={auth:{getSession:()=>new Promise(resolve=>c.sessions.push(resolve))}};
 export const c={sessions:[],fetches:[],slots:[],cursor:0,effects:[],actor:'a',requests:[],actions:[],tts:[],answers:[],writes:0};const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export const useRef=initial=>{const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i];};
 export const useState=initial=>{const i=c.cursor++;if(!(i in c.slots))c.slots[i]=typeof initial==='function'?initial():initial;return [c.slots[i],v=>{c.writes++;c.slots[i]=typeof v==='function'?v(c.slots[i]):v;}];};
 export const useCallback=(fn,deps)=>{const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={fn,deps};return c.slots[i].fn;};
 export const useEffect=(fn,deps)=>{const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();c.slots[i]={deps,cleanup:fn()};});};
 const isCurrentUser=id=>c.actor===id;const actors=new Map();export const useAuth=()=>{if(c.actor&&!actors.has(c.actor))actors.set(c.actor,{id:c.actor});return {user:c.actor?actors.get(c.actor):null,isCurrentUser};};
 export const examAudioRequest=(url,signal)=>new Promise((resolve,reject)=>c.requests.push({url,signal,resolve,reject}));
 export const getModule=id=>({name:id}),LessonContentReview=()=>null,ContentReviewDecision=()=>null,PrivateExamAudio=()=>null;export const createFileRoute=()=>config=>config,AuthProvider=()=>null,AuthButton=()=>null,ThemeToggle=()=>null,AssessmentCleanupStatus=()=>null;
 export const MODULES=[{id:'roofing',name:'Roofing'},{id:'plumber',name:'Plumber'}],LANGUAGES=['Spanish','French'],NATIVE_LANGUAGES=['English','Spanish'];
 c.RequestError=ExamRequestError;
 export const examReviewerRequest=(body,signal,owner)=>c.realClient?realReviewer(body,signal,owner):new Promise((resolve,reject)=>c.actions.push({body,signal,owner,resolve,reject}));
 export const examContentRequest=(body,signal,owner)=>c.realClient?realContent(body,signal,owner):new Promise((resolve,reject)=>c.actions.push({body,signal,owner,resolve,reject}));
 export const examRequest=(url,signal,owner)=>c.realClient?realRequest(url,signal,owner):new Promise((resolve,reject)=>c.requests.push({url,signal,owner,resolve,reject}));
 export const ACCENTS_BY_LANGUAGE={Spanish:[{code:'es-CR'}]},getVoicesForLocale=()=>[{voiceURI:'device-voice'}];
 export const speakRemote=(text,locale,opts)=>new Promise(resolve=>{c.tts.push({text,locale,opts,resolve});opts.signal.addEventListener('abort',resolve,{once:true});});
 `,
            }));
          },
        },
      ],
    });
    const { Route, c } = await import(out),
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
    const owner = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      target = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    c.actor = owner;
    const unmount = () => {
      for (const s of c.slots) s?.cleanup?.();
    };
    let key;
    const render = () => {
      const page = Route.component().props.children,
        outer = page.type(page.props);
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
    try {
      await action({ c, render, owner, unmount });
    } finally {
      unmount();
    }
  } finally {
    for (const [k, d] of Object.entries(old)) {
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
    }
    rmSync(dir, { recursive: true, force: true });
  }
}

test("private content catalog and form reads bind their original SDK account", () =>
  fixture(async ({ c, render, owner }) => {
    render();
    c.sessions.shift()({
      data: { session: { user: { id: "other" }, access_token: "synthetic-other" } },
    });
    await tick();
    assert.equal(c.fetches.length, 0);
    assert.match(JSON.stringify(render()), /Sign in/);
    nodes(render())
      .find((n) => n.type === "button" && n.props.children === "Try again")
      .props.onClick();
    render();
    c.sessions.shift()({
      data: { session: { user: { id: owner }, access_token: "synthetic-owner" } },
    });
    await tick();
    assert.equal(c.fetches.length, 1);
    c.fetches[0].resolve({
      ok: true,
      json: async () => ({
        owner: false,
        registeredOwner: false,
        releases: [
          {
            id: "release-a",
            module_id: "roofing",
            target_language: "Spanish",
            instruction_language: "English",
            status: "draft",
            review_records: [],
            lesson_manifest: {},
          },
        ],
        forms: [
          {
            id: "form-a",
            release_id: "release-a",
            checkpoint: "entrance",
            purpose: "draft",
            version: "v1",
            status: "draft",
            calibrated: false,
          },
        ],
        releaseLimit: 10,
        formLimit: 10,
      }),
    });
    await tick();
    let tree = render();
    nodes(tree)
      .filter((n) => n.type === "select")[1]
      .props.onChange({ target: { value: "form-a" } });
    render();
    c.sessions.shift()({
      data: { session: { user: { id: "other" }, access_token: "synthetic-other" } },
    });
    await tick();
    assert.equal(c.fetches.length, 1);
    assert.match(JSON.stringify(render()), /Sign in/);
  }, true));
