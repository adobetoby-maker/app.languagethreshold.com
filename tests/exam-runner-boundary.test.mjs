import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
const tick = () => new Promise((r) => setImmediate(r));
function nodes(n, out = []) {
  if (Array.isArray(n)) n.forEach((x) => nodes(x, out));
  else if (n && typeof n === "object") {
    out.push(n);
    nodes(n.props?.children, out);
  }
  return out;
}
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/private-report-"));
  const saved = Object.fromEntries(
    ["window", "document", "URL", "setTimeout", "clearTimeout"].map((k) => [
      k,
      Object.getOwnPropertyDescriptor(globalThis, k),
    ]),
  );
  try {
    await build({
      stdin: {
        contents: (() => {
          const source = readFileSync("src/components/exams/ExamsArea.tsx", "utf8");
          const start = source.indexOf("type ExamRunnerProps =");
          const end = source.indexOf("type ExamResultProps =", start);
          return `import {useState,useEffect,useRef,useSyncExternalStore} from 'react';import {useAuth} from '@/state/auth-state';import {useExamRunnerActions} from '@/hooks/use-exam-runner-actions';import {examRequest} from '@/lib/assessments/client';import {c,card,button,primary,input,skills,getModule,checkpointName,answerText,useExamDraft,browserExamStorage,readExamInk,readSpeechTake,examInkKey,subscribeSpeechDrafts,unsavedSpeechCount,hasUnconfirmedExamInk,ExamListeningQuestion,ExamSpeechQuestion,HandwrittenExamAnswer,ExamInputPractice} from 'fixture';type ExamAttemptView=any;${source.slice(start, end)};export {ExamRunner,c};`;
        })(),
        loader: "tsx",
        resolveDir: process.cwd(),
      },
      outfile: join(dir, "case.mjs"),
      bundle: true,
      jsx: "automatic",
      format: "esm",
      platform: "node",
      external: ["react/jsx-runtime"],
      logLevel: "silent",
      plugins: [
        {
          name: "controlled-report",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(fixture|react|@\/state\/auth-state|@\/lib\/assessments\/client|@\/data\/(modules|curriculum|languages))$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `
 export const primary='',input='',checkpointName=x=>x,answerText=()=>'',useExamDraft=()=>c.draft,browserExamStorage=()=>({}),readExamInk=()=>null,readSpeechTake=()=>null,examInkKey=()=>'',subscribeSpeechDrafts=()=>()=>{},unsavedSpeechCount=()=>0,hasUnconfirmedExamInk=()=>false,ExamListeningQuestion='listening',ExamSpeechQuestion='speech',HandwrittenExamAnswer='ink',ExamInputPractice='input-practice';export const useSyncExternalStore=(_s,get)=>get();export const card='',button='',skills={recognition:'Word recognition'},getModule=id=>({name:id}),lessonNumberRanges=n=>n.join(',');
 export const c={slots:[],cursor:0,effects:[],actor:'a',requests:[],stateWrites:0};
 const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export function useState(initial){const slots=c.slots,i=c.cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>{c.stateWrites++;slots[i]=typeof v==='function'?v(slots[i]):v;}];}
 export function useRef(initial){const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i];}
 export function useCallback(fn,deps){const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={fn,deps};return c.slots[i].fn;}
 export function useEffect(fn,deps){const slots=c.slots,i=c.cursor++,old=slots[i];if(!old||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}
 const isCurrentUser=id=>c.actor===id;export const useAuth=()=>({user:c.actor?{id:c.actor}:null,isCurrentUser});
 export const examRequest=(url,signal)=>new Promise((resolve,reject)=>c.requests.push({url,signal,resolve,reject}));
 export class ExamRequestError extends Error{constructor(message,status){super(message);this.status=status;}}c.Error=ExamRequestError;
 `,
            }));
          },
        },
      ],
    });
    const { ExamRunner, c } = await import(join(dir, "case.mjs"));
    globalThis.window = { location: { origin: "https://synthetic.invalid" } };
    const snapshot = {};
    c.events = [];
    c.work = [];
    c.clear = 0;
    c.draft = {
      index: 0,
      answers: {},
      serverAnswers: {},
      status: "synced",
      error: "",
      pendingCount: 0,
      routePending: false,
      speechEvidence: [],
      revision: () => 4,
      setIndex: () => {},
      edit: () => {},
      sync: () => {},
      clearSubmitted: () => c.clear++,
      flush: () => new Promise((resolve, reject) => c.work.push({ resolve, reject })),
    };
    const instances = [];
    const dispose = (i) => {
      for (const s of instances[i]?.slots ?? []) s?.cleanup?.();
    };
    const unmount = () => {
      instances.forEach((_, i) => dispose(i));
      instances.length = 0;
    };
    const render = (mode = "readiness", opts = {}) => {
      let n = {
          type: ExamRunner,
          props: {
            attempt: attempt(),
            fromDevice: false,
            checkingServer: false,
            onBack: () => c.events.push("back"),
            onCheckServer: () => c.events.push("check"),
            onSubmitted: () => c.events.push("submitted"),
            onContinued: (x) => c.events.push(x),
            ...opts,
          },
          key: "root",
        },
        depth = 0;
      // Execute the actual wrappers and inner components with keyed cleanup.
      while (n && typeof n.type === "function") {
        const old = instances[depth];
        if (!old || old.key !== n.key || old.type !== n.type) {
          for (let i = depth; i < instances.length; i++) dispose(i);
          instances.splice(depth);
          instances[depth] = { key: n.key, type: n.type, slots: [] };
        }
        c.slots = instances[depth].slots;
        c.cursor = 0;
        n = n.type(n.props);
        depth++;
      }
      for (const e of c.effects.splice(0)) e();
      return n;
    };
    try {
      await run({ c, render, unmount, snapshot });
    } finally {
      unmount();
    }
  } finally {
    for (const [k, d] of Object.entries(saved)) {
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
    }
    rmSync(dir, { recursive: true, force: true });
  }
}
const attempt = (id = "attempt-a") => ({
  id,
  isLearner: true,
  submittedAt: null,
  form: {
    id: "form-a",
    items: [
      {
        id: "item-a",
        type: "production",
        skill: "writing",
        prompt: "Synthetic writing",
        inputMethods: ["typed"],
      },
    ],
  },
  enrollment: { moduleId: "roofing", targetLanguage: "English" },
  checkpoint: { checkpoint: "entrance" },
  studiedObjectiveCount: 0,
});
const button = (tree, label) =>
  nodes(tree).find((n) => n.type === "button" && n.props.children === label);
