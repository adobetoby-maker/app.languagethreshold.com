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
const button = (tree, label) =>
  nodes(tree).find((n) => n.type === "button" && JSON.stringify(n.props.children).includes(label));
const text = (tree) =>
  nodes(tree)
    .map((n) => (typeof n.props?.children === "string" ? n.props.children : ""))
    .join(" ");
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/owner-"));
  const saved = ["fetch", "document", "setTimeout", "clearTimeout"].map((k) => [
    k,
    Object.getOwnPropertyDescriptor(globalThis, k),
  ]);
  const oldCreate = URL.createObjectURL,
    oldRevoke = URL.revokeObjectURL;
  try {
    await build({
      stdin: {
        contents: `export {Route} from '@/routes/owner';export {c} from 'fixture';`,
        resolveDir: process.cwd(),
        loader: "tsx",
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
          name: "controlled-invitation",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(fixture|react|@tanstack\/react-router|@\/state\/auth-state|@\/components\/(auth\/AuthModal|ThemeToggle)|@\/integrations\/supabase\/client)$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `
 export const c={actor:'a',token:'synthetic-owner-a',slots:[],cursor:0,effects:[],writes:0,requests:[],credentialReads:0};
 const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export function useState(initial){const slots=c.slots,i=c.cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>{c.writes++;slots[i]=typeof v==='function'?v(slots[i]):v}]}
 export function useRef(initial){const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i]}
 export function useCallback(fn,deps){const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={fn,deps};return c.slots[i].fn}
 export function useEffect(fn,deps){const slots=c.slots,i=c.cursor++,old=slots[i];if(!old||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()}})}
 const isCurrentUser=id=>c.actor===id;const canUseReader=id=>c.actor===id&&!c.signingOut;
 export const useAuth=()=>({user:c.actor?{id:c.actor,email:c.actor+'@synthetic.invalid'}:null,loading:!!c.loading,isCurrentUser,canUseReader});
 export const AuthProvider=({children})=>children;export const AuthModal=()=>null;export const ThemeToggle=()=>null;export const Link=({children,...props})=>({type:'a',props:{...props,children}});
 export const createFileRoute=()=>options=>({...options,useSearch:()=>({token:c.token}),useNavigate:()=>()=>{}});
 export const supabase={auth:{getSession:()=>{c.credentialReads++;return c.credentials?new Promise(resolve=>c.credentials.push(resolve)):Promise.resolve({data:{session:{user:{id:c.sdkActor??c.actor},access_token:'synthetic-token'}}})}}};
 `,
            }));
          },
        },
      ],
    });
    const { Route, c } = await import(join(dir, "case.mjs"));
    globalThis.fetch = (url, init) =>
      new Promise((resolve, reject) => c.requests.push({ url, init, resolve, reject }));
    c.urls = [];
    c.revoked = [];
    c.clicks = [];
    c.timers = [];
    URL.createObjectURL = (blob) => {
      const url = "blob:synthetic-" + c.urls.length;
      c.urls.push({ url, blob });
      return url;
    };
    URL.revokeObjectURL = (url) => c.revoked.push(url);
    globalThis.document = {
      createElement: () => {
        const a = { click: () => c.clicks.push({ href: a.href, download: a.download }) };
        return a;
      },
    };
    globalThis.setTimeout = (fn) => {
      c.timers.push(fn);
      return c.timers.length;
    };
    globalThis.clearTimeout = (id) => {
      c.cleared = (c.cleared ?? []).concat(id);
    };
    const instances = [];
    const dispose = (i) => {
      for (const s of instances[i]?.slots ?? []) s?.cleanup?.();
    };
    const unmount = () => {
      instances.forEach((_, i) => dispose(i));
      instances.length = 0;
    };
    const render = () => {
      let n = { type: Route.component, key: "root", props: {} },
        depth = 0;
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
      for (let i = depth; i < instances.length; i++) dispose(i);
      instances.splice(depth);
      for (const effect of c.effects.splice(0)) effect();
      return n;
    };
    const reply = async (i, payload = {}, ok = true) => {
      c.requests[i].resolve({ ok, json: async () => payload });
      await tick();
    };
    try {
      await run({ c, render, unmount, reply });
    } finally {
      unmount();
    }
  } finally {
    for (const [k, value] of saved) {
      if (value) Object.defineProperty(globalThis, k, value);
      else delete globalThis[k];
    }
    URL.createObjectURL = oldCreate;
    URL.revokeObjectURL = oldRevoke;
    rmSync(dir, { recursive: true, force: true });
  }
}
const report = (memo = "synthetic owner A") => ({
  counts: {},
  financial: { income_cents: 0, expense_cents: 0, net_cents: 0, months: [] },
  categories: [],
  siteUsage: [],
  organizations: [],
  entitlements: [],
  members: [],
  activity: [],
  attempts: [],
  auditEvents: [],
  moduleRequests: [],
  ledger: [
    {
      id: "synthetic-entry",
      occurred_on: "2026-01-01",
      category: "=synthetic category",
      amount_cents: 123,
      source: "manual",
      external_ref: null,
      organization_id: null,
      memo,
    },
  ],
});
const load = async (f) => {
  f.render();
  await tick();
  await f.reply(0, report());
  return f.render();
};
test("owner report uses owned credentials/no-store and latest refresh supersedes earlier response", () =>
  fixture(async (f) => {
    const { c, render, reply } = f;
    let tree = await load(f);
    assert.equal(c.requests[0].init.cache, "no-store");
    assert.match(c.requests[0].url, /^\/api\/platform\?since=/);
    const refresh = button(tree, "Refresh").props.onClick;
    refresh();
    await tick();
    refresh();
    await tick();
    assert.equal(c.requests[1].init.signal.aborted, true);
    await reply(2, report("newest report"));
    await reply(1, report("stale report"));
    tree = render();
    assert.match(text(tree), /newest report/);
    assert.doesNotMatch(text(tree), /stale report/);
  }));
