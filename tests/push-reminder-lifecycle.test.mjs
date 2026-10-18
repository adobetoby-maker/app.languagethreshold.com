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
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/push-"));
  const globals = ["window", "document", "navigator", "Notification", "fetch", "localStorage"];
  const saved = globals.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]);
  try {
    await build({
      stdin: {
        contents: `export {PushReminderControl} from '@/components/PushReminderControl';export {PushReminderSync} from '@/components/PushReminderSync';export {pushApi} from '@/lib/push-api';export {c} from 'fixture';`,
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
          name: "controlled-reminders",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(fixture|react|lucide-react|sonner|@\/state\/(auth-state|app-state)|@\/lib\/learning-reminders|@\/integrations\/supabase\/client)$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: ` export const c={slots:[],cursor:0,effects:[],actor:'a',requests:[],stateWrites:0};
 const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
 export function useState(initial){const slots=c.slots,i=c.cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],v=>{c.stateWrites++;slots[i]=typeof v==='function'?v(slots[i]):v;}];}
 export function useRef(initial){const i=c.cursor++;if(!(i in c.slots))c.slots[i]={current:initial};return c.slots[i];}
 export function useCallback(fn,deps){const i=c.cursor++,old=c.slots[i];if(!old||changed(old.deps,deps))c.slots[i]={fn,deps};return c.slots[i].fn;}
 export function useEffect(fn,deps){const slots=c.slots,i=c.cursor++,old=slots[i];if(!old||changed(old.deps,deps))c.effects.push(()=>{old?.cleanup?.();slots[i]={deps,setup:fn,cleanup:fn()};});}
 export const useMemo=(fn,deps)=>useCallback(fn,deps)();
 const actors=new Map();const isCurrentUser=id=>c.actor===id;export const useAuth=()=>{if(!actors.has(c.actor)){const user=c.actor?{id:c.actor}:null;actors.set(c.actor,{user,session:user?{user}:null,isCurrentUser});}return actors.get(c.actor);};
 export const useApp=()=>({state:c.state,dispatch:action=>c.dispatches.push(action)});
 export const LANGUAGES=['English','Spanish'];export const buildLearningReminderContext=()=>c.context;
 export const BellOff='icon',BellRing='icon',Loader2='icon',Smartphone='icon';export const toast=(...args)=>c.toasts.push(args);
 export const supabase={auth:{getSession:()=>{c.credentialReads++;return c.credentials?new Promise(resolve=>c.credentials.push(resolve)):Promise.resolve({data:{session:{user:{id:c.sdkActor??c.actor},access_token:'synthetic-token'}}});}}};
`,
            }));
          },
        },
      ],
    });
    const { PushReminderControl, PushReminderSync, pushApi, c } = await import(
      join(dir, "case.mjs")
    );
    Object.assign(c, {
      context: { version: 1, language: "English", topicTitle: "synthetic private topic" },
      state: { hydrated: true, selectedLanguage: "English" },
      dispatches: [],
      toasts: [],
      credentialReads: 0,
      permissionCalls: 0,
      subscribes: 0,
      unsubscribes: 0,
      settings: {
        configured: true,
        enabled: false,
        publicKey: "YQ",
        reminderHour: 19,
        timezone: "UTC",
      },
    });
    const storage = new Map(),
      timers = new Map();
    let serial = 0;
    globalThis.Notification = {
      requestPermission: () => {
        c.permissionCalls++;
        return c.permissions
          ? new Promise((resolve) => c.permissions.push(resolve))
          : Promise.resolve("granted");
      },
    };
    const subscription = {
      endpoint: "https://synthetic.invalid/push",
      toJSON: () => ({
        endpoint: "https://synthetic.invalid/push",
        keys: { p256dh: "synthetic-public", auth: "synthetic-auth" },
      }),
      unsubscribe: async () => {
        c.unsubscribes++;
        return true;
      },
    };
    const registration = {
      pushManager: {
        getSubscription: async () => (c.existing ? subscription : null),
        subscribe: async () => {
          c.subscribes++;
          return c.subscriptionResults
            ? new Promise((resolve) => c.subscriptionResults.push(resolve))
            : subscription;
        },
      },
    };
    globalThis.window = {
      Notification,
      PushManager: {},
      matchMedia: () => ({ matches: false }),
      setTimeout: (fn) => {
        timers.set(++serial, fn);
        return serial;
      },
      clearTimeout: (id) => timers.delete(id),
    };
    window.localStorage = {
      getItem: (k) => storage.get(k) ?? null,
      setItem: (k, v) => storage.set(k, v),
      removeItem: (k) => storage.delete(k),
    };
    // push-api uses the browser global localStorage.
    const localDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    globalThis.localStorage = window.localStorage;
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        userAgent: "controlled-fixture",
        serviceWorker: { ready: Promise.resolve(registration) },
      },
    });
    globalThis.document = {
      visibilityState: "visible",
      addEventListener() {},
      removeEventListener() {},
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
    const render = (sync = false) => {
      let n = { type: sync ? PushReminderSync : PushReminderControl, key: "root", props: {} },
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
      for (const e of c.effects.splice(0)) e();
      return n;
    };
    const reply = async (index, payload = c.settings, ok = true) => {
      c.requests[index].resolve({ ok, json: async () => payload });
      await tick();
    };
    const loaded = async () => {
      render();
      await tick();
      await reply(c.requests.length - 1);
      return render();
    };
    const owner = (controller = new AbortController()) => ({
      userId: "a",
      isCurrent: () => c.actor === "a",
      signal: controller.signal,
    });
    try {
      await run({
        c,
        pushApi,
        render,
        unmount,
        loaded,
        reply,
        owner,
        storage,
        timers,
        subscription,
      });
    } finally {
      unmount();
      if (localDescriptor) Object.defineProperty(globalThis, "localStorage", localDescriptor);
      else delete globalThis.localStorage;
    }
  } finally {
    for (const [k, d] of saved) {
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
    }
    rmSync(dir, { recursive: true, force: true });
  }
}