function confirm(ctx) {
  let tree = ctx.render();
  button(tree, "Review submission").props.onClick();
  return ctx.render();
}
test("actual runner resets confirmation across attempt/account boundaries and refuses departed navigation", () =>
  fixture(async (ctx) => {
    const old = confirm(ctx);
    assert.ok(button(old, "Sync and submit exam"));
    let tree = ctx.render("runner", { attempt: attempt("attempt-b") });
    assert.equal(button(tree, "Sync and submit exam"), undefined);
    const writes = ctx.c.stateWrites;
    button(old, "Review submission").props.onClick();
    button(old, "Back to Exams").props.onClick();
    assert.equal(ctx.c.stateWrites, writes);
    assert.deepEqual(ctx.c.events, []);
    ctx.c.actor = "b";
    tree = ctx.render();
    assert.equal(button(tree, "Sync and submit exam"), undefined);
    ctx.c.actor = null;
    assert.equal(ctx.render(), null);
  }));
test("actual runner submit binding cannot send after delayed flush from an unmounted view", () =>
  fixture(async (ctx) => {
    const tree = confirm(ctx);
    const submit = button(tree, "Sync and submit exam");
    submit.props.onClick();
    submit.props.onClick();
    assert.equal(ctx.c.work.length, 1);
    ctx.unmount();
    ctx.c.work[0].resolve(true);
    await tick();
    assert.equal(ctx.c.requests.length, 0);
    assert.equal(ctx.c.clear, 0);
    assert.deepEqual(ctx.c.events, []);
  }));
