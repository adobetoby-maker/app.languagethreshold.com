import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { profileSnapshotKey } from "../src/lib/profile-device-snapshot.ts";
mkdirSync(resolve("node_modules/.cache/lle-tests"), { recursive: true });
const dir = mkdtempSync(resolve("node_modules/.cache/lle-tests/profile-preserve-"));
const file = resolve(dir, "provider.mjs"),
  control = {};
globalThis.__profilePreserve = control;
await build({
  entryPoints: ["src/state/app-state.tsx"],
  outfile: file,
  bundle: true,
  format: "esm",
  platform: "node",
  external: ["react/jsx-runtime"],
  logLevel: "silent",
  plugins: [
    {
      name: "profile-lifecycle",
      setup(b) {
        b.onResolve({ filter: /^(react|sonner)$|auth-state$|supabase\/client$/ }, () => ({
          path: "fixture",
          namespace: "fixture",
        }));
        b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          contents: `
    const c=globalThis.__profilePreserve;export const createContext=()=>({Provider:'provider'}),useContext=()=>null;
    export const useAuth=()=>({user:c.actor?{id:c.actor}:null,loading:false,isCurrentUser:id=>id===c.actor,canUseReader:id=>id===c.actor});
    export function useState(init){const i=c.index++;if(!(i in c.slots))c.slots[i]=typeof init==='function'?init():init;return[c.slots[i],v=>{c.slots[i]=typeof v==='function'?v(c.slots[i]):v;}];}
    export function useReducer(fn,init){const i=c.index++;if(!(i in c.slots))c.slots[i]=init;return[c.slots[i],action=>{c.slots[i]=fn(c.slots[i],action);}];}
    export function useRef(init){const i=c.index++;if(!(i in c.slots))c.slots[i]={current:init};return c.slots[i];}
    export function useMemo(fn,deps){const i=c.index++,old=c.slots[i];if(!old||deps.some((v,j)=>v!==old.deps[j]))c.slots[i]={deps,value:fn()};return c.slots[i].value;}
    export const useCallback=(fn,deps)=>useMemo(()=>fn,deps);
    export function useEffect(fn,deps){const i=c.index++,old=c.slots[i];if(!old||deps.some((v,j)=>v!==old.deps[j]))c.effects.push(()=>{old?.cleanup?.();c.slots[i]={deps,cleanup:fn()};});}
    export const toast=Object.assign((message,options)=>c.notices.push({message,options}),{error(){},success(){}});
    export const supabase={auth:{onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}};}},from(){throw Error('Unexpected network access in startup-only fixture');}};
  `,
        }));
      },
    },
  ],
});
const { AppProvider } = await import(file);
rmSync(dir, { recursive: true, force: true });
delete globalThis.__profilePreserve;
function fixture({ actor = "a", raw, blocked = false }, run) {
  const saved = Object.getOwnPropertyDescriptor(globalThis, "window"),
    entries = new Map(),
    writes = [];
  if (raw !== undefined) entries.set(profileSnapshotKey(actor), raw);
  const storage = {
    getItem: (k) => entries.get(k) ?? null,
    setItem: (k, v) => {
      writes.push(k);
      entries.set(k, v);
    },
  };
  const window = { addEventListener() {}, removeEventListener() {}, dispatchEvent() {} };
  Object.defineProperty(window, "localStorage", {
    get() {
      if (blocked) throw Error("Browser denied storage");
      return storage;
    },
  });
  Object.defineProperty(globalThis, "window", { configurable: true, value: window });
  Object.assign(control, { actor, index: 0, slots: [], effects: [], notices: [] });
  const root = AppProvider({ children: null });
  function frame() {
    control.index = 0;
    const tree = root.type(root.props);
    for (const fn of control.effects.splice(0)) fn();
    return tree.props.value.state;
  }
  try {
    return run({ frame, entries, writes });
  } finally {
    for (const s of control.slots) s?.cleanup?.();
    if (saved) Object.defineProperty(globalThis, "window", saved);
    else delete globalThis.window;
  }
}
test("actual AppProvider startup and repeated autosave preserve rejected bytes and warn without exposing another learner", () => {
  for (const raw of [
    "broken",
    JSON.stringify({ schema: 1, userId: "b", data: { userNotes: ["other learner private data"] } }),
  ])
    fixture({ raw }, ({ frame, entries, writes }) => {
      frame();
      frame();
      const state = frame();
      assert.equal(state.hydrated, true);
      assert.equal(entries.get(profileSnapshotKey("a")), raw);
      assert.equal(writes.includes(profileSnapshotKey("a")), false);
      assert.equal(
        control.notices.filter((n) => n.options?.id === "profile-device-unreadable").length,
        1,
      );
      assert.match(control.notices[0].options.description, /remain untouched/);
      assert.doesNotMatch(JSON.stringify(control.notices), /other learner private data/);
    });
});
test("actual AppProvider survives a denied localStorage getter and warns rather than treating it as empty", () =>
  fixture({ blocked: true }, ({ frame, writes }) => {
    assert.doesNotThrow(() => {
      frame();
      frame();
      frame();
    });
    assert.equal(writes.length, 0);
    assert.ok(control.notices.some((n) => n.options?.id === "profile-device-unreadable"));
  }));
test("actual guest provider still restores and persists a valid owned envelope", () => {
  const raw = JSON.stringify({ schema: 1, userId: null, data: { __v: 5, xp: 94, userNotes: [] } });
  fixture({ actor: null, raw }, ({ frame, entries, writes }) => {
    frame();
    frame();
    const state = frame();
    assert.equal(state.xp, 94);
    assert.equal(JSON.parse(entries.get(profileSnapshotKey(null))).data.xp, 94);
    assert.ok(writes.includes(profileSnapshotKey(null)));
    assert.equal(
      control.notices.some((n) => n.options?.id === "profile-device-unreadable"),
      false,
    );
  });
});
