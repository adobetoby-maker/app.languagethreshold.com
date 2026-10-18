import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
const tick = () => new Promise((r) => setImmediate(r));
async function fixture(run) {
  const dir = mkdtempSync(resolve("node_modules/.cache/team-interval-"));
  const names = ["window", "document", "fetch"];
  const saved = names.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]);
  const now = Date.now;
  try {
    await build({
      stdin: {
        contents: `export {TeamActivityBridge} from '@/components/team/TeamActivityBridge';export {ownedTeamRequest,teamRequest} from '@/lib/team-client';export {c} from 'fixture';`,
        loader: "tsx",
        resolveDir: process.cwd(),
      },
      bundle: true,
      outfile: join(dir, "case.mjs"),
      format: "esm",
      platform: "node",
      jsx: "automatic",
      logLevel: "silent",
      plugins: [
        {
          name: "controlled-team-intervals",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(fixture|react|@\/state\/(auth-state|app-state)|@\/integrations\/supabase\/client)$/,
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

 const isCurrentUser=id=>c.actor===id;export const useAuth=()=>({user:c.actor?{id:c.actor}:null,isCurrentUser});export const useApp=()=>({state:c.state});
 export const supabase={auth:{getSession:()=>{c.credentialReads++;return c.credentials?new Promise(resolve=>c.credentials.push(resolve)):Promise.resolve({data:{session:{user:{id:c.sdkActor??c.actor},access_token:'synthetic-token'}}});}}};
`,
            }));
          },
        },
      ],
    });
    const { TeamActivityBridge, ownedTeamRequest, teamRequest, c } = await import(
      join(dir, "case.mjs")
    );
    Object.assign(c, {
      now: 1700000000000,
      credentialReads: 0,
      state: { hydrated: true, activeModuleId: "roofing", currentTab: "core30" },
    });
    Date.now = () => c.now;
    const intervals = new Map(),
      listeners = new Map();
    let serial = 0;
    globalThis.window = {
      setInterval: (fn, ms) => {
        assert.equal(ms, 30000);
        intervals.set(++serial, fn);
        return serial;
      },
      clearInterval: (id) => intervals.delete(id),
      addEventListener: (name, fn) => {
        const values = listeners.get(name) ?? new Set();
        values.add(fn);
        listeners.set(name, values);
      },
      removeEventListener: (name, fn) => listeners.get(name)?.delete(fn),
    };
    globalThis.document = { visibilityState: "visible" };
    globalThis.fetch = (path, init) =>
      new Promise((resolve, reject) => c.requests.push({ path, init, resolve, reject }));
    let slots = [];
    const render = () => {
      c.slots = slots;
      c.cursor = 0;
      TeamActivityBridge();
      for (const e of c.effects.splice(0)) e();
    };
    const unmount = () => {
      for (const s of slots) s?.cleanup?.();
      slots = [];
    };
    const fire = () => [...intervals.values()].forEach((fn) => fn());
    const input = () => [...(listeners.get("pointerdown") ?? [])].forEach((fn) => fn());
    const reply = async (i, payload = { recorded: 0 }, ok = true) => {
      c.requests[i].resolve({ ok, json: async () => payload });
      await tick();
    };
    const owner = (controller = new AbortController()) => ({
      userId: "a",
      isCurrent: () => c.actor === "a",
      signal: controller.signal,
    });
    try {
      await run({
        c,
        ownedTeamRequest,
        teamRequest,
        owner,
        render,
        unmount,
        fire,
        input,
        reply,
        intervals,
        listeners,
      });
    } finally {
      unmount();
    }
  } finally {
    Date.now = now;
    for (const [k, d] of saved) {
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
    }
    rmSync(dir, { recursive: true, force: true });
  }
}

test("owned team request refuses inactive or mismatched SDK identity before sending an interval", () =>
  fixture(async ({ c, ownedTeamRequest, owner }) => {
    c.actor = "b";
    await assert.rejects(ownedTeamRequest(owner(), "/api/team-activity", { action: "interval" }), {
      name: "AbortError",
    });
    assert.equal(c.credentialReads, 0);
    c.actor = "a";
    c.sdkActor = "b";
    await assert.rejects(ownedTeamRequest(owner(), "/api/team-activity", {}), /Sign in/);
    assert.equal(c.requests.length, 0);
  }));
test("owned team transport pins signal/no-store and rejects late JSON after abort", () =>
  fixture(async ({ c, ownedTeamRequest, owner }) => {
    const control = new AbortController();
    const promise = ownedTeamRequest(owner(control), "/api/team-activity", { action: "interval" });
    await tick();
    const request = c.requests[0];
    assert.equal(request.init.signal, control.signal);
    assert.equal(request.init.cache, "no-store");
    assert.equal(request.init.headers.Authorization, "Bearer synthetic-token");
    let parse;
    request.resolve({ ok: true, json: () => new Promise((resolve) => (parse = resolve)) });
    await tick();
    control.abort();
    parse({ recorded: 1 });
    await assert.rejects(promise, { name: "AbortError" });
  }));
test("bridge needs hydrated actual owner and serializes conservative interval bodies without backfill", () =>
  fixture(async ({ c, render, fire, reply, intervals }) => {
    c.state.hydrated = false;
    render();
    assert.equal(intervals.size, 0);
    c.state = { ...c.state, hydrated: true };
    c.actor = null;
    render();
    assert.equal(intervals.size, 0);
    c.actor = "a";
    render();
    fire();
    fire();
    await tick();
    assert.equal(c.requests.length, 1);
    const first = JSON.parse(c.requests[0].init.body);
    assert.deepEqual(
      { ...first, idempotencyKey: "uuid" },
      {
        action: "interval",
        moduleId: "roofing",
        activity: "core30",
        activeSeconds: 30,
        startedAt: new Date(c.now - 30000).toISOString(),
        idempotencyKey: "uuid",
      },
    );
    assert.match(first.idempotencyKey, /^[0-9a-f-]{36}$/);
    await reply(0);
    c.now += 30000;
    fire();
    await tick();
    assert.equal(c.requests.length, 2);
    assert.notEqual(JSON.parse(c.requests[1].init.body).idempotencyKey, first.idempotencyKey);
  }));
test("module/tab replacement and unmount cancel in-flight ticks/listeners and refuse captured old callbacks", () =>
  fixture(async ({ c, render, fire, unmount, intervals, listeners }) => {
    render();
    const old = [...intervals.values()][0];
    const mark = [...listeners.get("pointerdown")][0];
    fire();
    await tick();
    c.state = { ...c.state, activeModuleId: "landscaper", currentTab: "reader" };
    render();
    assert.equal(c.requests[0].init.signal.aborted, true);
    old();
    mark();
    await tick();
    assert.equal(c.requests.length, 1);
    fire();
    await tick();
    assert.equal(JSON.parse(c.requests[1].init.body).moduleId, "landscaper");
    assert.equal(JSON.parse(c.requests[1].init.body).activity, "reader");
    const current = [...intervals.values()][0];
    unmount();
    assert.equal(intervals.size, 0);
    assert.ok([...listeners.values()].every((set) => set.size === 0));
    assert.equal(c.requests[1].init.signal.aborted, true);
    current();
    await tick();
    assert.equal(c.requests.length, 2);
  }));
test("account replacement during deferred credentials cannot credit the old activity to the new account", () =>
  fixture(async ({ c, render, fire }) => {
    c.credentials = [];
    render();
    fire();
    assert.equal(c.credentials.length, 1);
    c.actor = "b";
    render();
    c.credentials[0]({ data: { session: { user: { id: "b" }, access_token: "synthetic-b" } } });
    await tick();
    assert.equal(c.requests.length, 0);
    c.credentials = null;
    fire();
    await tick();
    assert.equal(c.requests.length, 1);
  }));
test("hidden or idle tabs contribute no interval until current input resumes", () =>
  fixture(async ({ c, render, fire, input }) => {
    render();
    document.visibilityState = "hidden";
    fire();
    await tick();
    assert.equal(c.requests.length, 0);
    document.visibilityState = "visible";
    c.now += 60001;
    fire();
    await tick();
    assert.equal(c.requests.length, 0);
    input();
    fire();
    await tick();
    assert.equal(c.requests.length, 1);
    assert.equal(JSON.parse(c.requests[0].init.body).activeSeconds, 30);
  }));
test("legacy team entry preserves method/body/error contract without claiming owner binding", () =>
  fixture(async ({ c, teamRequest, reply }) => {
    const get = teamRequest("/api/team");
    await tick();
    assert.equal(c.requests[0].init.method, "GET");
    await reply(0, { organizations: [] });
    assert.deepEqual(await get, { organizations: [] });
    const post = teamRequest("/api/team", { action: "synthetic" });
    await tick();
    assert.equal(c.requests[1].init.method, "POST");
    assert.deepEqual(JSON.parse(c.requests[1].init.body), { action: "synthetic" });
    const rejected = assert.rejects(post, /synthetic denial/);
    await reply(1, { error: "synthetic denial" }, false);
    await rejected;
  }));
