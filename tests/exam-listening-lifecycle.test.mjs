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
        contents: `export {ExamListeningQuestion} from './src/components/exams/ExamListeningQuestion';export {c} from 'fixture';`,
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
 export const c={slots:[],cursor:0,effects:[],actor:'a',requests:[],tts:[],answers:[],writes:0};const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export const useRef=initial=>{const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i];};
 export const useState=initial=>{const i=c.cursor++;if(!(i in c.slots))c.slots[i]=typeof initial==='function'?initial():initial;return [c.slots[i],v=>{c.writes++;c.slots[i]=typeof v==='function'?v(c.slots[i]):v;}];};
 export const useCallback=(fn,deps)=>{const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={fn,deps};return c.slots[i].fn;};
 export const useEffect=(fn,deps)=>{const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();c.slots[i]={deps,cleanup:fn()};});};
 const isCurrentUser=id=>c.actor===id;export const useAuth=()=>({user:c.actor?{id:c.actor}:null,isCurrentUser});
 export const examAudioRequest=(url,signal)=>new Promise(resolve=>c.requests.push({url,signal,resolve}));
 export const ACCENTS_BY_LANGUAGE={Spanish:[{code:'es-CR'}]},getVoicesForLocale=()=>[{voiceURI:'device-voice'}];
 export const speakRemote=(text,locale,opts)=>new Promise(resolve=>{c.tts.push({text,locale,opts,resolve});opts.signal.addEventListener('abort',resolve,{once:true});});
 `,
            }));
          },
        },
      ],
    });
    const { ExamListeningQuestion, c } = await import(out),
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
    const render = (attempt = "attempt-a", id = "item-a", answer) => {
      c.cursor = 0;
      const tree = ExamListeningQuestion({
        attemptId: attempt,
        item: { id, options: [{ id: "choice-a", text: "QA choice" }] },
        answer,
        onAnswer: (a) => c.answers.push(a),
      });
      for (const f of c.effects.splice(0)) f();
      return tree;
    };
    const unmount = () => {
      for (const s of c.slots) s?.cleanup?.();
    };
    const play = (tree) =>
      nodes(tree)
        .find((n) => n.type === "button")
        .props.onClick();
    const choice = (tree) => nodes(tree).find((n) => n.type === "input");
    await action({ c, render, unmount, play, choice, audios, revoked, cancels: () => cancels });
  } finally {
    for (const [k, d] of Object.entries(old)) {
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
    }
    rmSync(dir, { recursive: true, force: true });
  }
}
test("actual exam listening owns private clip requests, sources and completion across item/attempt/retry without global cancellation", () =>
  fixture(async ({ c, render, unmount, play, choice, audios, revoked, cancels }) => {
    let tree = render();
    const oldChoice = choice(tree).props.onChange;
    play(tree);
    play(tree);
    assert.equal(c.requests.length, 1);
    tree = render("attempt-b", "item-b");
    assert.equal(c.requests[0].signal.aborted, true);
    assert.equal(choice(tree).props.disabled, true);
    oldChoice();
    assert.equal(c.answers.length, 0);
    c.requests[0].resolve({ mode: "private_clip", blob: {} });
    await tick();
    assert.equal(audios.length, 0, "late private blob cannot create an audio URL");
    play(tree);
    c.requests.at(-1).resolve({ mode: "private_clip", blob: {} });
    await tick();
    const failed = audios.at(-1),
      oldEnd = failed.onended;
    failed.onerror();
    assert.equal(failed.src, "");
    assert.equal(failed.onended, null);
    assert.equal(revoked.length, 1);
    tree = render("attempt-b", "item-b");
    assert.equal(choice(tree).props.disabled, true);
    play(tree);
    c.requests.at(-1).resolve({ mode: "private_clip", blob: {} });
    await tick();
    const current = audios.at(-1),
      currentEnd = current.onended;
    oldEnd();
    failed.rejectPlay(new Error("late play failure"));
    await tick();
    assert.equal(current.onended, currentEnd);
    assert.equal(current.paused, false);
    assert.equal(choice(render("attempt-b", "item-b")).props.disabled, true);
    currentEnd();
    currentEnd();
    tree = render("attempt-b", "item-b");
    assert.equal(choice(tree).props.disabled, false);
    choice(tree).props.onChange();
    assert.equal(c.answers.length, 1);
    assert.equal(c.answers[0].listeningHeard, true);
    assert.equal(current.src, "");
    play(tree);
    c.requests.at(-1).resolve({ mode: "private_clip", blob: {} });
    await tick();
    const final = audios.at(-1),
      late = final.onended;
    tree = render("attempt-b", "item-c");
    assert.equal(final.src, "");
    assert.equal(final.onended, null);
    assert.equal(choice(tree).props.disabled, true);
    late();
    assert.equal(choice(render("attempt-b", "item-c")).props.disabled, true);
    unmount();
    assert.equal(cancels(), 0, "cleanup cannot cancel another surface native speech");
    assert.equal(revoked.length, 3);
  }));
test("actual exam QA listening forces device-only playback and requires current successful completion before answers", () =>
  fixture(async ({ c, render, unmount, play, choice }) => {
    let tree = render();
    play(tree);
    c.requests.at(-1).resolve({ mode: "qa_tts", language: "Spanish", text: "Protected QA sample" });
    await tick();
    const failed = c.tts.at(-1);
    assert.equal(failed.opts.deviceOnly, true);
    assert.equal(failed.opts.voiceURI, "device-voice");
    failed.opts.onerror();
    failed.opts.onend();
    failed.resolve();
    await tick();
    tree = render();
    assert.equal(choice(tree).props.disabled, true);
    play(tree);
    c.requests.at(-1).resolve({ mode: "qa_tts", language: "Spanish", text: "Protected QA sample" });
    await tick();
    const success = c.tts.at(-1);
    success.opts.onend();
    success.opts.onend();
    success.resolve();
    await tick();
    tree = render();
    assert.equal(choice(tree).props.disabled, false);
    const oldChoice = choice(tree).props.onChange;
    tree = render("attempt-new", "item-new");
    oldChoice();
    assert.equal(c.answers.length, 0);
    assert.equal(choice(tree).props.disabled, true);
    play(tree);
    c.requests.at(-1).resolve({ mode: "qa_tts", language: "Spanish", text: "Protected QA sample" });
    await tick();
    const late = c.tts.at(-1);
    c.actor = "b";
    const writes = c.writes;
    late.opts.onend();
    assert.equal(c.writes, writes);
    unmount();
    assert.equal(late.opts.signal.aborted, true);
    late.resolve();
    await tick();
    assert.equal(c.writes, writes);
    c.slots = [];
    tree = render("attempt-new", "item-new", { listeningHeard: true, choiceId: "choice-a" });
    assert.equal(choice(tree).props.disabled, false, "saved answer heard flag is preserved");
    unmount();
  }));
