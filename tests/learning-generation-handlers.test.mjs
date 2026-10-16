import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
const dir = resolve("node_modules/.cache/lle-tests");
mkdirSync(dir, { recursive: true });
async function load(name, exportName) {
  const outfile = resolve(dir, `learning-budget-${name}.mjs`);
  await build({
    stdin: {
      contents: `export {${exportName} as handler} from ${JSON.stringify(resolve(`src/fns/${name}.functions.ts`))}; export {controls} from 'test-controls';`,
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
        name: "handler-network-boundaries",
        setup(b) {
          b.onResolve(
            { filter: /^(test-controls|@anthropic-ai\/sdk|@tanstack\/react-start(\/server)?)$/ },
            () => ({ path: "controls", namespace: "fixture" }),
          );
          b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
            contents: `
      export const controls={calls:0,status:200,headers:{},origin:'https://owned-preview.invalid'};
      export const createServerFn=()=>({inputValidator:validate=>({handler:fn=>({data})=>fn({data:validate(data)})})});
      export const getRequest=()=>new Request('https://owned-preview.invalid/_serverFn/generate',{method:'POST',headers:{Origin:controls.origin,'x-vercel-forwarded-for':'192.0.2.37'}});
      export const setResponseHeader=(key,value)=>{controls.headers[key]=value;};
      export const setResponseStatus=status=>{controls.status=status;};
      export default class Model {messages={create:async()=>{controls.calls++;return {content:[]};}};}
    `,
          }));
        },
      },
    ],
  });
  return import(outfile);
}
for (const [name, exportName, data, resultKey] of [
  [
    "lesson-words",
    "generateLessonWords",
    { moduleId: "roofing", lessonNumber: 1, language: "Spanish", nativeLanguage: "English" },
    "words",
  ],
  [
    "module-deck",
    "generateModuleDeck",
    { moduleId: "roofing", language: "Spanish", nativeLanguage: "English" },
    "pairs",
  ],
  [
    "library",
    "generateCultureEssay",
    { country: "Spain", targetLanguage: "Spanish", nativeLanguage: "English" },
    "data",
  ],
  [
    "handwriting-read",
    "readHandwriting",
    { imageBase64: "A".repeat(100), language: "Spanish" },
    "text",
  ],
  [
    "handwriting-recognize",
    "recognizeHandwriting",
    { imageBase64: "A".repeat(100), language: "Japanese" },
    "result",
  ],
]) {
  test(`${name}: actual handler rejects exceeded/storage/cross-origin requests before the model and emits retry headers`, async () => {
    const keys = ["ANTHROPIC_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "VERCEL_ENV"],
      old = Object.fromEntries(keys.map((key) => [key, process.env[key]])),
      oldFetch = globalThis.fetch;
    process.env.ANTHROPIC_API_KEY = "fixture-only";
    process.env.SUPABASE_URL = "https://budget-store.invalid";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-only";
    process.env.VERCEL_ENV = "preview";
    try {
      const { handler, controls } = await load(name, exportName);
      globalThis.fetch = async () => Response.json(false);
      let result = await handler({ data });
      assert.equal(result[resultKey], null);
      assert.match(result.error, /Wait a minute/);
      assert.equal(controls.status, 429);
      assert.equal(controls.headers["Retry-After"], "60");
      assert.equal(controls.headers["Cache-Control"], "no-store");
      assert.equal(controls.calls, 0);
      controls.status = 200;
      controls.headers = {};
      globalThis.fetch = async () => new Response("unavailable", { status: 503 });
      result = await handler({ data });
      assert.equal(controls.status, 503);
      assert.match(result.error, /temporarily unavailable/);
      assert.equal(controls.calls, 0);
      controls.origin = "https://outside.invalid";
      result = await handler({ data });
      assert.equal(controls.status, 403);
      assert.equal(controls.calls, 0);
      controls.origin = "https://owned-preview.invalid";
      controls.status = 200;
      controls.headers = {};
      globalThis.fetch = async () => Response.json(true);
      await handler({ data });
      assert.equal(controls.calls, 1);
      assert.equal(controls.status, 200);
      assert.equal(controls.headers["Cache-Control"], "no-store");
    } finally {
      globalThis.fetch = oldFetch;
      for (const key of keys) {
        if (old[key] === undefined) delete process.env[key];
        else process.env[key] = old[key];
      }
    }
  });
}
