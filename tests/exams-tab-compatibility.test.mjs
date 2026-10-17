import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
const directory = resolve("node_modules/.cache/lle-tests");
mkdirSync(directory, { recursive: true });
const outfile = resolve(directory, "exams-tab-compatibility.mjs");
await build({
  stdin: {
    contents: `export {ExamsTab} from ${JSON.stringify(resolve("src/components/exams/ExamsTab.tsx"))}; export {controls} from 'test-controls';`,
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
      name: "component-context-fixture",
      setup(b) {
        b.onResolve({ filter: /^(react|@\/state\/(app-state|auth-state)|test-controls)$/ }, () => ({
          path: "controls",
          namespace: "fixture",
        }));
        b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          contents: `export const controls={app:null,auth:null,effects:[]};export const useApp=()=>controls.app;export const useAuth=()=>controls.auth;export const useEffect=(effect)=>controls.effects.push(effect);`,
        }));
      },
    },
  ],
});
const { ExamsTab, controls } = await import(outfile);
function fixture(search = "") {
  const saved = {
    window: Object.getOwnPropertyDescriptor(globalThis, "window"),
    requestAnimationFrame: Object.getOwnPropertyDescriptor(globalThis, "requestAnimationFrame"),
    cancelAnimationFrame: Object.getOwnPropertyDescriptor(globalThis, "cancelAnimationFrame"),
  };
  const frames = new Map(),
    redirects = [];
  let id = 0;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: { search, replace: (destination) => redirects.push(destination) } },
  });
  Object.defineProperty(globalThis, "requestAnimationFrame", {
    configurable: true,
    value: (callback) => {
      frames.set(++id, callback);
      return id;
    },
  });
  Object.defineProperty(globalThis, "cancelAnimationFrame", {
    configurable: true,
    value: (key) => frames.delete(key),
  });
  controls.app = {
    state: {
      hydrated: true,
      activeModuleId: "landscaper",
      selectedLanguage: "Spanish",
      nativeLanguage: "English",
    },
    profileReadyUserId: "qa-a",
  };
  controls.auth = { user: { id: "qa-a" }, loading: false };
  controls.effects = [];
  return {
    redirects,
    frames,
    runEffect: () => {
      ExamsTab();
      return controls.effects.at(-1)();
    },
    flush: () => {
      for (const [key, callback] of [...frames]) {
        frames.delete(key);
        callback();
      }
    },
    restore: () => {
      for (const [key, descriptor] of Object.entries(saved)) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    },
  };
}
test("saved Exams tab waits for local, auth and current profile restoration", () => {
  const f = fixture();
  try {
    controls.app.state.hydrated = false;
    f.runEffect();
    assert.equal(f.frames.size, 0);
    controls.app.state.hydrated = true;
    controls.auth.loading = true;
    f.runEffect();
    assert.equal(f.frames.size, 0);
    controls.auth.loading = false;
    controls.app.profileReadyUserId = "old-account";
    f.runEffect();
    assert.equal(f.frames.size, 0);
    controls.app.profileReadyUserId = "qa-a";
    f.runEffect();
    f.flush();
    assert.deepEqual(f.redirects, ["/exams?target=Spanish&native=English&module=landscaper"]);
  } finally {
    f.restore();
  }
});
test("an explicit incoming Reader or lesson link takes priority over a cached Exams tab", () => {
  for (const tab of ["reader", "core30"]) {
    const f = fixture("?tab=" + tab + "&module=roofing");
    try {
      f.runEffect();
      f.flush();
      assert.deepEqual(f.redirects, []);
    } finally {
      f.restore();
    }
  }
});
test("cleanup cancels a stale context before the navigation bridge settles", () => {
  const f = fixture("?tab=exams");
  try {
    const cleanup = f.runEffect();
    assert.equal(f.frames.size, 1);
    cleanup();
    assert.equal(f.frames.size, 0);
    controls.app.state.activeModuleId = "roofing";
    controls.app.state.selectedLanguage = "English";
    controls.app.state.nativeLanguage = "Spanish";
    f.runEffect();
    f.flush();
    assert.deepEqual(f.redirects, ["/exams?target=English&native=Spanish&module=roofing"]);
  } finally {
    f.restore();
  }
});
