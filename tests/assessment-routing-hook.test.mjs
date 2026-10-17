import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
mkdirSync(resolve("node_modules/.cache/lle-tests"), { recursive: true });
const root = mkdtempSync(resolve("node_modules/.cache/lle-tests/routing-hook-"));
let m;
try {
  const outfile = join(root, "hook.mjs");
  await build({
    stdin: {
      contents: `export {useExamDraft} from './src/hooks/use-exam-draft.ts';export * from './src/lib/assessments/drafts.ts';export * from './src/lib/assessments/offline.ts';export {controls,ExamRequestError} from 'test-controls';`,
      resolveDir: process.cwd(),
    },
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    logLevel: "silent",
    plugins: [
      {
        name: "controlled-hook-host",
        setup(b) {
          b.onResolve(
            { filter: /^(react|test-controls|@\/state\/auth-state|@\/lib\/assessments\/client)$/ },
            () => ({ path: "fixture", namespace: "fixture" }),
          );
          b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
            contents: `
        export const controls={slots:[],cursor:0,effects:[],actor:'owner-a',request:null,begin(){this.cursor=0;this.effects=[];},commit(){for(const fn of this.effects.splice(0))fn();},unmount(){for(const slot of this.slots)slot?.cleanup?.();this.slots=[];this.effects=[];}};
        const changed=(a,b)=>!a||!b||a.length!==b.length||a.some((v,i)=>v!==b[i]);
        export function useState(initial){const i=controls.cursor++;if(!(i in controls.slots))controls.slots[i]=typeof initial==='function'?initial():initial;return [controls.slots[i],value=>{controls.slots[i]=typeof value==='function'?value(controls.slots[i]):value;}];}
        export function useRef(initial){const i=controls.cursor++;if(!(i in controls.slots))controls.slots[i]={current:initial};return controls.slots[i];}
        export function useCallback(fn,deps){const i=controls.cursor++,old=controls.slots[i];if(!old||changed(old.deps,deps))controls.slots[i]={deps,fn};return controls.slots[i].fn;}
        export function useEffect(fn,deps){const i=controls.cursor++,old=controls.slots[i];if(!old||changed(old.deps,deps))controls.effects.push(()=>{old?.cleanup?.();controls.slots[i]={deps,cleanup:fn()};});}
        const isCurrentUser=id=>id===controls.actor;
        export const useAuth=()=>({user:controls.actor?{id:controls.actor}:null,isCurrentUser});
        export class ExamRequestError extends Error{constructor(message,status){super(message);this.status=status;}}
        export const examRequest=(body,signal)=>controls.request(body,signal);
      `,
          }));
        },
      },
    ],
  });
  m = await import(outfile);
} finally {
  rmSync(root, { recursive: true, force: true });
}
const tick = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
function attempt(selected = false) {
  return {
    id: "local-attempt",
    isLearner: true,
    submittedAt: null,
    revision: selected ? 6 : 4,
    savedAt: "2026-10-17T17:00:00Z",
    form: {
      id: "local-form",
      version: "local-v1",
      rubricVersion: "local-r1",
      items: [{ id: "core-a" }, { id: "core-b" }, ...(selected ? [{ id: "server-branch" }] : [])],
    },
    enrollment: { id: "local-enrollment", moduleId: "roofing", scope: "personal" },
    routing: { state: selected ? "selected" : "core", coreItemCount: 2 },
    responses: [
      {
        id: "response-a",
        item_id: "core-a",
        answer: { inputMethod: "typed", text: "Saved core A" },
      },
      {
        id: "response-b",
        item_id: "core-b",
        answer: { inputMethod: "unavailable", missingReason: "Synthetic unavailable input" },
      },
    ],
  };
}
async function fixture(run) {
  const windowBefore = Object.getOwnPropertyDescriptor(globalThis, "window"),
    navigatorBefore = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const values = new Map(),
    listeners = new Map(),
    calls = [];
  const f = { values, calls, online: true, blocked: false, current: attempt() };
  const storage = {
    get length() {
      return values.size;
    },
    key: (i) => [...values.keys()][i] ?? null,
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => {
      if (f.blocked) throw new Error("Synthetic quota");
      values.set(k, v);
    },
    removeItem: (k) => values.delete(k),
  };
  const emit = (name) => {
    for (const fn of listeners.get(name) ?? []) fn({ preventDefault() {} });
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: storage,
      addEventListener: (name, fn) => {
        if (!listeners.has(name)) listeners.set(name, new Set());
        listeners.get(name).add(fn);
      },
      removeEventListener: (name, fn) => listeners.get(name)?.delete(fn),
    },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      get onLine() {
        return f.online;
      },
    },
  });
  m.controls.actor = "owner-a";
  m.controls.request = async (body, signal) => {
    calls.push({ body: structuredClone(body), signal });
    return f.request(body, signal);
  };
  const serverAnswers = new Map();
  f.request = async (body) => {
    if (typeof body === "string") {
      const latest = attempt(true);
      latest.responses = latest.responses.map((response) => ({
        ...response,
        answer: serverAnswers.get(response.item_id) ?? response.answer,
      }));
      return latest;
    }
    if (body.action === "save") {
      for (const update of body.updates) serverAnswers.set(update.itemId, update.answer);
      return { revision: 5, syncedAt: "2026-10-17T17:01:00Z" };
    }
    return { revision: 6 };
  };
  f.render = (fromDevice = false) => {
    m.controls.begin();
    const hook = m.useExamDraft(f.current, fromDevice);
    m.controls.commit();
    return hook;
  };
  f.remount = (next, fromDevice = false) => {
    m.controls.unmount();
    f.current = next;
    return f.render(fromDevice);
  };
  Object.assign(f, { storage, listeners, emit, key: m.examDraftKey("owner-a", "local-attempt") });
  try {
    await run(f);
  } finally {
    m.controls.unmount();
    for (const actor of ["owner-a", "owner-b"]) m.clearExamDraftsForUser(storage, actor);
    if (windowBefore) Object.defineProperty(globalThis, "window", windowBefore);
    else delete globalThis.window;
    if (navigatorBefore) Object.defineProperty(globalThis, "navigator", navigatorBefore);
    else delete globalThis.navigator;
  }
}

