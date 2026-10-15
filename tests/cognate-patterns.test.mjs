import assert from "node:assert/strict";
import test from "node:test";
import {
  ALL_COGNATE_RULES,
  COGNATE_TARGET_LANGUAGES,
  getCognateRules,
  getCognateSources,
} from "../src/data/cognate-patterns.ts";

// Pattern syntax (see src/data/cognates/helpers.ts): alternatives separated by " / ";
// "-x" = ends with x, "x-" = starts with x, "x" = contains x, "~..." = not checked.
function matches(word, pattern) {
  if (pattern.startsWith("~")) return true;
  const w = word.normalize("NFC").toLowerCase();
  return pattern.split(" / ").some((alt) => {
    const a = alt.normalize("NFC").toLowerCase().trim();
    if (a.startsWith("-")) return w.endsWith(a.slice(1));
    if (a.endsWith("-")) return w.startsWith(a.slice(0, -1));
    return w.includes(a);
  });
}

test("every rule has a unique id and well-formed fields", () => {
  const ids = new Set();
  for (const r of ALL_COGNATE_RULES) {
    assert.ok(!ids.has(r.id), `duplicate rule id ${r.id}`);
    ids.add(r.id);
    assert.ok(r.name && r.hook && r.sourcePattern && r.targetPattern, `${r.id}: missing text`);
    assert.ok(["ultra", "high", "medium"].includes(r.frequency), `${r.id}: bad frequency`);
    assert.ok(r.reliability >= 0 && r.reliability <= 100, `${r.id}: reliability out of range`);
    assert.notEqual(r.sourceLanguage, r.targetLanguage, `${r.id}: same source and target`);
    // The original Italian rules sometimes have only two or three examples.
    const minExamples = r.targetLanguage === "Italian" ? 2 : 4;
    assert.ok(r.examples.length >= minExamples, `${r.id}: needs at least ${minExamples} examples`);
    for (const e of r.examples) {
      assert.ok(e.source && e.target && e.gloss, `${r.id}: empty example field`);
    }
  }
});

test("every example actually follows its rule's patterns", () => {
  const problems = [];
  // The original Italian rules (src/data/cognate-patterns.ts) describe their patterns
  // in free text such as "gn or nn", so they are exempt from this mechanical check.
  for (const r of ALL_COGNATE_RULES.filter((x) => x.targetLanguage !== "Italian")) {
    for (const e of r.examples) {
      if (!matches(e.source, r.sourcePattern)) {
        problems.push(`${r.id}: "${e.source}" does not match source pattern ${r.sourcePattern}`);
      }
      if (!matches(e.target, r.targetPattern)) {
        problems.push(`${r.id}: "${e.target}" does not match target pattern ${r.targetPattern}`);
      }
    }
  }
  assert.deepEqual(problems, []);
});

test("no rule repeats the same example word twice", () => {
  for (const r of ALL_COGNATE_RULES) {
    const seen = new Set();
    for (const e of r.examples) {
      const key = `${e.source}|${e.target}`;
      assert.ok(!seen.has(key), `${r.id}: duplicate example ${key}`);
      seen.add(key);
    }
  }
});

test("every language the app teaches has working cognate rules", () => {
  assert.equal(COGNATE_TARGET_LANGUAGES.length, 10);
  for (const target of COGNATE_TARGET_LANGUAGES) {
    const rules = getCognateRules(target);
    assert.ok(rules.length >= 6, `${target}: only ${rules.length} rules (need at least 6)`);
    assert.ok(getCognateSources(target).length >= 1, `${target}: no source languages`);
    assert.ok(
      rules.some((r) => r.frequency === "ultra" || r.frequency === "high"),
      `${target}: needs at least one high-value rule`,
    );
  }
});

test("Spanish has a full bridge from English, French, Portuguese and Italian", () => {
  const sources = getCognateSources("Spanish");
  for (const s of ["English", "French", "Portuguese", "Italian"]) {
    assert.ok(sources.includes(s), `Spanish is missing the ${s} bridge`);
  }
  assert.ok(getCognateRules("Spanish", "English").length >= 25, "English → Spanish should be rich");
  for (const s of ["French", "Portuguese", "Italian"]) {
    assert.ok(getCognateRules("Spanish", s).length >= 10, `${s} → Spanish needs 10+ rules`);
  }
  // Spot checks on the most important English → Spanish words.
  const all = getCognateRules("Spanish", "English").flatMap((r) => r.examples);
  const has = (s, t) => all.some((e) => e.source === s && e.target === t);
  assert.ok(has("information", "información"));
  assert.ok(has("university", "universidad"));
  assert.ok(has("probably", "probablemente"));
  assert.ok(has("station", "estación"));
});
