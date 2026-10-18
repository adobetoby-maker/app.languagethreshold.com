import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createLibraryDevice } from "../src/lib/library-device.ts";
const directory = resolve("node_modules/.cache/lle-tests");
mkdirSync(directory, { recursive: true });
const outfile = resolve(directory, "culture-reading.mjs");
await build({
  stdin: {
    contents: `export {useCultureGenerator} from ${JSON.stringify(resolve("src/components/library/useCultureGenerator.ts"))}; export {controls} from 'test-controls';`,
    resolveDir: process.cwd(),
  },
  outfile,
  bundle: true,
  format: "esm",
  platform: "node",
  logLevel: "silent",
  plugins: [
    {
      name: "culture-boundaries",
      setup(b) {
        b.onResolve(
          {
            filter:
              /^(react|@tanstack\/react-start|@\/fns\/library.functions|@\/state\/(library|app)-state|test-controls)$/,
          },
          () => ({ path: "controls", namespace: "fixture" }),
        );
        b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          contents: `
      export const controls={};
      let slots=[],index=0,cleanups=[];
      controls.reset=()=>{slots=[];index=0;cleanups=[];controls.calls=[];controls.saves=[];controls.selections=[];controls.app={selectedLanguage:'Spanish',nativeLanguage:'English'};controls.library={entries:[]};controls.ready=true;controls.failure=null;controls.generate=async(input)=>{controls.calls.push(input);return controls.response;};controls.add=async(entry)=>{if(controls.failure)throw Error(controls.failure);controls.saves.push(entry);};};
      controls.begin=()=>{index=0;};
      controls.unmount=()=>{for(const cleanup of cleanups)cleanup?.();cleanups=[];};
      export const useState=(initial)=>{const i=index++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];};
      export const useRef=(initial)=>{const i=index++;if(!(i in slots))slots[i]={current:initial};return slots[i];};
      export const useEffect=(effect)=>{const i=index++;if(!(i in slots)){slots[i]=true;cleanups.push(effect());}};
      export const useServerFn=()=>controls.generate;
      export const generateCultureEssay=()=>{};
      export const useApp=()=>({state:controls.app});
      export const useLibrary=()=>({state:controls.library,dispatch:action=>controls.selections.push(action),addCustomEntry:entry=>controls.add(entry),readyToSelect:controls.ready});
      export const flagFor=()=>'fixture-flag';
    `,
        }));
      },
    },
  ],
});
const { useCultureGenerator, controls } = await import(outfile);
const response = () => ({
  data: {
    countryName: "Spain",
    targetLanguageText: ["Una plaza.", "Un mercado."],
    englishText: ["A square.", "A market."],
  },
  error: null,
});
function fixture() {
  controls.reset();
  controls.response = response();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { onLine: true } });
  const render = () => {
    controls.begin();
    return useCultureGenerator();
  };
  return {
    render,
    close() {
      controls.unmount();
      if (previous) Object.defineProperty(globalThis, "navigator", previous);
      else delete globalThis.navigator;
    },
  };
}
function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

