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
  const old = Object.getOwnPropertyDescriptor(globalThis, "window");
  try {
    await build({
      stdin: {
        contents: `export {ExamReviewQueue} from './src/components/exams/ExamReviewQueue';export {c} from 'fixture';`,
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
 export const MODULES=[{id:'roofing',name:'Roofing'},{id:'landscaper',name:'Landscaper'}],LANGUAGES=['English','Spanish'],NATIVE_LANGUAGES=['English','Spanish'];export const getCurriculum=()=>({lessons:[]}),getModule=id=>({name:id});
 export const c={slots:[],cursor:0,effects:[],actor:'a',requests:[],stateWrites:0};
 const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export function useState(initial){const slots=c.slots,i=c.cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>{c.stateWrites++;slots[i]=typeof v==='function'?v(slots[i]):v;}];}
 export function useRef(initial){const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i];}
 export function useCallback(fn,deps){const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={fn,deps};return c.slots[i].fn;}
 export function useEffect(fn,deps){const slots=c.slots,i=c.cursor++,old=slots[i];if(!old||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}
 const users=new Map();const isCurrentUser=id=>c.actor===id;export const useAuth=()=>{if(c.actor&&!users.has(c.actor))users.set(c.actor,{id:c.actor});return {user:c.actor?users.get(c.actor):null,isCurrentUser};};
 export const examRequest=(url,signal)=>new Promise((resolve,reject)=>c.requests.push({url,signal,resolve,reject}));
 export class ExamRequestError extends Error{constructor(message,status){super(message);this.status=status;}}c.Error=ExamRequestError;
 `,
            }));
          },
        },
      ],
    });
    const { ExamReviewQueue, c } = await import(join(dir, "case.mjs"));
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
          type: ExamReviewQueue,
          props: {
            orgId: "org-a",
            members: [],
            onOpen: (id, review) => opened.push({ id, review }),
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
    const payload = (items = [row("attempt-a")], extra = {}) => ({
      eligible: true,
      items,
      hasMore: true,
      nextCursor: { submittedAt: "2026-10-17T12:00:00Z", id: "cursor-a" },
      limit: 10,
      summary: "synthetic private metadata",
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
    if (old) Object.defineProperty(globalThis, "window", old);
    else delete globalThis.window;
    rmSync(dir, { recursive: true, force: true });
  }
}
const row = (id, extra = {}) => ({
  attempt_id: id,
  submitted_at: "2026-10-17T12:00:00Z",
  attempt_number: 1,
  status: "needs_review",
  checkpoint: "entrance",
  module_id: "roofing",
  target_language: "English",
  instruction_language: "Spanish",
  learner_id: "learner-a",
  review_id: null,
  reviewer_id: null,
  ...extra,
});
const button = (tree, label) =>
  nodes(tree).find((n) => n.type === "button" && n.props.children === label);
const text = (tree) => JSON.stringify(tree);
function toggle(tree, open) {
  const target = { open };
  tree.props.onToggle({ target, currentTarget: target });
}
test("review queue pagination has one flight, exact team cursor, dedup and updated rows", () =>
  fixture(async (ctx) => {
    let tree = await ctx.ready();
    const more = button(tree, "Load more reviews");
    more.props.onClick();
    more.props.onClick();
    assert.equal(ctx.c.requests.length, 2);
    const req = ctx.c.requests[1],
      u = new URL(req.url, "https://synthetic.invalid");
    assert.equal(u.searchParams.get("org"), "org-a");
    assert.equal(u.searchParams.get("afterId"), "cursor-a");
    assert.equal(req.signal.aborted, false);
    tree = ctx.render();
    assert.equal(button(tree, "Refresh queue").props.disabled, true);
    req.resolve(
      ctx.payload([row("attempt-a", { attempt_number: 2 }), row("attempt-b")], {
        hasMore: false,
        nextCursor: null,
      }),
    );
    await tick();
    tree = ctx.render();
    assert.equal(nodes(tree).filter((n) => n.type === "li").length, 2);
    assert.match(text(tree), /attempt-b/);
    assert.equal(button(tree, "Load more reviews"), undefined);
    more.props.onClick();
    assert.equal(ctx.c.requests.length, 2);
  }));
test("refresh aborts old work, hides old rows, preserves disclosure and rejects retained callbacks", () =>
  fixture(async (ctx) => {
    let tree = await ctx.ready();
    toggle(tree, true);
    tree = ctx.render();
    const old = tree;
    button(tree, "Refresh queue").props.onClick();
    button(old, "Load more reviews").props.onClick();
    button(old, "Open rubric review").props.onClick();
    assert.equal(ctx.c.requests.length, 1);
    assert.equal(ctx.opened.length, 0);
    tree = ctx.render();
    assert.equal(tree.props.open, true);
    assert.equal(nodes(tree).filter((n) => n.type === "li").length, 0);
    const req = ctx.c.requests.at(-1);
    req.resolve(ctx.payload([row("fresh")]));
    await tick();
    tree = ctx.render();
    assert.match(text(tree), /fresh/);
    assert.doesNotMatch(text(tree), /attempt-a/);
    button(old, "Refresh queue").props.onClick();
    assert.equal(ctx.c.requests.length, 2);
  }));
test("account/team change and unmount abort page work and reject late callbacks and finalizers", () =>
  fixture(async (ctx) => {
    let tree = await ctx.ready();
    toggle(tree, true);
    tree = ctx.render();
    const old = tree;
    button(tree, "Load more reviews").props.onClick();
    const oldPage = ctx.c.requests.at(-1);
    tree = ctx.render("component", { orgId: "org-b" });
    assert.equal(tree.props.open, false);
    assert.equal(oldPage.signal.aborted, true);
    assert.equal(nodes(tree).filter((n) => n.type === "li").length, 0);
    const writes = ctx.c.stateWrites;
    oldPage.resolve(ctx.payload([row("old")]));
    await tick();
    assert.equal(ctx.c.stateWrites, writes);
    button(old, "Open rubric review").props.onClick();
    button(old, "Load more reviews").props.onClick();
    toggle(old, true);
    assert.equal(ctx.c.stateWrites, writes);
    assert.equal(ctx.opened.length, 0);
    const current = ctx.c.requests.at(-1);
    ctx.c.actor = "b";
    ctx.render("component", { orgId: "org-b" });
    assert.equal(current.signal.aborted, true);
    const last = ctx.c.requests.at(-1);
    ctx.unmount();
    const after = ctx.c.stateWrites;
    last.reject(new Error("late"));
    await tick();
    assert.equal(last.signal.aborted, true);
    assert.equal(ctx.c.stateWrites, after);
    ctx.c.actor = null;
    assert.equal(ctx.render(), null);
  }));
test("claim owns one signal/flight through navigation and cannot open after departure or actor loss", () =>
  fixture(async (ctx) => {
    let tree = ctx.render();
    ctx.c.requests.at(-1).resolve(ctx.payload([row("shared", { review_id: "review-a" })]));
    await tick();
    tree = ctx.render();
    const claim = button(tree, "Claim and review shared attempt");
    claim.props.onClick();
    claim.props.onClick();
    button(tree, "Load more reviews").props.onClick();
    assert.equal(ctx.c.requests.length, 2);
    let req = ctx.c.requests.at(-1);
    assert.deepEqual(req.url, { action: "claim_review", reviewId: "review-a" });
    assert.ok(req.signal);
    ctx.unmount();
    req.resolve({});
    await tick();
    assert.equal(req.signal.aborted, true);
    assert.equal(ctx.opened.length, 0);
    tree = await ctx.ready();
    button(tree, "Open rubric review").props.onClick();
    await tick();
    assert.deepEqual(ctx.opened, [{ id: "attempt-a", review: true }]);
    tree = ctx.render();
    ctx.c.actor = "other";
    const writes = ctx.c.stateWrites;
    button(tree, "Open rubric review").props.onClick();
    assert.equal(ctx.opened.length, 1);
    assert.equal(ctx.c.stateWrites, writes);
  }));
test("current claim failure can retry; access denial removes private rows and stale open controls", () =>
  fixture(async (ctx) => {
    let tree = ctx.render();
    ctx.c.requests.at(-1).resolve(ctx.payload([row("shared", { review_id: "review-a" })]));
    await tick();
    tree = ctx.render();
    const old = tree;
    button(tree, "Claim and review shared attempt").props.onClick();
    ctx.c.requests.at(-1).reject(new Error("synthetic claim conflict"));
    await tick();
    tree = ctx.render();
    assert.match(text(tree), /synthetic claim conflict/);
    assert.equal(button(tree, "Refresh queue").props.disabled, false);
    button(tree, "Claim and review shared attempt").props.onClick();
    ctx.c.requests.at(-1).resolve({});
    await tick();
    assert.deepEqual(ctx.opened, [{ id: "shared", review: true }]);
    tree = ctx.render();
    button(tree, "Load more reviews").props.onClick();
    ctx.c.requests.at(-1).reject(new ctx.c.Error("Forbidden", 403));
    await tick();
    tree = ctx.render();
    assert.equal(nodes(tree).filter((n) => n.type === "li").length, 0);
    assert.match(text(tree), /Forbidden/);
    const count = ctx.c.requests.length;
    button(old, "Claim and review shared attempt").props.onClick();
    assert.equal(ctx.c.requests.length, count);
    button(tree, "Refresh queue").props.onClick();
    ctx.render();
    assert.equal(ctx.c.requests.length, count + 1);
  }));
