import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
async function fixture(run) {
  const root = mkdtempSync(path.resolve("node_modules/.cache/shared-module-decks-")),
    file = path.join(root, "handler.mjs");
  const keys = ["ANTHROPIC_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "VERCEL_ENV"];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]])),
    oldFetch = globalThis.fetch;
  Object.assign(process.env, {
    ANTHROPIC_API_KEY: "fixture-only",
    SUPABASE_URL: "https://draft.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "fixture-only",
    VERCEL_ENV: "preview",
  });
  try {
    await build({
      stdin: {
        contents: `export {generateModuleDeck as handler} from ${JSON.stringify(path.resolve("src/fns/module-deck.functions.ts"))};export {moduleDeckDraftKey} from ${JSON.stringify(path.resolve("src/lib/shared-module-decks.ts"))};export {cleanModuleDeck} from './src/lib/module-deck-core.ts';export {controls} from 'test-controls';`,
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
          name: "draft-boundaries",
          setup(b) {
            b.onResolve(
              {
                filter:
                  /^(test-controls|@anthropic-ai\/sdk|@tanstack\/react-start(\/server(?:-only)?)?)$/,
              },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `
    export const controls={calls:0,status:200,headers:{},origin:'https://qa.invalid',invalid:false};
    export const createServerFn=()=>({inputValidator:validate=>({handler:fn=>({data})=>fn({data:validate(data)})})});
    export const getRequest=()=>new Request('https://qa.invalid/_serverFn/pairs',{method:'POST',headers:{Origin:controls.origin,'x-vercel-forwarded-for':'192.0.2.37'}});
    export const setResponseHeader=(k,v)=>controls.headers[k]=v;
    export const setResponseStatus=s=>controls.status=s;
    export default class Model{constructor(options){controls.options=options;}messages={create:async request=>{controls.calls++;controls.request=request;controls.started?.();await controls.wait;return {model:'fixture',usage:{input_tokens:1,output_tokens:1},content:controls.invalid?[]:[{type:'tool_use',input:{terms:Array.from({length:20},(_,i)=>({english:'term '+i,translation:'término '+i})),phrases:Array.from({length:20},(_,i)=>({english:'phrase '+i,translation:'frase '+i}))}}]};}};}
   `,
            }));
          },
        },
      ],
    });
    const mod = await import(file),
      cache = new Map();
    let budgetCalls = 0,
      rpcCalls = 0,
      denyBudget = false,
      unavailable = false;
    globalThis.fetch = async (url, init) => {
      rpcCalls++;
      if (unavailable) return new Response("unavailable", { status: 503 });
      const args = JSON.parse(init.body),
        key = args.p_environment + ":" + args.p_cache_key;
      if (String(url).endsWith("claim_module_deck_draft")) {
        const row = cache.get(key);
        if (row?.pairs)
          return Response.json({
            status: "hit",
            pairs: row.pairs.map((pair) => ({
              kind: pair.kind,
              translation: pair.translation,
              english: pair.english,
            })),
          });
        if (row?.lease) return Response.json({ status: "pending" });
        cache.set(key, { lease: args.p_lease });
        return Response.json({ status: "claimed" });
      }
      if (String(url).endsWith("complete_module_deck_draft")) {
        assert.equal(cache.get(key).lease, args.p_lease);
        cache.set(key, { pairs: args.p_pairs });
        return Response.json(true);
      }
      if (String(url).endsWith("release_module_deck_draft")) {
        if (cache.get(key)?.lease === args.p_lease) cache.delete(key);
        return Response.json(true);
      }
      assert.ok(String(url).endsWith("consume_speaking_request"));
      budgetCalls++;
      return Response.json(!denyBudget);
    };
    const data = {
      moduleId: "roofing",
      language: "Spanish",
      nativeLanguage: "English",
    };
    await run({
      ...mod,
      cache,
      data,
      counts: () => ({ budgetCalls, rpcCalls }),
      deny: () => (denyBudget = true),
      offline: () => (unavailable = true),
    });
  } finally {
    globalThis.fetch = oldFetch;
    for (const key of keys)
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    rmSync(root, { recursive: true, force: true });
  }
}
test("concurrent browsers share one generated draft; repeat and warm-cache origin denial spend no model budget", () =>
  fixture(async ({ handler, controls, data, cache, counts }) => {
    let started, release;
    const began = new Promise((r) => (started = r));
    controls.started = started;
    controls.wait = new Promise((r) => (release = r));
    const first = handler({ data });
    await began;
    const pending = await handler({ data });
    assert.match(pending.error, /being prepared/);
    assert.equal(controls.status, 202);
    assert.equal(controls.headers["Retry-After"], "3");
    assert.equal(controls.calls, 1);
    controls.status = 200;
    controls.headers = {};
    release();
    const generated = await first;
    assert.equal(generated.pairs.length, 40);
    assert.equal(generated.cached, false);
    assert.equal(cache.size, 1);
    assert.equal(counts().budgetCalls, 3);
    assert.equal(controls.options.timeout, 45000);
    assert.equal(controls.options.maxRetries, 0);
    controls.headers = {};
    const repeat = await handler({ data });
    assert.equal(repeat.cached, true);
    assert.deepEqual(repeat.pairs, generated.pairs);
    assert.equal(controls.calls, 1);
    assert.equal(counts().budgetCalls, 3);
    assert.equal(JSON.parse(controls.headers["X-LT-AI-Usage"]).providerCalls, 0);
    const before = counts().rpcCalls;
    controls.origin = "https://outside.invalid";
    await handler({ data });
    assert.equal(controls.status, 403);
    assert.equal(counts().rpcCalls, before);
    assert.equal(controls.headers["Cache-Control"], "no-store");
  }));
