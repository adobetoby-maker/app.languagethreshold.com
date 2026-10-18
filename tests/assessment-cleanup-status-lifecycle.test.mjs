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
    ["Audio", "URL", "window"].map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]),
  );
  const originalFetch = globalThis.fetch;
  try {
    const out = join(dir, "component.mjs");
    await build({
      stdin: {
        contents: `export {AssessmentCleanupStatus} from './src/components/exams/AssessmentCleanupStatus';export {c} from 'fixture';`,
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
            b.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({
              path: "fixture",
              namespace: "fixture",
            }));
            b.onResolve(
              {
                filter:
                  /^(fixture|react|@\/state\/(auth|speech)-state|@\/lib\/(assessments\/client|voices|tts))$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              resolveDir: process.cwd(),
              contents: `
 import {examRequest as realRequest,examPlanRequest as realPlan,ExamRequestError} from "./src/lib/assessments/client.ts";
 export {ExamRequestError};export const supabase={auth:{getSession:()=>new Promise(resolve=>c.sessions.push(resolve))}};
 export const c={sessions:[],fetches:[],slots:[],cursor:0,effects:[],actor:'a',requests:[],actions:[],tts:[],answers:[],writes:0};const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export const useRef=initial=>{const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i];};
 export const useState=initial=>{const i=c.cursor++;if(!(i in c.slots))c.slots[i]=typeof initial==='function'?initial():initial;return [c.slots[i],v=>{c.writes++;c.slots[i]=typeof v==='function'?v(c.slots[i]):v;}];};
 export const useCallback=(fn,deps)=>{const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={fn,deps};return c.slots[i].fn;};
 export const useEffect=(fn,deps)=>{const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();c.slots[i]={deps,cleanup:fn()};});};
 const isCurrentUser=id=>c.actor===id;export const useAuth=()=>({user:c.actor?{id:c.actor}:null,isCurrentUser});
 export const examAudioRequest=(url,signal)=>new Promise((resolve,reject)=>c.requests.push({url,signal,resolve,reject}));
 c.RequestError=ExamRequestError;
 export const examRequest=(url,signal,owner)=>c.realClient?realRequest(url,signal,owner):new Promise((resolve,reject)=>c.requests.push({url,signal,owner,resolve,reject}));
 export const ACCENTS_BY_LANGUAGE={Spanish:[{code:'es-CR'}]},getVoicesForLocale=()=>[{voiceURI:'device-voice'}];
 export const speakRemote=(text,locale,opts)=>new Promise(resolve=>{c.tts.push({text,locale,opts,resolve});opts.signal.addEventListener('abort',resolve,{once:true});});
 `,
            }));
          },
        },
      ],
    });
    const { AssessmentCleanupStatus, c } = await import(out),
      audios = [],
      revoked = [];
    c.realClient = realClient;
    globalThis.fetch = (url, opts) =>
      new Promise((resolve) => c.fetches.push({ url, opts, resolve }));
    let cancels = 0;
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
    const render = () => {
      c.cursor = 0;
      const tree = AssessmentCleanupStatus();
      for (const f of c.effects.splice(0)) f();
      return tree;
    };
    const unmount = () => {
      for (const s of c.slots) s?.cleanup?.();
    };
    const refresh = (tree) =>
      nodes(tree)
        .find((n) => n.type === "button")
        .props.onClick();
    const healthy = {
      executionEnabled: false,
      health: "healthy",
      runs: [],
      note: "synthetic fixture only",
    };
    const text = (tree) => {
      const strings = [];
      const walk = (n) => {
        if (Array.isArray(n)) n.forEach(walk);
        else if (n && typeof n === "object") walk(n.props?.children);
        else if (typeof n === "string" || typeof n === "number") strings.push(String(n));
      };
      walk(tree);
      return strings.join(" ");
    };
    try {
      await action({ c, render, unmount, refresh, healthy, text });
    } finally {
      unmount();
    }
  } finally {
    globalThis.fetch = originalFetch;
    for (const [k, d] of Object.entries(old)) {
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
    }
    rmSync(dir, { recursive: true, force: true });
  }
}
test("cleanup refresh hides previous health immediately and failure cannot retain an old success", async () => {
  await fixture(async ({ c, render, refresh, healthy, text }) => {
    render();
    assert.equal(c.requests.length, 1);
    c.requests[0].resolve(healthy);
    await tick();
    let tree = render();
    assert.match(text(tree), /Most recent scheduled run succeeded/);
    assert.match(text(tree), /Status checked/);
    refresh(tree);
    tree = render();
    assert.match(text(tree), /Loading private operations status/);
    assert.doesNotMatch(
      text(tree),
      /Most recent scheduled run succeeded|Status checked|Scheduled execution:/,
    );
    c.requests[1].reject(new Error("synthetic offline failure"));
    await tick();
    tree = render();
    assert.match(text(tree), /Operations status is unavailable/);
    assert.match(text(tree), /synthetic offline failure/);
    assert.doesNotMatch(
      text(tree),
      /Most recent scheduled run succeeded|Status checked|Scheduled execution:/,
    );
    refresh(tree);
    render();
    c.requests[2].resolve({ ...healthy, health: "not_observed" });
    await tick();
    tree = render();
    assert.match(text(tree), /No scheduled endpoint invocation recorded/);
    assert.doesNotMatch(text(tree), /synthetic offline failure/);
  });
});
test("cleanup account changes and unmount reject delayed replies without stale UI writes", async () => {
  await fixture(async ({ c, render, healthy, text, unmount, refresh }) => {
    const oldTree = render();
    c.actor = "b";
    let tree = render();
    assert.equal(c.requests[0].signal.aborted, true);
    const writes = c.writes;
    c.requests[0].resolve(healthy);
    await tick();
    assert.equal(c.writes, writes);
    assert.doesNotMatch(text(render()), /Most recent scheduled run succeeded/);
    c.requests[1].resolve({ ...healthy, health: "attention" });
    await tick();
    tree = render();
    assert.match(text(tree), /Cleanup needs attention/);
    const reads = c.requests.length;
    refresh(oldTree);
    render();
    assert.equal(c.requests.length, reads);
    refresh(tree);
    render();
    unmount();
    const after = c.writes;
    c.requests[2].reject(new Error("late"));
    await tick();
    assert.equal(c.writes, after);
  });
});
test("cleanup loading refreshes stay single-flight and guest makes no private request", async () => {
  await fixture(async ({ c, render, refresh, healthy, text }) => {
    let tree = render();
    refresh(tree);
    refresh(tree);
    render();
    assert.equal(c.requests.length, 1);
    assert.equal(nodes(tree).find((n) => n.type === "button").props.disabled, true);
    c.requests[0].resolve(healthy);
    await tick();
    tree = render();
    refresh(tree);
    refresh(tree);
    render();
    assert.equal(c.requests.length, 2);
    c.actor = null;
    render();
    assert.equal(c.requests[1].signal.aborted, true);
    tree = render();
    assert.match(text(tree), /authorized owner account/);
    assert.equal(nodes(tree).find((n) => n.type === "button").props.disabled, true);
    assert.equal(c.requests.length, 2);
  });
});

test("cleanup status binds SDK account without manufacturing operational health", () =>
  fixture(async ({ c, render, text }) => {
    render();
    c.sessions.shift()({ data: { session: { user: { id: "b" }, access_token: "synthetic-b" } } });
    await tick();
    assert.equal(c.fetches.length, 0);
    assert.match(text(render()), /Sign in/);
  }, true));
