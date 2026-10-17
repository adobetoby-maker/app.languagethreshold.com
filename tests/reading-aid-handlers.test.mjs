import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

for (const [format, exportName, text, readings] of [
  ["furigana", "addFurigana", "私", { hiragana: "わたし", romaji: "watashi" }],
  ["pinyin", "addPinyin", "我", { pinyin: "wǒ" }],
  ["romaja", "addRomaja", "나", { romaja: "na" }],
])
  test(`${format}: actual reading-aid handler bounds origin/budget/provider and validates exact source segments`, async () => {
    const root = mkdtempSync(resolve("node_modules/.cache/reading-aid-test-"));
    const keys = ["ANTHROPIC_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "VERCEL_ENV"],
      saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    const savedFetch = globalThis.fetch,
      savedLog = console.error;
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
          contents: `export {${exportName} as handler} from ${JSON.stringify(resolve(`src/fns/${format}.functions.ts`))};export {controls} from 'test-controls';`,
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
            name: "reading-aid-boundaries",
            setup(b) {
              b.onResolve(
                {
                  filter: /^(test-controls|@anthropic-ai\/sdk|@tanstack\/react-start(\/server)?)$/,
                },
                () => ({ path: "fixture", namespace: "fixture" }),
              );
              b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
                contents: `
        export const controls={calls:0,origin:'https://owned-preview.invalid',status:200,headers:{},signal:new AbortController()};
        export const createServerFn=()=>({inputValidator:validate=>({handler:fn=>({data})=>fn({data:validate(data)})})});
        export const getRequest=()=>new Request('https://owned-preview.invalid/_serverFn/reading',{method:'POST',signal:controls.signal.signal,headers:{...(controls.origin?{Origin:controls.origin}:{}),'x-vercel-forwarded-for':'192.0.2.38'}});
        export const setResponseHeader=(key,value)=>controls.headers[key]=value;
        export const setResponseStatus=status=>controls.status=status;
        export default class Model{constructor(options){controls.options=options;}messages={create:async(body,options)=>{controls.calls++;controls.body=body;controls.callOptions=options;if(controls.failure)throw Error('PRIVATE provider payload');return {content:[{type:'tool_use',name:body.tool_choice.name,input:controls.output}]};}};}
      `,
              }));
            },
          },
        ],
      });
      const { handler, controls } = await import(file);
      const valid = { segments: [{ base: text, ...readings }] };
      controls.output = valid;
      let budgets = 0;
      globalThis.fetch = async () => {
        budgets++;
        return Response.json(true);
      };
      for (const origin of [null, "https://outside.invalid"]) {
        controls.origin = origin;
        assert.equal((await handler({ data: { text } })).data, null);
        assert.equal(controls.status, 403);
      }
      assert.equal(budgets, 0);
      assert.equal(controls.calls, 0);
      controls.origin = "https://owned-preview.invalid";
      controls.status = 200;
      delete process.env.ANTHROPIC_API_KEY;
      assert.deepEqual((await handler({ data: { text: "plain ASCII" } })).data, {
        segments: [{ base: "plain ASCII" }],
      });
      assert.equal(budgets, 0);
      assert.equal(controls.calls, 0);
      process.env.ANTHROPIC_API_KEY = "fixture-only";
      globalThis.fetch = async (_, init) => {
        budgets++;
        const body = JSON.parse(init.body);
        assert.match(body.p_bucket_hash, /^[a-f0-9]{64}$/);
        assert.equal(body.p_request_limit, 40);
        return Response.json(false);
      };
      assert.equal((await handler({ data: { text } })).data, null);
      assert.equal(controls.status, 429);
      assert.equal(controls.headers["Retry-After"], "60");
      assert.equal(controls.calls, 0);
      globalThis.fetch = async () => {
        throw Error("Synthetic unavailable budget");
      };
      await handler({ data: { text } });
      assert.equal(controls.status, 503);
      assert.equal(controls.calls, 0);
      globalThis.fetch = async () => Response.json(true);
      controls.status = 200;
      const result = await handler({ data: { text } });
      assert.deepEqual(result.data, valid);
      assert.equal(result.error, null);
      assert.equal(controls.calls, 1);
      assert.equal(controls.options.maxRetries, 0);
      assert.equal(controls.options.timeout, 30_000);
      assert.equal(controls.callOptions.signal.aborted, false);
      controls.signal.abort();
      assert.equal(controls.callOptions.signal.aborted, true);
      controls.signal = new AbortController();
      assert.equal(controls.headers["Cache-Control"], "no-store");
      for (const segments of [
        [{ base: "different" }],
        [{ base: text, privateField: "not allowed" }],
        [
          {
            base: text,
            ...Object.fromEntries(Object.keys(readings).map((key) => [key, "x".repeat(121)])),
          },
        ],
      ]) {
        controls.output = { segments };
        assert.equal((await handler({ data: { text } })).data, null);
      }
      controls.output = { ...valid, privateField: "omit" };
      assert.deepEqual((await handler({ data: { text } })).data, valid);
      let logged;
      console.error = (...values) => {
        logged = values.join(" ");
      };
      controls.failure = true;
      assert.equal((await handler({ data: { text } })).data, null);
      assert.ok(!logged.includes("PRIVATE"));
      assert.match(logged, /provider request failed/);
    } finally {
      globalThis.fetch = savedFetch;
      console.error = savedLog;
      for (const key of keys) {
        if (saved[key] === undefined) delete process.env[key];
        else process.env[key] = saved[key];
      }
      rmSync(root, { recursive: true, force: true });
    }
  });
