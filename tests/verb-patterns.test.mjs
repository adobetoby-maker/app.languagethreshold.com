import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formFamilies, formIssues } from "../src/lib/verb-games/classify.ts";
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

const overrides = JSON.parse(readFileSync("docs/verb-patterns/es-overrides.json", "utf8"));
const report = readFileSync("docs/verb-patterns/es-review-report.md", "utf8");
const formsOf = (v) => Object.fromEntries(v.forms.map((f) => [f.person, f.full]));

test("R1: every shipped verb passes the form/tag gate", () => {
  for (const v of data.verbs) assert.deepEqual(formIssues(v.infinitive, formsOf(v)), [], v.infinitive);
});

test("R2: the reviewed profile errors ship the lesson form", () => {
  const form = (inf, i) => data.verbs.find((v) => v.infinitive === inf).forms[i].full;
  assert.equal(form("enfriar", 0), "enfrío");
  assert.equal(form("monitorear", 1), "monitoreas");
  assert.equal(form("monitorear", 4), "monitorean");
  assert.equal(form("planchar", 4), "planchan");
  assert.equal(form("renovar", 0), "renuevo");
});

test("R5: overrides are applied and printed in the signed report", () => {
  assert.ok(report.includes("## overrides"));
  for (const [inf, gloss] of Object.entries(overrides.gloss)) {
    const v = data.verbs.find((x) => x.infinitive === inf);
    if (v) assert.equal(v.english, gloss);
    else assert.ok(report.includes(`- ${inf}: "${gloss}":`) || report.includes(`- ${inf}: form/tag`), inf);
  }
  for (const inf of Object.keys(overrides.exclude)) {
    assert.equal(data.verbs.some((v) => v.infinitive === inf), false);
    assert.ok(report.includes(`- ${inf}: override: `), inf);
  }
  const gustar = data.verbs.find((v) => v.infinitive === "gustar");
  assert.deepEqual(gustar.forms.map((f) => f.english), Object.values(overrides.formEnglish.gustar));
});

test("R6: no shipped frame English starts with the verb's own head verb", () => {
  for (const v of data.verbs) {
    const head = v.english.replace(/\([^)]*\)/g, " ").split(/[,/;]/)[0].trim().replace(/^to /, "").split(" ")[0].toLowerCase();
    for (const f of v.forms) {
      if (!f.sentence) continue;
      const first = f.sentence.native.replace(/^\p{Lu}\p{L}*, (?=\p{Ll})/u, "").split(/\s+/)[0].toLowerCase().replace(/[^\p{L}']/gu, "");
      assert.notEqual(first, head, `${v.infinitive} ${f.person}: ${f.sentence.native}`);
    }
  }
  for (const [inf, persons] of Object.entries(overrides.dropFrames)) {
    const v = data.verbs.find((x) => x.infinitive === inf);
    for (const f of v?.forms ?? []) if (persons.includes(f.person)) assert.equal(f.sentence, null, `${inf} ${f.person}`);
  }
});
