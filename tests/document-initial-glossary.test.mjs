import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import {
  attachInitialDocumentDefinitions,
  initialDocumentDefinition,
} from "../src/lib/document-words.ts";
const pairs = [{ en: "Do not use damaged equipment.", target: "No use equipo dañado." }];
const entry = {
  passage: 0,
  side: "target",
  word: "equipo",
  headword: "equipo",
  meaning: "Equipment.",
};
test("initial glossary keeps source wording, aligns definitions to passage/side and rejects invented words", () => {
  const result = attachInitialDocumentDefinitions(pairs, [
    entry,
    { ...entry, word: "EQUIPO" },
    { ...entry, word: "invented" },
    { ...entry, passage: 20 },
    { ...entry, side: "en" },
    null,
    { ...entry, word: "dañado", meaning: " " },
    { ...entry, word: "dañado", grammar: 4 },
  ]);
  assert.equal(result[0].en, pairs[0].en);
  assert.equal(result[0].target, pairs[0].target);
  assert.equal(result[0].definitions.length, 1);
  assert.equal(initialDocumentDefinition(result[0], "target", "EQUIPO").meaning, "Equipment.");
  assert.equal(initialDocumentDefinition(result[0], "en", "equipo"), undefined);
  assert.equal(pairs[0].definitions, undefined);
  assert.deepEqual(attachInitialDocumentDefinitions(pairs, null), pairs);
});
test("initial glossary is bounded even if the provider exceeds its schema", () => {
  const words = Array.from(
    { length: 61 },
    (_, i) => String.fromCharCode(65 + Math.floor(i / 26)) + String.fromCharCode(65 + (i % 26)),
  );
  const result = attachInitialDocumentDefinitions(
    [{ en: words.join(" "), target: "Texto." }],
    words.map((word) => ({ ...entry, side: "en", word, headword: word })),
  );
  assert.equal(result[0].definitions.length, 60);
});
async function fixture() {
  mkdirSync(resolve("node_modules/.cache"), { recursive: true });
  const dir = mkdtempSync(resolve("node_modules/.cache/initial-glossary-"));
  const out = join(dir, "fixture.mjs");
  await build({
    stdin: {
      contents: `export {translateDocumentContent} from './src/lib/document-translation-server.ts';export {c} from '@anthropic-ai/sdk';`,
      resolveDir: process.cwd(),
    },
    outfile: out,
    bundle: true,
    platform: "node",
    format: "esm",
    logLevel: "silent",
    define: { "process.env.ANTHROPIC_API_KEY": JSON.stringify("fixture-not-a-secret") },
    plugins: [
      {
        name: "mock",
        setup(b) {
          b.onResolve({ filter: /^@anthropic-ai\/sdk$/ }, () => ({
            path: "sdk",
            namespace: "mock",
          }));
          b.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
            contents: `export const c={calls:[],input:{translations:['No use equipo dañado.'],glossary:[${JSON.stringify(entry)}]}};export default class Anthropic{constructor(){this.messages={create:async options=>{c.calls.push(options);return{content:[{type:'tool_use',input:c.input}]}}}}}`,
          }));
        },
      },
    ],
  });
  return { ...(await import(out)), dir };
}
test("one initial model request returns translation and persistent glossary together", async () => {
  const f = await fixture();
  try {
    const result = await f.translateDocumentContent({
      text: pairs[0].en,
      sourceLanguage: "English",
      targetLanguage: "Spanish",
      quality: "standard",
    });
    assert.equal(f.c.calls.length, 1);
    assert.equal(f.c.calls[0].model, "claude-haiku-5-5");
    assert.ok(f.c.calls[0].tools[0].input_schema.required.includes("glossary"));
    assert.equal(result[0].definitions[0].card.meaning, "Equipment.");
    assert.equal(result[0].en, pairs[0].en);
    // A missing optional glossary never discards a valid translation; taps fall back to lookup.
    f.c.input = { translations: ["No use equipo dañado."] };
    assert.equal(
      (
        await f.translateDocumentContent({
          text: pairs[0].en,
          sourceLanguage: "English",
          targetLanguage: "Spanish",
          quality: "detailed",
        })
      )[0].target,
      pairs[0].target,
    );
    assert.equal(f.c.calls[1].model, "claude-sonnet-5-5");
    f.c.input = { translations: [], glossary: [entry] };
    await assert.rejects(
      f.translateDocumentContent({
        text: pairs[0].en,
        sourceLanguage: "English",
        targetLanguage: "Spanish",
        quality: "standard",
      }),
      /incomplete/,
    );
  } finally {
    rmSync(f.dir, { recursive: true, force: true });
  }
});