test("module, language pair, model and exact prompt changes create distinct deck draft keys", () =>
  fixture(async ({ moduleDeckDraftKey }) => {
    const body = {
      model: "fixture",
      system: "canonical module themes",
      messages: [{ role: "user", content: "Spanish English" }],
    };
    const key = await moduleDeckDraftKey("roofing", body);
    assert.match(key, /^[a-f0-9]{64}$/);
    assert.equal(key, await moduleDeckDraftKey("roofing", body));
    for (const [module, request] of [
      ["landscaper", body],
      ["roofing", { ...body, system: "changed themes" }],
      ["roofing", { ...body, model: "other" }],
      ["roofing", { ...body, messages: [{ role: "user", content: "English Spanish" }] }],
    ])
      assert.notEqual(key, await moduleDeckDraftKey(module, request));
  }));
test("quota and invalid model output release their lease so the next request can recover", () =>
  fixture(async ({ handler, controls, data, cache, deny }) => {
    controls.invalid = true;
    const bad = await handler({ data });
    assert.equal(bad.pairs, null);
    assert.equal(cache.size, 0);
    controls.invalid = false;
    deny();
    const denied = await handler({ data });
    assert.equal(controls.status, 429);
    assert.equal(denied.pairs, null);
    assert.equal(cache.size, 0);
    assert.equal(controls.calls, 1);
  }));
test("unavailable or malformed shared storage fails before inference", () =>
  fixture(async ({ handler, controls, data, offline, cache }) => {
    await handler({ data });
    for (const row of cache.values()) row.pairs = [];
    const corrupt = await handler({ data });
    assert.equal(corrupt.pairs, null);
    assert.equal(controls.status, 503);
    assert.equal(controls.calls, 1);
    offline();
    await handler({ data: { ...data, language: "Italian" } });
    assert.equal(controls.status, 503);
    assert.equal(controls.calls, 1);
  }));

test("deck validation keeps bounded distinct native labels and requires enough terms and phrases", () =>
  fixture(async ({cleanModuleDeck}) => {
    const raw = ['term','phrase'].flatMap(kind => Array.from({length:20},(_,i)=>({english:kind+' '+i,translation:'target '+kind+' '+i,kind})));
    assert.equal(cleanModuleDeck(raw).length,40);
    assert.equal(cleanModuleDeck(raw.filter(p=>p.kind==='term')),null);
    assert.equal(cleanModuleDeck(raw.map(p=>({...p,english:'same'}))),null);
    assert.equal(cleanModuleDeck(raw.map(p=>({...p,translation:'x'.repeat(241)}))),null);
    assert.equal(cleanModuleDeck(raw.map(p=>({...p,translation:'Spanish'})),'Spanish'),null);
    const dirty=[null,{},...raw.map(p=>({...p,english:' '+p.english+' ',privateAnswer:'discard'}))];
    assert.deepEqual(cleanModuleDeck(dirty),raw);
    const oversized=['term','phrase'].flatMap(kind=>Array.from({length:25},(_,i)=>({english:kind+' '+i,translation:'target '+kind+' '+i,kind})));
    assert.equal(cleanModuleDeck(oversized).filter(p=>p.kind==='term').length,20);
    assert.equal(cleanModuleDeck(oversized).filter(p=>p.kind==='phrase').length,20);
  }));