test("request binds SDK credentials to original owner and refuses departed or aborted work before fetch", () =>
  fixture(async ({ c, pushApi, owner }) => {
    c.actor = "b";
    await assert.rejects(pushApi(owner()), { name: "AbortError" });
    assert.equal(c.credentialReads, 0);
    c.actor = "a";
    c.sdkActor = "b";
    await assert.rejects(pushApi(owner()), /Sign in/);
    assert.equal(c.requests.length, 0);
    c.sdkActor = "a";
    c.credentials = [];
    const controller = new AbortController();
    const request = pushApi(owner(controller));
    controller.abort();
    c.credentials[0]({ data: { session: { user: { id: "a" }, access_token: "synthetic-token" } } });
    await assert.rejects(request, { name: "AbortError" });
    assert.equal(c.requests.length, 0);
  }));
test("request pins no-store/auth/signal and rejects late transport or parser after ownership loss", () =>
  fixture(async ({ c, pushApi, owner }) => {
    const control = new AbortController();
    const request = pushApi(owner(control), {
      headers: { Authorization: "wrong" },
      cache: "force-cache",
    });
    await tick();
    assert.equal(c.requests[0].init.headers.Authorization, "Bearer synthetic-token");
    assert.equal(c.requests[0].init.cache, "no-store");
    assert.equal(c.requests[0].init.signal, control.signal);
    let parse;
    c.requests[0].resolve({ ok: true, json: () => new Promise((resolve) => (parse = resolve)) });
    await tick();
    c.actor = "b";
    parse({ private: "synthetic" });
    await assert.rejects(request, { name: "AbortError" });
  }));
test("duplicate enable shares one permission action and departure stops before subscription/server work", () =>
  fixture(async ({ c, loaded, unmount, storage }) => {
    const tree = await loaded();
    c.permissions = [];
    const enable = button(tree, "Allow practice reminders").props.onClick;
    enable();
    enable();
    assert.equal(c.permissionCalls, 1);
    unmount();
    c.permissions[0]("granted");
    await tick();
    assert.equal(c.subscribes, 0);
    assert.equal(c.requests.length, 1);
    assert.equal(storage.get("lt.push.enabled.a"), undefined);
    assert.equal(c.toasts.length, 0);
  }));
test("current explicit enable preserves exact body and departed disable cannot unsubscribe shared device endpoint", () =>
  fixture(async ({ c, loaded, reply, render, unmount, storage }) => {
    const tree = await loaded();
    button(tree, "Allow practice reminders").props.onClick();
    await tick();
    assert.equal(c.subscribes, 1);
    const body = JSON.parse(c.requests[1].init.body);
    assert.equal(body.action, "subscribe");
    assert.deepEqual(body.context, c.context);
    assert.equal(body.reminderHour, 19);
    await reply(1, { ok: true });
    assert.equal(storage.get("lt.push.enabled.a"), "1");
    assert.equal(c.toasts.length, 1);
    c.existing = true;
    const current = render();
    button(current, "Turn off").props.onClick();
    await tick();
    assert.equal(JSON.parse(c.requests[2].init.body).action, "unsubscribe");
    unmount();
    await reply(2, { ok: true });
    assert.equal(c.requests[2].init.signal.aborted, true);
    assert.equal(c.unsubscribes, 0);
    assert.equal(storage.get("lt.push.enabled.a"), "1");
  }));
