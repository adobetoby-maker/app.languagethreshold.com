import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";

test("Spanish 101: all 120 actual lesson answers pass Foundation, Core and Master", async () => {
  const compiled = await build({
    stdin: {
      contents:
        'export { loadModulePlacement } from "./src/lib/module-placement-loader.ts"; export { placementResult } from "./src/lib/module-placement.ts";',
      resolveDir: process.cwd(),
    },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    tsconfig: "tsconfig.json",
    logLevel: "silent",
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    try {
      return new Response(
        await readFile(
          new URL(`../public${new URL(String(input), "http://local").pathname}`, import.meta.url),
        ),
      );
    } catch {
      return new Response("", { status: 404 });
    }
  };
  try {
    const app = await import(
      `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].contents).toString("base64")}`
    );
    const data = await app.loadModulePlacement(
      "spanish-basics",
      "Spanish",
      "English",
      "perfect-101",
    );
    const questions = data.blocks.flatMap((block) => block.questions);
    assert.equal(questions.length, 120);
    assert.equal(data.gap, null);
    const responses = Object.fromEntries(
      questions.map((question) => [question.id, question.answer]),
    );
    const result = app.placementResult(data.blocks, responses);
    assert.equal(result.complete, true);
    assert.equal(result.start, null);
    assert.equal(result.credit.length, 60);
    const completedSentences = Object.fromEntries(
      questions.map((question) => [
        question.id,
        question.type === "typed"
          ? question.prompt.replace("____", question.answer)
          : question.answer,
      ]),
    );
    const sentenceResult = app.placementResult(data.blocks, completedSentences);
    assert.equal(sentenceResult.complete, true);
    assert.equal(sentenceResult.start, null);
    assert.equal(sentenceResult.credit.length, 60);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