test("actual hook flushes saves, coalesces continuation, locks uncertain edits and caches/restores the selected branch", async () =>
  fixture(async (f) => {
    let hook = f.render();
    hook.edit("core-a", { inputMethod: "typed", text: "Changed core A" });
    hook = f.render();
    const route = deferred(),
      base = f.request;
    f.request = (body) =>
      typeof body !== "string" && body.action === "route" ? route.promise : base(body);
    const work = hook.continueRouting();
    assert.equal(hook.continueRouting(), work);
    await tick();
    assert.deepEqual(
      f.calls.map((c) => (typeof c.body === "string" ? "read" : c.body.action)),
      ["save", "route"],
    );
    assert.equal(f.calls[1].body.revision, 5);
    hook = f.render();
    assert.equal(hook.routePending, true);
    assert.equal(m.hasUnsyncedExamDrafts(f.storage, "owner-a"), true);
    hook.edit("core-a", { inputMethod: "typed", text: "Must be ignored" });
    assert.equal(f.render().answers["core-a"].text, "Changed core A");
    route.resolve({ revision: 6 });
    const selected = await work;
    assert.equal(selected.responses[0].answer.text, "Changed core A");
    f.render(); // The old core component must not overwrite its selected snapshot.
    assert.equal(m.readOfflineExams(f.storage, "owner-a")[0].routing.state, "selected");
    assert.equal(m.readOfflineExams(f.storage, "owner-b").length, 0);
    f.online = false;
    hook = f.remount(selected, true);
    assert.equal(hook.index, 2);
    assert.equal(hook.routePending, false);
    hook.edit("server-branch", { inputMethod: "typed", text: "Offline selected answer" });
    f.render(true);
    const cached = m.readOfflineExams(f.storage, "owner-a")[0];
    hook = f.remount(cached, true);
    assert.equal(hook.answers["server-branch"].text, "Offline selected answer");
    assert.equal(hook.pendingCount, 1);
    assert.equal(f.calls.length, 3);
  }));

