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
        contents: `export {useExamMutation} from './src/hooks/use-exam-mutation';export {c} from 'fixture';`,
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
 export const supabase={auth:{getSession:()=>new Promise(resolve=>c.sessions.push(resolve))}};export const c={sessions:[],slots:[],cursor:0,effects:[],actor:'a',requests:[],stateWrites:0,offline:[],persisted:[],reads:0};export const browserExamStorage=()=>({});export const readOfflineExams=()=>{c.reads++;return c.offline;};export const saveOfflineExam=(s,actor,attempt)=>c.persisted.push({actor,attempt});export const recoveryCopiesForScope=(rows,org)=>rows.filter(row=>!org||(row.enrollment.scope==='team'&&row.enrollment.organizationId===org));
 const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export function useState(initial){const slots=c.slots,i=c.cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>{c.stateWrites++;slots[i]=typeof v==='function'?v(slots[i]):v;}];}
 export function useRef(initial){const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i];}
 export function useCallback(fn,deps){const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={fn,deps};return c.slots[i].fn;}
 export function useEffect(fn,deps){const slots=c.slots,i=c.cursor++,old=slots[i];if(!old||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}
 const isCurrentUser=id=>c.actor===id;export const useAuth=()=>({user:c.actor?{id:c.actor}:null,isCurrentUser,canUseReader:id=>c.actor===id&&!c.signingOut});
 export const examRequest=(url,signal,owner)=>new Promise((resolve,reject)=>c.requests.push({url,signal,owner,resolve,reject}));
 export class ExamRequestError extends Error{constructor(message,status){super(message);this.status=status;}}c.Error=ExamRequestError;
 `,
            }));
          },
        },
      ],
    });
    const { useExamMutation, c } = await import(join(dir, "case.mjs"));
    if (realClient)
      globalThis.fetch = (url, opts) =>
        new Promise((resolve) => c.requests.push({ url, opts, resolve }));
    const slots = [],
      started = [];
    const onStart = () => started.push(true);
    const unmount = () => {
      for (const item of slots) item?.cleanup?.();
      slots.length = 0;
    };
    const render = (context = "form-a") => {
      c.slots = slots;
      c.cursor = 0;
      const value = useExamMutation(context, onStart);
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
      await run({ c, render, started, unmount });
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
test("mutation owns one flight and forwards exact retry/revision body and signal before one current success callback", () =>
  fixture(async ({ c, render, started }) => {
    let view = render();
    const successes = [];
    const body = {
      action: "schedule",
      requestId: "same-id",
      revision: 7,
      reason: "synthetic reason",
    };
    view.act(body, (v) => successes.push(v));
    view.act(body, (v) => successes.push(v));
    assert.equal(c.requests.length, 1);
    assert.equal(started.length, 1);
    assert.deepEqual(c.requests[0].url, body);
    assert.ok(c.requests[0].signal instanceof AbortSignal);
    assert.equal(render().busy, true);
    c.requests[0].resolve({ ok: true });
    await tick();
    view = render();
    assert.deepEqual(successes, [{ ok: true }]);
    assert.equal(view.busy, false);
    assert.equal(view.error, "");
    assert.equal(c.requests[0].signal.aborted, true);
    view.act(body, () => successes.push("cancelled"));
    view.cancel();
    assert.equal(c.requests[1].signal.aborted, true);
    assert.equal(render().busy, false);
    c.requests[1].resolve({ ok: true });
    await tick();
    assert.deepEqual(successes, [{ ok: true }]);
  }));
test("form/target departure aborts and resets status; late reply and finalizer cannot affect next action", () =>
  fixture(async ({ c, render, started }) => {
    let old = render();
    const calls = [];
    old.act({ action: "start" }, () => calls.push("old"));
    let next = render("form-b");
    assert.equal(c.requests[0].signal.aborted, true);
    assert.equal(next.busy, false);
    assert.equal(next.error, "");
    old.act(
      () => {
        throw new Error("departed payload factory must not run");
      },
      () => calls.push("retained"),
    );
    assert.equal(c.requests.length, 1);
    assert.equal(started.length, 1);
    next.act({ action: "schedule" }, () => calls.push("new"));
    assert.equal(render("form-b").busy, true);
    c.requests[0].resolve({});
    await tick();
    assert.deepEqual(calls, []);
    assert.equal(render("form-b").busy, true);
    c.requests[1].resolve({});
    await tick();
    assert.deepEqual(calls, ["new"]);
    assert.equal(render("form-b").busy, false);
  }));
test("actor loss without render, unmount and retained callbacks suppress onStart, success, error and status writes", () =>
  fixture(async ({ c, render, started, unmount }) => {
    let view = render();
    const calls = [];
    view.act({ action: "start" }, () => calls.push("old"));
    c.actor = "b";
    const writes = c.stateWrites;
    c.requests[0].resolve({});
    await tick();
    assert.equal(c.stateWrites, writes);
    assert.deepEqual(calls, []);
    view.act({ action: "enroll" }, () => {});
    assert.equal(started.length, 1);
    view = render();
    view.act({ action: "schedule" }, () => calls.push("new"));
    unmount();
    const after = c.stateWrites;
    c.requests[1].reject(new Error("late"));
    await tick();
    assert.equal(c.stateWrites, after);
    assert.equal(c.requests[1].signal.aborted, true);
    c.actor = null;
    view = render();
    view.act({ action: "start" }, () => {});
    assert.equal(c.requests.length, 2);
  }));
test("current server/callback failures remain retryable; status clears only in current context", () =>
  fixture(async ({ c, render }) => {
    let view = render();
    const body = { action: "schedule", requestId: "retained", revision: 7 };
    view.act(body, () => {});
    c.requests[0].reject(new c.Error("revision conflict", 409));
    await tick();
    view = render();
    assert.equal(view.busy, false);
    assert.equal(view.error, "revision conflict");
    view.clearError();
    assert.equal(render().error, "");
    view = render();
    view.act(body, () => {
      throw new Error("outside team scope");
    });
    assert.deepEqual(c.requests[1].url, body);
    c.requests[1].resolve({});
    await tick();
    view = render();
    assert.equal(view.error, "outside team scope");
    const oldClear = view.clearError;
    render("form-b");
    const writes = c.stateWrites;
    oldClear();
    assert.equal(c.stateWrites, writes);
    assert.equal(render("form-b").error, "");
  }));

test("mutation passes its original owner through success context and releases busy after pending signout", () =>
  fixture(async ({ c, render }) => {
    let successes = 0;
    const view = render();
    const done = view.act({ action: "synthetic" }, () => successes++);
    assert.equal(c.requests[0].owner.userId, "a");
    c.signingOut = true;
    c.requests[0].resolve({});
    await done;
    assert.equal(successes, 0);
    c.signingOut = false;
    assert.equal(render().busy, false);
    let context;
    const again = render().act({ action: "synthetic" }, (_v, ctx) => (context = ctx));
    c.requests[1].resolve({});
    await again;
    assert.equal(context.owner, c.requests[1].owner);
    assert.equal(context.owner.userId, "a");
    assert.equal(context.owner.isCurrent(), false);
  }));
test("actual mutation hook and assessment client refuse mismatched SDK credentials before transport", () =>
  fixture(async ({ c, render }) => {
    let successes = 0;
    let done = render().act({ action: "synthetic" }, () => successes++);
    c.sessions.shift()({ data: { session: { user: { id: "b" }, access_token: "synthetic-b" } } });
    await tick();
    assert.equal(c.requests.length, 0);
    await done;
    assert.equal(successes, 0);
    assert.match(render().error, /Sign in to continue/);
    assert.equal(render().busy, false);
    done = render().act({ action: "synthetic" }, () => successes++);
    c.sessions.shift()({ data: { session: { user: { id: "a" }, access_token: "synthetic-a" } } });
    await tick();
    assert.equal(c.requests.length, 1);
    assert.deepEqual(JSON.parse(c.requests[0].opts.body), { action: "synthetic" });
    assert.equal(c.requests[0].opts.headers.Authorization, "Bearer synthetic-a");
    c.requests[0].resolve({ ok: true, json: async () => ({ ok: true }) });
    await done;
    assert.equal(successes, 1);
  }, true));
