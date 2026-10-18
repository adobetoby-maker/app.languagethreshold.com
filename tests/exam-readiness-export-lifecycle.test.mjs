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
async function fixture(run, realClient = false) {
  const dir = mkdtempSync(resolve("node_modules/.cache/private-report-"));
  const saved = Object.fromEntries(
    ["window", "document", "URL", "setTimeout", "clearTimeout"].map((k) => [
      k,
      Object.getOwnPropertyDescriptor(globalThis, k),
    ]),
  );
  const originalFetch = globalThis.fetch;
  try {
    await build({
      stdin: {
        contents: (() => {
          const source = readFileSync("src/components/exams/ExamsArea.tsx", "utf8");
          const start = source.indexOf("type ShownProgressExportProps =");
          const end = source.indexOf("function PlanPanelDisclosure", start);
          return `import {useState,useEffect,useRef} from 'react';import {useAuth} from '@/state/auth-state';import {usePracticeLifecycle} from '@/hooks/use-practice-lifecycle';import {examRequest} from '@/lib/assessments/client';import {assessmentCsv,assessedProgressRows} from '@/lib/assessments/export';import {c,card,button,getModule,skills,lessonNumberRanges} from 'fixture';type Overview=any;type Language=string;type NativeLanguage=string;type LessonSourceCoverage=any;type AssessmentSkill=string;${source.slice(start, end)};export {ReadinessPanel,ShownProgressExport,c};`;
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
            b.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({
              path: "fixture",
              namespace: "fixture",
            }));
            b.onResolve(
              {
                filter:
                  /^(fixture|react|@\/state\/auth-state|@\/lib\/assessments\/client|@\/data\/(modules|curriculum|languages))$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              resolveDir: process.cwd(),
              contents: `
 import {examRequest as realRequest,examPlanRequest as realPlan,ExamRequestError} from "./src/lib/assessments/client.ts";
 export {ExamRequestError};export const supabase={auth:{getSession:()=>new Promise(resolve=>c.sessions.push(resolve))}};
 export const card='',button='',skills={recognition:'Word recognition'},getModule=id=>({name:id}),lessonNumberRanges=n=>n.join(',');
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
    const { ReadinessPanel, ShownProgressExport, c } = await import(join(dir, "case.mjs"));
    c.realClient = realClient;
    globalThis.fetch = (url, opts) =>
      new Promise((resolve) => c.fetches.push({ url, opts, resolve }));
    globalThis.window = { location: { origin: "https://synthetic.invalid" } };
    const snapshot = { members: [], enrollments: [] };
    c.downloads = [];
    c.revoked = [];
    c.timers = new Map();
    let serial = 0;
    globalThis.URL = {
      createObjectURL: (blob) => {
        c.lastBlob = blob;
        return "blob:synthetic-" + ++serial;
      },
      revokeObjectURL: (url) => c.revoked.push(url),
    };
    globalThis.setTimeout = (fn) => {
      const id = ++serial;
      c.timers.set(id, fn);
      return id;
    };
    globalThis.clearTimeout = (id) => c.timers.delete(id);
    globalThis.document = {
      createElement: () => ({
        click() {
          if (c.failClick) throw new Error("synthetic download failure");
          c.downloads.push({ name: this.download, url: this.href });
        },
      }),
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
          type: mode === "export" ? ShownProgressExport : ReadinessPanel,
          props: {
            target: "English",
            native: "Spanish",
            context: "report-a",
            overview: snapshot,
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
    globalThis.fetch = originalFetch;
    for (const [k, d] of Object.entries(saved)) {
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
    }
    rmSync(dir, { recursive: true, force: true });
  }
}
const select = (tree) => nodes(tree).find((n) => n.type === "select");
const button = (tree, label) =>
  nodes(tree).find((n) => n.type === "button" && n.props.children === label);
const text = (tree) => JSON.stringify(tree);
function toggle(tree, open) {
  const target = { open };
  tree.props.onToggle({ target, currentTarget: target });
}
const track = (name) => ({
  moduleId: name,
  name,
  status: "content_pending",
  lessonCount: 1,
  authoredLessonLists: 1,
  contextualPassages: 1,
  exams: { entrance: "draft", day45: "draft", day90: "draft" },
  sourceCoverage: {
    lessonsWithTeachingSettings: 1,
    missingLessonNumbers: [],
    duplicateLessonNumbers: [],
    missingWordLists: [],
    vocabularyQuantityGaps: [],
    missingPassages: [],
    missingTeachingSettings: [],
    lessonsWithoutExplicitRecallStep: [],
  },
});
async function loaded(ctx) {
  let tree = ctx.render();
  toggle(tree, true);
  ctx.render();
  ctx.c.requests.at(-1).resolve({ tracks: [track("Roofing"), track("Landscaper")] });
  await tick();
  return ctx.render();
}
test("readiness loads only on disclosure, ignores nested toggles, and selects current module", () =>
  fixture(async (ctx) => {
    let tree = ctx.render();
    assert.equal(ctx.c.requests.length, 0);
    tree.props.onToggle({ target: {}, currentTarget: { open: true } });
    ctx.render();
    assert.equal(ctx.c.requests.length, 0);
    toggle(tree, true);
    tree = ctx.render();
    assert.equal(ctx.c.requests.length, 1);
    tree = ctx.render();
    assert.match(text(tree), /Loading module readiness/);
    assert.equal(select(tree).props.disabled, true);
    assert.match(ctx.c.requests[0].url, /target=English&native=Spanish/);
    ctx.c.requests[0].resolve({
      tracks: [track("Roofing"), track("Landscaper")],
    });
    await tick();
    tree = ctx.render();
    select(tree).props.onChange({ target: { value: "Roofing" } });
    tree = ctx.render();
    assert.equal(select(tree).props.value, "Roofing");
    select(tree).props.onChange({ target: { value: "Landscaper" } });
    tree = ctx.render();
    assert.equal(select(tree).props.value, "Landscaper");
    assert.equal(ctx.c.requests.length, 1);
  }));
test("language and account changes reset readiness disclosure/selection and reject departed controls", () =>
  fixture(async (ctx) => {
    const old = await loaded(ctx);
    select(old).props.onChange({ target: { value: "Roofing" } });
    ctx.render();
    let tree = ctx.render("readiness", {
      target: "Spanish",
      native: "English",
    });
    assert.equal(tree.props.open, false);
    assert.equal(select(tree).props.value, "");
    assert.doesNotMatch(text(tree), /Roofing ·/);
    const writes = ctx.c.stateWrites;
    toggle(old, true);
    select(old).props.onChange({ target: { value: "Roofing" } });
    assert.equal(ctx.c.stateWrites, writes);
    toggle(tree, true);
    ctx.render("readiness", { target: "Spanish", native: "English" });
    const request = ctx.c.requests.at(-1);
    ctx.c.actor = "b";
    tree = ctx.render();
    assert.equal(tree.props.open, false);
    assert.equal(request.signal.aborted, true);
    const after = ctx.c.stateWrites;
    request.resolve({ tracks: [track("old")] });
    await tick();
    assert.equal(ctx.c.stateWrites, after);
    ctx.c.actor = null;
    assert.equal(ctx.render(), null);
  }));
test("closing readiness aborts immediately; reopen uses fresh request and errors can retry", () =>
  fixture(async (ctx) => {
    let tree = ctx.render();
    toggle(tree, true);
    tree = ctx.render();
    const first = ctx.c.requests.at(-1);
    toggle(tree, false);
    assert.equal(first.signal.aborted, true);
    tree = ctx.render();
    toggle(tree, true);
    ctx.render();
    const second = ctx.c.requests.at(-1);
    first.resolve({ tracks: [track("stale")] });
    await tick();
    tree = ctx.render();
    assert.match(text(tree), /Loading module readiness/);
    assert.doesNotMatch(text(tree), /stale/);
    second.reject(new Error("synthetic readiness failure"));
    await tick();
    tree = ctx.render();
    assert.match(text(tree), /synthetic readiness failure/);
    button(tree, "Retry readiness").props.onClick();
    ctx.render();
    const third = ctx.c.requests.at(-1);
    assert.notEqual(third, second);
    third.resolve({ tracks: [] });
    await tick();
    tree = ctx.render();
    assert.match(text(tree), /No readiness records/);
    toggle(tree, false);
    tree = ctx.render();
    toggle(tree, true);
    ctx.render();
    const last = ctx.c.requests.at(-1);
    ctx.unmount();
    assert.equal(last.signal.aborted, true);
    const after = ctx.c.stateWrites;
    last.reject(new Error("late"));
    await tick();
    assert.equal(ctx.c.stateWrites, after);
  }));
test("shown-progress download uses loaded rows and releases URL on snapshot change, expiry and unmount", () =>
  fixture(async (ctx) => {
    ctx.snapshot.members = [{ user_id: "a", display_name: "=Synthetic QA" }];
    ctx.snapshot.enrollments = [
      {
        user_id: "a",
        role: "primary",
        module_id: "roofing",
        scope: "personal",
        instruction_language: "Spanish",
        target_language: "English",
        timezone: "UTC",
        status: "active",
        checkpoints: [
          {
            checkpoint: "entrance",
            due_date: "2026-10-17",
            status: "ready",
            ready: true,
            attempts: [],
          },
        ],
        rawResponse: "SHOULD_NOT_EXPORT",
      },
    ];
    let tree = ctx.render("export");
    const start = button(tree, "Export shown assessed progress");
    start.props.onClick();
    start.props.onClick();
    assert.equal(ctx.c.downloads.length, 1);
    assert.equal(ctx.c.downloads[0].name, "language-threshold-assessed-progress.csv");
    const csv = await ctx.c.lastBlob.text();
    assert.match(csv, /Learner/);
    assert.match(csv, /'=Synthetic QA/);
    assert.match(csv, /not_started/);
    assert.doesNotMatch(csv, /SHOULD_NOT_EXPORT/);
    tree = ctx.render("export", { overview: { members: [], enrollments: [] } });
    assert.equal(ctx.c.revoked.length, 1);
    assert.equal(ctx.c.timers.size, 0);
    start.props.onClick();
    assert.equal(ctx.c.downloads.length, 1);
    button(tree, "Export shown assessed progress").props.onClick();
    assert.equal(ctx.c.downloads.length, 2);
    const expire = [...ctx.c.timers.values()][0];
    expire();
    assert.equal(ctx.c.revoked.length, 2);
    assert.equal(ctx.c.timers.size, 0);
    expire();
    assert.equal(ctx.c.revoked.length, 2);
    tree = ctx.render("export");
    button(tree, "Export shown assessed progress").props.onClick();
    ctx.unmount();
    assert.equal(ctx.c.revoked.length, 3);
    assert.equal(ctx.c.timers.size, 0);
  }));
test("shown-progress old actor/view cannot download; click failure cleans URL and current retry works", () =>
  fixture(async (ctx) => {
    let tree = ctx.render("export");
    const old = button(tree, "Export shown assessed progress");
    ctx.c.actor = "b";
    old.props.onClick();
    assert.equal(ctx.c.downloads.length, 0);
    tree = ctx.render("export", { context: "report-b" });
    ctx.c.failClick = true;
    button(tree, "Export shown assessed progress").props.onClick();
    assert.equal(ctx.c.revoked.length, 1);
    assert.equal(ctx.c.timers.size, 0);
    tree = ctx.render("export", { context: "report-b" });
    assert.match(text(tree), /synthetic download failure/);
    ctx.c.failClick = false;
    button(tree, "Export shown assessed progress").props.onClick();
    assert.equal(ctx.c.downloads.length, 1);
    tree = ctx.render("export", { context: "report-c" });
    assert.equal(ctx.c.revoked.length, 2);
    old.props.onClick();
    assert.equal(ctx.c.downloads.length, 1);
    ctx.c.actor = null;
    assert.equal(ctx.render("export"), null);
  }));

test("readiness binds SDK account before accepting capability metadata", () =>
  fixture(async ({ c, render }) => {
    toggle(render(), true);
    render();
    c.sessions.shift()({ data: { session: { user: { id: "b" }, access_token: "synthetic-b" } } });
    await tick();
    assert.equal(c.fetches.length, 0);
    assert.match(text(render()), /Sign in/);
  }, true));
