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
async function fixture(run, realClient = false) {
  const dir = mkdtempSync(resolve("node_modules/.cache/private-report-"));
  const old = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const oldFetch = globalThis.fetch;
  try {
    await build({
      stdin: {
        contents: `export {useExamAttemptOpen,useExamPreparation} from './src/hooks/use-exam-entry';export {c} from 'fixture';`,
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
                  /^(fixture|react|@\/state\/auth-state|@\/lib\/assessments\/(client|drafts|offline)|@\/integrations\/supabase\/client)$/,
              },
              (args) =>
                realClient && args.path === "@/lib/assessments/client"
                  ? undefined
                  : { path: "fixture", namespace: "fixture" },
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `
 export const supabase={auth:{getSession:()=>new Promise(resolve=>c.sessions.push(resolve))}};export const c={sessions:[],fetches:[],slots:[],cursor:0,effects:[],actor:'a',requests:[],stateWrites:0,offline:[],persisted:[],reads:0};export const browserExamStorage=()=>({});export const readOfflineExams=()=>{c.reads++;return c.offline;};export const saveOfflineExam=(s,actor,attempt)=>c.persisted.push({actor,attempt});export const recoveryCopiesForScope=(rows,org)=>rows.filter(row=>!org||(row.enrollment.scope==='team'&&row.enrollment.organizationId===org));
 const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export function useState(initial){const slots=c.slots,i=c.cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>{c.stateWrites++;slots[i]=typeof v==='function'?v(slots[i]):v;}];}
 export function useRef(initial){const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i];}
 export function useCallback(fn,deps){const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={fn,deps};return c.slots[i].fn;}
 export function useEffect(fn,deps){const slots=c.slots,i=c.cursor++,old=slots[i];if(!old||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}
 const isCurrentUser=id=>c.actor===id;export const useAuth=()=>({user:c.actor?{id:c.actor}:null,isCurrentUser});
 export const examRequest=(url,signal,owner)=>new Promise((resolve,reject)=>c.requests.push({url,signal,owner,resolve,reject}));
 export class ExamRequestError extends Error{constructor(message,status){super(message);this.status=status;}}c.Error=ExamRequestError;
 `,
            }));
          },
        },
      ],
    });
    const { useExamAttemptOpen, useExamPreparation, c } = await import(join(dir, "case.mjs"));
    if (realClient)
      globalThis.fetch = (url, opts) =>
        new Promise((resolve) => c.fetches.push({ url, opts, resolve }));
    Object.defineProperty(globalThis, "navigator", { value: { onLine: true }, configurable: true });
    const slots = [],
      opened = [],
      loading = [],
      errors = [];
    const callbacks = {
      onOpened: (value) => opened.push(value),
      onLoading: (value) => loading.push(value),
      onError: (value) => errors.push(value),
    };
    const unmount = () => {
      for (const item of slots) item?.cleanup?.();
      slots.length = 0;
    };
    const render = (mode = "open", opts = {}) => {
      c.slots = slots;
      c.cursor = 0;
      const value =
        mode === "prepare"
          ? useExamPreparation(opts.checkpointId)
          : useExamAttemptOpen(opts.orgId, callbacks);
      for (const e of c.effects.splice(0)) e();
      return value;
    };
    const payload = (items = [{ id: "row-a", attempt_number: 1 }], extra = {}) => ({
      items,
      hasMore: true,
      nextCursor: { before: "cursor-a" },
      limit: 10,
      summary: "synthetic private metadata",
      ...extra,
    });

    try {
      await run({ c, render, opened, loading, errors, unmount });
    } finally {
      unmount();
    }
  } finally {
    globalThis.fetch = oldFetch;
    if (old) Object.defineProperty(globalThis, "navigator", old);
    else delete globalThis.navigator;
    rmSync(dir, { recursive: true, force: true });
  }
}
const attempt = (id = "attempt-a", org) => ({
  id,
  enrollment: { scope: org ? "team" : "personal", organizationId: org ?? null },
});
test("newest attempt open wins; superseded replies do not select, cache or clear new loading", () =>
  fixture(async ({ c, render, opened, loading, errors }) => {
    const entry = render("open", { orgId: "org-a" });
    entry.open("first", true);
    entry.open("second");
    assert.equal(c.requests[0].signal.aborted, true);
    assert.match(c.requests[0].url, /review=1&org=org-a/);
    assert.match(c.requests[1].url, /attempt=second&org=org-a/);
    const before = loading.length;
    c.requests[0].resolve(attempt("first", "org-a"));
    await tick();
    assert.equal(loading.length, before);
    assert.deepEqual(opened, []);
    assert.deepEqual(c.persisted, []);
    c.requests[1].resolve(attempt("second", "org-a"));
    await tick();
    assert.equal(opened[0].attempt.id, "second");
    assert.equal(c.persisted.length, 1);
    assert.equal(c.persisted[0].actor, "a");
    assert.equal(loading.at(-1), false);
    assert.equal(errors.at(-1), "");
  }));
