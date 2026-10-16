import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
const dir = resolve("node_modules/.cache/lle-tests");
mkdirSync(dir, { recursive: true });
const outfile = resolve(dir, "grammar-content-handler.mjs");
await build({
  stdin: {
    contents: `export {generateLessonContent} from ${JSON.stringify(resolve("src/fns/grammar.functions.ts"))}; export {controls} from 'test-controls';`,
    resolveDir: process.cwd(),
  },
  outfile,
  bundle: true,
  format: "esm",
  platform: "node",
  external: ["zod"],
  logLevel: "silent",
  plugins: [
    {
      name: "grammar-model-boundary",
      setup(b) {
        b.onResolve(
          { filter: /^(test-controls|@anthropic-ai\/sdk|@tanstack\/react-start(\/server)?)$/ },
          () => ({ path: "controls", namespace: "fixture" }),
        );
        b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          contents: `export const controls={next:null}; export const setResponseHeader=()=>{}; export const createServerFn=()=>({inputValidator:validate=>({handler:fn=>({data})=>fn({data:validate(data)})})}); export default class Model{messages={create:async()=>({usage:{input_tokens:1,output_tokens:1},content:[{type:'tool_use',name:'return_lesson_content',input:controls.next}]})};}`,
        }));
      },
    },
  ],
});
const { generateLessonContent, controls } = await import(outfile);
const base = () => ({
  explanation: "Synthetic QA teaching text.",
  keyRule: "Synthetic QA rule.",
  examples: Array.from({ length: 3 }, () => ({ target: "QA target.", english: "QA translation." })),
});
const request = {
  data: {
    language: "Spanish",
    nativeLanguage: "English",
    level: "A1",
    concept: "Synthetic QA concept",
  },
};
async function withKey(run) {
  const saved = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "fixture-no-network";
  try {
    await run();
  } finally {
    if (saved === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = saved;
  }
}
test("production content handler refuses structurally valid but impossible fixed-stem splits", async () =>
  withKey(async () => {
    controls.next = {
      ...base(),
      morphology: {
        summary: "Synthetic wrong fixed root.",
        base: { word: "ser", root: "s", ending: "er", gloss: "to be" },
        table: [{ form: "tú", root: "s", ending: "eres", full: "eres", english: "you are" }],
      },
    };
    const result = await generateLessonContent(request);
    assert.equal(result.data, null);
    assert.match(result.error, /word forms were inconsistent/);
  }));
test("production content handler accepts complete irregular teaching without a split and exact regular splits", async () =>
  withKey(async () => {
    controls.next = base();
    assert.ok((await generateLessonContent(request)).data);
    controls.next = {
      ...base(),
      morphology: {
        summary: "Synthetic regular pattern.",
        base: { word: "hablar", root: "habl", ending: "ar", gloss: "to speak" },
        table: [{ form: "yo", root: "habl", ending: "o", full: "hablo", english: "I speak" }],
      },
    };
    assert.ok((await generateLessonContent(request)).data);
  }));
