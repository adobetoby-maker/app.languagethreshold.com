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
          const start = source.indexOf("type RubricReviewProps =");
          const end = source.indexOf("type ReadinessTrack =", start);
          return `import {useState,useRef,useCallback} from 'react';import {useAuth} from '@/state/auth-state';import {usePracticeLifecycle} from '@/hooks/use-practice-lifecycle';import {useExamMutation} from '@/hooks/use-exam-mutation';import {examRequest} from '@/lib/assessments/client';import {c,card,button,input,primary,skills,checkpointName,answerText,moduleLessonUrl,SpeechEvidencePlayback,AIWritingProposal,PlanPanelDisclosure} from 'fixture';type ExamAttemptView=any;type AssessmentAnswer=any;${source.slice(start, end)};export {ExamRubricReview,c};`;
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
    const { ExamRubricReview, c } = await import(join(dir, "case.mjs"));
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
          type: ExamRubricReview,
          props: {
            attempt: attempt(),
            onRefresh: () => opened.push("refresh"),
            onResolved: () => opened.push("resolved"),
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
    canReview: true,
    form: {
      rubricVersion: "synthetic-v1",
      items: [{ id: "item-a", skill: "writing", prompt: "Synthetic rubric question" }],
    },
    responses: [{ id: "response-a", item_id: "item-a", answer: { text: "Synthetic response" } }],
    feedback: [],
    evidence: [{ itemId: "item-a", maximum: 4 }],
    speechEvidence: [],
    reviews: [
      { id: "review-a", status: "requested", reason: "Synthetic request", reviewer_id: null },
    ],
    ...extra,
  };
}
const selects = (t) => nodes(t).filter((n) => n.type === "select");
const reason = (t) => nodes(t).find((n) => n.type === "textarea");
const form = (t) => nodes(t).find((n) => n.type === "form");
const submit = (t) => form(t).props.onSubmit({ preventDefault() {} });
const close = (t) =>
  nodes(t).find((n) => n.type === "button" && n.props.children === "Close review with this reason");
function prepared(ctx, props = {}) {
  let tree = ctx.render("component", props);
  selects(tree)[0].props.onChange({ target: { value: "item-a" } });
  tree = ctx.render("component", props);
  reason(tree).props.onChange({ target: { value: "Synthetic reviewer reason" } });
  return ctx.render("component", props);
}
test("rubric decisions are single flight, retain exact retry ID and body, and only current success refreshes", () =>
  fixture(async (ctx) => {
    const { c, render, opened } = ctx;
    let tree = prepared(ctx);
    submit(tree);
    submit(tree);
    close(tree).props.onClick();
    assert.equal(c.requests.length, 1);
    const body = c.requests[0].url;
    assert.equal(body.action, "review_score");
    assert.equal(body.responseId, "response-a");
    assert.equal(body.state, "needs_review");
    assert.equal(body.points, null);
    assert.equal(body.reason, "Synthetic reviewer reason");
    const id = body.requestId;
    c.requests[0].reject(new Error("synthetic unavailable"));
    await tick();
    tree = render("component");
    assert.equal(reason(tree).props.disabled, false);
    submit(tree);
    assert.equal(c.requests[1].url.requestId, id);
    c.requests[1].resolve({});
    await tick();
    assert.deepEqual(opened, ["refresh"]);
  }));
test("claim and resolve share an owned signal and lock; current close finishes only after resolve", () =>
  fixture(async (ctx) => {
    const { c, render, opened } = ctx;
    let tree = prepared(ctx);
    close(tree).props.onClick();
    close(tree).props.onClick();
    assert.equal(c.requests.length, 1);
    assert.deepEqual(c.requests[0].url, { action: "claim_review", reviewId: "review-a" });
    c.requests[0].resolve({});
    await tick();
    assert.equal(c.requests.length, 2);
    assert.equal(c.requests[1].url.action, "resolve_review");
    assert.equal(c.requests[1].signal, c.requests[0].signal);
    assert.deepEqual(opened, []);
    tree = render("component");
    assert.equal(reason(tree).props.disabled, true);
    c.requests[1].resolve({});
    await tick();
    assert.deepEqual(opened, ["resolved"]);
  }));
test("departure between claim and resolve cannot send a second request; late score/resolve cannot refresh or close", () =>
  fixture(async (ctx) => {
    const { c, render, opened, unmount } = ctx;
    let tree = prepared(ctx);
    close(tree).props.onClick();
    unmount();
    c.requests[0].resolve({});
    await tick();
    assert.equal(c.requests.length, 1);
    assert.deepEqual(opened, []);
    tree = prepared(ctx);
    close(tree).props.onClick();
    c.requests[1].resolve({});
    await tick();
    assert.equal(c.requests[2].url.action, "resolve_review");
    render("component", { attempt: attempt("attempt-b") });
    assert.equal(c.requests[2].signal.aborted, true);
    const writes = c.stateWrites;
    c.requests[2].resolve({});
    await tick();
    assert.equal(c.stateWrites, writes);
    assert.deepEqual(opened, []);
  }));
