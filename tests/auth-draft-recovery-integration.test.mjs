import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
const dir = resolve("node_modules/.cache/lle-tests");
mkdirSync(dir, { recursive: true });
const outfile = resolve(dir, "auth-draft-recovery.mjs");
await build({
  stdin: {
    contents: `export {AuthProvider} from ${JSON.stringify(resolve("src/state/auth-state.tsx"))};export * from ${JSON.stringify(resolve("src/lib/assessments/drafts.ts"))};export * from ${JSON.stringify(resolve("src/lib/lesson-drafts.ts"))};export * from ${JSON.stringify(resolve("src/lib/assessments/speech-device.ts"))};export {controls} from 'test-controls';`,
    resolveDir: process.cwd(),
  },
  outfile,
  bundle: true,
  format: "esm",
  platform: "node",
  external: ["react/jsx-runtime"],
  logLevel: "silent",
  plugins: [
    {
      name: "auth-sdk-fixture",
      setup(b) {
        b.onResolve(
          { filter: /^(react|sonner|test-controls|@\/integrations\/supabase\/client)$/ },
          () => ({ path: "fixture", namespace: "fixture" }),
        );
        b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          contents: `
    export const controls={};let slots=[],index=0,pending=[];
    controls.reset=()=>{slots=[];index=0;pending=[];controls.warnings=[];controls.dismissed=[];controls.errors=[];controls.signouts=[];controls.signoutError=null;controls.initial=new Promise((r,j)=>{controls.resolveInitial=r;controls.rejectInitial=j;});};
    controls.begin=()=>{index=0;pending=[];};controls.commit=()=>{for(const fn of pending)fn();pending=[];};controls.unmount=()=>{for(const s of slots)s?.cleanup?.();};
    export const Fragment='fixture-fragment',createContext=()=>({Provider:'fixture-provider'}),useContext=()=>null;
    export const useState=initial=>{const i=index++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];};
    export const useRef=initial=>{const i=index++;if(!(i in slots))slots[i]={current:initial};return slots[i];};
    export const useEffect=(fn,deps)=>{const i=index++,old=slots[i];if(!old||!deps||deps.some((v,j)=>v!==old.deps?.[j]))pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});};
    export const useMemo=(fn,deps)=>{const i=index++,old=slots[i];if(!old||deps.some((v,j)=>v!==old.deps?.[j]))slots[i]={deps,value:fn()};return slots[i].value;};export const useCallback=(fn,deps)=>useMemo(()=>fn,deps);
    export const toast={warning:(text,options)=>controls.warnings.push({text,options}),dismiss:id=>controls.dismissed.push(id),error:text=>controls.errors.push(text)};
    export const supabase={auth:{onAuthStateChange:fn=>{controls.emit=fn;return {data:{subscription:{unsubscribe(){controls.unsubscribed=true;}}}};},getSession:()=>controls.initial,signOut:async options=>{controls.signouts.push(options);if(!controls.signoutError&&options.scope!=='others')controls.emit('SIGNED_OUT',null);return {error:controls.signoutError};}}};
  `,
        }));
      },
    },
  ],
});
const m = await import(outfile),
  { controls } = m;
