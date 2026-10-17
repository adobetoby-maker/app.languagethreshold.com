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
        contents: `export {usePrivatePagedReport} from './src/hooks/use-private-paged-report';export {TeamAssessmentInsights} from './src/components/exams/TeamAssessmentInsights';export {c} from 'fixture';`,
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
                  /^(fixture|react|@\/state\/auth-state|@\/lib\/assessments\/client|@\/data\/(modules|curriculum|languages))$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `
 export const MODULES=[{id:'roofing',name:'Roofing'},{id:'landscaper',name:'Landscaper'}],LANGUAGES=['English','Spanish'],NATIVE_LANGUAGES=['English','Spanish'];export const getCurriculum=()=>({lessons:[]});
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
    const { usePrivatePagedReport, TeamAssessmentInsights, c } = await import(
      join(dir, "case.mjs")
    );
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
          type:
            mode === "hook"
              ? () =>
                  usePrivatePagedReport(
                    opts.path ?? "/report-a",
                    opts.enabled ?? true,
                    opts.itemKey ?? "items",
                  )
              : TeamAssessmentInsights,
          props: {
            orgId: "org-a",
            moduleId: "roofing",
            target: "English",
            native: "Spanish",
            onOpen: (id) => opened.push(id),
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
const selects = (tree) => nodes(tree).filter((n) => n.type === "select");
const form = (tree) => nodes(tree).find((n) => n.type === "form");
const refresh = (tree) =>
  nodes(tree).find((n) => n.type === "button" && n.props.children === "Refresh team evidence");
const submit = (tree) => form(tree).props.onSubmit({ preventDefault() {} });
async function openView(ctx, opts = {}) {
  let tree = ctx.render("component", opts);
  tree.props.onToggle({ currentTarget: { open: true } });
  ctx.render("component", opts);
  ctx.c.requests.at(-1).resolve(ctx.payload([], { status: "content_pending" }));
  await tick();
  return ctx.render("component", opts);
}
test("team insight drafts stay local until Apply; applied request scope and data update together", () =>
  fixture(async (ctx) => {
    const { c, render } = ctx;
    let tree = await openView(ctx);
    const count = c.requests.length;
    selects(tree)[0].props.onChange({ target: { value: "landscaper" } });
    tree = render("component");
    assert.equal(selects(tree)[0].props.value, "landscaper");
    assert.equal(c.requests.length, count);
    selects(tree)[1].props.onChange({ target: { value: "day45" } });
    tree = render("component");
    submit(tree);
    tree = render("component");
    const url = new URL(c.requests.at(-1).url, "https://synthetic.invalid");
    assert.equal(url.searchParams.get("org"), "org-a");
    assert.equal(url.searchParams.get("module"), "landscaper");
    assert.equal(url.searchParams.get("checkpoint"), "day45");
    assert.equal(c.requests.length, count + 1);
    assert.equal(refresh(tree).props.disabled, true);
    // A duplicate retained submit cannot create another query while this report loads.
    submit(tree);
    render("component");
    assert.equal(c.requests.length, count + 1);
  }));
test("team, module, target, instruction and actual account changes reset disclosure and both filters", () =>
  fixture(async (ctx) => {
    const { c, render } = ctx;
    for (const opts of [
      { orgId: "org-b" },
      { moduleId: "landscaper" },
      { target: "Spanish" },
      { native: "English" },
    ]) {
      let tree = await openView(ctx);
      selects(tree)[1].props.onChange({ target: { value: "day90" } });
      tree = render("component");
      submit(tree);
      render("component");
      const pending = c.requests.at(-1);
      tree = render("component", opts);
      assert.equal(tree.props.open, false);
      assert.equal(pending.signal.aborted, true);
      tree.props.onToggle({ currentTarget: { open: true } });
      tree = render("component", opts);
      assert.equal(selects(tree)[0].props.value, opts.moduleId ?? "roofing");
      assert.equal(selects(tree)[1].props.value, "entrance");
      assert.equal(selects(tree)[2].props.value, opts.target ?? "English");
      assert.equal(selects(tree)[3].props.value, opts.native ?? "Spanish");
      // Return to default props for the next independent reuse case.
      render("component");
    }
    let tree = await openView(ctx);
    c.actor = "b";
    tree = render("component");
    assert.equal(tree.props.open, false);
  }));
test("departed team form/toggle/select/refresh handlers and late replies cannot modify the replacement", () =>
  fixture(async (ctx) => {
    const { c, render, unmount, payload } = ctx;
    let tree = await openView(ctx);
    const old = tree;
    tree = render("component", { orgId: "org-b" });
    const count = c.requests.length,
      writes = c.stateWrites;
    old.props.onToggle({ currentTarget: { open: true } });
    submit(old);
    selects(old).forEach((n) => n.props.onChange({ target: { value: "Spanish" } }));
    refresh(old).props.onClick();
    assert.equal(c.requests.length, count);
    assert.equal(c.stateWrites, writes);
    tree.props.onToggle({ currentTarget: { open: true } });
    tree = render("component", { orgId: "org-b" });
    const pending = c.requests.at(-1);
    unmount();
    const after = c.stateWrites;
    pending.resolve(payload([], { status: "small_group", minimumGroup: 5 }));
    await tick();
    assert.equal(c.stateWrites, after);
    assert.equal(pending.signal.aborted, true);
    tree = await openView(ctx);
    c.actor = "c";
    const actorWrites = c.stateWrites;
    refresh(tree).props.onClick();
    submit(tree);
    assert.equal(c.stateWrites, actorWrites);
  }));
