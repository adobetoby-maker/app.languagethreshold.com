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
        contents: `export {PrivateExamAudio} from './src/components/exams/PrivateExamAudio';export {SpeechEvidencePlayback} from './src/components/exams/SpeechEvidencePlayback';export {c} from 'fixture';`,
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
 export const examRequest=(body,signal)=>new Promise((resolve,reject)=>c.actions.push({body,signal,resolve,reject}));
 export const ACCENTS_BY_LANGUAGE={Spanish:[{code:'es-CR'}]},getVoicesForLocale=()=>[{voiceURI:'device-voice'}];
 export const speakRemote=(text,locale,opts)=>new Promise(resolve=>{c.tts.push({text,locale,opts,resolve});opts.signal.addEventListener('abort',resolve,{once:true});});
 `,
            }));
          },
        },
      ],
    });
    const { PrivateExamAudio, SpeechEvidencePlayback, c } = await import(out),
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
    const unmount = () => {
      for (const s of c.slots) s?.cleanup?.();
    };
    const render = (path = "clip-a") => {
      c.cursor = 0;
      const tree = PrivateExamAudio({
        path,
        onEnded: () => c.answers.push("ended"),
        onAccessLost: () => c.answers.push("lost"),
      });
      for (const f of c.effects.splice(0)) f();
      return tree;
    };
    let speechKey;
    const ready = [];
    const speech = (evidenceId = "evidence-a", learner = false, available = true) => {
      const outer = SpeechEvidencePlayback({
        evidenceId,
        learner,
        available,
        onReviewReady: (v) => ready.push(v),
        onChanged: () => ready.push("changed"),
      });
      if (speechKey !== outer.key) {
        unmount();
        c.slots = [];
        speechKey = outer.key;
      }
      c.cursor = 0;
      const tree = outer.type(outer.props);
      for (const f of c.effects.splice(0)) f();
      return tree;
    };
    const click = (tree) =>
      nodes(tree)
        .find((n) => n.type === "button")
        .props.onClick();
    await action({ c, render, unmount, click, speech, ready, audios, revoked });
  } finally {
    for (const [k, d] of Object.entries(old)) {
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
    }
    rmSync(dir, { recursive: true, force: true });
  }
}
test("private reviewer clips reject stale path/account callbacks and fully release playback", async () => {
  await fixture(async ({ c, render, unmount, click, audios, revoked }) => {
    const first = render();
    click(first);
    click(first);
    assert.equal(c.requests.length, 1);
    const next = render("clip-b");
    assert.equal(c.requests[0].signal.aborted, true);
    assert.equal(
      nodes(next).find((n) => n.type === "button").props.children,
      "Play attached listening clip",
    );
    c.requests[0].resolve({ mode: "private_clip", blob: new Blob(["old"]) });
    await tick();
    assert.equal(audios.length, 0);
    click(next);
    c.requests[1].resolve({ mode: "private_clip", blob: new Blob(["current"]) });
    await tick();
    const oldEnd = audios[0].onended,
      oldError = audios[0].onerror;
    click(render("clip-b"));
    assert.equal(audios[0].onended, null);
    assert.equal(audios[0].src, "");
    assert.equal(audios[0].loaded, true);
    assert.equal(revoked.length, 1);
    click(render("clip-b"));
    oldEnd();
    oldError();
    audios[0].rejectPlay(new Error("old failure"));
    await tick();
    assert.equal(c.answers.length, 0);
    assert.equal(
      nodes(render("clip-b")).find((n) => n.type === "button").props.children,
      "Stop playback",
    );
    c.requests[2].resolve({ mode: "private_clip", blob: new Blob(["retry"]) });
    await tick();
    const end = audios[1].onended;
    end();
    end();
    assert.deepEqual(c.answers, ["ended"]);
    assert.equal(revoked.length, 2);
    click(render("clip-b"));
    c.actor = "b";
    c.requests[3].resolve({ mode: "private_clip", blob: new Blob(["foreign"]) });
    await tick();
    assert.equal(audios.length, 2);
    render("clip-b");
    assert.equal(c.requests[3].signal.aborted, true);
    click(render("clip-b"));
    unmount();
    const writes = c.writes;
    c.requests[4].resolve({ mode: "private_clip", blob: new Blob(["unmounted"]) });
    await tick();
    assert.equal(c.writes, writes);
    assert.equal(audios.length, 2);
  });
});
test("speech review acknowledgement and withdrawal stay with mounted evidence and actor", async () => {
  await fixture(async ({ c, speech, ready, unmount }) => {
    const input = (t) => nodes(t).find((n) => n.type === "input");
    const player = (t) => nodes(t).find((n) => typeof n.type === "function" && n.props.path);
    let tree = speech();
    assert.equal(input(tree).props.disabled, true);
    input(tree).props.onChange();
    assert.equal(c.actions.length, 0);
    player(tree).props.onEnded();
    tree = speech();
    input(tree).props.onChange();
    input(tree).props.onChange();
    assert.equal(c.actions.length, 1);
    tree = speech("evidence-b");
    assert.equal(c.actions[0].signal.aborted, true);
    assert.equal(input(tree).props.disabled, true);
    c.actions[0].resolve({});
    await tick();
    assert.equal(ready.includes(true), false);
    player(tree).props.onEnded();
    tree = speech("evidence-b");
    input(tree).props.onChange();
    c.actions[1].resolve({});
    await tick();
    assert.equal(ready.filter((v) => v === true).length, 1);
    assert.equal(input(speech("evidence-b")).props.checked, true);
    tree = speech("evidence-c", true);
    nodes(tree)
      .find((n) => n.type === "button")
      .props.onClick();
    tree = speech("evidence-c", true);
    const confirm = nodes(tree).find(
      (n) => n.type === "button" && n.props.children === "Confirm withdrawal",
    );
    confirm.props.onClick();
    confirm.props.onClick();
    assert.equal(c.actions.length, 3);
    c.actor = "b";
    const writes = c.writes;
    c.actions[2].resolve({});
    await tick();
    assert.equal(c.writes, writes);
    assert.equal(ready.includes("changed"), false);
    tree = speech("evidence-c", true);
    assert.equal(c.actions[2].signal.aborted, true);
    nodes(tree)
      .find((n) => n.type === "button")
      .props.onClick();
    tree = speech("evidence-c", true);
    nodes(tree)
      .find((n) => n.type === "button" && n.props.children === "Confirm withdrawal")
      .props.onClick();
    c.actions[3].resolve({});
    await tick();
    assert.equal(ready.filter((v) => v === "changed").length, 1);
    tree = speech("evidence-d");
    player(tree).props.onEnded();
    tree = speech("evidence-d");
    input(tree).props.onChange();
    unmount();
    const after = c.writes;
    c.actions[4].resolve({});
    await tick();
    assert.equal(c.writes, after);
  });
});

test("private clip authorization failures and unavailable evidence do not grant acknowledgement", async () => {
  await fixture(async ({ c, render, click, speech, ready, unmount }) => {
    click(render());
    c.requests[0].reject(new c.RequestError("access lost", 403));
    await tick();
    assert.deepEqual(c.answers, ["lost"]);
    click(render());
    c.requests[1].resolve({ mode: "device_speech_qa_only", text: "unsupported" });
    await tick();
    assert.equal(
      nodes(render()).some((n) => n.props?.role === "alert"),
      true,
    );
    click(render());
    unmount();
    const writes = c.writes;
    c.requests[2].reject(new c.RequestError("late", 401));
    await tick();
    assert.deepEqual(c.answers, ["lost"]);
    assert.equal(c.writes, writes);
    let tree = speech();
    const player = nodes(tree).find((n) => typeof n.type === "function" && n.props.path);
    player.props.onEnded();
    tree = speech();
    nodes(tree)
      .find((n) => n.type === "input")
      .props.onChange();
    c.actions[0].reject(new Error("review failed"));
    await tick();
    tree = speech();
    assert.equal(
      nodes(tree).some((n) => n.props?.role === "alert"),
      true,
    );
    assert.equal(ready.includes(true), false);
    nodes(tree)
      .find((n) => n.type === "input")
      .props.onChange();
    assert.equal(c.actions.length, 2);
    nodes(tree)
      .find((n) => typeof n.type === "function" && n.props.path)
      .props.onAccessLost();
    assert.equal(c.actions[1].signal.aborted, true);
    speech("evidence-a", false, false);
    c.actions[1].resolve({});
    await tick();
    assert.equal(ready.includes(true), false);
  });
});
