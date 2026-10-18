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
  const globals = [
    "window",
    "document",
    "navigator",
    "Notification",
    "fetch",
    "localStorage",
    "setTimeout",
    "clearTimeout",
  ];
  const saved = globals.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]);
  try {
    await build({
      stdin: {
        contents: `export {PushReminderControl} from '@/components/PushReminderControl';export {PushReminderSync} from '@/components/PushReminderSync';export {pushApi} from '@/lib/push-api';export {PUSH_REQUEST_WAIT_MS,PUSH_RESPONSE_MAX_BYTES} from '@/lib/push-response';export {c} from 'fixture';`,
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
    const {
      PushReminderControl,
      PushReminderSync,
      pushApi,
      PUSH_REQUEST_WAIT_MS,
      PUSH_RESPONSE_MAX_BYTES,
      c,
    } = await import(join(dir, "case.mjs"));
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
    const nativeSet = globalThis.setTimeout,
      nativeClear = globalThis.clearTimeout;
    c.deadlines = new Map();
    globalThis.setTimeout = (fn, ms, ...args) => {
      if (ms !== PUSH_REQUEST_WAIT_MS) return nativeSet(fn, ms, ...args);
      const id = {};
      c.deadlines.set(id, fn);
      return id;
    };
    globalThis.clearTimeout = (id) => {
      if (c.deadlines.has(id)) c.deadlines.delete(id);
      else nativeClear(id);
    };
    c.expire = () => {
      for (const fn of [...c.deadlines.values()]) fn();
    };
    const directOwners = [];
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
      c.requests[index].resolve(Response.json(payload, { status: ok ? 200 : 503 }));
      await tick();
    };
    const loaded = async () => {
      render();
      await tick();
      await reply(c.requests.length - 1);
      return render();
    };
    const owner = (controller = new AbortController()) => {
      directOwners.push(controller);
      return { userId: "a", isCurrent: () => c.actor === "a", signal: controller.signal };
    };
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
        PUSH_RESPONSE_MAX_BYTES,
      });
    } finally {
      unmount();
      for (const controller of directOwners) controller.abort();
      await tick();
      assert.equal(c.deadlines.size, 0);
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
    assert.notEqual(c.requests[0].init.signal, control.signal);
    assert.ok(c.requests[0].init.signal instanceof AbortSignal);
    let body;
    c.requests[0].resolve(
      new Response(
        new ReadableStream({
          start(x) {
            body = x;
            x.enqueue(new TextEncoder().encode("{"));
          },
        }),
      ),
    );
    await tick();
    c.actor = "b";
    body.enqueue(new TextEncoder().encode('"private":"synthetic"}'));
    body.close();
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
test("hour updates serialize, validate bounds and retain server time after an unconfirmed response", () =>
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
    assert.match(JSON.stringify(tree), /The reminder change could not be confirmed/);
    assert.doesNotMatch(JSON.stringify(tree), /synthetic retry/);
    assert.ok(button(tree, "Check saved settings"));
    select.props.onChange({ target: { value: "20" } });
    await tick();
    assert.equal(c.requests.length, 2);
    button(tree, "Check saved settings").props.onClick();
    await tick();
    assert.equal(c.requests[2].init.method, undefined);
    await reply(2, { ...c.settings, reminderHour: 20 });
    tree = render();
    assert.match(JSON.stringify(tree), /Last visible saved settings/);
    assert.match(JSON.stringify(tree), /earlier change is still unconfirmed/);
    select.props.onChange({ target: { value: "21" } });
    await tick();
    assert.equal(c.requests.length, 3);
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
test("reminder writes require literal success acknowledgement and expose only fixed unconfirmed errors", () =>
  fixture(async ({ c, pushApi, owner }) => {
    const attempt = async (response) => {
      const p = pushApi(owner(), {
        method: "POST",
        body: JSON.stringify({ action: "sync-context" }),
      });
      const rejected = assert.rejects(
        p,
        (error) =>
          error.message === "The reminder change could not be confirmed." &&
          error.cause === undefined,
      );
      await tick();
      c.requests.at(-1).resolve(response);
      await rejected;
    };
    for (const payload of [
      {},
      null,
      [],
      true,
      { ok: false },
      { ok: "true" },
      { error: "synthetic-private-detail" },
    ])
      await attempt(Response.json(payload));
    await attempt(new Response("synthetic-private-detail"));
    let cancelled = 0;
    await attempt(
      new Response(
        new ReadableStream({
          start(x) {
            x.enqueue(new TextEncoder().encode("synthetic-private-detail"));
          },
          cancel() {
            cancelled++;
          },
        }),
        { status: 503 },
      ),
    );
    assert.equal(cancelled, 1);
    const failed = pushApi(owner(), { method: "POST" });
    const rejection = assert.rejects(failed, {
      message: "The reminder change could not be confirmed.",
    });
    await tick();
    c.requests.at(-1).reject(new Error("synthetic-private-network-detail"));
    await rejection;
    const succeeded = pushApi(owner(), { method: "post" });
    await tick();
    c.requests.at(-1).resolve(Response.json({ ok: true }));
    assert.deepEqual(await succeeded, { ok: true });
    assert.equal(c.requests.length, 11);
  }));
test("reminder settings must validate before reaching account state and departed response bodies are disposed", () =>
  fixture(async ({ c, pushApi, owner }) => {
    for (const payload of [
      {},
      null,
      [],
      { ...c.settings, enabled: "true" },
      { ...c.settings, configured: 1 },
      { ...c.settings, reminderHour: 24 },
      { ...c.settings, reminderHour: 1.5 },
      { ...c.settings, timezone: "" },
      { ...c.settings, timezone: "x".repeat(81) },
      { ...c.settings, publicKey: 42 },
      { ...c.settings, publicKey: "x".repeat(2049) },
    ]) {
      const p = pushApi(owner());
      const rejection = assert.rejects(p, { message: "Practice reminders are unavailable." });
      await tick();
      c.requests.at(-1).resolve(Response.json(payload));
      await rejection;
    }
    const p = pushApi(owner());
    await tick();
    c.requests.at(-1).resolve(Response.json({ ...c.settings, publicKey: null }));
    assert.deepEqual(await p, { ...c.settings, publicKey: null });
    let cancelled = 0;
    const departed = pushApi(owner());
    const rejection = assert.rejects(departed, { name: "AbortError" });
    await tick();
    c.actor = "b";
    c.requests.at(-1).resolve(
      new Response(
        new ReadableStream({
          cancel() {
            cancelled++;
          },
        }),
      ),
    );
    await rejection;
    assert.equal(cancelled, 1);
  }));
test("malformed successful reminder write cannot enable UI, persist enabled flag or announce success", () =>
  fixture(async ({ c, loaded, render, storage }) => {
    const tree = await loaded();
    button(tree, "Allow practice reminders").props.onClick();
    await tick();
    assert.equal(c.requests.length, 2);
    c.requests[1].resolve(Response.json({ error: "synthetic-private-detail" }));
    await tick();
    const current = render();
    assert.match(JSON.stringify(current), /The reminder change could not be confirmed/);
    assert.doesNotMatch(
      JSON.stringify(current),
      /synthetic-private-detail|Your countdown is active/,
    );
    assert.ok(button(current, "Check saved settings"));
    assert.equal(storage.has("lt.push.enabled.a"), false);
    assert.equal(c.toasts.length, 0);
    assert.equal(c.requests.length, 2);
    assert.equal(c.unsubscribes, 0);
  }));
test("reminder wait covers credential lookup and prevents late or departed credentials from dispatching", () =>
  fixture(async ({ c, pushApi, owner }) => {
    c.credentials = [];
    const p = pushApi(owner(), { method: "POST" });
    const rejection = assert.rejects(
      p,
      (error) =>
        error.outcome === "not_started" &&
        error.message === "The reminder request did not start. Please try again." &&
        error.cause === undefined,
    );
    c.expire();
    await rejection;
    c.credentials[0]({ data: { session: { user: { id: "a" }, access_token: "synthetic-token" } } });
    await tick();
    assert.equal(c.requests.length, 0);
    const control = new AbortController();
    const departed = pushApi(owner(control), { method: "POST" });
    const abort = assert.rejects(departed, { name: "AbortError" });
    control.abort();
    await abort;
    c.credentials[1]({ data: { session: { user: { id: "a" }, access_token: "synthetic-token" } } });
    await tick();
    assert.equal(c.requests.length, 0);
  }));
test("reminder header expiry reports unknown, disposes late responses and keeps later requests independent", () =>
  fixture(async ({ c, pushApi, owner }) => {
    const controller = new AbortController();
    const p = pushApi(owner(controller), { method: "POST" });
    const rejection = assert.rejects(
      p,
      (error) =>
        error.outcome === "unknown" &&
        error.message === "The reminder change could not be confirmed.",
    );
    await tick();
    const request = c.requests[0];
    c.expire();
    await rejection;
    assert.equal(controller.signal.aborted, false);
    assert.equal(request.init.signal.aborted, true);
    let cancelled = 0;
    request.resolve(
      new Response(
        new ReadableStream({
          cancel() {
            cancelled++;
          },
        }),
      ),
    );
    await tick();
    assert.equal(cancelled, 1);
    const next = pushApi(owner());
    await tick();
    c.requests[1].resolve(Response.json(c.settings));
    assert.deepEqual(await next, c.settings);
    assert.equal(c.requests.length, 2);
    const control = new AbortController();
    const aborted = pushApi(owner(control), { method: "POST" });
    const expected = assert.rejects(aborted, { name: "AbortError" });
    await tick();
    control.abort();
    await expected;
    c.requests[2].resolve(Response.json({ ok: true }));
    await tick();
  }));
test("reminder response reader counts exact and streamed UTF-8 bytes and rejects advertised or actual overflow", () =>
  fixture(async ({ c, pushApi, owner, PUSH_RESPONSE_MAX_BYTES }) => {
    const raw = JSON.stringify({ ...c.settings, padding: "" });
    const exact = JSON.stringify({
      ...c.settings,
      padding: "x".repeat(PUSH_RESPONSE_MAX_BYTES - Buffer.byteLength(raw)),
    });
    assert.equal(Buffer.byteLength(exact), PUSH_RESPONSE_MAX_BYTES);
    const good = pushApi(owner());
    await tick();
    c.requests.at(-1).resolve(new Response(exact));
    assert.equal((await good).enabled, false);
    for (const advertised of [true, false]) {
      let cancelled = 0;
      const stream = new ReadableStream({
        start(x) {
          x.enqueue(
            new TextEncoder().encode(
              JSON.stringify({ ok: true, padding: "é".repeat(PUSH_RESPONSE_MAX_BYTES) }),
            ),
          );
        },
        cancel() {
          cancelled++;
          return new Promise(() => {});
        },
      });
      const p = pushApi(owner(), { method: "POST" });
      const rejection = assert.rejects(p, (error) => error.outcome === "unknown");
      await tick();
      c.requests.at(-1).resolve(
        new Response(stream, {
          headers: advertised ? { "content-length": String(PUSH_RESPONSE_MAX_BYTES + 1) } : {},
        }),
      );
      await rejection;
      assert.equal(cancelled, 1);
      assert.equal(stream.locked, false);
    }
    const bad = pushApi(owner());
    const rejection = assert.rejects(bad, { message: "Practice reminders are unavailable." });
    await tick();
    c.requests.at(-1).resolve(new Response(new Uint8Array([255])));
    await rejection;
  }));
test("reminder partial-body deadline releases reader and returns UI from busy without success or retry", () =>
  fixture(async ({ c, loaded, render, storage }) => {
    const tree = await loaded();
    button(tree, "Allow practice reminders").props.onClick();
    await tick();
    let cancelled = 0;
    const stream = new ReadableStream({
      start(x) {
        x.enqueue(new TextEncoder().encode("{"));
      },
      cancel() {
        cancelled++;
        return new Promise(() => {});
      },
    });
    c.requests[1].resolve(new Response(stream));
    await tick();
    c.expire();
    await tick();
    const current = render();
    assert.match(JSON.stringify(current), /The reminder change could not be confirmed/);
    assert.equal(button(current, "Check saved settings").props.disabled, false);
    assert.equal(storage.has("lt.push.enabled.a"), false);
    assert.equal(c.toasts.length, 0);
    assert.equal(c.requests.length, 2);
    assert.equal(cancelled, 1);
    assert.equal(stream.locked, false);
  }));
test("unknown reminder write blocks retained actions and read-only observations never clear uncertainty", () =>
  fixture(async ({ c, loaded, render, reply, storage }) => {
    const tree = await loaded();
    const enable = button(tree, "Allow practice reminders").props.onClick;
    const language = nodes(tree).find((n) => n.type === "select" && n.props.value === "English");
    enable();
    await tick();
    await reply(1, {}, true);
    let current = render();
    assert.match(JSON.stringify(current), /Reminder status is unconfirmed/);
    enable();
    language.props.onChange({ target: { value: "Spanish" } });
    await tick();
    assert.equal(c.requests.length, 2);
    assert.equal(c.permissionCalls, 1);
    assert.equal(c.dispatches.length, 0);
    for (const enabled of [false, true]) {
      const check = button(current, "Check saved settings").props.onClick;
      check();
      check();
      await tick();
      const index = c.requests.length - 1;
      assert.equal(c.requests[index].init.method, undefined);
      await reply(index, { ...c.settings, enabled });
      current = render();
      assert.match(JSON.stringify(current), /Last visible saved settings/);
      assert.ok(button(current, "Check saved settings"));
      assert.equal(button(current, "Turn off"), undefined);
      assert.equal(button(current, "Allow practice reminders"), undefined);
      enable();
      await tick();
      assert.equal(c.requests.length, index + 1);
    }
    button(current, "Check saved settings").props.onClick();
    await tick();
    await reply(c.requests.length - 1, { error: "synthetic-private-detail" }, false);
    current = render();
    assert.match(JSON.stringify(current), /Saved settings could not be checked/);
    assert.doesNotMatch(JSON.stringify(current), /synthetic-private-detail/);
    assert.equal(storage.has("lt.push.enabled.a"), false);
    assert.equal(c.toasts.length, 0);
    assert.equal(c.unsubscribes, 0);
    assert.equal(c.requests.filter((x) => x.init.method === "POST").length, 1);
  }));
test("context replacement during reminder write preserves uncertainty and cannot auto-read or replay", () =>
  fixture(async ({ c, loaded, render, reply, storage }) => {
    const tree = await loaded();
    const enable = button(tree, "Allow practice reminders").props.onClick;
    enable();
    await tick();
    assert.equal(c.requests.length, 2);
    c.context = { ...c.context, topicTitle: "new synthetic context" };
    c.state = { ...c.state };
    render();
    await tick();
    let current = render();
    assert.match(JSON.stringify(current), /Reminder status is unconfirmed/);
    assert.equal(c.requests[1].init.signal.aborted, true);
    assert.equal(c.requests.length, 2);
    await reply(1, { ok: true });
    current = render();
    enable();
    await tick();
    assert.equal(c.requests.length, 2);
    assert.equal(storage.has("lt.push.enabled.a"), false);
    assert.equal(c.toasts.length, 0);
    button(current, "Check saved settings").props.onClick();
    await tick();
    assert.equal(c.requests[2].init.method, undefined);
    await reply(2, { ...c.settings, enabled: true });
    current = render();
    assert.match(JSON.stringify(current), /earlier change is still unconfirmed/);
    assert.equal(c.requests.length, 3);
  }));
test("late reminder status observation cannot update replacement account or its enabled cache", () =>
  fixture(async ({ c, loaded, render, reply, storage }) => {
    const tree = await loaded();
    button(tree, "Allow practice reminders").props.onClick();
    await tick();
    await reply(1, {});
    let current = render();
    button(current, "Check saved settings").props.onClick();
    await tick();
    assert.equal(c.requests.length, 3);
    c.actor = "b";
    render();
    await tick();
    assert.equal(c.requests.length, 4);
    assert.equal(c.requests[2].init.signal.aborted, true);
    const before = c.stateWrites;
    await reply(2, { ...c.settings, enabled: true });
    assert.equal(c.stateWrites, before);
    await reply(3, { ...c.settings, enabled: false });
    current = render();
    assert.ok(button(current, "Allow practice reminders"));
    assert.equal(button(current, "Check saved settings"), undefined);
    assert.equal(storage.has("lt.push.enabled.b"), false);
    assert.equal(c.toasts.length, 0);
  }));
test("reminder API pre-dispatch expiry stays retryable without an unknown-write latch", () =>
  fixture(async ({ c, loaded, render, reply }) => {
    const tree = await loaded();
    c.credentials = [];
    button(tree, "Allow practice reminders").props.onClick();
    await tick();
    assert.equal(c.credentials.length, 1);
    assert.equal(c.requests.length, 1);
    c.expire();
    await tick();
    let current = render();
    assert.match(JSON.stringify(current), /reminder request did not start/);
    assert.ok(button(current, "Allow practice reminders"));
    assert.equal(button(current, "Check saved settings"), undefined);
    c.credentials[0]({ data: { session: { user: { id: "a" }, access_token: "synthetic-token" } } });
    await tick();
    assert.equal(c.requests.length, 1);
    c.credentials = null;
    c.existing = true;
    button(current, "Allow practice reminders").props.onClick();
    await tick();
    assert.equal(c.requests.length, 2);
    await reply(1, { ok: true });
    current = render();
    assert.ok(button(current, "Turn off"));
  }));
