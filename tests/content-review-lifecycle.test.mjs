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
async function fixture(action) {
  const dir = mkdtempSync(resolve("node_modules/.cache/exam-listening-"));
  const old = Object.fromEntries(
    ["Audio", "URL", "window"].map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]),
  );
  try {
    const out = join(dir, "component.mjs");
    await build({
      stdin: {
        contents: `export {ContentReviewDecision} from './src/components/exams/ContentReviewDecision';export {FreezeLessonSnapshot} from './src/components/exams/FreezeLessonSnapshot';export {c} from 'fixture';`,
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
                  /^(fixture|react|@\/state\/(auth|speech)-state|@\/lib\/(assessments\/client|voices|tts))$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `
 export const c={slots:[],cursor:0,effects:[],actor:'a',requests:[],actions:[],tts:[],answers:[],writes:0};const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export const useRef=initial=>{const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i];};
 export const useState=initial=>{const i=c.cursor++;if(!(i in c.slots))c.slots[i]=typeof initial==='function'?initial():initial;return [c.slots[i],v=>{c.writes++;c.slots[i]=typeof v==='function'?v(c.slots[i]):v;}];};
 export const useCallback=(fn,deps)=>{const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={fn,deps};return c.slots[i].fn;};
 export const useEffect=(fn,deps)=>{const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();c.slots[i]={deps,cleanup:fn()};});};
 const isCurrentUser=id=>c.actor===id;export const useAuth=()=>({user:c.actor?{id:c.actor}:null,isCurrentUser});
 export const examAudioRequest=(url,signal)=>new Promise((resolve,reject)=>c.requests.push({url,signal,resolve,reject}));
 export class ExamRequestError extends Error {constructor(message,status){super(message);this.status=status;}} c.RequestError=ExamRequestError;
 export const examContentRequest=(body,signal)=>new Promise((resolve,reject)=>c.actions.push({body,signal,resolve,reject}));
 export const examRequest=(body,signal)=>new Promise((resolve,reject)=>c.actions.push({body,signal,resolve,reject}));
 export const ACCENTS_BY_LANGUAGE={Spanish:[{code:'es-CR'}]},getVoicesForLocale=()=>[{voiceURI:'device-voice'}];
 export const speakRemote=(text,locale,opts)=>new Promise(resolve=>{c.tts.push({text,locale,opts,resolve});opts.signal.addEventListener('abort',resolve,{once:true});});
 `,
            }));
          },
        },
      ],
    });
    const { ContentReviewDecision, FreezeLessonSnapshot, c } = await import(out),
      audios = [],
      revoked = [];
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
    const recorded = [],
      bound = [],
      lost = [];
    const unmount = () => {
      for (const s of c.slots) s?.cleanup?.();
    };
    let key;
    const render = (kind = "review", overrides = {}) => {
      const outer =
        kind === "review"
          ? ContentReviewDecision({
              formId: "form-a",
              context: {
                fingerprint: "fp-a",
                reviewKinds: ["domain"],
                lessonBindingCurrent: true,
                decisions: [],
                ...overrides,
              },
              onRecorded: () => recorded.push(true),
              onAccessLost: () => lost.push(true),
            })
          : FreezeLessonSnapshot({
              data: {
                releaseId: "release-a",
                fingerprint: "fp-a",
                releaseManifest: { version: "manifest-a" },
                releaseContentVersion: "content-a",
                canBind: true,
                ...overrides,
              },
              onBound: () => bound.push(true),
              onAccessLost: () => lost.push(true),
            });
      const nextKey = kind + outer.key;
      if (key !== nextKey) {
        unmount();
        c.slots = [];
        key = nextKey;
      }
      c.cursor = 0;
      const tree = outer.type(outer.props);
      for (const f of c.effects.splice(0)) f();
      return tree;
    };
    const confirm = (tree) =>
      nodes(tree)
        .find((n) => n.type === "input")
        .props.onChange({ target: { checked: true } });
    const note = (tree, value = "synthetic fixture findings") =>
      nodes(tree)
        .find((n) => n.type === "textarea")
        .props.onChange({ target: { value } });
    const submit = (tree) =>
      nodes(tree)
        .find((n) => n.type === "form")
        .props.onSubmit({ preventDefault() {} });
    try {
      await action({ c, render, unmount, recorded, bound, lost, confirm, note, submit });
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
test("content review confirmation follows exact actor/form/assignment/binding scope and rejects late decisions", async () => {
  await fixture(async ({ c, render, recorded, confirm, note, submit }) => {
    let tree = render();
    submit(tree);
    assert.equal(c.actions.length, 0);
    note(tree);
    tree = render();
    confirm(tree);
    tree = render();
    submit(tree);
    submit(tree);
    assert.equal(c.actions.length, 1);
    tree = render("review", { fingerprint: "fp-b" });
    assert.equal(c.actions[0].signal.aborted, true);
    assert.equal(nodes(tree).find((n) => n.type === "input").props.checked, false);
    assert.equal(nodes(tree).find((n) => n.type === "textarea").props.value, "");
    const writes = c.writes;
    c.actions[0].resolve({});
    await tick();
    assert.equal(c.writes, writes);
    assert.equal(recorded.length, 0);
    note(tree);
    tree = render("review", { fingerprint: "fp-b" });
    confirm(tree);
    tree = render("review", { fingerprint: "fp-b" });
    tree = render("review", { fingerprint: "fp-b", reviewKinds: ["curriculum"] });
    assert.equal(nodes(tree).find((n) => n.type === "input").props.checked, false);
    assert.equal(nodes(tree).find((n) => n.type === "select").props.value, "curriculum");
    note(tree);
    tree = render("review", { fingerprint: "fp-b", reviewKinds: ["curriculum"] });
    confirm(tree);
    tree = render("review", { fingerprint: "fp-b", reviewKinds: ["curriculum"] });
    note(tree, "edited synthetic findings");
    tree = render("review", { fingerprint: "fp-b", reviewKinds: ["curriculum"] });
    assert.equal(nodes(tree).find((n) => n.type === "input").props.checked, false);
    c.actor = "b";
    tree = render();
    assert.equal(nodes(tree).find((n) => n.type === "input").props.checked, false);
  });
});
test("content review retries preserve identity, active errors remain honest and stale access loss is ignored", async () => {
  await fixture(async ({ c, render, unmount, recorded, lost, confirm, note, submit }) => {
    let tree = render();
    note(tree);
    tree = render();
    confirm(tree);
    tree = render();
    submit(tree);
    c.actions[0].reject(new Error("synthetic retry"));
    await tick();
    tree = render();
    assert.equal(
      nodes(tree).some((n) => n.props?.role === "alert"),
      true,
    );
    submit(tree);
    assert.equal(c.actions[1].body.requestId, c.actions[0].body.requestId);
    c.actions[1].resolve({});
    await tick();
    assert.equal(recorded.length, 1);
    tree = render("review", { lessonBindingCurrent: false });
    const decision = nodes(tree).filter((n) => n.type === "select")[1];
    decision.props.onChange({ target: { value: "approved" } });
    note(tree);
    tree = render("review", { lessonBindingCurrent: false });
    confirm(tree);
    tree = render("review", { lessonBindingCurrent: false });
    submit(tree);
    assert.equal(c.actions.length, 2);
    nodes(tree)
      .filter((n) => n.type === "select")[1]
      .props.onChange({ target: { value: "changes_requested" } });
    tree = render("review", { lessonBindingCurrent: false });
    confirm(tree);
    tree = render("review", { lessonBindingCurrent: false });
    submit(tree);
    c.actions[2].reject(new c.RequestError("denied", 403));
    await tick();
    assert.equal(lost.length, 1);
    submit(render("review", { lessonBindingCurrent: false }));
    unmount();
    const writes = c.writes;
    c.actions[3].reject(new c.RequestError("late", 401));
    await tick();
    assert.equal(lost.length, 1);
    assert.equal(c.writes, writes);
  });
});
test("snapshot confirmation resets on manifest/version/permission/account changes; departed completion cannot bind new view", async () => {
  await fixture(async ({ c, render, confirm, submit, bound }) => {
    let tree = render("freeze");
    submit(tree);
    assert.equal(c.actions.length, 0);
    confirm(tree);
    tree = render("freeze");
    submit(tree);
    submit(tree);
    assert.equal(c.actions.length, 1);
    tree = render("freeze", { releaseManifest: { version: "manifest-b" } });
    assert.equal(c.actions[0].signal.aborted, true);
    assert.equal(nodes(tree).find((n) => n.type === "input").props.checked, false);
    c.actions[0].resolve({});
    await tick();
    assert.equal(bound.length, 0);
    confirm(tree);
    tree = render("freeze", { releaseManifest: { version: "manifest-b" } });
    tree = render("freeze", {
      releaseManifest: { version: "manifest-b" },
      releaseContentVersion: "content-b",
    });
    assert.equal(nodes(tree).find((n) => n.type === "input").props.checked, false);
    assert.equal(render("freeze", { canBind: false }), null);
    tree = render("freeze");
    assert.equal(nodes(tree).find((n) => n.type === "input").props.checked, false);
    confirm(tree);
    tree = render("freeze");
    c.actor = "b";
    tree = render("freeze");
    assert.equal(nodes(tree).find((n) => n.type === "input").props.checked, false);
  });
});
test("snapshot retry uses original request ID and current callbacks only", async () => {
  await fixture(async ({ c, render, confirm, submit, bound, lost, unmount }) => {
    let tree = render("freeze");
    confirm(tree);
    tree = render("freeze");
    submit(tree);
    c.actions[0].reject(new Error("retry"));
    await tick();
    submit(render("freeze"));
    assert.equal(c.actions[1].body.requestId, c.actions[0].body.requestId);
    c.actions[1].resolve({});
    await tick();
    assert.equal(bound.length, 1);
    submit(render("freeze"));
    c.actor = "b";
    c.actions[2].resolve({});
    await tick();
    assert.equal(bound.length, 1);
    tree = render("freeze");
    confirm(tree);
    tree = render("freeze");
    submit(tree);
    unmount();
    const writes = c.writes;
    c.actions[3].reject(new c.RequestError("late", 403));
    await tick();
    assert.equal(lost.length, 0);
    assert.equal(c.writes, writes);
  });
});