test("attempt/account/rubric/permission changes reset form; old form and speech readiness callbacks are inert", () =>
  fixture(async (ctx) => {
    const { c, render } = ctx;
    const old = prepared(ctx);
    let tree = render("component", { attempt: attempt("attempt-b") });
    assert.equal(selects(tree)[0].props.value, "");
    const writes = c.stateWrites;
    submit(old);
    close(old).props.onClick();
    reason(old).props.onChange({ target: { value: "late" } });
    assert.equal(c.stateWrites, writes);
    assert.equal(c.requests.length, 0);
    tree = prepared(ctx);
    c.actor = "b";
    tree = render("component");
    assert.equal(selects(tree)[0].props.value, "");
    tree = prepared(ctx);
    tree = render("component", { attempt: attempt("attempt-a", { canReview: false }) });
    assert.equal(form(tree), undefined);
  }));
test("scored decisions require current evidence and bounded rubric dimensions; speech requires current readiness", () =>
  fixture(async (ctx) => {
    const { c, render } = ctx;
    const rubric = { dimensions: [{ id: "meaning", label: "Meaning", maximum: 2 }] };
    const props = { attempt: attempt("attempt-a", { feedback: [{ itemId: "item-a", rubric }] }) };
    let tree = prepared(ctx, props);
    selects(tree)[1].props.onChange({ target: { value: "scored" } });
    tree = render("component", props);
    submit(tree);
    assert.equal(c.requests.length, 0);
    nodes(tree)
      .find((n) => n.type === "input" && n.props.type === "number")
      .props.onChange({ target: { value: "3" } });
    tree = render("component", props);
    submit(tree);
    assert.equal(c.requests.length, 0);
    nodes(tree)
      .find((n) => n.type === "input" && n.props.type === "number")
      .props.onChange({ target: { value: "2" } });
    tree = render("component", props);
    submit(tree);
    assert.equal(c.requests[0].url.points, 2);
    assert.deepEqual(c.requests[0].url.dimensions, { meaning: 2 });
    c.requests[0].resolve({});
    await tick();
    const speechProps = {
      attempt: attempt("speech-attempt", {
        form: {
          rubricVersion: "synthetic-speech",
          items: [{ id: "item-a", skill: "speaking", prompt: "Synthetic speech" }],
        },
        responses: [
          { id: "speech-response", item_id: "item-a", answer: { mediaEvidenceId: "audio-a" } },
        ],
        speechEvidence: [{ id: "audio-a", available: true }],
      }),
    };
    tree = prepared(ctx, speechProps);
    selects(tree)[1].props.onChange({ target: { value: "scored" } });
    tree = render("component", speechProps);
    submit(tree);
    assert.equal(c.requests.length, 1);
    const playback = nodes(tree).find((n) => n.type === "speech");
    playback.props.onReviewReady(true);
    tree = render("component", speechProps);
    submit(tree);
    assert.equal(c.requests.length, 2);
    const changed = {
      attempt: { ...speechProps.attempt, speechEvidence: [{ id: "audio-a", available: false }] },
    };
    const reset = render("component", changed);
    assert.equal(selects(reset)[0].props.value, "");
    assert.equal(c.requests[1].signal.aborted, true);
    render("component", { attempt: attempt("other") });
    const writes = c.stateWrites;
    playback.props.onReviewReady(true);
    assert.equal(c.stateWrites, writes);
  }));
test("already-owned review resolves directly, foreign ownership refuses, current errors are retryable", () =>
  fixture(async (ctx) => {
    const { c, render, opened } = ctx;
    const own = {
      attempt: attempt("attempt-a", {
        reviews: [{ id: "review-a", status: "claimed", reviewer_id: "a" }],
      }),
    };
    let tree = prepared(ctx, own);
    close(tree).props.onClick();
    assert.equal(c.requests[0].url.action, "resolve_review");
    c.requests[0].reject(new Error("synthetic resolve failed"));
    await tick();
    tree = render("component", own);
    assert.equal(reason(tree).props.disabled, false);
    assert.deepEqual(opened, []);
    const other = {
      attempt: attempt("attempt-b", {
        reviews: [{ id: "review-b", status: "claimed", reviewer_id: "other" }],
      }),
    };
    tree = prepared(ctx, other);
    close(tree).props.onClick();
    assert.equal(c.requests.length, 1);
  }));