const session = (id) => ({
  user: { id, email: id + "@example.invalid" },
  access_token: "synthetic-fixture",
});
const example = {
  formId: "qa",
  revision: 2,
  index: 4,
  sequence: 1,
  pending: { item: { answer: { inputMethod: "typed", text: "QA retained answer" }, edit: 1 } },
  flight: null,
  savedAt: "now",
};
async function fixture(run) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window"),
    values = new Map(),
    listeners = new Map();
  const storage = {
    get length() {
      return values.size;
    },
    key: (i) => [...values.keys()][i] ?? null,
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
    removeItem: (k) => values.delete(k),
  };
  const location = {
    href: "https://qa.invalid/exams?module=roofing",
    origin: "https://qa.invalid",
    pathname: "/exams",
    search: "?module=roofing",
    replace() {
      assert.fail("Unexpected navigation");
    },
  };
  controls.reset();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location,
      localStorage: storage,
      confirm: () => controls.confirm !== false,
      addEventListener: (type, fn) => {
        const set = listeners.get(type) || new Set();
        set.add(fn);
        listeners.set(type, set);
      },
      removeEventListener: (type, fn) => listeners.get(type)?.delete(fn),
    },
  });
  const render = () => {
    controls.begin();
    const tree = m.AuthProvider({ children: null });
    controls.childIdentityKey = tree.props.children.key;
    controls.commit();
    return tree.props.value;
  };
  try {
    render();
    await run({
      storage,
      values,
      render,
      emit: (id, event = "SIGNED_IN") => {
        controls.emit(event, id ? session(id) : null);
        return render();
      },
      storageEvent: (event) => {
        for (const fn of [...(listeners.get("storage") || [])]) fn(event);
      },
    });
  } finally {
    controls.unmount();
    for (const actor of ["qa-a", "qa-b"]) m.clearExamDraftsForUser(storage, actor);
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else delete globalThis.window;
  }
}
test("unexpected sign-in loss preserves owned answers and lesson work, stops recordings and denies other accounts", () =>
  fixture(async (f) => {
    const before = f.emit("qa-a");
    m.saveExamDraft(f.storage, m.examDraftKey("qa-a", "attempt"), example);
    m.saveLessonDraft(f.storage, m.lessonDraftKey("qa-a", "roofing-1", "write"), {
      version: "qa",
      text: "QA lesson response",
      ink: null,
      transcript: "",
      checks: [],
      savedAt: "now",
    });
    let cancelled = 0;
    m.registerSpeechCapture("qa-a", "attempt", "item", () => cancelled++);
    m.saveSpeechTake("qa-a", "attempt", "item", {
      blob: new Blob(["QA"]),
      mime: "audio/webm",
      durationMs: 1000,
      policyVersion: "qa",
    });
    const out = f.emit(null, "SIGNED_OUT");
    assert.equal(out.user, null);
    assert.equal(before.isCurrentUser("qa-a"), false);
    assert.equal(
      m.readExamDraft(f.storage, m.examDraftKey("qa-a", "attempt")).pending.item.answer.text,
      "QA retained answer",
    );
    assert.equal(
      m.readLessonDraft(f.storage, m.lessonDraftKey("qa-a", "roofing-1", "write")).text,
      "QA lesson response",
    );
    assert.equal(cancelled, 1);
    assert.equal(m.unsavedSpeechCount("qa-a"), 0);
    assert.match(controls.warnings[0].text, /remain under the previous account/);
    const other = f.emit("qa-b");
    assert.equal(other.isCurrentUser("qa-a"), false);
    assert.equal(m.readExamDraft(f.storage, m.examDraftKey("qa-b", "attempt")), null);
    const again = f.emit("qa-a");
    assert.equal(again.isCurrentUser("qa-a"), true);
    assert.equal(before.isCurrentUser("qa-a"), false);
    assert.ok(m.readExamDraft(f.storage, m.examDraftKey("qa-a", "attempt")));
  }));
test("a late initial-session read or failure cannot restore or sign out a newer identity", () =>
  fixture(async (f) => {
    f.emit("qa-a");
    const current = f.emit("qa-b");
    controls.resolveInitial({ data: { session: session("qa-a") } });
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(f.render().user.id, "qa-b");
    assert.equal(current.isCurrentUser("qa-b"), true);
    assert.equal(controls.signouts.length, 0);
  }));
test("a late invalid-refresh initialization failure cannot sign out the newly signed-in account", () =>
  fixture(async (f) => {
    f.emit("qa-a");
    controls.rejectInitial({ code: "refresh_token_not_found", status: 400 });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(f.render().user.id, "qa-a");
    assert.equal(controls.signouts.length, 0);
  }));