test("explicit Back cancellation, org changes and retained callbacks suppress late work", () =>
  fixture(async ({ c, render, opened, loading }) => {
    let entry = render("open", { orgId: "org-a" });
    entry.open("first");
    entry.cancelOpen();
    assert.equal(c.requests[0].signal.aborted, true);
    const before = loading.length;
    c.requests[0].resolve(attempt("first", "org-a"));
    await tick();
    assert.equal(loading.length, before);
    assert.equal(c.persisted.length, 0);
    entry.open("next");
    const pending = c.requests[1];
    render("open", { orgId: "org-b" });
    assert.equal(pending.signal.aborted, true);
    const count = c.requests.length;
    entry.open("old");
    entry.cancelOpen();
    assert.equal(c.requests.length, count);
    pending.reject(new TypeError("late network"));
    await tick();
    assert.equal(c.reads, 0);
    assert.equal(opened.length, 0);
  }));
test("unmount and actor loss without rerender prevent persistence, fallback and state callbacks", () =>
  fixture(async ({ c, render, opened, loading, unmount }) => {
    let entry = render();
    entry.open("first");
    c.actor = "b";
    const before = loading.length;
    c.requests[0].resolve(attempt("first"));
    await tick();
    assert.equal(c.persisted.length, 0);
    assert.equal(opened.length, 0);
    assert.equal(loading.length, before);
    entry.open("old");
    assert.equal(c.requests.length, 1);
    entry = render();
    entry.open("next");
    unmount();
    const after = loading.length;
    c.requests[1].reject(new TypeError("late"));
    await tick();
    assert.equal(c.reads, 0);
    assert.equal(loading.length, after);
    assert.equal(c.requests[1].signal.aborted, true);
  }));
test("current network recovery is account/organization scoped; online denials and foreign team responses stay errors", () =>
  fixture(async ({ c, render, opened, errors }) => {
    const entry = render("open", { orgId: "org-a" });
    c.offline = [attempt("saved", "org-b"), attempt("saved", "org-a")];
    entry.open("saved");
    c.requests[0].reject(new TypeError("network"));
    await tick();
    assert.equal(opened[0].attempt.enrollment.organizationId, "org-a");
    assert.equal(opened[0].fromDevice, true);
    assert.match(errors.at(-1), /saved copy/);
    entry.open("denied");
    c.requests[1].reject(new c.Error("denied", 403));
    await tick();
    assert.equal(c.reads, 1);
    assert.equal(opened.length, 1);
    assert.equal(errors.at(-1), "denied");
    entry.open("foreign");
    c.requests[2].resolve(attempt("foreign", "org-b"));
    await tick();
    assert.match(errors.at(-1), /outside this team view/);
    assert.equal(c.persisted.length, 0);
    assert.equal(opened.length, 1);
  }));
test("preparation owns checkpoint/actor and aborts old request; late success/error cannot replace new disclosure", () =>
  fixture(async ({ c, render }) => {
    render("prepare", { checkpointId: "check-a" });
    const old = c.requests[0];
    let view = render("prepare", { checkpointId: "check-b" });
    assert.equal(old.signal.aborted, true);
    assert.equal(view.prepared, null);
    assert.equal(c.requests[1].url.checkpointId, "check-b");
    old.resolve({ preparedForm: "old" });
    await tick();
    assert.equal(render("prepare", { checkpointId: "check-b" }).prepared, null);
    c.requests[1].resolve({ preparedForm: "new", estimatedMinutes: 20, provisional: true });
    await tick();
    view = render("prepare", { checkpointId: "check-b" });
    assert.equal(view.prepared.preparedForm, "new");
    c.actor = "b";
    view = render("prepare", { checkpointId: "check-b" });
    assert.equal(view.prepared, null);
    c.requests.at(-1).reject(new Error("current failure"));
    await tick();
    assert.equal(render("prepare", { checkpointId: "check-b" }).error, "current failure");
  }));
