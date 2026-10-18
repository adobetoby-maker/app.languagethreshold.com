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
  const old = Object.getOwnPropertyDescriptor(globalThis, "window"),
    nav = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { onLine: true } });
  const originalFetch = globalThis.fetch;
  try {
    await build({
      stdin: {
        contents: `export {DailyLessonPlan} from './src/components/exams/DailyLessonPlan';export {c} from 'fixture';`,
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
            b.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({
              path: "fixture",
              namespace: "fixture",
            }));
            b.onResolve(
              {
                filter:
                  /^(fixture|react|@\/state\/auth-state|@\/lib\/(?:assessments\/(?:client|drafts|offline)|exam-navigation|learning-link|lesson-drafts)|@\/data\/(modules|curriculum|languages)|\.\/ExamsArea)$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              resolveDir: process.cwd(),
              contents: `
 import {examRequest as realRequest,examPlanRequest as realPlan,ExamRequestError} from "./src/lib/assessments/client.ts";
 export {ExamRequestError};export const supabase={auth:{getSession:()=>new Promise(resolve=>c.sessions.push(resolve))}};
 export const MODULES=[{id:'roofing',name:'Roofing'},{id:'landscaper',name:'Landscaper'}],LANGUAGES=['English','Spanish'],NATIVE_LANGUAGES=['English','Spanish'];export const getCurriculum=()=>({lessons:[]}),getModule=id=>({name:id});
 export const ExamsArea='embedded-exams',Suspense='suspense',lazy=()=> 'embedded-exams',examsLocation=()=>'/exams',moduleLessonUrl=o=>'/lesson/'+o.moduleId+'/'+o.lesson+'/'+o.way,examGuidanceKey=()=> 'guidance',browserExamStorage=()=>({}),saveOfflineGuidance=(s,k,d)=>c.saved.push(d),readOfflineGuidance=()=>c.offline??null,lessonPositionKey=()=>'',readLessonPosition=()=>null;
 export const c={sessions:[],fetches:[],slots:[],cursor:0,effects:[],actor:'a',requests:[],stateWrites:0};
 const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export function useState(initial){const slots=c.slots,i=c.cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>{c.stateWrites++;slots[i]=typeof v==='function'?v(slots[i]):v;}];}
 export function useRef(initial){const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i];}
 export function useCallback(fn,deps){const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={fn,deps};return c.slots[i].fn;}
 export function useEffect(fn,deps){const slots=c.slots,i=c.cursor++,old=slots[i];if(!old||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}
 const users=new Map();const isCurrentUser=id=>c.actor===id;export const useAuth=()=>{if(c.actor&&!users.has(c.actor))users.set(c.actor,{id:c.actor});return {user:c.actor?users.get(c.actor):null,isCurrentUser};};
 export const examRequest=(url,signal,owner)=>c.realClient?realRequest(url,signal,owner):new Promise((resolve,reject)=>c.requests.push({kind:'exam',url,signal,owner,resolve,reject}));export const examPlanRequest=(url,signal,owner)=>c.realClient?realPlan(url,signal,owner):new Promise((resolve,reject)=>c.requests.push({kind:'plan',url,signal,owner,resolve,reject}));
 c.Error=ExamRequestError;
 `,
            }));
          },
        },
      ],
    });
    const { DailyLessonPlan, c } = await import(join(dir, "case.mjs"));
    c.realClient = realClient;
    globalThis.fetch = (url, opts) =>
      new Promise((resolve) => c.fetches.push({ url, opts, resolve }));
    const listeners = new Map();
    c.emit = (name) => {
      for (const f of listeners.get(name) ?? []) f();
    };
    globalThis.window = {
      location: { origin: "https://synthetic.invalid", assign: (url) => c.navigations.push(url) },
      localStorage: {},
      addEventListener: (n, f) => {
        if (!listeners.has(n)) listeners.set(n, new Set());
        listeners.get(n).add(f);
      },
      removeEventListener: (n, f) => listeners.get(n)?.delete(f),
    };
    const timing = (x) => c.timings.push(x);
    c.timings = [];
    c.navigations = [];
    c.saved = [];
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
          type: DailyLessonPlan,
          props: {
            moduleId: "roofing",
            target: "English",
            native: "Spanish",
            activePlanId: "plan-a",
            lessonNumber: 1,
            lessonWay: "see",
            onPlanTiming: timing,
            ...opts,
          },
          key: "root",
        },
        depth = 0;
      // The hook harness itself is stable across prop changes.
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
    const payload = (extra = {}) => ({
      plans: [
        {
          enrollmentId: "plan-a",
          scope: "personal",
          organizationId: null,
          startDate: "2026-10-17",
          timezone: "UTC",
          status: "active",
          pausedOn: null,
          revision: null,
          assignments: [
            {
              id: "assignment-a",
              mode: "units",
              capability_snapshot: {
                title: "Synthetic support",
                moduleId: "foreman",
                lessonIds: ["foreman.lesson.1"],
              },
              reason: "Synthetic recommendation",
              primaryObjectives: ["roofing.lesson.1"],
              primary_weekly_minutes: 60,
              support_weekly_minutes: 10,
              status: "approved",
              acknowledged_at: null,
              checkpoints: [{ id: "checkpoint-a", checkpoint: "entrance", attempts: [] }],
            },
          ],
        },
      ],
      returnContexts: [],
      ...extra,
    });
    const ready = async (mode = "component", opts = {}) => {
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
    if (nav) Object.defineProperty(globalThis, "navigator", nav);
    else delete globalThis.navigator;
    rmSync(dir, { recursive: true, force: true });
  }
}
function label(n) {
  if (Array.isArray(n)) return n.map(label).join("");
  if (n && typeof n === "object") return label(n.props?.children);
  return n == null || typeof n === "boolean" ? "" : String(n);
}
const button = (tree, prefix) =>
  nodes(tree).find((n) => n.type === "button" && label(n).startsWith(prefix));