test("lesson-only loss warnings can cancel explicit sign-out; approved success clears only that account", () =>
  fixture(async (f) => {
    const current = f.emit("qa-a");
    const key = m.lessonDraftKey("qa-a", "lesson", "write");
    m.saveLessonDraft(f.storage, key, {
      version: "qa",
      text: "QA lesson",
      ink: null,
      transcript: "",
      checks: [],
      savedAt: "now",
    });
    m.saveExamDraft(f.storage, m.examDraftKey("qa-b", "attempt"), example);
    controls.confirm = false;
    assert.equal(await current.signOut(), false);
    assert.equal(controls.signouts.length, 0);
    assert.ok(m.readLessonDraft(f.storage, key));
    assert.equal(current.isCurrentUser("qa-a"), true);
    controls.confirm = true;
    assert.equal(await current.signOut(), true);
    assert.equal(m.readLessonDraft(f.storage, key), null);
    assert.equal(current.isCurrentUser("qa-a"), false);
    assert.ok(m.readExamDraft(f.storage, m.examDraftKey("qa-b", "attempt")));
    assert.ok([...f.values.keys()].some((key) => key.startsWith("lt.privateDraftDiscard.v1.")));
  }));
test("another tab’s explicit discard clears the memory fallback and invalidates current async work", () =>
  fixture(async (f) => {
    const old = f.emit("qa-a");
    const key = m.examDraftKey("qa-a", "attempt");
    m.saveExamDraft(f.storage, key, example);
    f.values.delete(key);
    assert.ok(
      m.readExamDraft(null, key),
      "stale in-memory fallback exists before cross-tab cleanup",
    );
    f.storageEvent({ key: "lt.privateDraftDiscard.v1.qa-a", newValue: "explicit-discard-notice" });
    assert.equal(f.render().user, null);
    assert.equal(old.isCurrentUser("qa-a"), false);
    assert.equal(m.readExamDraft(null, key), null);
    assert.equal(f.emit("qa-a").isCurrentUser("qa-a"), true);
    assert.equal(old.isCurrentUser("qa-a"), false);
  }));
test("routine token refresh retains the current identity lease", () =>
  fixture(async (f) => {
    const current = f.emit("qa-a"), key = controls.childIdentityKey;
    f.emit("qa-a", "TOKEN_REFRESHED");
    assert.equal(controls.childIdentityKey, key);
    assert.equal(current.isCurrentUser("qa-a"), true);
  }));

test("a failing capture cleanup cannot block identity loss or cancellation of other captures", () =>
  fixture(async (f) => {
    f.emit("qa-a");
    let cancelled = 0;
    m.registerSpeechCapture("qa-a", "attempt", "bad", () => {
      throw Error("QA device cleanup failure");
    });
    m.registerSpeechCapture("qa-a", "attempt", "good", () => {
      cancelled++;
    });
    const out = f.emit(null, "SIGNED_OUT");
    assert.equal(out.user, null);
    assert.equal(cancelled, 1);
    assert.equal(m.unsavedSpeechCount("qa-a"), 0);
  }));

test("batched sign-out and same-account sign-in remount the protected subtree and reject old callbacks", () =>
  fixture(async (f) => {
    const old = f.emit("qa-a"),
      oldKey = controls.childIdentityKey;
    controls.emit("SIGNED_OUT", null);
    controls.emit("SIGNED_IN", session("qa-a"));
    const current = f.render();
    assert.equal(current.user.id, "qa-a");
    assert.notEqual(controls.childIdentityKey, oldKey);
    assert.equal(old.isCurrentUser("qa-a"), false);
    assert.equal(current.isCurrentUser("qa-a"), true);
  }));

test("SDK sign-out failure keeps the draft, identity lease and protected subtree intact", () =>
  fixture(async (f) => {
    const current = f.emit("qa-a"),
      before = controls.childIdentityKey;
    const key = m.examDraftKey("qa-a", "attempt");
    m.saveExamDraft(f.storage, key, example);
    controls.signoutError = Error("QA network failure");
    assert.equal(await current.signOut(), false);
    assert.equal(f.render().user.id, "qa-a");
    assert.equal(controls.childIdentityKey, before);
    assert.equal(current.isCurrentUser("qa-a"), true);
    assert.ok(m.readExamDraft(f.storage, key));
    assert.equal(
      [...f.values.keys()].some((key) => key.startsWith("lt.privateDraftDiscard.v1.")),
      false,
    );
  }));
