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
        contents: `export {LocalExamTakeAudio} from './src/components/exams/LocalExamTakeAudio';export {c} from 'fixture';`,
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
    const { LocalExamTakeAudio, c } = await import(out),
      audios = [],
      revoked = [];
    let cancels = 0,
      urls = 0;
    globalThis.window = { speechSynthesis: { cancel: () => cancels++ } };
    globalThis.URL = {
      createObjectURL: () => `blob:qa-${urls++}`,
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
    let current = null,
      last = null;
    const elements = [];
    const render = (blob) => {
      c.cursor = 0;
      const tree = LocalExamTakeAudio({ blob });
      if (!last || last.key !== tree.key) {
        last?.props.ref(null);
        current = {
          src: tree.props.src,
          pauses: 0,
          loads: 0,
          pause() {
            this.pauses++;
          },
          removeAttribute() {
            this.src = "";
          },
          load() {
            this.loads++;
          },
        };
        elements.push(current);
        tree.props.ref(current);
      }
      last = tree;
      for (const f of c.effects.splice(0)) f();
      return tree;
    };
    const unmount = () => {
      last?.props.ref(null);
      last = null;
      for (const s of c.slots) s?.cleanup?.();
    };
    try {
      await action({ c, render, unmount, elements, revoked });
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
test("local recording preview detaches and clears replaced/foreign/unmounted media before releasing URLs", async () => {
  await fixture(async ({ c, render, unmount, elements, revoked }) => {
    const a = new Blob(["synthetic a"]),
      b = new Blob(["synthetic b"]);
    assert.equal(render(a).props.src, undefined);
    assert.ok(render(a).props.src);
    const first = elements.at(-1);
    const firstSrc = first.src;
    assert.equal(render(b).props.src, undefined);
    assert.equal(first.pauses, 1);
    assert.equal(first.loads, 1);
    assert.equal(first.src, "");
    assert.ok(revoked.includes(firstSrc));
    render(b);
    const second = elements.at(-1);
    const secondSrc = second.src;
    c.actor = "b";
    assert.equal(render(b).props.src, undefined);
    assert.equal(second.pauses, 1);
    assert.equal(second.src, "");
    assert.ok(revoked.includes(secondSrc));
    render(b);
    const third = elements.at(-1),
      thirdSrc = third.src;
    unmount();
    assert.equal(third.pauses, 1);
    assert.equal(third.loads, 1);
    assert.equal(third.src, "");
    assert.ok(revoked.includes(thirdSrc));
    assert.equal(a.size, 11);
    assert.equal(b.size, 11);
  });
});
