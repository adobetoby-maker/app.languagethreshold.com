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
const accept = (tree) =>
  nodes(tree).find(
    (n) => n.type === "button" && JSON.stringify(n.props.children).includes("Accept invitation"),
  );
const text = (tree) =>
  nodes(tree)
    .map((n) => (typeof n.props?.children === "string" ? n.props.children : ""))
    .join(" ");
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/invite-"));
  const saved = Object.getOwnPropertyDescriptor(globalThis, "fetch");
  try {
    await build({
      stdin: {
        contents: `export {Route} from '@/routes/team_.accept';export {c} from 'fixture';`,
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
 export const c={actor:'a',token:'synthetic-invite-a',slots:[],cursor:0,effects:[],writes:0,requests:[],credentialReads:0};
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
    if (saved) Object.defineProperty(globalThis, "fetch", saved);
    else delete globalThis.fetch;
    rmSync(dir, { recursive: true, force: true });
  }
}
test("acceptance owns its original account/token and one flight, including a captured control after success", () =>
  fixture(async ({ c, render, reply }) => {
    const click = accept(render()).props.onClick;
    click();
    click();
    await tick();
    assert.equal(c.requests.length, 1);
    assert.deepEqual(JSON.parse(c.requests[0].init.body), {
      action: "accept",
      token: "synthetic-invite-a",
    });
    assert.equal(c.requests[0].init.cache, "no-store");
    assert.equal(c.requests[0].init.headers.Authorization, "Bearer synthetic-token");
    await reply(0);
    assert.match(text(render()), /Your seat is ready/);
    click();
    await tick();
    assert.equal(c.requests.length, 1);
  }));
test("credential wait cannot use a replacement SDK account and current mismatch is retryable", () =>
  fixture(async ({ c, render }) => {
    c.credentials = [];
    accept(render()).props.onClick();
    assert.equal(c.credentials.length, 1);
    c.actor = "b";
    render();
    c.credentials[0]({
      data: { session: { user: { id: "b" }, access_token: "synthetic-b-token" } },
    });
    await tick();
    assert.equal(c.requests.length, 0);
    c.credentials = null;
    c.sdkActor = "a";
    accept(render()).props.onClick();
    await tick();
    assert.equal(c.requests.length, 0);
    assert.match(text(render()), /Sign in to use your team workspace/);
  }));
test("account/token replacement aborts transport and refuses stale success, error and old controls", () =>
  fixture(async ({ c, render, reply }) => {
    const old = accept(render()).props.onClick;
    old();
    await tick();
    c.token = "synthetic-invite-b";
    render();
    assert.equal(c.requests[0].init.signal.aborted, true);
    const writes = c.writes;
    await reply(0);
    assert.equal(c.writes, writes);
    assert.doesNotMatch(text(render()), /Your seat is ready/);
    old();
    await tick();
    assert.equal(c.requests.length, 1);
    accept(render()).props.onClick();
    await tick();
    c.actor = "b";
    render();
    await reply(1, { error: "departed failure" }, false);
    assert.doesNotMatch(text(render()), /departed failure|Your seat is ready/);
  }));
test("unmount or late body parsing cannot mark the invitation accepted", () =>
  fixture(async ({ c, render, unmount }) => {
    accept(render()).props.onClick();
    await tick();
    let finish;
    c.requests[0].resolve({ ok: true, json: () => new Promise((r) => (finish = r)) });
    await tick();
    unmount();
    const writes = c.writes;
    finish({});
    await tick();
    assert.equal(c.writes, writes);
    assert.equal(c.requests[0].init.signal.aborted, true);
  }));
test("current rejection allows retry while guest, missing token, loading and pending signout refuse acceptance", () =>
  fixture(async ({ c, render, reply }) => {
    accept(render()).props.onClick();
    await tick();
    await reply(0, { error: "synthetic denial" }, false);
    assert.match(text(render()), /synthetic denial/);
    accept(render()).props.onClick();
    await tick();
    await reply(1);
    assert.match(text(render()), /Your seat is ready/);
    c.token = "synthetic-other";
    let tree = render();
    c.signingOut = true;
    accept(tree).props.onClick();
    await tick();
    assert.equal(c.requests.length, 2);
    c.signingOut = false;
    c.loading = true;
    tree = render();
    assert.equal(accept(tree), undefined);
    c.loading = false;
    c.actor = null;
    tree = render();
    assert.equal(accept(tree), undefined);
    c.actor = "a";
    c.token = undefined;
    tree = render();
    assert.equal(accept(tree), undefined);
  }));

test("pending local signout suppresses acceptance but releases local busy status for a cancelled signout retry", () =>
  fixture(async ({ c, render, reply }) => {
    accept(render()).props.onClick();
    await tick();
    c.signingOut = true;
    await reply(0);
    assert.doesNotMatch(text(render()), /Your seat is ready/);
    c.signingOut = false;
    const control = accept(render());
    assert.equal(control.props.disabled, false);
    control.props.onClick();
    await tick();
    await reply(1);
    assert.match(text(render()), /Your seat is ready/);
  }));
