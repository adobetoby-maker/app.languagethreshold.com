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
  const old = Object.getOwnPropertyDescriptor(globalThis, "window");
  const oldFetch = globalThis.fetch;
  try {
    await build({
      stdin: {
        contents: `export {usePrivatePagedReport} from './src/hooks/use-private-paged-report';export {CheckpointAttemptHistory} from './src/components/exams/CheckpointAttemptHistory';export {c} from 'fixture';`,
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
                  /^(fixture|react|@\/state\/auth-state|@\/lib\/assessments\/client|@\/integrations\/supabase\/client)$/,
              },
              (args) =>
                realClient && args.path === "@/lib/assessments/client"
                  ? undefined
                  : { path: "fixture", namespace: "fixture" },
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `
 export const supabase={auth:{getSession:()=>new Promise(resolve=>c.sessions.push(resolve))}};export const c={sessions:[],fetches:[],slots:[],cursor:0,effects:[],actor:'a',requests:[],stateWrites:0};
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
    const { usePrivatePagedReport, CheckpointAttemptHistory, c } = await import(
      join(dir, "case.mjs")
    );
    if (realClient)
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
          type:
            mode === "hook"
              ? () =>
                  usePrivatePagedReport(
                    opts.path ?? "/report-a",
                    opts.enabled ?? true,
                    opts.itemKey ?? "items",
                  )
              : CheckpointAttemptHistory,
          props: { checkpointId: "check-a", onOpen: (id) => opened.push(id), ...opts },
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
    globalThis.fetch = oldFetch;
    if (old) Object.defineProperty(globalThis, "window", old);
    else delete globalThis.window;
    rmSync(dir, { recursive: true, force: true });
  }
}
test("private report suppresses old path/account/disabled callbacks and hides old rows and metadata immediately", () =>
  fixture(async ({ c, ready, render, payload }) => {
    let page = await ready();
    const oldMore = page.loadMore,
      oldRefresh = page.refresh;
    assert.equal(page.items.length, 1);
    page = render("hook", { path: "/report-b" });
    assert.deepEqual(page.items, []);
    assert.equal(page.metadata, null);
    const count = c.requests.length,
      writes = c.stateWrites;
    oldMore();
    oldRefresh();
    assert.equal(c.requests.length, count);
    assert.equal(c.stateWrites, writes);
    c.requests.at(-1).resolve(payload([{ id: "row-b" }]));
    await tick();
    page = render("hook", { path: "/report-b" });
    const bMore = page.loadMore;
    page = render("hook", { path: "/report-b", enabled: false });
    assert.deepEqual(page.items, []);
    assert.equal(page.metadata, null);
    bMore();
    assert.equal(c.requests.length, count);
    c.actor = "b";
    page = render("hook");
    assert.deepEqual(page.items, []);
    assert.equal(page.metadata, null);
    c.actor = null;
    page = render("hook");
    assert.equal(page.loading, false);
    assert.deepEqual(page.items, []);
    const guest = c.requests.length;
    page.loadMore();
    page.refresh();
    assert.equal(c.requests.length, guest);
  }));
test("refresh cancels synchronously, rejects duplicate old handlers and new epoch hides previous data", () =>
  fixture(async ({ c, ready, render, payload }) => {
    let page = await ready();
    page.loadMore();
    const old = c.requests.at(-1);
    page.refresh();
    assert.equal(old.signal.aborted, true);
    const writes = c.stateWrites;
    page.refresh();
    page.loadMore();
    assert.equal(c.stateWrites, writes);
    assert.equal(c.requests.length, 2);
    page = render();
    assert.deepEqual(page.items, []);
    assert.equal(page.metadata, null);
    assert.equal(page.loading, true);
    const newer = c.requests.at(-1);
    old.reject(new c.Error("late denied", 403));
    await tick();
    assert.equal(c.stateWrites, writes + 1);
    newer.resolve(payload([{ id: "fresh" }]));
    await tick();
    page = render();
    assert.equal(page.items[0].id, "fresh");
    assert.equal(page.error, "");
    assert.equal(page.moreBusy, false);
  }));
test("pagination is single flight, stable-ID merges, and denied access clears all private continuation metadata", () =>
  fixture(async ({ c, ready, render, payload }) => {
    let page = await ready();
    page.loadMore();
    page.loadMore();
    assert.equal(c.requests.length, 2);
    assert.match(c.requests[1].url, /before=cursor-a/);
    c.requests[1].resolve(
      payload([
        { id: "row-a", attempt_number: 2 },
        { id: "row-b", attempt_number: 3 },
      ]),
    );
    await tick();
    page = render();
    assert.equal(page.items.length, 2);
    assert.equal(page.items[0].attempt_number, 2);
    page.loadMore();
    c.requests.at(-1).reject(new c.Error("denied", 403));
    await tick();
    page = render();
    assert.deepEqual(page.items, []);
    assert.equal(page.metadata, null);
    assert.equal(page.hasMore, false);
    assert.equal(page.nextCursor, null);
    assert.equal(page.limit, 0);
    assert.equal(page.error, "denied");
    assert.equal(page.moreBusy, false);
  }));
test("pending initial/page replies and retained callbacks do nothing after unmount or actor loss without render", () =>
  fixture(async ({ c, ready, render, payload, unmount }) => {
    render();
    const initial = c.requests[0];
    unmount();
    const writes = c.stateWrites;
    initial.resolve(payload());
    await tick();
    assert.equal(c.stateWrites, writes);
    assert.equal(initial.signal.aborted, true);
    let page = await ready();
    page.loadMore();
    const more = c.requests.at(-1);
    c.actor = "b";
    const before = c.stateWrites;
    more.resolve(payload([{ id: "foreign" }]));
    await tick();
    page.loadMore();
    page.refresh();
    assert.equal(c.stateWrites, before);
    unmount();
    assert.equal(more.signal.aborted, true);
  }));
test("current initial/network/validation errors stay retryable and enrollment item shape remains supported", () =>
  fixture(async ({ c, render, payload }) => {
    render();
    c.requests[0].reject(new TypeError("network"));
    await tick();
    let page = render();
    assert.match(page.error, /Cannot connect/);
    page.refresh();
    render();
    c.requests.at(-1).resolve({ items: "malformed", hasMore: true });
    await tick();
    page = render();
    assert.match(page.error, /could not be read/);
    page = render("hook", { itemKey: "enrollments" });
    c.requests
      .at(-1)
      .resolve({ ...payload(), items: undefined, enrollments: [{ id: "enrollment-a" }] });
    await tick();
    page = render("hook", { itemKey: "enrollments" });
    assert.equal(page.items[0].id, "enrollment-a");
    page.loadMore();
    c.requests.at(-1).reject(new Error("temporary"));
    await tick();
    page = render("hook", { itemKey: "enrollments" });
    assert.equal(page.items[0].id, "enrollment-a");
    assert.ok(page.metadata);
    assert.equal(page.error, "temporary");
    assert.equal(page.moreBusy, false);
  }));
test("checkpoint disclosure resets by checkpoint/account and departed toggle/open/refresh/more callbacks are inert", () =>
  fixture(async ({ c, render, payload, opened, unmount }) => {
    let tree = render("component");
    assert.equal(tree.props.open, false);
    assert.equal(c.requests.length, 0);
    tree.props.onToggle({ currentTarget: { open: true } });
    render("component");
    c.requests.at(-1).resolve(payload());
    await tick();
    tree = render("component");
    assert.equal(tree.props.open, true);
    const old = tree;
    const open = nodes(tree).find((n) => n.type === "button" && Array.isArray(n.props.children));
    open.props.onClick();
    assert.deepEqual(opened, ["row-a"]);
    tree = render("component", { checkpointId: "check-b" });
    assert.equal(tree.props.open, false);
    const count = c.requests.length,
      writes = c.stateWrites;
    old.props.onToggle({ currentTarget: { open: true } });
    for (const b of nodes(old).filter((n) => n.type === "button")) b.props.onClick();
    assert.equal(c.requests.length, count);
    assert.equal(c.stateWrites, writes);
    assert.deepEqual(opened, ["row-a"]);
    tree.props.onToggle({ currentTarget: { open: true } });
    render("component", { checkpointId: "check-b" });
    const pending = c.requests.at(-1);
    c.actor = "b";
    tree = render("component", { checkpointId: "check-b" });
    assert.equal(tree.props.open, false);
    assert.equal(pending.signal.aborted, true);
    unmount();
    pending.resolve(payload());
    await tick();
  }));
test("report initial and pagination requests keep the same originating account and reject departed guards", () =>
  fixture(async ({ c, ready, render }) => {
    const page = await ready();
    assert.equal(c.requests[0].owner.userId, "a");
    page.loadMore();
    assert.equal(c.requests[1].owner.userId, "a");
    assert.equal(c.requests[1].owner.isCurrent(), true);
    c.actor = "b";
    render();
    assert.equal(c.requests[0].owner.isCurrent(), false);
    assert.equal(c.requests[1].owner.isCurrent(), false);
    assert.equal(c.requests[2].owner.userId, "b");
  }));
test("actual private report/client refuses replacement SDK identity on first page and continuation, clearing old private rows", () =>
  fixture(async ({ c, render, payload }) => {
    render();
    c.sessions.shift()({ data: { session: { user: { id: "b" }, access_token: "synthetic-b" } } });
    await tick();
    assert.equal(c.fetches.length, 0);
    assert.deepEqual(render().items, []);
    assert.match(render().error, /Sign in to continue/);
    render().refresh();
    render();
    c.sessions.shift()({ data: { session: { user: { id: "a" }, access_token: "synthetic-a" } } });
    await tick();
    assert.equal(c.fetches.length, 1);
    c.fetches[0].resolve({ ok: true, json: async () => payload() });
    await tick();
    let page = render();
    assert.equal(page.items.length, 1);
    const done = page.loadMore();
    c.sessions.shift()({ data: { session: { user: { id: "b" }, access_token: "synthetic-b" } } });
    await tick();
    assert.equal(c.fetches.length, 1);
    await done;
    page = render();
    assert.deepEqual(page.items, []);
    assert.equal(page.metadata, null);
    assert.equal(page.hasMore, false);
    assert.match(page.error, /Sign in to continue/);
  }, true));