test("account replacement and context changes discard old settings/read/error/actions", () =>
  fixture(async ({ c, loaded, render, reply, storage }) => {
    const old = await loaded();
    c.actor = "b";
    render();
    await tick();
    assert.equal(button(old, "Allow practice reminders").props.onClick(), undefined);
    assert.equal(c.permissionCalls, 0);
    await reply(1, { ...c.settings, enabled: true });
    let tree = render();
    assert.ok(button(tree, "Turn off"));
    assert.equal(storage.get("lt.push.enabled.b"), "1");
    c.context = { ...c.context, language: "Spanish" };
    c.state = { ...c.state };
    render();
    await tick();
    tree = render();
    assert.equal(button(tree, "Allow practice reminders").props.disabled, true);
    assert.equal(c.requests[2].init.signal.aborted, false);
    c.actor = "a";
    render();
    await tick();
    await reply(2, { ...c.settings, enabled: true });
    assert.equal(storage.get("lt.push.enabled.b"), "1");
    assert.equal(c.requests[2].init.signal.aborted, true);
    await reply(3);
    tree = render();
    assert.ok(button(tree, "Allow practice reminders"));
  }));
test("background sync cancels debounce and pending credential reads on account/context departure", () =>
  fixture(async ({ c, render, unmount, storage, timers }) => {
    storage.set("lt.push.enabled.a", "1");
    render(true);
    assert.equal(timers.size, 1);
    const timer = [...timers.values()][0];
    c.credentials = [];
    timer();
    assert.equal(c.credentials.length, 1);
    unmount();
    assert.equal(timers.size, 0);
    c.actor = "b";
    c.credentials[0]({
      data: { session: { user: { id: "b" }, access_token: "synthetic-token-b" } },
    });
    await tick();
    assert.equal(c.requests.length, 0);
    c.credentials = null;
    c.actor = "a";
    render(true);
    [...timers.values()][0]();
    await tick();
    assert.equal(JSON.parse(c.requests[0].init.body).action, "sync-context");
    c.context = { ...c.context, topicTitle: "new snapshot" };
    c.state = { ...c.state };
    render(true);
    assert.equal(c.requests[0].init.signal.aborted, true);
  }));
test("hour updates serialize, validate bounds and retain server time after current retryable error", () =>
  fixture(async ({ c, loaded, render, reply }) => {
    c.settings.enabled = true;
    let tree = await loaded();
    const select = nodes(tree).find((n) => n.type === "select" && n.props.value === 19);
    select.props.onChange({ target: { value: "99" } });
    assert.equal(c.requests.length, 1);
    select.props.onChange({ target: { value: "20" } });
    select.props.onChange({ target: { value: "21" } });
    await tick();
    assert.equal(c.requests.length, 2);
    assert.equal(JSON.parse(c.requests[1].init.body).reminderHour, 20);
    await reply(1, { error: "synthetic retry" }, false);
    tree = render();
    assert.match(JSON.stringify(tree), /synthetic retry/);
    assert.ok(nodes(tree).find((n) => n.type === "select" && n.props.value === 19));
    nodes(tree)
      .find((n) => n.type === "select" && n.props.value === 19)
      .props.onChange({ target: { value: "20" } });
    await tick();
    await reply(2, { ok: true });
    tree = render();
    assert.ok(nodes(tree).find((n) => n.type === "select" && n.props.value === 20));
  }));

test("a late device subscription is not bound after departure and denied permission stays retryable", () =>
  fixture(async ({ c, loaded, render, unmount, subscription }) => {
    let tree = await loaded();
    c.permissions = [];
    button(tree, "Allow practice reminders").props.onClick();
    c.permissions[0]("denied");
    await tick();
    tree = render();
    assert.match(JSON.stringify(tree), /Notifications were not allowed/);
    assert.equal(c.subscribes, 0);
    c.permissions = null;
    c.subscriptionResults = [];
    button(tree, "Allow practice reminders").props.onClick();
    await tick();
    assert.equal(c.subscribes, 1);
    c.actor = "b";
    unmount();
    c.subscriptionResults[0](subscription);
    await tick();
    assert.equal(c.requests.length, 1);
    assert.equal(c.toasts.length, 0);
    assert.equal(c.unsubscribes, 0);
  }));
