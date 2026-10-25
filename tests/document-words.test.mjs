import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { documentWordParts, documentWordKey, isDocumentWord } from "../src/lib/document-words.ts";
test("word buttons preserve punctuation, accents, spacing and apostrophes", () => {
  const original = "  No use equipo dañado. L'équipe\n  atención: 25 mg.";
  const parts = documentWordParts(original);
  assert.equal(parts.join(""), original);
  assert.deepEqual(parts.filter(isDocumentWord), [
    "No",
    "use",
    "equipo",
    "dañado",
    "L'équipe",
    "atención",
    "mg",
  ]);
  assert.equal(documentWordKey("DAN\u0303ADO"), documentWordKey("DAÑADO"));
});
async function fixture() {
  mkdirSync(resolve("node_modules/.cache"), { recursive: true });
  const dir = mkdtempSync(resolve("node_modules/.cache/doc-words-"));
  const out = join(dir, "fixture.mjs");
  await build({
    stdin: {
      contents: `export { lookupDocumentWord } from './src/lib/document-words-server.ts';export {c,db,TeamOperationError} from 'fixture';`,
      resolveDir: process.cwd(),
    },
    outfile: out,
    define: { "process.env.ANTHROPIC_API_KEY": JSON.stringify("fixture-not-a-secret") },
    bundle: true,
    platform: "node",
    format: "esm",
    logLevel: "silent",
    plugins: [
      {
        name: "mocks",
        setup(b) {
          b.onResolve(
            {
              filter:
                /^(fixture|@anthropic-ai\/sdk|\.\/team-server|\.\/learning-generation-security)$/,
            },
            () => ({ path: "fixture", namespace: "fixture" }),
          );
          b.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
            contents: `
 export const c={rows:[],calls:0,denial:null,fail:false,missing:false,saveFail:false};
 export class TeamOperationError extends Error{constructor(message,status=400){super(message);this.status=status}}
 export const json=(v,status=200)=>new Response(JSON.stringify(v),{status});
 export const checkLearningGenerationBudget=async()=>c.denial;
 export const teamAdminClient=()=>db;
 export const db={from(table){let filters=[],op='read',value;
 const q={select(){return q},eq(k,v){filters.push(r=>r[k]===v);return q},is(k,v){filters.push(r=>(r[k]??null)===v);return q},lte(k,v){filters.push(r=>r[k]<=v);return q},
 insert(v){op='insert';value=v;return q},update(v){op='update';value=v;return q},delete(){op='delete';return q},
 maybeSingle:async()=>table==='study_documents'?{data:c.missing||!filters.every(f=>f({id:'doc',user_id:'owner',state:'ready'}))?null:{sentences:[{en:'Do not use damaged equipment.',target:'No use equipo dañado.'}],source_language:'English',target_language:'Spanish'},error:null}:{data:c.rows.find(r=>filters.every(f=>f(r)))??null,error:null},
 then(resolve){let matches=c.rows.filter(r=>filters.every(f=>f(r)));let result={data:matches,error:null};
 if(op==='insert'){if(c.rows.some(r=>r.document_id===value.document_id&&r.passage_index===value.passage_index&&r.side===value.side&&r.word===value.word))result={data:null,error:{code:'23505'}};else{c.rows.push({...value,card:null});result.data=[value]}}
 if(op==='update'){if(c.saveFail&&value.card)result={data:null,error:{message:'DB down'}};else{matches.forEach(r=>Object.assign(r,value));result.data=matches}}
 if(op==='delete')c.rows=c.rows.filter(r=>!matches.includes(r));return Promise.resolve(result).then(resolve)} };return q}};
 export default class Anthropic{constructor(){this.messages={create:async options=>{c.calls++;c.model=options.model;if(c.fail)throw Error('Provider error');return{content:[{type:'tool_use',input:{headword:'equipo',meaning:'Equipment.',grammar:'A noun.',context:'The tools being used.'}}]}}}}}
 `,
          }));
        },
      },
    ],
  });
  return { ...(await import(out)), dir };
}
const request = new Request("https://app.languagethreshold.com/api/documents");
const data = { id: "doc", passage: 0, side: "target", word: "equipo" };
test("document definitions survive a new request and use no second model call", async () => {
  const f = await fixture();
  try {
    const first = await f.lookupDocumentWord(f.db, "owner", request, data);
    assert.equal((await first.json()).cached, false);
    assert.equal(f.c.calls, 1);
    assert.equal(f.c.model, "claude-haiku-5-5");
    const second = await f.lookupDocumentWord(f.db, "owner", request, { ...data, word: "EQUIPO" });
    assert.equal((await second.json()).cached, true);
    assert.equal(f.c.calls, 1);
  } finally {
    rmSync(f.dir, { recursive: true, force: true });
  }
});
test("foreign accounts, fabricated words and passages never reach the provider", async () => {
  const f = await fixture();
  try {
    await assert.rejects(f.lookupDocumentWord(f.db, "other", request, data), /not found/);
    await assert.rejects(
      f.lookupDocumentWord(f.db, "owner", request, { ...data, word: "invented" }),
      /Choose a word/,
    );
    await assert.rejects(
      f.lookupDocumentWord(f.db, "owner", request, { ...data, passage: 1 }),
      /Choose a word/,
    );
    assert.equal(f.c.calls, 0);
  } finally {
    rmSync(f.dir, { recursive: true, force: true });
  }
});
test("provider failure and budget denial release claims; retry succeeds", async () => {
  const f = await fixture();
  try {
    f.c.denial = { error: "Wait", status: 429 };
    await assert.rejects(f.lookupDocumentWord(f.db, "owner", request, data), /Wait/);
    assert.equal(f.c.calls, 0);
    assert.equal(f.c.rows.length, 0);
    f.c.denial = null;
    f.c.fail = true;
    await assert.rejects(f.lookupDocumentWord(f.db, "owner", request, data), /Could not create/);
    assert.equal(f.c.rows.length, 0);
    f.c.fail = false;
    assert.equal(
      (await (await f.lookupDocumentWord(f.db, "owner", request, data)).json()).cached,
      false,
    );
  } finally {
    rmSync(f.dir, { recursive: true, force: true });
  }
});
test("simultaneous requests create one definition; a pending claim makes no duplicate call", async () => {
  const f = await fixture();
  try {
    const results = await Promise.allSettled([
      f.lookupDocumentWord(f.db, "owner", request, data),
      f.lookupDocumentWord(f.db, "owner", request, data),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(f.c.calls, 1);
  } finally {
    rmSync(f.dir, { recursive: true, force: true });
  }
});
test("expired claims recover and failed storage never reports a saved definition", async () => {
  const f = await fixture();
  try {
    f.c.rows.push({
      document_id: "doc",
      user_id: "owner",
      passage_index: 0,
      side: "target",
      word: "equipo",
      card: null,
      claim_id: "old",
      expires_at: "2000-01-01T00:00:00Z",
    });
    f.c.saveFail = true;
    await assert.rejects(f.lookupDocumentWord(f.db, "owner", request, data), /Could not create/);
    assert.equal(f.c.rows.length, 0);
    f.c.saveFail = false;
    await f.lookupDocumentWord(f.db, "owner", request, data);
    assert.equal(f.c.rows.length, 1);
  } finally {
    rmSync(f.dir, { recursive: true, force: true });
  }
});
