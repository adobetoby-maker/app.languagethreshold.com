import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formFamilies } from "../src/lib/verb-games/classify.ts";
import { compilePatterns } from "../src/lib/verb-games/compile.ts";
import { PERSONS } from "../src/lib/verb-games/types.ts";

const data = JSON.parse(readFileSync("src/data/verb-patterns/es.json", "utf8"));

test("committed es.json equals a fresh compile", async () => {
  const { readCompileInput } = await import("../scripts/build-verb-patterns.mts");
  const fresh = compilePatterns(await readCompileInput(process.cwd()));
  assert.deepEqual(fresh.data, data);
  assert.equal(fresh.reportMarkdown, readFileSync("docs/verb-patterns/es-review-report.md", "utf8"));
});

test("every verb has all five persons and every family rule holds", () => {
  for (const v of data.verbs) {
    assert.deepEqual(v.forms.map((f) => f.person), PERSONS);
    for (const f of v.forms) assert.deepEqual(f.families, formFamilies(v.infinitive, f.person, f.full));
    for (const f of v.forms) if (f.families.length) assert.equal(f.stem + f.ending, f.full);
  }
});

test("72 core verbs are verified by a dictionary profile", () => {
  const core = data.verbs.filter((v) => v.sources.some((s) => s.kind === "core") && v.status === "verified");
  assert.equal(core.length, 72);
});

test("unsigned data contains no classified verbs", () => {
  if (!data.signedOff) assert.ok(data.verbs.every((v) => v.status === "verified"));
});
