import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
const tick = () => new Promise((r) => setImmediate(r));
const files = [
  "src/components/missionary/FieldPrepMode.tsx",
  "src/components/modules/ModuleFieldPrep.tsx",
];
const icons = [
  ...new Set(
    files.flatMap((f) =>
      readFileSync(f, "utf8")
        .match(/import\s*\{([^}]+)\}\s*from "lucide-react"/s)[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ),
];
function nodes(n, out = []) {
  if (Array.isArray(n)) n.forEach((v) => nodes(v, out));
  else if (n && typeof n === "object") {
    out.push(n);
    nodes(n.props?.children, out);
  }
  return out;
}
function text(n) {
  if (n == null || typeof n === "boolean") return "";
  if (Array.isArray(n)) return n.map(text).join("");
  if (typeof n === "object") return text(n.props?.children);
  return String(n);
}
for (const [name, file] of [
  ["FieldPrepMode", files[0]],
  ["ModuleFieldPrep", files[1]],
])
  test(`actual ${name} rejects late streams, scopes microphone callbacks and auto-sends once outside replayable updaters`, async () => {
    const dir = mkdtempSync(resolve("node_modules/.cache/field-lifecycle-"));
    const previous = Object.fromEntries(
      ["window", "localStorage", "fetch"].map((k) => [
        k,
        Object.getOwnPropertyDescriptor(globalThis, k),
      ]),
    );
    try {
      const outfile = join(dir, "component.mjs");
      await build({
        stdin: {
          contents: `export {${name}} from './${file}';export {c} from 'fixture';`,
          resolveDir: process.cwd(),
        },
        outfile,
        bundle: true,
        platform: "node",
        format: "esm",
        external: ["react/jsx-runtime"],
        logLevel: "silent",
        plugins: [
          {
            name: "field-fixture",
            setup(b) {
              b.onResolve(
                {
                  filter:
                    /^(fixture|react|lucide-react|sonner|react-markdown|rehype-raw|@\/state\/(app|auth|speech|ai-gate)-state|@\/lib\/(tts|utils|lt-analytics)|@\/hooks\/use-field-prep-analytics|@\/components\/reader\/(ClickableText|WordCard)|@\/data\/(roleplay-scenarios|practice-scenarios|missionary-content)|\.\/(MissionBanner|PostSessionFeedback))$/,
                },
                () => ({ path: "fixture", namespace: "fixture" }),
              );
              b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
                contents: `
 export const c={actor:'a',state:{selectedLanguage:'Spanish',activeModuleId:'roofing',level:'A2',moduleAssignments:{}},slots:[],cursor:0,effects:[],dispatches:[],writes:0,audio:[],errors:[]};
 const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export function useRef(initial){const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i];}
 export function useState(initial){const i=c.cursor++;if(!(i in c.slots))c.slots[i]=typeof initial==='function'?initial():initial;return [c.slots[i],value=>{c.writes++;if(typeof value==='function'){value(c.slots[i]);c.slots[i]=value(c.slots[i]);}else c.slots[i]=value;}];}
 export function useCallback(fn,deps){const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={fn,deps};return c.slots[i].fn;}
 export function useEffect(fn,deps){const i=c.cursor++,old=c.slots[i];if(!old||!deps||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();c.slots[i]={deps,cleanup:fn()};});}
 const isCurrentUser=id=>c.actor===id;export const useAuth=()=>({user:c.actor?{id:c.actor}:null,isCurrentUser});
 export const useApp=()=>({state:c.state,dispatch:a=>c.dispatches.push(a)}),useSpeech=()=>({voiceURI:null}),useAiGate=()=>({gated:fn=>fn()});
 export const speakRemote=(text,locale,opts)=>{c.audio.push({text,locale,opts});return Promise.resolve();};
 export const toast={error:(...args)=>c.errors.push(args)},cn=(...args)=>args.filter(Boolean).join(' ');
 export const FIELD_PREP_ANALYTICS_ENABLED=false,useFieldPrepAnalytics=()=>({appEvent:()=>{},fieldPrepSession:()=>{}});
 const base={id:'qa-scenario',title:'QA scenario',emoji:'*',investigatorName:'QA',investigatorBackground:'QA background',partnerName:'QA',partnerRole:'QA',learnerRole:'QA',moduleGroup:'trades',openingSetup:'QA setup'};
 export const ROLEPLAY_SCENARIOS=[{...base,difficulty:'greenie'}],getPracticeScenarios=()=>[{...base,difficulty:'beginner'}],getMissionArea=()=>null;
 export const DIFFICULTY_BADGE={},DIFFICULTY_LABELS={},PRACTICE_DIFFICULTY_BADGE={},PRACTICE_DIFFICULTY_LABELS={};
 export const ClickableText='span',WordCard='aside',MissionBanner='header',PostSessionFeedback='aside';
 export default function Placeholder(){return null;}
 ${icons.map((n) => `export const ${n}='span';`).join("\n")}
 `,
              }));
            },
          },
        ],
      });
      const mod = await import(outfile),
        { c } = mod;
      const requests = [],
        recognitions = [];
      globalThis.window = {
        SpeechRecognition: class {
          constructor() {
            recognitions.push(this);
          }
          start() {}
          abort() {
            this.aborted = true;
          }
        },
      };
      globalThis.localStorage = { getItem: () => null, setItem: () => {} };
      globalThis.fetch = (url, opts) =>
        new Promise((resolve) => requests.push({ url, opts, resolve }));
      const render = () => {
        c.cursor = 0;
        const tree = mod[name]({ moduleGroup: "trades" });
        for (const f of c.effects.splice(0)) f();
        return tree;
      };
      const unmount = () => {
        for (const s of c.slots) s?.cleanup?.();
      };
      const scenario = (tree) => nodes(tree).find((n) => n.props?.scenario && n.props.onClick);
      const button = (tree, label) =>
        nodes(tree).find((n) => n.type === "button" && text(n).trim() === label);
      const finish = async (request) => {
        let index = 0;
        const chunks = [
          `data: ${JSON.stringify({ choices: [{ delta: { content: "QA response" } }] })}\n`,
          `data: [DONE]\n`,
        ];
        const reader = {
          read: async () =>
            index < chunks.length
              ? { done: false, value: new TextEncoder().encode(chunks[index++]) }
              : { done: true },
          cancel: async () => {
            reader.cancelled = true;
          },
        };
        request.resolve({ ok: true, body: { getReader: () => reader } });
        await tick();
        return reader;
      };
      let tree = render();
      scenario(tree).props.onClick();
      await tick();
      tree = render();
      assert.equal(requests.length, 1);
      button(tree, "Scenarios").props.onClick();
      tree = render();
      scenario(tree).props.onClick();
      await tick();
      tree = render();
      assert.equal(requests.length, 2);
      assert.equal(requests[0].opts.signal.aborted, true);
      let oldBodyCancelled = false;
      requests[0].resolve({
        ok: true,
        body: {
          cancel: async () => {
            oldBodyCancelled = true;
          },
        },
      });
      await tick();
      assert.equal(oldBodyCancelled, true);
      assert.equal(c.audio.length, 0);
      assert.ok(button(render(), "Stop"), "old finally cannot clear new request busy state");
      const reader = await finish(requests[1]);
      assert.equal(reader.cancelled, true);
      assert.equal(c.audio.length, 1);
      const audio = c.audio.at(-1);
      audio.opts.onend();
      audio.opts.onend();
      assert.equal(recognitions.length, 1, "one successful playback starts one microphone");
      const rec = recognitions[0],
        result = rec.onresult;
      const final = {
        results: [Object.assign([{ transcript: "QA learner response" }], { isFinal: true })],
      };
      result(final);
      result(final);
      await tick();
      assert.equal(
        requests.length,
        3,
        "one final result sends once even if state updaters are replayed",
      );
      assert.equal(c.dispatches.filter((a) => a.type === "ADD_XP" && a.payload === 8).length, 1);
      assert.equal(
        JSON.parse(requests[2].opts.body).messages.at(-1).content,
        "QA learner response",
      );
      assert.equal(
        JSON.parse(requests[2].opts.body).scenarioId,
        "qa-scenario",
        "opening-line microphone sees the current scenario",
      );
      const reader3 = await finish(requests[2]);
      assert.equal(reader3.cancelled, true);
      const failed = c.audio.at(-1);
      failed.opts.onerror();
      failed.opts.onend();
      assert.equal(
        recognitions.length,
        1,
        "failed audio does not automatically activate microphone",
      );
      tree = render();
      button(tree, "Scenarios").props.onClick();
      tree = render();
      scenario(tree).props.onClick();
      await tick();
      await finish(requests.at(-1));
      c.audio.at(-1).opts.onend();
      const lateRec = recognitions.at(-1),
        lateResult = lateRec.onresult;
      const count = requests.length,
        dispatchCount = c.dispatches.length;
      unmount();
      const writes = c.writes;
      lateResult(final);
      lateRec.onend?.();
      c.audio.at(-1).opts.onend();
      await tick();
      assert.equal(lateRec.aborted, true);
      assert.equal(lateRec.onresult, null);
      assert.equal(requests.length, count);
      assert.equal(c.dispatches.length, dispatchCount);
      assert.equal(c.writes, writes);
      c.slots = [];
      c.actor = "a";
      tree = render();
      scenario(tree).props.onClick();
      await tick();
      const pendingReadRequest = requests.at(-1);
      let resolveRead;
      let readerCancelled = false;
      pendingReadRequest.resolve({
        ok: true,
        body: {
          getReader: () => ({
            read: () => new Promise((r) => (resolveRead = r)),
            cancel: async () => {
              readerCancelled = true;
            },
          }),
        },
      });
      await tick();
      const beforePendingDispatch = c.dispatches.length,
        beforePendingAudio = c.audio.length;
      unmount();
      const afterPendingWrites = c.writes;
      assert.equal(readerCancelled, true);
      assert.equal(pendingReadRequest.opts.signal.aborted, true);
      resolveRead({
        done: false,
        value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"late chunk"}}]}\n'),
      });
      await tick();
      assert.equal(c.writes, afterPendingWrites);
      assert.equal(c.dispatches.length, beforePendingDispatch);
      assert.equal(c.audio.length, beforePendingAudio);
      // Captured browser callbacks also fail closed before the cleanup render observes identity loss.
      c.slots = [];
      c.actor = "a";
      tree = render();
      scenario(tree).props.onClick();
      await tick();
      const foreign = requests.at(-1);
      c.actor = "b";
      await finish(foreign);
      assert.equal(c.audio.length, 3);
      render();
      assert.ok(
        scenario(render()),
        "identity change clears the prior conversation without relying on a parent remount",
      );
      assert.equal(c.errors.length, 0);
      unmount();
    } finally {
      for (const [k, d] of Object.entries(previous)) {
        if (d) Object.defineProperty(globalThis, k, d);
        else delete globalThis[k];
      }
      rmSync(dir, { recursive: true, force: true });
    }
  });