test("actual hook preserves the same route retry through lost replies, remount and online event without automatic routing", async () =>
  fixture(async (f) => {
    f.request = async () => {
      throw new TypeError("Synthetic disconnect");
    };
    await assert.rejects(f.render().continueRouting());
    const receipt = m.readExamDraft(f.storage, f.key).routeFlight;
    assert.ok(receipt.requestId);
    let hook = f.remount(attempt(), true);
    assert.equal(hook.routePending, true);
    f.emit("online");
    await tick();
    assert.equal(f.calls.filter((c) => c.body.action === "route").length, 1);
    f.request = async (body) => (typeof body === "string" ? attempt(true) : { revision: 6 });
    await hook.continueRouting();
    assert.deepEqual(
      f.calls
        .filter((c) => c.body.action === "route")
        .map((c) => ({ revision: c.body.revision, requestId: c.body.requestId })),
      [receipt, receipt],
    );
    hook = f.remount(attempt(true));
    assert.equal(hook.index, 2);
    assert.equal(m.readExamDraft(f.storage, f.key).routeFlight, undefined);
    assert.equal(m.hasUnsyncedExamDrafts(f.storage, "owner-a"), false);
  }));

test("actual hook retains an expired-session retry for the same owner and recovers after reauthentication", async () =>
  fixture(async (f) => {
    f.request = async () => {
      throw new m.ExamRequestError("Synthetic expired session", 403);
    };
    await assert.rejects(f.render().continueRouting(), { status: 403 });
    const receipt = m.readExamDraft(f.storage, f.key).routeFlight;
    assert.ok(receipt);
    f.request = async (body) => (typeof body === "string" ? attempt(true) : { revision: 6 });
    await f.remount(attempt(), true).continueRouting();
    assert.equal(
      f.calls.filter((c) => c.body.action === "route")[1].body.requestId,
      receipt.requestId,
    );
  }));

test("actual hook aborts on unmount/account change and never fetches or adopts late selected data", async () =>
  fixture(async (f) => {
    const route = deferred();
    f.request = () => route.promise;
    const work = f.render().continueRouting();
    await tick();
    const signal = f.calls[0].signal;
    m.controls.actor = "owner-b";
    m.controls.unmount();
    assert.equal(signal.aborted, true);
    route.resolve({ revision: 6 });
    await assert.rejects(work, /session changed/);
    assert.equal(f.calls.length, 1);
    assert.equal(m.readOfflineExams(f.storage, "owner-b").length, 0);
    assert.equal(m.readOfflineExams(f.storage, "owner-a")[0].routing.state, "core");
    assert.ok(m.readExamDraft(f.storage, f.key).routeFlight);
  }));

test("actual hook rejects a late read after unmount without replacing the owned recovery copy", async () =>
  fixture(async (f) => {
    const read = deferred();
    f.request = (body) => (typeof body === "string" ? read.promise : { revision: 6 });
    const work = f.render().continueRouting();
    await tick();
    assert.equal(f.calls.length, 2);
    m.controls.unmount();
    read.resolve(attempt(true));
    await assert.rejects(work, /session changed/);
    assert.equal(m.readOfflineExams(f.storage, "owner-a")[0].routing.state, "core");
  }));

test("actual hook keeps concurrent-save conflicts explicit and reloads the chosen server copy", async () =>
  fixture(async (f) => {
    const latest = { ...attempt(), revision: 9 };
    f.request = async (body) => {
      if (typeof body === "string") return latest;
      throw new m.ExamRequestError("Synthetic revision conflict", 409);
    };
    await assert.rejects(f.render().continueRouting(), { status: 409 });
    let hook = f.render();
    assert.equal(hook.status, "conflict");
    assert.equal(hook.revision(), 4);
    assert.equal(hook.routePending, false);
    assert.equal(hook.conflict.revision, 9);
    await hook.resolve(false);
    hook = f.render();
    assert.equal(hook.status, "synced");
    assert.equal(hook.revision(), 9);
  }));

