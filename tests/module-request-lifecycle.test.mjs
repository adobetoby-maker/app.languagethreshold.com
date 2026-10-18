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
const field = (tree, placeholder) => nodes(tree).find((n) => n.props?.placeholder === placeholder);
const form = (tree) => nodes(tree).find((n) => n.type === "form");
const button = (tree, label) =>
  nodes(tree).find((n) => n.type === "button" && String(n.props.children).includes(label));
function text(n) {
  if (Array.isArray(n)) return n.map(text).join(" ");
  if (typeof n === "string" || typeof n === "number") return String(n);
  return n?.props ? text(n.props.children) : "";
}
const submit = (tree) => form(tree).props.onSubmit({ preventDefault() {} });
const company = {
  organization_id: "11111111-1111-4111-8111-111111111111",
  role: "admin",
  team_organizations: { name: "Synthetic company" },
};
async function loaded(f) {
  f.render();
  await tick();
  await f.reply(f.c.requests.length - 2, {
    requests: [
      {
        id: "r",
        title: "Synthetic private request",
        status: "submitted",
        created_at: "2026-10-18",
        owner_note: "Private note",
      },
    ],
  });
  await f.reply(f.c.requests.length - 1, { organizations: [company] });
  return f.render();
}
function fill(f) {
  for (const [placeholder, value] of [
    ["e.g. Commercial roofing inspections", "Synthetic specialty"],
    ["e.g. Foremen who coordinate Spanish-speaking crews", "Synthetic audience"],
    ["Describe the conversations your team needs to practice.", "Synthetic work situations"],
  ]) {
    field(f.render(), placeholder).props.onChange({ target: { value } });
  }
  return f.render();
}
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/module-request-"));
  const saved = ["fetch", "window"].map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]);
  try {
    await build({
      stdin: {
        contents: `export {Route} from '@/routes/module-request';export {c} from 'fixture';`,
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
 export const c={actor:'a',token:'synthetic-module-request-a',slots:[],cursor:0,effects:[],writes:0,requests:[],credentialReads:0};
 const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export function useState(initial){const slots=c.slots,i=c.cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>{c.writes++;slots[i]=typeof v==='function'?v(slots[i]):v}]}
 export function useRef(initial){const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i]}
 export function useCallback(fn,deps){const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={fn,deps};return c.slots[i].fn}
 export function useEffect(fn,deps){const slots=c.slots,i=c.cursor++,old=slots[i];if(!old||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()}})}
 const isCurrentUser=id=>c.actor===id;const canUseReader=id=>c.actor===id&&!c.signingOut;
 export const useAuth=()=>({user:c.actor?{id:c.actor,email:c.actor+'@synthetic.invalid'}:null,loading:!!c.loading,isCurrentUser,canUseReader});
 export const AuthProvider=({children})=>children;export const AuthModal=()=>null;export const ThemeToggle=()=>null;export const Link=({children,...props})=>({type:'a',props:{...props,children}});
 export const createFileRoute=()=>options=>({...options,useSearch:()=>({token:c.token})});
 export const supabase={auth:{getSession:()=>{c.credentialReads++;return c.credentials?new Promise(resolve=>c.credentials.push(resolve)):Promise.resolve({data:{session:{user:{id:c.sdkActor??c.actor},access_token:'synthetic-token'}}})}}};
 `,
            }));
          },
        },
      ],
    });
    const { Route, c } = await import(join(dir, "case.mjs"));
    c.redirects = [];
    globalThis.window = {
      location: {
        hostname: "synthetic.invalid",
        search: "",
        assign: (url) => c.redirects.push(url),
      },
    };
    globalThis.fetch = (url, init) =>
      new Promise((resolve, reject) => c.requests.push({ url, init, resolve, reject }));
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
    for (const [k, d] of saved) {
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
    }
    rmSync(dir, { recursive: true, force: true });
  }
}
test("private lists and form reset on account/guest replacement; late reads are refused", () =>
  fixture(async (f) => {
    await loaded(f);
    fill(f);
    assert.match(text(f.render()), /Private note/);
    const old = form(f.render()).props.onSubmit;
    f.c.actor = "b";
    const tree = f.render();
    await tick();
    assert.doesNotMatch(text(tree), /Private note/);
    assert.equal(field(tree, "e.g. Commercial roofing inspections").props.value, "");
    old({ preventDefault() {} });
    await tick();
    assert.equal(f.c.requests.filter((r) => r.init.method === "POST").length, 0);
    f.c.actor = null;
    f.render();
    const writes = f.c.writes;
    await f.reply(2, { requests: [{ title: "Departed private request" }] });
    await f.reply(3, { organizations: [company] });
    assert.equal(f.c.writes, writes);
    assert.doesNotMatch(text(f.render()), /Departed private request/);
    assert.equal(f.c.requests[2].init.signal.aborted, true);
  }));
test("held credentials cannot transfer reads to a replacement SDK identity", () =>
  fixture(async (f) => {
    f.c.credentials = [];
    f.render();
    assert.equal(f.c.credentials.length, 2);
    f.c.actor = "b";
    f.render();
    f.c.credentials[0]({ data: { session: { user: { id: "b" }, access_token: "synthetic-b" } } });
    f.c.credentials[1]({ data: { session: { user: { id: "b" }, access_token: "synthetic-b" } } });
    await tick();
    assert.equal(f.c.requests.length, 0);
  }));
test("checkout validates current input/company and has one flight with original body", () =>
  fixture(async (f) => {
    await loaded(f);
    submit(f.render());
    await tick();
    assert.equal(f.c.requests.length, 2);
    fill(f);
    const old = form(f.render()).props.onSubmit;
    nodes(f.render())
      .find((n) => n.type === "select")
      .props.onChange({ target: { value: company.organization_id } });
    old({ preventDefault() {} });
    await tick();
    assert.equal(f.c.requests.length, 2);
    const tree = f.render();
    submit(tree);
    submit(tree);
    await tick();
    assert.equal(f.c.requests.length, 3);
    assert.deepEqual(JSON.parse(f.c.requests[2].init.body), {
      title: "Synthetic specialty",
      audience: "Synthetic audience",
      situations: "Synthetic work situations",
      vocabulary: "",
      organizationId: company.organization_id,
    });
    assert.equal(f.c.requests[2].init.cache, "no-store");
    field(f.render(), "e.g. Commercial roofing inspections").props.onChange({
      target: { value: "Changed during checkout" },
    });
    await f.reply(2, { url: "https://checkout.stripe.com/c/pay/synthetic" });
    assert.deepEqual(f.c.redirects, ["https://checkout.stripe.com/c/pay/synthetic"]);
    submit(tree);
    await tick();
    assert.equal(f.c.requests.length, 3);
    assert.equal(
      field(f.render(), "e.g. Commercial roofing inspections").props.value,
      "Synthetic specialty",
    );
  }));
test("checkout credential mismatch/known failure release busy and preserve fields for deliberate retry", () =>
  fixture(async (f) => {
    await loaded(f);
    fill(f);
    f.c.sdkActor = "b";
    submit(f.render());
    await tick();
    assert.equal(f.c.requests.length, 2);
    assert.match(text(f.render()), /Sign in to use your team workspace/);
    f.c.sdkActor = "a";
    submit(f.render());
    await tick();
    await f.reply(2, { error: "Synthetic rejection" }, false);
    assert.match(text(f.render()), /Synthetic rejection.*may already have been created/);
    assert.equal(button(f.render(), "Submit request").props.disabled, false);
    submit(f.render());
    await tick();
    assert.equal(f.c.requests.length, 4);
    await f.reply(3, { url: "https://untrusted.invalid/checkout" });
    assert.equal(f.c.redirects.length, 0);
    assert.match(text(f.render()), /invalid destination/);
  }));
test("late checkout parsing, departure and pending signout cannot redirect; mounted cleanup permits retry", () =>
  fixture(async (f) => {
    await loaded(f);
    fill(f);
    submit(f.render());
    await tick();
    let finish;
    f.c.requests[2].resolve({ ok: true, json: () => new Promise((r) => (finish = r)) });
    await tick();
    f.c.signingOut = true;
    finish({ url: "https://checkout.stripe.com/c/pay/synthetic" });
    await tick();
    assert.equal(f.c.redirects.length, 0);
    f.c.signingOut = false;
    assert.equal(button(f.render(), "Submit request").props.disabled, false);
    submit(f.render());
    await tick();
    f.c.actor = "b";
    f.render();
    await f.reply(3, { url: "https://checkout.stripe.com/c/pay/departed" });
    assert.equal(f.c.redirects.length, 0);
    assert.equal(f.c.requests[3].init.signal.aborted, true);
  }));
test("read failure clears both private lists and refuses checkout; reload supersedes old read", () =>
  fixture(async (f) => {
    f.render();
    await tick();
    await f.reply(0, { error: "Synthetic denial" }, false);
    await f.reply(1, { organizations: [company] });
    assert.match(text(f.render()), /Synthetic denial/);
    assert.equal(
      nodes(f.render()).some((n) => n.type === "select"),
      false,
    );
    const reload = button(f.render(), "Reload").props.onClick;
    reload();
    await tick();
    reload();
    await tick();
    assert.equal(f.c.requests[2].init.signal.aborted, true);
    await f.reply(4, { requests: [] });
    await f.reply(5, { organizations: [] });
    await f.reply(2, { requests: [{ title: "Superseded request" }] });
    await f.reply(3, { organizations: [company] });
    assert.doesNotMatch(text(f.render()), /Superseded request/);
    fill(f);
    submit(f.render());
    await tick();
    assert.equal(f.c.requests.length, 7);
  }));
test("Preview blocks checkout synchronously before hostname effect rerender; URL flags do not claim payment", () =>
  fixture(async (f) => {
    window.location.search = "?checkout=cancel";
    await loaded(f);
    const beforeHostnameChange = fill(f);
    assert.equal(button(beforeHostnameChange, "Submit request").props.disabled, false);
    window.location.hostname = "synthetic.vercel.app";
    submit(beforeHostnameChange);
    await tick();
    assert.equal(f.c.requests.length, 2);
    assert.match(
      text(f.render()),
      /does not confirm payment|Payment status has not been confirmed/,
    );
    assert.doesNotMatch(text(f.render()), /You have not been charged/);
  }));
test("unmount refuses late checkout and stale edits; unknown organization is rejected", () =>
  fixture(async (f) => {
    await loaded(f);
    fill(f);
    nodes(f.render())
      .find((n) => n.type === "select")
      .props.onChange({ target: { value: "unknown" } });
    submit(f.render());
    await tick();
    assert.equal(f.c.requests.length, 2);
    assert.match(text(f.render()), /Choose an available company/);
    nodes(f.render())
      .find((n) => n.type === "select")
      .props.onChange({ target: { value: "" } });
    submit(f.render());
    await tick();
    const oldEdit = field(f.render(), "e.g. Commercial roofing inspections").props.onChange;
    f.unmount();
    const writes = f.c.writes;
    oldEdit({ target: { value: "Departed" } });
    await f.reply(2, { url: "https://checkout.stripe.com/c/pay/unmounted" });
    assert.equal(f.c.writes, writes);
    assert.equal(f.c.redirects.length, 0);
  }));
test("authentication loading departure resets private form and does not strand busy state", () =>
  fixture(async (f) => {
    await loaded(f);
    fill(f);
    submit(f.render());
    await tick();
    f.c.loading = true;
    f.render();
    assert.equal(f.c.requests[2].init.signal.aborted, true);
    await f.reply(2, { url: "https://checkout.stripe.com/c/pay/stale-loading" });
    assert.equal(f.c.redirects.length, 0);
    f.c.loading = false;
    await loaded(f);
    fill(f);
    assert.equal(button(f.render(), "Submit request").props.disabled, false);
  }));
