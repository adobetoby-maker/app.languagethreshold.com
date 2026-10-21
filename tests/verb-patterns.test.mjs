import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
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

test("Core 60 stage files outside the signed set never reach the compile", async () => {
  const { readCompileInput } = await import("../scripts/build-verb-patterns.mts");
  const real = process.cwd();
  const baseline = await readCompileInput(real);
  const modules = baseline.lessonFiles.map((f) => f.module);
  // The repo has dozens of Foundation files; none of the unsigned ones is read.
  assert.ok(readdirSync("public/lesson-content/es").some((n) => n === "foundation-plumber.json"));
  assert.equal(modules.includes("foundation-plumber"), false);
  assert.deepEqual(
    modules.filter((m) => /^(foundation|master)-/.test(m)).sort(),
    ["foundation-electrician", "foundation-nursing", "foundation-roofing", "master-electrician", "master-nursing", "master-roofing"],
    "only the stage files already in the signed compile stay",
  );

  // A temp root with the same inputs plus new stage files: the compile input and output are unchanged.
  const root = mkdtempSync(path.join(os.tmpdir(), "verb-compile-"));
  try {
    const lessonDir = path.join(root, "public/lesson-content/es");
    mkdirSync(lessonDir, { recursive: true });
    for (const name of readdirSync("public/lesson-content/es")) {
      if (name.endsWith(".json")) symlinkSync(path.resolve("public/lesson-content/es", name), path.join(lessonDir, name));
    }
    for (const dir of ["src/data/verb-patterns", "docs/verb-patterns"]) {
      mkdirSync(path.join(root, dir), { recursive: true });
      for (const name of readdirSync(dir)) symlinkSync(path.resolve(dir, name), path.join(root, dir, name));
    }
    const newVerb = { infinitive: "zzzmirar", native: "to zzz-look", forms: { yo: "zzzmiro", tú: "zzzmiras", él_ella_usted: "zzzmira", nosotros: "zzzmiramos", ellos_ustedes: "zzzmiran" }, example: { target: "Zzzmiro.", native: "I zzz-look." } };
    const lessons = { 1: { verbs: [newVerb] } };
    writeFileSync(path.join(lessonDir, "foundation-zzz-new.json"), JSON.stringify({ module: "foundation-zzz-new", lessons }));
    writeFileSync(path.join(lessonDir, "master-zzz-new.json"), JSON.stringify({ module: "master-zzz-new", lessons }));
    // Named like a module, but its module field is a stage id: skipped too.
    writeFileSync(path.join(lessonDir, "zzz-renamed.json"), JSON.stringify({ module: "foundation-zzz-renamed", lessons }));
    const withStages = await readCompileInput(root);
    assert.deepEqual(withStages.lessonFiles.map((f) => f.module), modules);
    assert.equal(compilePatterns(withStages).data.dataHash, compilePatterns(baseline).data.dataHash);
    // A plain module file still counts (the exclusion is not a blanket skip of new files).
    writeFileSync(path.join(lessonDir, "zzz-module.json"), JSON.stringify({ module: "zzz-module", lessons }));
    assert.ok((await readCompileInput(root)).lessonFiles.some((f) => f.module === "zzz-module"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
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

test("R6: no frame is a command, verified or classified (signed in-memory trial)", async () => {
  const { readCompileInput } = await import("../scripts/build-verb-patterns.mts");
  const input = await readCompileInput(process.cwd());
  const unsigned = compilePatterns(input);
  const signed = compilePatterns({ ...input, signoff: { reportSha256: unsigned.data.reportSha256, signedBy: "test", signedAt: "x" } });
  assert.equal(signed.data.signedOff, true);
  assert.ok(signed.data.verbs.some((v) => v.status === "classified"));
  const senseHeads = (gloss) => gloss.replace(/\([^)]*\)/g, " ").split(/[,/;]/)
    .map((x) => x.trim().replace(/^to /, "").split(" ")[0].toLowerCase()).filter(Boolean);
  const adverbs = new Set(["first", "then", "now", "next", "always", "never", "just", "also", "again", "finally", "today"]);
  const aux = new Set(["do", "does", "can", "could", "may", "might", "must", "shall", "should", "will", "would", "have", "has", "is", "are", "am"]);
  const pronouns = new Set(["i", "you", "he", "she", "it", "we", "they"]);
  const clean = (w) => (w ?? "").toLowerCase().replace(/[’‘]/g, "'").replace(/[^\p{L}']/gu, "");
  const commands = [];
  for (const v of signed.data.verbs) {
    const heads = new Set([...senseHeads(v.english), "please", "don't", "let's"]);
    for (const f of v.forms) {
      if (!f.sentence) continue;
      let words = f.sentence.native.trim().split(/\s+/);
      if (words.length > 1 && /^\p{Lu}[\p{L}'’-]*,$/u.test(words[0]) && /^\p{Ll}/u.test(words[1])) words = words.slice(1);
      let at = 0;
      while (at < words.length - 1 && adverbs.has(clean(words[at]))) at++;
      const first = clean(words[at]);
      if (aux.has(first) && pronouns.has(clean(words[at + 1]))) continue;
      if (heads.has(first) || (first === "do" && clean(words[at + 1]) === "not")) commands.push(`${v.infinitive} ${f.person}: ${f.sentence.native}`);
    }
  }
  assert.deepEqual(commands, []);
  for (const inf of ["acomodar", "soltar"]) {
    const v = signed.data.verbs.find((x) => x.infinitive === inf);
    assert.ok(v, inf);
    assert.equal(v.forms[2].sentence, null, `${inf} él_ella_usted`);
  }
  for (const [inf, persons] of Object.entries(overrides.dropFrames)) {
    const v = signed.data.verbs.find((x) => x.infinitive === inf);
    for (const f of v?.forms ?? []) if (persons.includes(f.person)) assert.equal(f.sentence, null, `${inf} ${f.person}`);
  }
});