test("preparation clears on Back, refetches on reopening same checkpoint and suppresses unmounted replies", () =>
  fixture(async ({ c, render, unmount }) => {
    render("prepare", { checkpointId: "check-a" });
    c.requests[0].resolve({ preparedForm: "old" });
    await tick();
    assert.ok(render("prepare", { checkpointId: "check-a" }).prepared);
    render("prepare");
    const count = c.requests.length;
    let view = render("prepare", { checkpointId: "check-a" });
    assert.equal(view.prepared, null);
    assert.equal(c.requests.length, count + 1);
    const request = c.requests.at(-1);
    unmount();
    const writes = c.stateWrites;
    request.reject(new Error("late"));
    await tick();
    assert.equal(c.stateWrites, writes);
    assert.equal(request.signal.aborted, true);
    c.actor = null;
    render("prepare", { checkpointId: "check-a" });
    assert.equal(c.requests.length, count + 1);
  }));
test("attempt and preparation requests supply the originating owner and current lifecycle", () =>
  fixture(async ({ c, render, unmount }) => {
    render().open("owned");
    assert.equal(c.requests[0].owner.userId, "a");
    assert.equal(c.requests[0].owner.isCurrent(), true);
    unmount();
    assert.equal(c.requests[0].owner.isCurrent(), false);
    render("prepare", { checkpointId: "owned-checkpoint" });
    assert.equal(c.requests[1].owner.userId, "a");
    c.actor = "b";
    assert.equal(c.requests[1].owner.isCurrent(), false);
  }));
test("an offline browser flag cannot restore a cached attempt after an explicit denial", () =>
  fixture(async ({ c, render, opened, errors }) => {
    navigator.onLine = false;
    c.offline = [attempt("denied")];
    render().open("denied");
    c.requests[0].reject(new c.Error("explicit denial", 403));
    await tick();
    assert.equal(c.reads, 0);
    assert.equal(opened.length, 0);
    assert.equal(errors.at(-1), "explicit denial");
  }));
test("actual entry hooks/client refuse SDK mismatch without caching or recovery, then accept current preparation", () =>
  fixture(async ({ c, render, opened, errors, unmount }) => {
    navigator.onLine = false;
    const done = render().open("owned");
    c.sessions.shift()({ data: { session: { user: { id: "b" }, access_token: "synthetic-b" } } });
    await tick();
    assert.equal(c.fetches.length, 0);
    await done;
    assert.equal(opened.length, 0);
    assert.equal(c.persisted.length, 0);
    assert.equal(c.reads, 0);
    assert.match(errors.at(-1), /Sign in to continue/);
    unmount();
    render("prepare", { checkpointId: "owned-checkpoint" });
    c.sessions.shift()({ data: { session: { user: { id: "b" }, access_token: "synthetic-b" } } });
    await tick();
    assert.equal(c.fetches.length, 0);
    assert.equal(render("prepare", { checkpointId: "owned-checkpoint" }).prepared, null);
    render("prepare", { checkpointId: "next-checkpoint" });
    c.sessions.shift()({ data: { session: { user: { id: "a" }, access_token: "synthetic-a" } } });
    await tick();
    assert.equal(c.fetches.length, 1);
    assert.deepEqual(JSON.parse(c.fetches[0].opts.body), {
      action: "prepare",
      checkpointId: "next-checkpoint",
    });
    c.fetches[0].resolve({
      ok: true,
      json: async () => ({
        preparedForm: "synthetic digest",
        estimatedMinutes: 20,
        provisional: true,
      }),
    });
    await tick();
    assert.equal(
      render("prepare", { checkpointId: "next-checkpoint" }).prepared.preparedForm,
      "synthetic digest",
    );
  }, true));
