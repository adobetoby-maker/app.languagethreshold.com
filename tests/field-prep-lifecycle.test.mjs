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
/** Bundles the real component with the fixture and imports it. */
async function load(name, file, dir) {
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
            resolveDir: process.cwd(),
            contents: `
 import { planListening } from './src/lib/listening-audio.ts';
 export const c={actor:'a',state:{selectedLanguage:'Spanish',activeModuleId:'roofing',level:'A2',moduleAssignments:{}},slots:[],cursor:0,effects:[],dispatches:[],writes:0,audio:[],errors:[]};
 const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export function useRef(initial){const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i];}
 export function useState(initial){const i=c.cursor++;if(!(i in c.slots))c.slots[i]=typeof initial==='function'?initial():initial;return [c.slots[i],value=>{c.writes++;if(typeof value==='function'){value(c.slots[i]);c.slots[i]=value(c.slots[i]);}else c.slots[i]=value;}];}
 export function useCallback(fn,deps){const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={fn,deps};return c.slots[i].fn;}
 export function useEffect(fn,deps){const i=c.cursor++,old=c.slots[i];if(!old||!deps||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();c.slots[i]={deps,cleanup:fn()};});}
 const isCurrentUser=id=>c.actor===id;export const useAuth=()=>({user:c.actor?{id:c.actor}:null,isCurrentUser});
 export const useApp=()=>({state:c.state,dispatch:a=>c.dispatches.push(a)}),useAiGate=()=>({gated:fn=>fn()});
 export const ACCENTS_BY_LANGUAGE={Spanish:[{code:'es-CR'},{code:'es-MX'}],English:[{code:'en-US'}]};
 c.issues=[];c.listening={voiceURI:null,source:'hd',gender:'woman',accent:'es-CR',rate:1};
 const listeningPlan=locale=>planListening({locale:locale??c.listening.accent,learningLocale:c.listening.accent,source:c.listening.source,gender:c.listening.gender,voiceURI:c.listening.voiceURI,signedIn:c.actor!==null,deviceFallback:false});
 const reportListeningIssue=(reason,retry,isCurrent)=>{c.issues.push({reason,retry,isCurrent});return ()=>{};},noteListeningPlayed=()=>{};
 export const useSpeech=()=>({voiceURI:null,accent:c.listening.accent,rate:c.listening.rate,voiceSettings:{listeningAudioSource:c.listening.source,listeningGender:c.listening.gender},listeningPlan,reportListeningIssue,noteListeningPlayed});
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
  return import(outfile);
}

/** Browser globals the components touch; put back after each test. */
const GLOBALS = ["window", "localStorage", "fetch"];
const saveGlobals = () =>
  Object.fromEntries(GLOBALS.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
function restoreGlobals(previous) {
  for (const [k, d] of Object.entries(previous)) {
    if (d) Object.defineProperty(globalThis, k, d);
    else delete globalThis[k];
  }
}

for (const [name, file] of [
  ["FieldPrepMode", files[0]],
  ["ModuleFieldPrep", files[1]],
])
  test(`actual ${name} rejects late streams, scopes microphone callbacks and auto-sends once outside replayable updaters`, async () => {
    const dir = mkdtempSync(resolve("node_modules/.cache/field-lifecycle-"));
    const previous = saveGlobals();
    try {
      const mod = await load(name, file, dir),
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
      restoreGlobals(previous);
      rmSync(dir, { recursive: true, force: true });
    }
  });

// "Listen again" under a partner message is target-language listening practice: it goes through
// the learner's listening voice. The partner's own reply playback above is unchanged.
for (const [name, file, bubbleName] of [
  ["FieldPrepMode", files[0], "InvestigatorBubble"],
  ["ModuleFieldPrep", files[1], "PartnerBubble"],
])
  test(`actual ${name} replays a partner message in the learner's listening voice, owned by that message`, async () => {
    const dir = mkdtempSync(resolve("node_modules/.cache/field-lifecycle-"));
    const previous = saveGlobals();
    try {
      const mod = await load(name, file, dir),
        { c } = mod;
      const requests = [];
      globalThis.window = {
        SpeechRecognition: class {
          start() {}
          abort() {}
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
      // The bubble is its own component: it gets its own hook slots, like a mounted child.
      const child = { slots: [], effects: [] };
      const inChild = (work) => {
        const parent = { slots: c.slots, cursor: c.cursor, effects: c.effects };
        Object.assign(c, { slots: child.slots, cursor: 0, effects: child.effects });
        try {
          return work();
        } finally {
          child.slots = c.slots;
          Object.assign(c, parent);
        }
      };
      const renderBubble = (element) =>
        inChild(() => {
          const out = element.type(element.props);
          for (const f of c.effects.splice(0)) f();
          return out;
        });
      const unmountBubble = () =>
        inChild(() => {
          for (const s of c.slots) s?.cleanup?.();
          c.slots = [];
        });
      const listenAgain = (out) =>
        nodes(out).find((n) => n.type === "button" && text(n).trim() === "Listen again");

      // A scenario with one streamed partner reply.
      let tree = render();
      nodes(tree)
        .find((n) => n.props?.scenario && n.props.onClick)
        .props.onClick();
      await tick();
      let index = 0;
      const chunks = [
        `data: ${JSON.stringify({ choices: [{ delta: { content: "**Buenos** días, ¿cómo está?" } }] })}\n`,
        `data: [DONE]\n`,
      ];
      requests[0].resolve({
        ok: true,
        body: {
          getReader: () => ({
            read: async () =>
              index < chunks.length
                ? { done: false, value: new TextEncoder().encode(chunks[index++]) }
                : { done: true },
            cancel: async () => {},
          }),
        },
      });
      await tick();
      tree = render();
      const replyPlayback = c.audio.length;
      assert.equal(replyPlayback, 1, "the partner's reply still plays through its own path");
      assert.equal(c.audio[0].opts.cloudOnly, undefined, "which this change leaves as it was");

      const bubble = nodes(tree).find(
        (n) => typeof n.type === "function" && n.type.name === bubbleName,
      );
      assert.ok(bubble, "the partner message is shown");
      assert.equal(bubble.props.language, "Spanish");
      assert.equal("voiceURI" in bubble.props, false, "the replay no longer takes a raw voice");
      assert.equal("locale" in bubble.props, false);

      // Signed in with the HD voice resolved: HD only, the learner's accent, gender and speed.
      const HD = "google:es-US:es-US-Chirp3-HD-Charon";
      Object.assign(c.listening, { voiceURI: HD, gender: "man", accent: "es-MX", rate: 0.85 });
      listenAgain(renderBubble(bubble)).props.onClick();
      assert.equal(c.audio.length, replyPlayback + 1);
      const replay = c.audio.at(-1);
      assert.equal(replay.text, "Buenos días, ¿cómo está?", "markdown marks are not read out");
      assert.equal(replay.locale, "es-MX");
      assert.equal(replay.opts.voiceURI, HD);
      assert.equal(replay.opts.cloudOnly, true, "HD only: no silent device voice");
      assert.equal(replay.opts.recordedGender, "male");
      assert.equal(replay.opts.rate, 0.85);
      assert.equal(replay.opts.owner.userId, "a");
      assert.equal(replay.opts.owner.isCurrent(), true);
      // An HD miss is reported with a retry of the same message.
      replay.opts.onerror("offline");
      assert.equal(c.issues.length, 1);
      assert.equal(c.issues[0].reason, "offline");
      c.issues[0].retry();
      assert.equal(c.audio.at(-1).text, replay.text);
      assert.equal(c.audio.at(-1).opts.cloudOnly, true);

      // The learner's Device voice choice is respected.
      c.listening.source = "device";
      listenAgain(renderBubble(bubble)).props.onClick();
      assert.equal(c.audio.at(-1).opts.cloudOnly, false);
      assert.equal(c.audio.at(-1).opts.recordedGender, undefined);
      assert.equal(c.audio.at(-1).opts.voiceURI, "device:default");
      c.listening.source = "hd";

      // Signed out: a recording may play without an account; a miss asks, it does not swap voices.
      unmountBubble();
      c.actor = null;
      c.listening.voiceURI = "device:default";
      listenAgain(renderBubble(bubble)).props.onClick();
      const guest = c.audio.at(-1);
      assert.equal(guest.opts.owner.userId, "");
      assert.equal(guest.opts.recordedGender, "male");
      assert.equal(guest.opts.cloudOnly, true);
      assert.equal(guest.opts.unavailableReason, "sign-in");

      // The replay belongs to its message: when the message leaves, it stops, and its speaker
      // and pending retry do nothing afterwards.
      unmountBubble();
      c.actor = "a";
      c.listening.voiceURI = HD;
      const again = listenAgain(renderBubble(bubble));
      again.props.onClick();
      const owned = c.audio.at(-1);
      assert.equal(owned.opts.owner.isCurrent(), true);
      unmountBubble();
      assert.equal(owned.opts.signal.aborted, true);
      assert.equal(owned.opts.owner.isCurrent(), false);
      const count = c.audio.length;
      again.props.onClick();
      c.issues[0].retry();
      assert.equal(c.audio.length, count, "nothing plays for a message that is gone");
      assert.equal(c.errors.length, 0);
      for (const s of c.slots) s?.cleanup?.();
    } finally {
      restoreGlobals(previous);
      rmSync(dir, { recursive: true, force: true });
    }
  });
