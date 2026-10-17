import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

test("actual Pen Pal handler bounds paid image checks and ignores model-selected practice credit", async () => {
  const root = mkdtempSync(resolve("node_modules/.cache/penpal-guards-"));
  const keys = ["ANTHROPIC_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "VERCEL_ENV"],
    saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const savedFetch = globalThis.fetch;
  Object.assign(process.env, {
    ANTHROPIC_API_KEY: "fixture-only",
    SUPABASE_URL: "https://budget.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "fixture-only",
    VERCEL_ENV: "preview",
  });
  try {
    const file = join(root, "handler.mjs");
    await build({
      stdin: {
        contents: `export {checkPenPalWriting as handler} from ${JSON.stringify(resolve("src/fns/penpal-check.functions.ts"))};export {controls} from 'test-controls';`,
        resolveDir: process.cwd(),
      },
      outfile: file,
      bundle: true,
      format: "esm",
      platform: "node",
      external: ["zod"],
      logLevel: "silent",
      plugins: [
        {
          name: "penpal-boundaries",
          setup(b) {
            b.onResolve(
              { filter: /^(test-controls|@anthropic-ai\/sdk|@tanstack\/react-start(\/server)?)$/ },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `
        export const controls={calls:0,constructed:0,origin:'https://owned-preview.invalid',status:200,headers:{},abort:new AbortController()};
        export const createServerFn=()=>({inputValidator:validate=>({handler:fn=>({data})=>fn({data:validate(data)})})});
        export const getRequest=()=>new Request('https://owned-preview.invalid/_serverFn/penpal',{method:'POST',signal:controls.abort.signal,headers:{...(controls.origin?{Origin:controls.origin}:{}),'x-vercel-forwarded-for':'192.0.2.39'}});
        export const setResponseHeader=(key,value)=>controls.headers[key]=value;
        export const setResponseStatus=status=>controls.status=status;
        export default class Model{constructor(options){controls.constructed++;controls.options=options;}messages={create:async(body,options)=>{controls.calls++;controls.body=body;controls.callOptions=options;if(controls.fail)throw Error('PRIVATE learner image and provider payload');return {content:[{type:'text',text:controls.output}]};}};}
      `,
            }));
          },
        },
      ],
    });
    const { handler, controls } = await import(file);
    const input = {
      imageBase64: "A".repeat(100),
      targetText: "Synthetic copy prompt",
      language: "Spanish",
      mode: "word",
    };
    let budgets = 0;
    globalThis.fetch = async () => {
      budgets++;
      return Response.json(true);
    };
    for (const data of [
      { ...input, imageBase64: "A".repeat(1_000_001) },
      { ...input, targetText: "x".repeat(2001) },
      { ...input, language: "x".repeat(41) },
    ])
      assert.throws(() => handler({ data }));
    assert.equal(budgets, 0);
    assert.equal(controls.constructed, 0);
    for (const origin of [null, "https://outside.invalid"]) {
      controls.origin = origin;
      assert.equal((await handler({ data: input })).result, null);
      assert.equal(controls.status, 403);
    }
    assert.equal(budgets, 0);
    assert.equal(controls.constructed, 0);
    controls.origin = "https://owned-preview.invalid";
    controls.status = 200;
    globalThis.fetch = async (_, init) => {
      budgets++;
      assert.equal(JSON.parse(init.body).p_request_limit, 30);
      return Response.json(false);
    };
    await handler({ data: input });
    assert.equal(controls.status, 429);
    assert.equal(controls.headers["Retry-After"], "60");
    assert.equal(controls.constructed, 0);
    globalThis.fetch = async () => {
      throw Error("Synthetic unavailable store");
    };
    await handler({ data: input });
    assert.equal(controls.status, 503);
    assert.equal(controls.constructed, 0);
    globalThis.fetch = async () => Response.json(true);
    controls.status = 200;
    controls.output = JSON.stringify({
      correct: false,
      recognized: "QA imperfect copy",
      feedback: "QA feedback",
      xp: 999999,
      privateExtra: "omit",
    });
    assert.deepEqual((await handler({ data: input })).result, {
      correct: false,
      recognized: "QA imperfect copy",
      feedback: "QA feedback",
      xp: 5,
    });
    assert.equal((await handler({ data: { ...input, mode: "sentence" } })).result.xp, 5);
    assert.equal((await handler({ data: { ...input, mode: "free" } })).result.xp, 10);
    assert.equal(controls.options.timeout, 30_000);
    assert.equal(controls.options.maxRetries, 0);
    assert.equal(controls.callOptions.signal.aborted, false);
    controls.abort.abort();
    assert.equal(controls.callOptions.signal.aborted, true);
    controls.abort = new AbortController();
    assert.equal(controls.headers["Cache-Control"], "no-store");
    for (const output of [
      { correct: "yes", recognized: "QA", feedback: "QA" },
      { correct: true, recognized: "x".repeat(4001), feedback: "QA" },
      { correct: false, recognized: "QA", feedback: "x".repeat(1201) },
    ]) {
      controls.output = JSON.stringify(output);
      const response = await handler({ data: input });
      assert.equal(response.result, null);
      assert.match(response.error, /Could not check/);
    }
    controls.fail = true;
    const response = await handler({ data: input });
    assert.equal(response.result, null);
    assert.ok(!response.error.includes("PRIVATE"));
    const before = controls.constructed;
    delete process.env.ANTHROPIC_API_KEY;
    assert.equal((await handler({ data: input })).result, null);
    assert.equal(controls.constructed, before);
  } finally {
    globalThis.fetch = savedFetch;
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    rmSync(root, { recursive: true, force: true });
  }
});
