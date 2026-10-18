import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
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
  const old = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  try {
    await build({
      stdin: {
        contents: `export {useExamRunnerActions} from './src/hooks/use-exam-runner-actions';export {c} from 'fixture';`,
        resolveDir: process.cwd(),
      },
      outfile: join(dir, "case.mjs"),
      bundle: true,
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
                  /^(fixture|react|@\/state\/auth-state|@\/lib\/assessments\/(client|drafts|offline))$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `
 export const c={slots:[],cursor:0,effects:[],actor:'a',requests:[],stateWrites:0,offline:[],persisted:[],reads:0};export const browserExamStorage=()=>({});export const readOfflineExams=()=>{c.reads++;return c.offline;};export const saveOfflineExam=(s,actor,attempt)=>c.persisted.push({actor,attempt});export const recoveryCopiesForScope=(rows,org)=>rows.filter(row=>!org||(row.enrollment.scope==='team'&&row.enrollment.organizationId===org));
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
    const { useExamRunnerActions, c } = await import(join(dir, "case.mjs"));
    const slots = [],
      events = [];
    const deferred = (kind, signal) =>
      new Promise((resolve, reject) => c.work.push({ kind, signal, resolve, reject }));
    c.work = [];
    c.revision = 4;
    c.clear = 0;
    c.checks = 0;
    const draft = {
      flush: () => deferred("flush"),
      revision: () => c.revision,
      clearSubmitted: () => c.clear++,
      continueRouting: (signal) => deferred("continue", signal),
      resolve: (keep, signal) => deferred(keep ? "keep" : "server", signal),
      conflict: { id: "attempt-a" },
    };
    const unmount = () => {
      for (const item of slots) item?.cleanup?.();
      slots.length = 0;
    };
    const render = (opts = {}) => {
      c.slots = slots;
      c.cursor = 0;
      const value = useExamRunnerActions({
        attempt: { id: "attempt-a", form: { id: "form-a" }, isLearner: true, submittedAt: null },
        fromDevice: false,
        blocked: false,
        confirmed: true,
        draft,
        checkInputs: () => {
          c.checks++;
          if (c.inputError) throw new Error(c.inputError);
        },
        onSubmitted: () => events.push("submitted"),
        onContinued: (x) => events.push(x),
        ...opts,
      });
      for (const e of c.effects.splice(0)) e();
      return value;
    };
    try {
      await run({ c, render, events, unmount });
    } finally {
      unmount();
    }
  } finally {
    if (old) Object.defineProperty(globalThis, "navigator", old);
    else delete globalThis.navigator;
    rmSync(dir, { recursive: true, force: true });
  }
}
const core = {
  id: "attempt-a",
  form: { id: "form-a" },
  isLearner: true,
  submittedAt: null,
  routing: { state: "core" },
};
test("submission locks flush and final request; exact retry identity survives uncertain response", () =>
  fixture(async ({ c, render, events }) => {
    let view = render();
    view.submit();
    view.submit();
    view.resolveConflict(true);
    assert.equal(c.work.length, 1);
    c.work[0].resolve(true);
    await tick();
    assert.equal(c.requests.length, 1);
    const first = c.requests[0];
    assert.equal(first.url.action, "submit");
    assert.equal(first.url.attemptId, "attempt-a");
    assert.equal(first.url.revision, 4);
    assert.ok(first.signal);
    assert.equal(c.checks, 2);
    first.reject(new Error("synthetic lost response"));
    await tick();
    view = render();
    assert.match(view.error, /lost response/);
    assert.equal(c.clear, 0);
    view.submit();
    c.work.at(-1).resolve(true);
    await tick();
    assert.deepEqual(c.requests[1].url, first.url);
    c.requests[1].resolve({});
    await tick();
    assert.equal(c.clear, 1);
    assert.deepEqual(events, ["submitted"]);
    assert.equal(render().busy, false);
  }));
test("unmount or context change during flush cannot send submission or clear a draft", () =>
  fixture(async ({ c, render, events, unmount }) => {
    let view = render();
    view.submit();
    const flush = c.work.at(-1);
    unmount();
    const writes = c.stateWrites;
    flush.resolve(true);
    await tick();
    assert.equal(c.requests.length, 0);
    assert.equal(c.clear, 0);
    assert.equal(c.stateWrites, writes);
    view = render();
    view.submit();
    const second = c.work.at(-1);
    render({ attempt: { ...core, id: "attempt-b" } });
    second.resolve(true);
    await tick();
    assert.equal(c.requests.length, 0);
    assert.equal(events.length, 0);
    view = render();
    view.submit();
    c.work.at(-1).resolve(true);
    await tick();
    const request = c.requests.at(-1);
    unmount();
    request.resolve({});
    await tick();
    assert.equal(request.signal.aborted, true);
    assert.equal(c.clear, 0);
    assert.equal(events.length, 0);
  }));
test("actor loss, absent confirmation, core state, blocked/guest/nonlearner and submitted views refuse work", () =>
  fixture(async ({ c, render }) => {
    for (const opts of [
      { confirmed: false },
      { attempt: core },
      { blocked: true },
      { attempt: { ...core, routing: null, isLearner: false } },
      { attempt: { ...core, routing: null, submittedAt: "date" } },
    ]) {
      const view = render(opts);
      view.submit();
      assert.equal(c.work.length, 0);
    }
    let view = render();
    c.actor = "b";
    view.submit();
    assert.equal(c.work.length, 0);
    c.actor = null;
    view = render();
    view.submit();
    assert.equal(c.work.length, 0);
  }));
test("fresh input checks and failed flush prevent final submit while preserving draft for retry", () =>
  fixture(async ({ c, render }) => {
    let view = render();
    c.inputError = "Unconfirmed ink";
    view.submit();
    await tick();
    assert.equal(c.work.length, 0);
    assert.match(render().error, /Unconfirmed ink/);
    c.inputError = "";
    view = render();
    view.submit();
    c.work.at(-1).resolve(false);
    await tick();
    assert.equal(c.requests.length, 0);
    assert.match(render().error, /Sync your device/);
    view = render();
    view.submit();
    c.inputError = "Unsaved recording";
    c.work.at(-1).resolve(true);
    await tick();
    assert.equal(c.requests.length, 0);
    assert.equal(c.clear, 0);
    assert.match(render().error, /Unsaved recording/);
  }));
test("continuation and conflict resolution share ownership, signal and current-only completion", () =>
  fixture(async ({ c, render, events }) => {
    let view = render({ attempt: core });
    view.continueRouting();
    view.continueRouting();
    assert.equal(c.work.length, 1);
    const continuation = c.work[0];
    assert.equal(continuation.kind, "continue");
    assert.ok(continuation.signal);
    render();
    assert.equal(continuation.signal.aborted, true);
    continuation.resolve({ id: "stale" });
    await tick();
    assert.equal(events.length, 0);
    view = render({ attempt: core });
    view.continueRouting();
    c.work.at(-1).resolve({ id: "selected", routing: { state: "selected" } });
    await tick();
    assert.equal(events[0].id, "selected");
    view = render();
    view.resolveConflict(false);
    view.resolveConflict(true);
    const resolution = c.work.at(-1);
    assert.equal(resolution.kind, "server");
    assert.ok(resolution.signal);
    resolution.resolve({ id: "attempt-a", routing: { state: "selected" } });
    await tick();
    assert.equal(events[1].id, "attempt-a");
  }));
test("explicit cancellation suppresses late errors/finalizers and cannot clear a newer action", () =>
  fixture(async ({ c, render, events }) => {
    let view = render({ attempt: core });
    view.continueRouting();
    const old = c.work.at(-1);
    view.cancel();
    view = render({ attempt: core });
    view.continueRouting();
    const current = c.work.at(-1);
    assert.equal(old.signal.aborted, true);
    old.reject(new Error("late"));
    await tick();
    assert.equal(render({ attempt: core }).busy, true);
    current.resolve({ id: "current" });
    await tick();
    assert.deepEqual(events, [{ id: "current" }]);
    assert.equal(render({ attempt: core }).busy, false);
  }));
