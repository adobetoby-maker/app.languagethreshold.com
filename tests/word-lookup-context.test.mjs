import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { currentTutorLesson, resolveTutorLesson } from "../src/lib/lesson-tutor-context.ts";
test("actual dictionary cache separates lesson senses, anchors prompts and rejects stale contexts before provider use", async () => {
  const root = mkdtempSync(path.resolve("node_modules/.cache/lookup-context-")),
    file = path.join(root, "handler.mjs");
  const keys = ["ANTHROPIC_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "VERCEL_ENV"],
    saved = Object.fromEntries(keys.map((k) => [k, process.env[k]])),
    oldFetch = globalThis.fetch;
  Object.assign(process.env, {
    ANTHROPIC_API_KEY: "fixture-only",
    SUPABASE_URL: "https://budget.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "fixture-only",
    VERCEL_ENV: "preview",
  });
  let budgetCalls = 0;
  globalThis.fetch = async () => {
    budgetCalls++;
    return Response.json(true);
  };
  try {
    await build({
      stdin: {
        contents: `export {lookupWord} from ${JSON.stringify(path.resolve("src/fns/word-lookup.functions.ts"))};export {controls} from 'test-controls';`,
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
          name: "lookup-boundaries",
          setup(b) {
            b.onResolve(
              { filter: /^(test-controls|@anthropic-ai\/sdk|@tanstack\/react-start(\/server)?)$/ },
              () => ({ path: "fixture", namespace: "fixture" }),
            );
            b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
              contents: `export const controls={calls:0,status:200,headers:{},origin:'https://qa.invalid'};export const createServerFn=()=>({inputValidator:validate=>({handler:fn=>({data})=>fn({data:validate(data)})})});export const getRequest=()=>new Request('https://qa.invalid/_serverFn/lookup',{method:'POST',headers:{Origin:controls.origin,'x-vercel-forwarded-for':'192.0.2.37'}});export const setResponseHeader=(k,v)=>controls.headers[k]=v;export const setResponseStatus=status=>controls.status=status;export default class Model{messages={create:async body=>{controls.calls++;controls.request=body;const anchored=body.system.includes('CURRENT LESSON DOMAIN');return {model:'fixture',usage:{input_tokens:1,output_tokens:1},content:[{type:'tool_use',name:'return_word_card',input:{headword:'limahoya',partOfSpeech:'noun',phonetic:'',baseDefinition:anchored?'Lesson-context fixture':'General-context fixture',conjugationNote:'',contextNuance:'',exampleSentence:'',exampleTranslation:''}}]};}};}`,
            }));
          },
        },
      ],
    });
    const { lookupWord, controls } = await import(file);
    const data = {
      word: "limahoya",
      sentence: "La limahoya aparece en un texto privado QA ajeno a la lección.",
      language: "Spanish",
      nativeLanguage: "English",
    };
    assert.equal((await lookupWord({ data })).card.baseDefinition, "General-context fixture");
    const lesson = currentTutorLesson("?lesson=15", {
      currentTab: "core30",
      activeModuleId: "roofing",
      selectedLanguage: "Spanish",
      nativeLanguage: "English",
    });
    assert.equal(
      (await lookupWord({ data: { ...data, lesson } })).card.baseDefinition,
      "Lesson-context fixture",
    );
    assert.equal(controls.calls, 2);
    assert.match(controls.request.system, /Roofing Foreman; lesson 15: Valley Protection/);
    assert.match(controls.request.system, /Authored vocabulary anchors/);
    assert.match(controls.request.system, /not a different generic or geographic sense/);
    // General/private context remains request-local, even with a valid lesson reference.
    assert.equal((await lookupWord({ data: { ...data, lesson } })).cached, false);
    assert.equal(controls.calls, 3);
    assert.equal((await lookupWord({ data })).cached, false);
    assert.equal(controls.calls, 4);
    const sentence = resolveTutorLesson(lesson).reading.sentences[0].target;
    const publicInput = { ...data, lesson, sentence, word: sentence.split(/\s+/)[0] };
    assert.equal((await lookupWord({ data: publicInput })).cached, false);
    const before = budgetCalls;
    assert.equal((await lookupWord({ data: publicInput })).cached, true);
    assert.equal(budgetCalls, before);
    assert.equal(controls.calls, 5);
    assert.equal(JSON.parse(controls.headers["X-LT-AI-Usage"]).providerCalls, 0);
    const wrongWord = { ...publicInput, word: "PRIVATE-not-in-public-sentence" };
    assert.equal((await lookupWord({ data: wrongWord })).cached, false);
    assert.equal((await lookupWord({ data: wrongWord })).cached, false);
    const finalCalls = controls.calls,
      finalBudgets = budgetCalls;
    const bad = await lookupWord({
      data: { ...data, lesson: { ...lesson, contentVersion: "old" } },
    });
    assert.equal(bad.card, null);
    assert.equal(controls.status, 409);
    assert.equal(controls.calls, finalCalls);
    assert.equal(budgetCalls, finalBudgets);
    controls.origin = "https://outside.invalid";
    assert.equal((await lookupWord({ data })).card, null);
    assert.equal(controls.status, 403);
    assert.equal(controls.calls, finalCalls);
    assert.equal(controls.headers["Cache-Control"], "no-store");
  } finally {
    globalThis.fetch = oldFetch;
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    rmSync(root, { recursive: true, force: true });
  }
});
