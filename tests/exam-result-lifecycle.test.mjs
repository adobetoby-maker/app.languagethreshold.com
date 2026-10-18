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
  const old = Object.getOwnPropertyDescriptor(globalThis, "window");
  try {
    await build({
      stdin: {
        contents: (() => {
          const source = readFileSync("src/components/exams/ExamsArea.tsx", "utf8");
          const start = source.indexOf("type ExamResultProps =");
          const end = source.indexOf("function ExamRubricReview(", start);
          return `import {useState,useCallback} from 'react';import {useAuth} from '@/state/auth-state';import {usePracticeLifecycle} from '@/hooks/use-practice-lifecycle';import {useExamMutation} from '@/hooks/use-exam-mutation';import {examRequest} from '@/lib/assessments/client';import {c,card,button,input,primary,skills,checkpointName,answerText,moduleLessonUrl,SpeechEvidencePlayback,AIWritingProposal,ExamRubricReview,PlanPanelDisclosure} from 'fixture';type ExamAttemptView=any;type AssessmentAnswer=any;${source.slice(start, end)};export {ExamResult,c};`;
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
              { filter: /^(fixture|react|@\/state\/auth-state|@\/lib\/assessments\/client)$/ },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `
 export const card='',button='',input='',primary='',skills={};export const checkpointName=x=>x,answerText=()=>'',moduleLessonUrl=()=>'/';export const SpeechEvidencePlayback='speech',AIWritingProposal='writing',ExamRubricReview='review',PlanPanelDisclosure='plan';
 export const c={slots:[],cursor:0,effects:[],actor:'a',requests:[],stateWrites:0};
 const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export function useState(initial){const slots=c.slots,i=c.cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>{c.stateWrites++;slots[i]=typeof v==='function'?v(slots[i]):v;}];}
 export function useRef(initial){const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i];}
 export function useCallback(fn,deps){const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={fn,deps};return c.slots[i].fn;}
 export function useEffect(fn,deps){const slots=c.slots,i=c.cursor++,old=slots[i];if(!old||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}
 const isCurrentUser=id=>c.actor===id;export const useAuth=()=>({user:c.actor?{id:c.actor}:null,isCurrentUser,canUseReader:id=>c.actor===id&&!c.signingOut});
 export const examRequest=(url,signal)=>new Promise((resolve,reject)=>c.requests.push({url,signal,resolve,reject}));
 export class ExamRequestError extends Error{constructor(message,status){super(message);this.status=status;}}c.Error=ExamRequestError;
 `,
            }));
          },
        },
      ],
    });
    const { ExamResult, c } = await import(join(dir, "case.mjs"));
    globalThis.window = { location: { origin: "https://synthetic.invalid" } };
    const instances = [],
      opened = [];
    const dispose = (i) => {
      for (const s of instances[i]?.slots ?? []) s?.cleanup?.();
    };
    const unmount = () => {
      instances.forEach((_, i) => dispose(i));
      instances.length = 0;
    };
    const render = (mode = "hook", opts = {}) => {
      let n = {
          type: ExamResult,
          props: {
            attempt: attempt(),
            onRefresh: () => opened.push("refresh"),
            onBack: () => opened.push("back"),
            onOpenAttempt: (id) => opened.push(id),
            ...opts,
          },
          key: "root",
        },
        depth = 0;
      // The hook harness itself is stable across prop changes.
      while (typeof n.type === "function") {
        const old = instances[depth];
        if (!old || old.key !== n.key || (mode !== "hook" && old.type !== n.type)) {
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
    const payload = (items = [{ id: "row-a", attempt_number: 1 }], extra = {}) => ({
      items,
      hasMore: true,
      nextCursor: { before: "cursor-a" },
      limit: 10,
      summary: "synthetic private metadata",
      ...extra,
    });
    const ready = async (mode = "hook", opts = {}) => {
      render(mode, opts);
      c.requests.at(-1).resolve(payload());
      await tick();
      return render(mode, opts);
    };
    try {
      await run({ c, render, ready, payload, opened, unmount });
    } finally {
      unmount();
    }
  } finally {
    if (old) Object.defineProperty(globalThis, "window", old);
    else delete globalThis.window;
    rmSync(dir, { recursive: true, force: true });
  }
}
function attempt(id = "attempt-a", extra = {}) {
  return {
    id,
    status: "submitted",
    submittedAt: "2026-10-17T20:00:00Z",
    checkpoint: { checkpoint: "entrance" },
    enrollment: { scope: "personal", role: "primary", id: "plan-a", moduleId: "roofing" },
    isLearner: true,
    canReview: false,
    profiles: [],
    form: { items: [] },
    responses: [],
    feedback: [],
    evidence: [],
    speechEvidence: [],
    ...extra,
  };
}
const form = (t) => nodes(t).find((n) => n.type === "form");
const reason = (t) => nodes(t).find((n) => n.type === "textarea");
const retry = (t) =>
  nodes(t).find((n) => n.type === "button" && n.props.children === "Retry pending scoring");
const back = (t) =>
  nodes(t).find((n) => n.type === "button" && n.props.children === "Back to Exams");
const submit = (t) => form(t).props.onSubmit({ preventDefault() {} });
function withReason(ctx, props = {}) {
  let tree = ctx.render("component", props);
  reason(tree).props.onChange({ target: { value: "Synthetic review request" } });
  return ctx.render("component", props);
}
test("result form resets by attempt/account/permission; old share reply cannot mark another attempt", () =>
  fixture(async (ctx) => {
    const { c, render, opened } = ctx;
    let tree = withReason(ctx);
    submit(tree);
    assert.equal(c.requests.length, 1);
    tree = render("component", { attempt: attempt("attempt-b") });
    assert.equal(reason(tree).props.value, "");
    assert.equal(c.requests[0].signal.aborted, true);
    const writes = c.stateWrites;
    c.requests[0].resolve({});
    await tick();
    assert.equal(c.stateWrites, writes);
    assert.deepEqual(opened, []);
    tree = withReason(ctx);
    c.actor = "b";
    tree = render("component");
    assert.equal(reason(tree).props.value, "");
    tree = render("component", { attempt: attempt("attempt-a", { isLearner: false }) });
    assert.equal(form(tree), undefined);
  }));
test("review sharing validates intent/reason, sends exact disclosure version and is one owned flight", () =>
  fixture(async (ctx) => {
    const { c, render } = ctx;
    let tree = render("component");
    submit(tree);
    assert.equal(c.requests.length, 0);
    tree = withReason(ctx);
    submit(tree);
    submit(tree);
    retry(tree).props.onClick();
    assert.equal(c.requests.length, 1);
    const body = c.requests[0].url;
    assert.equal(body.action, "request_review");
    assert.equal(body.attemptId, "attempt-a");
    assert.equal(body.consentVersion, "assessment-review-v1");
    assert.equal(body.reason, "Synthetic review request");
    assert.equal(typeof body.requestId, "string");
    tree = render("component");
    assert.equal(reason(tree).props.disabled, true);
    c.requests[0].resolve({});
    await tick();
    tree = render("component");
    assert.equal(reason(tree).props.disabled, false);
    assert.ok(
      nodes(tree).some(
        (n) =>
          n.type === "p" &&
          typeof n.props.children === "string" &&
          n.props.children.startsWith("Review requested."),
      ),
    );
  }));
test("retry pending scoring refreshes once; Back cancels immediately and cannot refresh a departed result", () =>
  fixture(async (ctx) => {
    const { c, render, opened } = ctx;
    let tree = render("component");
    retry(tree).props.onClick();
    retry(tree).props.onClick();
    assert.equal(c.requests.length, 1);
    assert.deepEqual(c.requests[0].url, { action: "retry_scoring", attemptId: "attempt-a" });
    c.requests[0].resolve({});
    await tick();
    assert.deepEqual(opened, ["refresh"]);
    tree = render("component");
    retry(tree).props.onClick();
    back(tree).props.onClick();
    assert.equal(c.requests[1].signal.aborted, true);
    c.requests[1].resolve({});
    await tick();
    assert.deepEqual(opened, ["refresh", "back"]);
    tree = render("component", { attempt: attempt("attempt-a", { status: "scored" }) });
    assert.equal(retry(tree), undefined);
  }));
test("retained navigation/form callbacks, unmount and actor loss suppress late updates", () =>
  fixture(async (ctx) => {
    const { c, render, opened, unmount } = ctx;
    const old = withReason(ctx);
    render("component", { attempt: attempt("attempt-b") });
    const writes = c.stateWrites;
    back(old).props.onClick();
    submit(old);
    reason(old).props.onChange({ target: { value: "old" } });
    assert.equal(c.stateWrites, writes);
    assert.equal(c.requests.length, 0);
    assert.deepEqual(opened, []);
    let tree = withReason(ctx);
    submit(tree);
    unmount();
    const after = c.stateWrites;
    c.requests[0].reject(new Error("late"));
    await tick();
    assert.equal(c.stateWrites, after);
    tree = render("component");
    retry(tree).props.onClick();
    c.actor = "b";
    const before = c.stateWrites;
    c.requests[1].resolve({});
    await tick();
    assert.equal(c.stateWrites, before);
    assert.deepEqual(opened, []);
  }));
test("current errors remain visible and retryable; context change hides old failures", () =>
  fixture(async (ctx) => {
    const { c, render } = ctx;
    let tree = withReason(ctx);
    submit(tree);
    c.requests[0].reject(new c.Error("access changed", 403));
    await tick();
    tree = render("component");
    assert.equal(reason(tree).props.disabled, false);
    assert.ok(nodes(tree).some((n) => n.type === "p" && n.props.children === "access changed"));
    tree = render("component", { attempt: attempt("attempt-b") });
    assert.equal(reason(tree).props.value, "");
    assert.equal(
      nodes(tree).some((n) => n.type === "p" && n.props.children === "access changed"),
      false,
    );
  }));