test("daily practice owns one acknowledgement before current lesson navigation and exact retry identity", () =>
  fixture(async (ctx) => {
    let tree = await ctx.ready();
    const practice = button(tree, "Practice 1");
    practice.props.onClick();
    practice.props.onClick();
    button(tree, "Before-practice check").props.onClick();
    assert.equal(ctx.c.requests.length, 2);
    const req = ctx.c.requests[1];
    assert.equal(req.kind, "plan");
    assert.equal(req.url.action, "acknowledge");
    assert.equal(req.url.assignmentId, "assignment-a");
    assert.ok(req.signal);
    req.reject(new Error("synthetic acknowledgement uncertainty"));
    await tick();
    tree = ctx.render();
    assert.match(label(tree), /uncertainty/);
    button(tree, "Practice 1").props.onClick();
    assert.deepEqual(ctx.c.requests[2].url, req.url);
    ctx.c.requests[2].resolve({});
    await tick();
    assert.deepEqual(ctx.c.navigations, ["/lesson/foreman/1/see"]);
  }));
test("checkpoint start owns transport, embeds only current result and resumes without duplicate start", () =>
  fixture(async (ctx) => {
    let tree = await ctx.ready();
    const start = button(tree, "Before-practice check");
    start.props.onClick();
    start.props.onClick();
    assert.equal(ctx.c.requests.length, 2);
    const req = ctx.c.requests[1];
    assert.equal(req.kind, "exam");
    assert.equal(req.url.action, "start");
    assert.equal(req.url.checkpointId, "checkpoint-a");
    assert.ok(req.signal);
    req.resolve({ id: "started-a" });
    await tick();
    tree = ctx.render();
    assert.ok(button(tree, "Return to this module lesson"));
    assert.equal(nodes(tree).find((n) => n.type === "embedded-exams").props.attemptId, "started-a");
    const refresh = ctx.c.requests.at(-1);
    refresh.resolve(ctx.payload());
    await tick();
    tree = ctx.render();
    button(tree, "Return to this module lesson").props.onClick();
    tree = ctx.render();
    ctx.c.requests.at(-1).resolve(ctx.payload());
    await tick();
    tree = ctx.render();
    const count = ctx.c.requests.length;
    button(tree, "Before-practice check").props.onClick();
    tree = ctx.render();
    assert.equal(nodes(tree).find((n) => n.type === "embedded-exams").props.attemptId, "started-a");
    assert.equal(ctx.c.requests.filter((r) => typeof r.url !== "string").length, 1);
    assert.ok(ctx.c.requests.length >= count);
  }));
test("lesson/pair/plan/account changes and unmount reject old actions, navigation, errors and busy completion", () =>
  fixture(async (ctx) => {
    let tree = await ctx.ready();
    const old = tree;
    button(tree, "Practice 1").props.onClick();
    const req = ctx.c.requests.at(-1);
    tree = ctx.render("component", { lessonNumber: 2 });
    assert.equal(req.signal.aborted, true);
    const writes = ctx.c.stateWrites;
    req.resolve({});
    await tick();
    assert.equal(ctx.c.navigations.length, 0);
    assert.equal(ctx.c.stateWrites, writes);
    button(old, "Before-practice check").props.onClick();
    assert.equal(ctx.c.stateWrites, writes);
    tree = ctx.render();
    button(tree, "Before-practice check").props.onClick();
    const start = ctx.c.requests.at(-1);
    ctx.c.actor = "b";
    tree = ctx.render();
    assert.equal(start.signal.aborted, true);
    const after = ctx.c.stateWrites;
    start.reject(new Error("late"));
    await tick();
    assert.equal(ctx.c.stateWrites, after);
    const read = ctx.c.requests.at(-1);
    ctx.unmount();
    assert.equal(read.signal.aborted, true);
    ctx.c.actor = null;
    assert.equal(ctx.render(), null);
  }));