test("account replacement refuses late private data and captured mutation with replacement SDK credentials", () =>
  fixture(async (f) => {
    const { c, render, reply } = f;
    let tree = await load(f);
    c.credentials = [];
    const old = button(tree, "Import Stripe history").props.onClick;
    old();
    assert.equal(c.credentials.length, 1);
    c.actor = "b";
    tree = render();
    assert.doesNotMatch(text(tree), /synthetic owner A/);
    c.credentials[0]({ data: { session: { user: { id: "b" }, access_token: "synthetic-b" } } });
    await tick();
    assert.equal(c.requests.length, 1);
    old();
    assert.equal(c.credentials.length, 2);
    c.credentials[1]({ data: { session: { user: { id: "b" }, access_token: "synthetic-b" } } });
    await tick();
    await reply(1, report("synthetic owner B"));
    assert.match(text(render()), /synthetic owner B/);
  }));
test("date replacement hides old data, rejects captured actions/export and owns the new read", () =>
  fixture(async (f) => {
    const { c, render, reply } = f;
    const tree = await load(f);
    const oldAction = button(tree, "Import Stripe history").props.onClick,
      oldCsv = button(tree, "Export CSV").props.onClick;
    const from = nodes(tree).find((n) => n.type === "input" && n.props.type === "date");
    from.props.onChange({ target: { value: "2026-02-01" } });
    let next = render();
    assert.doesNotMatch(text(next), /synthetic owner A/);
    oldAction();
    oldCsv();
    await tick();
    assert.equal(c.urls.length, 0);
    assert.equal(c.requests.length, 2);
    assert.match(c.requests[1].url, /since=2026-02-01/);
    await reply(1, report("new date data"));
    next = render();
    assert.match(text(next), /new date data/);
  }));
test("mutations serialize through post-write refresh; current failure retries and departed refresh cannot restore data", () =>
  fixture(async (f) => {
    const { c, render, reply } = f;
    let tree = await load(f);
    const click = button(tree, "Import Stripe history").props.onClick;
    click();
    click();
    await tick();
    assert.equal(c.requests.length, 2);
    assert.deepEqual(JSON.parse(c.requests[1].init.body), { action: "ledger_import_stripe" });
    button(render(), "Refresh").props.onClick();
    await tick();
    assert.equal(c.requests.length, 2);
    await reply(1, { error: "synthetic denial" }, false);
    assert.match(text(render()), /synthetic denial/);
    button(render(), "Import Stripe history").props.onClick();
    await tick();
    await reply(2, {});
    assert.equal(c.requests.length, 4);
    c.actor = "b";
    render();
    await tick();
    await reply(3, report("departed followup"));
    assert.doesNotMatch(text(render()), /departed followup|Stripe payment history imported/);
    assert.equal(c.requests[3].init.signal.aborted, true);
  }));
test("current ledger export uses formula-safe CSV and releases only its own URL/timer on departure", () =>
  fixture(async (f) => {
    const { c, render, unmount, reply } = f;
    const tree = await load(f);
    const csv = button(tree, "Export CSV").props.onClick;
    csv();
    assert.equal(c.clicks.length, 1);
    const value = await c.urls[0].blob.text();
    assert.match(value, /'=synthetic category/);
    assert.match(value, /synthetic owner A/);
    assert.match(c.clicks[0].download, /language-threshold-ledger-/);
    assert.equal(c.revoked.length, 0);
    button(tree, "Refresh").props.onClick();
    await tick();
    await reply(1, report("new export data"));
    render();
    csv();
    assert.equal(c.urls.length, 1);
    unmount();
    assert.deepEqual(c.revoked, [c.urls[0].url]);
    c.timers[0]();
    assert.equal(c.revoked.length, 1);
  }));
test("guest/loading/mismatched credentials and pending signout refuse private report acceptance", () =>
  fixture(async ({ c, render, reply }) => {
    c.actor = null;
    render();
    await tick();
    assert.equal(c.requests.length, 0);
    c.actor = "a";
    c.loading = true;
    render();
    await tick();
    assert.equal(c.requests.length, 0);
    c.loading = false;
    c.sdkActor = "b";
    render();
    await tick();
    assert.equal(c.requests.length, 0);
    assert.match(text(render()), /Sign in to use your team workspace/);
    c.sdkActor = "a";
    button(render(), "Refresh").props.onClick();
    await tick();
    c.signingOut = true;
    await reply(0, report("paused report"));
    assert.doesNotMatch(text(render()), /paused report/);
    c.signingOut = false;
    button(render(), "Refresh").props.onClick();
    await tick();
    await reply(1, report("restored report"));
    assert.match(text(render()), /restored report/);
  }));

test("an owner read waiting for SDK credentials cannot transfer to a replacement account", () =>
  fixture(async ({ c, render }) => {
    c.credentials = [];
    render();
    assert.equal(c.credentials.length, 1);
    c.actor = "b";
    render();
    assert.equal(c.credentials.length, 2);
    c.credentials[0]({ data: { session: { user: { id: "b" }, access_token: "synthetic-b" } } });
    await tick();
    assert.equal(c.requests.length, 0);
  }));