test("mounting the production culture hook makes no generation or save request", () => {
  const f = fixture();
  try {
    f.render();
    f.render();
    assert.deepEqual(controls.calls, []);
    assert.deepEqual(controls.saves, []);
  } finally {
    f.close();
  }
});
test("an explicit choice requests one country in the current pair and saves aligned text", async () => {
  const f = fixture();
  try {
    assert.equal(await f.render().generateCountry("Mexico"), true);
    assert.deepEqual(controls.calls, [
      { data: { country: "Mexico", targetLanguage: "Spanish", nativeLanguage: "English" } },
    ]);
    assert.equal(controls.saves.length, 1);
    assert.equal(controls.saves[0].title, "Culture: Mexico");
    assert.equal(controls.saves[0].subtitle, "AI culture reading · Mexico · English → Spanish");
    assert.deepEqual(controls.saves[0].sentences, [
      { target: "Una plaza.", en: "A square." },
      { target: "Un mercado.", en: "A market." },
    ]);
  } finally {
    f.close();
  }
});
test("saved current-pair readings reopen offline without another request; other pairs are not reused", async () => {
  const f = fixture();
  try {
    controls.library.entries = [
      {
        id: "owned-copy",
        section: "custom",
        available: true,
        language: "Spanish",
        subtitle: "AI culture reading · Spain · English → Spanish",
      },
    ];
    navigator.onLine = false;
    assert.equal(await f.render().generateCountry("Spain"), true);
    assert.equal(controls.calls.length, 0);
    assert.deepEqual(controls.selections, [{ type: "SELECT", payload: "owned-copy" }]);
    controls.app = { selectedLanguage: "Spanish", nativeLanguage: "French" };
    assert.equal(await f.render().generateCountry("Spain"), false);
    assert.equal(controls.selections.length, 1);
    assert.match(f.render().error, /Connect/);
  } finally {
    f.close();
  }
});
test("incomplete, empty or malformed language alignment is rejected without saving", async () => {
  for (const data of [
    { targetLanguageText: ["one", "two"], englishText: ["one"] },
    { targetLanguageText: [], englishText: [] },
    { targetLanguageText: [" "], englishText: ["text"] },
    { targetLanguageText: "encoded array", englishText: ["text"] },
  ]) {
    const f = fixture();
    try {
      controls.response = { data, error: null };
      assert.equal(await f.render().generateCountry("Spain"), false);
      assert.equal(controls.saves.length, 0);
      assert.match(f.render().error, /incomplete/);
    } finally {
      f.close();
    }
  }
});
test("double clicks send one request and late results after unmount never save", async () => {
  const f = fixture();
  try {
    const gate = deferred();
    controls.generate = async (input) => {
      controls.calls.push(input);
      return gate.promise;
    };
    const hook = f.render(),
      first = hook.generateCountry("Spain");
    assert.equal(await hook.generateCountry("Spain"), false);
    assert.equal(controls.calls.length, 1);
    controls.unmount();
    gate.resolve(response());
    assert.equal(await first, false);
    assert.equal(controls.saves.length, 0);
  } finally {
    f.close();
  }
});
test("a late result from a previous language pair cannot save to the next context", async () => {
  const f = fixture();
  try {
    const gate = deferred();
    controls.generate = () => gate.promise;
    const first = f.render().generateCountry("Spain");
    controls.app = { selectedLanguage: "French", nativeLanguage: "English" };
    f.render();
    gate.resolve(response());
    assert.equal(await first, false);
    assert.equal(controls.saves.length, 0);
  } finally {
    f.close();
  }
});
test("failed device saving retains the generated copy and retry does not charge another generation", async () => {
  const f = fixture();
  try {
    controls.failure = "Browser storage is full";
    assert.equal(await f.render().generateCountry("Spain"), false);
    assert.equal(f.render().needsSave, true);
    assert.match(f.render().error, /storage is full/);
    controls.failure = null;
    navigator.onLine = false;
    assert.equal(await f.render().generateCountry("Spain"), true);
    assert.equal(controls.calls.length, 1);
    assert.equal(controls.saves.length, 1);
    assert.equal(f.render().needsSave, false);
  } finally {
    f.close();
  }
});
test("generated text uses the real durable Reader cache and remains isolated by actor after reopening", async () => {
  const f = fixture();
  try {
    const records = new Map(),
      storage = {
        getItem: (key) => records.get(key) ?? null,
        setItem: (key, value) => records.set(key, value),
        removeItem: (key) => records.delete(key),
      };
    const create = (actor) =>
      createLibraryDevice({ actor, storage, remote: null, isCurrent: () => true });
    const device = create("qa-a");
    controls.add = async (entry) =>
      device.add({ ...entry, id: "10000000-0000-4000-8000-000000000001", section: "custom" });
    assert.equal(await f.render().generateCountry("Spain"), true);
    const restored = create("qa-a").getSnapshot();
    assert.equal(restored.books.length, 1);
    assert.equal(restored.pending.length, 1);
    assert.equal(restored.books[0].sentences[0].target, "Una plaza.");
    assert.equal(create("qa-b").getSnapshot().books.length, 0);
    assert.equal(create(null).getSnapshot().books.length, 0);
    controls.library.entries = restored.books;
    navigator.onLine = false;
    assert.equal(await f.render().generateCountry("Spain"), true);
    assert.equal(controls.calls.length, 1);
  } finally {
    f.close();
  }
});