test("reconnect disables old guidance actions, new snapshot unlocks them, and access denial clears displayed guidance", () =>
  fixture(async (ctx) => {
    let tree = await ctx.ready();
    const old = tree;
    button(tree, "Practice 1").props.onClick();
    const action = ctx.c.requests.at(-1);
    ctx.c.emit("online");
    tree = ctx.render();
    assert.equal(action.signal.aborted, true);
    tree = ctx.render();
    assert.equal(button(tree, "Practice 1").props.disabled, true);
    const count = ctx.c.requests.length;
    button(old, "Practice 1").props.onClick();
    assert.equal(ctx.c.requests.length, count);
    ctx.c.requests.at(-1).resolve(ctx.payload());
    await tick();
    tree = ctx.render();
    assert.equal(button(tree, "Practice 1").props.disabled, false);
    action.reject(new Error("late old action"));
    await tick();
    assert.doesNotMatch(label(ctx.render()), /late old action/);
    ctx.c.emit("online");
    ctx.render();
    ctx.c.requests.at(-1).reject(new ctx.c.Error("Forbidden", 403));
    await tick();
    tree = ctx.render();
    assert.equal(button(tree, "Practice 1"), undefined);
    assert.doesNotMatch(label(tree), /Synthetic support/);
  }));

test("pair and selected-plan replacement abort a pending start and reject its old controls", () =>
  fixture(async (ctx) => {
    for (const opts of [
      { target: "Spanish", native: "English" },
      { activePlanId: "plan-b" },
      { moduleId: "landscaper" },
    ]) {
      const tree = await ctx.ready();
      button(tree, "Before-practice check").props.onClick();
      const action = ctx.c.requests.at(-1);
      const replacement = ctx.render("component", opts);
      assert.equal(action.signal.aborted, true);
      const writes = ctx.c.stateWrites;
      action.resolve({ id: "stale-attempt" });
      await tick();
      assert.equal(ctx.c.stateWrites, writes);
      button(tree, "Before-practice check").props.onClick();
      assert.equal(ctx.c.stateWrites, writes);
      assert.equal(
        nodes(replacement).find((n) => n.type === "embedded-exams"),
        undefined,
      );
    }
  }));
test("only network failures recover the saved plan; explicit access denial never restores it even with offline flag", () =>
  fixture(async (ctx) => {
    let tree = await ctx.ready();
    ctx.c.offline = ctx.payload();
    ctx.c.emit("online");
    ctx.render();
    ctx.c.requests.at(-1).reject(new TypeError("synthetic disconnected"));
    await tick();
    tree = ctx.render();
    assert.ok(button(tree, "Practice 1"));
    assert.match(label(tree), /Using the saved learning plan/);
    navigator.onLine = false;
    ctx.c.emit("online");
    ctx.render();
    ctx.c.requests.at(-1).reject(new ctx.c.Error("Forbidden", 403));
    await tick();
    tree = ctx.render();
    assert.equal(button(tree, "Practice 1"), undefined);
    assert.doesNotMatch(label(tree), /Using the saved learning plan|Synthetic support/);
  }));

test("daily guidance SDK denial cannot become offline recovery or cache a replacement plan", () =>
  fixture(async ({ c, render, payload }) => {
    c.offline = payload();
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { onLine: false },
    });
    render();
    c.sessions.shift()({ data: { session: { user: { id: "b" }, access_token: "synthetic-b" } } });
    await tick();
    assert.equal(c.fetches.length, 0);
    assert.deepEqual(c.saved, []);
    assert.equal(label(render()).includes("Using the saved learning plan"), false);
  }, true));

test("daily acknowledgement and checkpoint start bind the original SDK actor", () =>
  fixture(async (ctx) => {
    let tree = await ctx.ready();
    ctx.c.realClient = true;
    button(tree, "Practice 1").props.onClick();
    ctx.c.sessions.shift()({
      data: { session: { user: { id: "b" }, access_token: "synthetic-b" } },
    });
    await tick();
    assert.equal(ctx.c.fetches.length, 0);
    assert.deepEqual(ctx.c.navigations, []);
    tree = ctx.render();
    button(tree, "Before-practice check").props.onClick();
    ctx.c.sessions.shift()({
      data: { session: { user: { id: "b" }, access_token: "synthetic-b" } },
    });
    await tick();
    assert.equal(ctx.c.fetches.length, 0);
    assert.deepEqual(ctx.opened, []);
  }));
