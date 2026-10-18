import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
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
  mkdirSync(resolve("node_modules/.cache"), { recursive: true });
  const dir = mkdtempSync(resolve("node_modules/.cache/private-report-"));
  const old = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalFetch = globalThis.fetch;
  try {
    await build({
      stdin: {
        contents: `export {AIWritingProposal} from './src/components/exams/AIWritingProposal';export {c} from 'fixture';`,
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
            b.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({
              path: "fixture",
              namespace: "fixture",
            }));
            b.onResolve(
              { filter: /^(fixture|react|@\/state\/auth-state|@\/lib\/assessments\/client)$/ },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              resolveDir: process.cwd(),
              contents: `
 import {examRequest as realRequest,examPlanRequest as realPlan,ExamRequestError} from "./src/lib/assessments/client.ts";
 export {ExamRequestError};export const supabase={auth:{getSession:()=>new Promise(resolve=>c.sessions.push(resolve))}};
 export const c={sessions:[],fetches:[],slots:[],cursor:0,effects:[],actor:'a',requests:[],stateWrites:0};
 const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export function useState(initial){const slots=c.slots,i=c.cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>{c.stateWrites++;slots[i]=typeof v==='function'?v(slots[i]):v;}];}
 export function useRef(initial){const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i];}
 export function useCallback(fn,deps){const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={fn,deps};return c.slots[i].fn;}
 export function useEffect(fn,deps){const slots=c.slots,i=c.cursor++,old=slots[i];if(!old||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}
 const isCurrentUser=id=>c.actor===id;export const useAuth=()=>({user:c.actor?{id:c.actor}:null,isCurrentUser});
 export const examRequest=(url,signal,owner)=>c.realClient?realRequest(url,signal,owner):new Promise((resolve,reject)=>c.requests.push({url,signal,owner,resolve,reject}));
 c.Error=ExamRequestError;
 `,
            }));
          },
        },
      ],
    });
    const { AIWritingProposal, c } = await import(join(dir, "case.mjs"));
    c.realClient = realClient;
    globalThis.fetch = (url, opts) =>
      new Promise((resolve) => c.fetches.push({ url, opts, resolve }));
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
          type: AIWritingProposal,
          props: {
            attemptId: "attempt-a",
            responseId: "response-a",
            onRefresh: () => opened.push(true),
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
    globalThis.fetch = originalFetch;
    if (old) Object.defineProperty(globalThis, "window", old);
    else delete globalThis.window;
    rmSync(dir, { recursive: true, force: true });
  }
}
const checkbox = (tree) => nodes(tree).find((n) => n.type === "input");
const button = (tree) => nodes(tree).find((n) => n.type === "button");
function consent(ctx, props = {}) {
  let tree = ctx.render("component", props);
  checkbox(tree).props.onChange({ target: { checked: true } });
  return ctx.render("component", props);
}
test("optional writing consent is reset for each attempt, response, account and durable job state", () =>
  fixture(async (ctx) => {
    const { c, render } = ctx;
    for (const props of [{ attemptId: "attempt-b" }, { responseId: "response-b" }]) {
      let tree = consent(ctx);
      assert.equal(checkbox(tree).props.checked, true);
      tree = render("component", props);
      assert.equal(checkbox(tree).props.checked, false);
      assert.equal(button(tree).props.disabled, true);
      render("component");
    }
    consent(ctx);
    c.actor = "b";
    let tree = render("component");
    assert.equal(checkbox(tree).props.checked, false);
    tree = consent(ctx);
    tree = render("component", { jobStatus: "failed" });
    assert.equal(button(tree), undefined);
    tree = render("component");
    assert.equal(checkbox(tree).props.checked, false);
  }));
test("one explicitly consented request sends only exact answer IDs/version and refreshes once on current result", () =>
  fixture(async (ctx) => {
    const { c, render, opened } = ctx;
    let tree = render("component");
    button(tree).props.onClick();
    assert.equal(c.requests.length, 0);
    tree = consent(ctx);
    button(tree).props.onClick();
    button(tree).props.onClick();
    assert.equal(c.requests.length, 1);
    assert.deepEqual(c.requests[0].url, {
      action: "ai_writing",
      attemptId: "attempt-a",
      responseId: "response-a",
      consentVersion: "assessment-ai-writing-v1",
    });
    assert.ok(c.requests[0].signal instanceof AbortSignal);
    tree = render("component");
    assert.equal(checkbox(tree).props.disabled, true);
    checkbox(tree).props.onChange({ target: { checked: false } });
    assert.equal(checkbox(render("component")).props.checked, true);
    c.requests[0].resolve({ message: "Synthetic proposal pending human review" });
    await tick();
    tree = render("component");
    assert.equal(button(tree).props.disabled, false);
    assert.deepEqual(opened, [true]);
    assert.equal(c.requests[0].signal.aborted, true);
  }));
test("departed attempt/response and unmount suppress provider-response refresh/error/finally and old consent handlers", () =>
  fixture(async (ctx) => {
    const { c, render, opened, unmount } = ctx;
    const old = consent(ctx);
    button(old).props.onClick();
    let tree = render("component", { responseId: "response-b" });
    assert.equal(c.requests[0].signal.aborted, true);
    const count = c.requests.length,
      writes = c.stateWrites;
    button(old).props.onClick();
    checkbox(old).props.onChange({ target: { checked: true } });
    assert.equal(c.requests.length, count);
    assert.equal(c.stateWrites, writes);
    c.requests[0].resolve({ message: "late" });
    await tick();
    assert.deepEqual(opened, []);
    assert.equal(c.stateWrites, writes);
    assert.equal(checkbox(tree).props.checked, false);
    tree = consent(ctx, { responseId: "response-b" });
    button(tree).props.onClick();
    unmount();
    const after = c.stateWrites;
    c.requests[1].reject(new Error("late"));
    await tick();
    assert.equal(c.stateWrites, after);
    assert.deepEqual(opened, []);
  }));
test("current errors refresh durable job state; actor loss or a new job state suppresses late completion", () =>
  fixture(async (ctx) => {
    const { c, render, opened } = ctx;
    let tree = consent(ctx);
    button(tree).props.onClick();
    c.requests[0].reject(new Error("uncertain synthetic job"));
    await tick();
    assert.deepEqual(opened, [true]);
    assert.equal(button(render("component")).props.disabled, false);
    tree = render("component");
    button(tree).props.onClick();
    c.actor = "b";
    const before = c.stateWrites;
    c.requests[1].resolve({ message: "late actor" });
    await tick();
    assert.equal(c.stateWrites, before);
    assert.deepEqual(opened, [true]);
    tree = consent(ctx);
    button(tree).props.onClick();
    render("component", { jobStatus: "running" });
    assert.equal(c.requests[2].signal.aborted, true);
    c.requests[2].reject(new Error("late job"));
    await tick();
    assert.deepEqual(opened, [true]);
  }));

test("optional writing request binds SDK owner before any provider-capable transport", () =>
  fixture(async (ctx) => {
    button(consent(ctx)).props.onClick();
    ctx.c.sessions.shift()({
      data: { session: { user: { id: "b" }, access_token: "synthetic-b" } },
    });
    await tick();
    assert.equal(ctx.c.fetches.length, 0);
    assert.match(JSON.stringify(ctx.render()), /Sign in/);
    assert.equal(
      ctx.opened.length,
      1,
      "current denial still requests observation of any durable outcome",
    );
  }, true));
