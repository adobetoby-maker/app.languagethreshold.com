import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { createLearnerDeviceStore } from "../src/lib/learner-device-store.ts";

test("actual hook hides previous text/actor, ignores delayed jobs, reuses owned cache and skips disabled fetches", async () => {
  const root = mkdtempSync(resolve("node_modules/.cache/reading-hint-hook-"));
  try {
    const outfile = join(root, "hook.mjs");
    await build({
      entryPoints: [resolve("src/hooks/use-reading-hints.ts")],
      outfile,
      bundle: true,
      platform: "node",
      format: "esm",
      logLevel: "silent",
      plugins: [
        {
          name: "hook-lifecycle",
          setup(b) {
            b.onResolve({ filter: /^(react|\.\/use-learner-device-store)$/ }, () => ({
              path: "hooks",
              namespace: "fixture",
            }));
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `
        export const controls={store:null,slots:[],cursor:0,pending:[],render(fn){this.cursor=0;return fn();},flush(){for(const fn of this.pending.splice(0))fn();}};
        export const useLearnerDeviceStore=()=>controls.store;
        export function useState(initial){const i=controls.cursor++;if(!(i in controls.slots))controls.slots[i]=initial;return [controls.slots[i],value=>{controls.slots[i]=value;}];}
        export function useEffect(fn,deps){const i=controls.cursor++,previous=controls.slots[i];if(!previous||deps.some((v,n)=>v!==previous.deps[n])){controls.pending.push(()=>{previous?.cleanup?.();controls.slots[i]={deps,cleanup:fn()};});}}
      `,
            }));
          },
        },
      ],
      footer: { js: "export {controls};" },
    });
    const { useReadingHints, controls } = await import(outfile);
    let actor = "a";
    const records = new Map();
    const storage = {
      getItem: (key) => records.get(key) ?? null,
      setItem: (key, value) => records.set(key, value),
    };
    const make = (who) =>
      createLearnerDeviceStore({
        kind: "readingHints:pinyin",
        actor: who,
        storage,
        isCurrent: () => actor === who,
      });
    const a = make("a"),
      b = make("b");
    controls.store = a;
    const jobs = [];
    const fetcher = ({ data }) => new Promise((resolve) => jobs.push({ text: data.text, resolve }));
    const render = (text, enabled = true) =>
      controls.render(() => useReadingHints("pinyin", text, fetcher, enabled));
    assert.equal(render("我"), null);
    controls.flush();
    assert.equal(render("你"), null);
    controls.flush();
    jobs[0].resolve({ data: { segments: [{ base: "我", pinyin: "wǒ" }] } });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(a.read(), null);
    jobs[1].resolve({ data: { segments: [{ base: "你", pinyin: "nǐ" }] } });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(render("你"), [{ base: "你", pinyin: "nǐ" }]);
    assert.equal(render("他"), null);
    controls.flush();
    actor = "b";
    controls.store = b;
    assert.equal(render("你"), null);
    controls.flush();
    jobs[2].resolve({ data: { segments: [{ base: "他", pinyin: "tā" }] } });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(b.read(), null);
    assert.equal(render("你"), null);
    actor = "a";
    controls.store = a;
    assert.deepEqual(render("你"), [{ base: "你", pinyin: "nǐ" }]);
    controls.flush();
    assert.deepEqual(render("你"), [{ base: "你", pinyin: "nǐ" }]);
    const count = jobs.length;
    assert.equal(render("你", false), null);
    controls.flush();
    assert.equal(jobs.length, count);
    jobs[3].resolve({ data: { segments: [{ base: "你", pinyin: "wrong actor late" }] } });
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(a.read().entries[0].segments, [{ base: "你", pinyin: "nǐ" }]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