test("actual hook does not route until an uncertain save is replayed with its original identity", async () =>
  fixture(async (f) => {
    let hook = f.render();
    hook.edit("core-a", { inputMethod: "typed", text: "Queued answer" });
    hook = f.render();
    f.request = async () => {
      throw new TypeError("Synthetic save reply lost");
    };
    await assert.rejects(hook.continueRouting(), /Sync your core/);
    assert.equal(f.calls.length, 1);
    assert.equal(f.calls[0].body.action, "save");
    const firstSave = f.calls[0].body;
    f.request = async (body) =>
      typeof body === "string"
        ? attempt(true)
        : body.action === "save"
          ? { revision: 5, syncedAt: "later" }
          : { revision: 6 };
    await f.render().continueRouting();
    assert.deepEqual(f.calls[1].body, firstSave);
    assert.equal(f.calls[2].body.action, "route");
    assert.equal(f.calls[2].body.revision, 5);
  }));

test("actual hook keeps quota-failed continuation in memory and warns before losing uncertain work", async () =>
  fixture(async (f) => {
    f.blocked = true;
    f.request = async () => {
      throw new TypeError("Synthetic disconnected request");
    };
    await assert.rejects(f.render().continueRouting());
    assert.equal(f.values.size, 0);
    assert.ok(m.readExamDraft(f.storage, f.key).routeFlight);
    assert.equal(m.hasUnsyncedExamDrafts(f.storage, "owner-a"), true);
    assert.equal(f.listeners.get("beforeunload")?.size, 1);
    m.clearExamDraftsForUser(f.storage, "owner-a");
    assert.equal(m.readExamDraft(f.storage, f.key), null);
    assert.equal(m.hasUnsyncedExamDrafts(f.storage, "owner-a"), false);
    assert.equal(f.listeners.get("beforeunload")?.size, 0);
  }));

test("actual hook cannot route or acknowledge a late save after the active owner changes", async () =>
  fixture(async (f) => {
    let hook = f.render();
    hook.edit("core-a", { inputMethod: "typed", text: "Owner A pending answer" });
    hook = f.render();
    const save = deferred();
    f.request = () => save.promise;
    const work = hook.continueRouting();
    await tick();
    m.controls.actor = "owner-b";
    m.controls.unmount();
    save.resolve({ revision: 5, syncedAt: "later" });
    await assert.rejects(work, /Sync your core/);
    assert.equal(f.calls.length, 1);
    assert.equal(f.calls[0].body.action, "save");
    const kept = m.readExamDraft(f.storage, f.key);
    assert.ok(kept.flight);
    assert.equal(kept.revision, 4);
    assert.equal(kept.pending["core-a"].answer.text, "Owner A pending answer");
    assert.equal(m.readOfflineExams(f.storage, "owner-b").length, 0);
  }));

test("actual hook's bounded continuation abort retains the original retry and locked core", async () =>
  fixture(async (f) => {
    const originalTimeout = globalThis.setTimeout;
    let deadline;
    globalThis.setTimeout = (fn, ms, ...args) => {
      if (ms === 30000) {
        deadline = fn;
        return Object.create(null);
      }
      return originalTimeout(fn, ms, ...args);
    };
    try {
      f.request = (_body, signal) =>
        new Promise((_resolve, reject) => {
          const fail = () => reject(new DOMException("Synthetic deadline", "AbortError"));
          if (signal.aborted) fail();
          else signal.addEventListener("abort", fail, { once: true });
        });
      const work = f.render().continueRouting();
      await tick();
      assert.equal(typeof deadline, "function");
      const receipt = m.readExamDraft(f.storage, f.key).routeFlight;
      deadline();
      await assert.rejects(work, { name: "AbortError" });
      assert.equal(f.calls[0].signal.aborted, true);
      assert.deepEqual(m.readExamDraft(f.storage, f.key).routeFlight, receipt);
      assert.equal(f.render().routePending, true);
      assert.equal(m.hasUnsyncedExamDrafts(f.storage, "owner-a"), true);
    } finally {
      globalThis.setTimeout = originalTimeout;
    }
  }));
