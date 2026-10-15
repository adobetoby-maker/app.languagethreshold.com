import assert from "node:assert/strict";
import test from "node:test";
import { ROOFING_LESSONS } from "../src/data/roofing-curriculum.ts";
import { ROOFING_LESSON_WORDS } from "../src/data/roofing-lesson-words.ts";
import {
  ROOFING_EXTRA_MATERIALS,
  ROOFING_EXTRA_PHRASES,
  ROOFING_GUIDE_MATERIALS,
  ROOFING_GUIDE_PHRASES,
} from "../src/data/roofing-content.ts";

// True cognates (or loanwords) whose Spanish may legitimately equal the English entry.
const ALLOWED_IDENTICAL = new Set(["fascia", "panel"]);

const norm = (text) => text.trim().toLowerCase();

const drillList = (lesson) => {
  const step = lesson.steps.find((s) => s.instruction.startsWith("Drill and pronounce:"));
  assert.ok(step, `lesson ${lesson.n} has a drill step`);
  return step.instruction
    .replace(/^Drill and pronounce:\s*/, "")
    .replace(/\.$/, "")
    .split(",")
    .map((item) => item.trim());
};

const terms = (n) => ROOFING_LESSON_WORDS[n].filter((word) => word.kind === "term");
const phrases = (n) => ROOFING_LESSON_WORDS[n].filter((word) => word.kind === "phrase");

test("every roofing lesson 1..30 has words wired onto the lesson", () => {
  assert.equal(ROOFING_LESSONS.length, 30);
  assert.equal(Object.keys(ROOFING_LESSON_WORDS).length, 30);
  for (let n = 1; n <= 30; n++) {
    assert.ok(Array.isArray(ROOFING_LESSON_WORDS[n]), `lesson ${n} has words`);
    const lesson = ROOFING_LESSONS.find((l) => l.n === n);
    assert.deepEqual(lesson.words, ROOFING_LESSON_WORDS[n], `lesson ${n} carries its words`);
  }
});

test("each lesson has 8-12 terms and 4-6 phrases, every entry marked with a kind", () => {
  for (let n = 1; n <= 30; n++) {
    for (const word of ROOFING_LESSON_WORDS[n]) {
      assert.ok(
        word.kind === "term" || word.kind === "phrase",
        `lesson ${n} ${word.en} has a kind`,
      );
    }
    const termCount = terms(n).length;
    const phraseCount = phrases(n).length;
    assert.ok(termCount >= 8 && termCount <= 12, `lesson ${n} has ${termCount} terms`);
    assert.ok(phraseCount >= 4 && phraseCount <= 6, `lesson ${n} has ${phraseCount} phrases`);
    assert.equal(termCount + phraseCount, ROOFING_LESSON_WORDS[n].length);
  }
});

test("drill words come first, in their original order", () => {
  for (const lesson of ROOFING_LESSONS) {
    const drill = drillList(lesson);
    const words = ROOFING_LESSON_WORDS[lesson.n];
    assert.deepEqual(
      words.slice(0, drill.length).map((word) => norm(word.en)),
      drill.map(norm),
      `lesson ${lesson.n} drill words lead the list`,
    );
    for (const word of words.slice(0, drill.length)) assert.equal(word.kind, "term");
    // all terms precede all phrases
    const firstPhrase = words.findIndex((word) => word.kind === "phrase");
    assert.ok(words.slice(firstPhrase).every((word) => word.kind === "phrase"));
  }
});

test("no duplicate English entries within a lesson", () => {
  for (const [n, words] of Object.entries(ROOFING_LESSON_WORDS)) {
    const keys = words.map((word) => norm(word.en));
    assert.equal(new Set(keys).size, keys.length, `lesson ${n} has duplicate en entries`);
  }
});

test("no empty strings and Spanish differs from English except listed cognates", () => {
  for (const [n, words] of Object.entries(ROOFING_LESSON_WORDS)) {
    for (const word of words) {
      assert.ok(word.en.trim().length > 0, `lesson ${n} empty en`);
      assert.ok(word.es.trim().length > 0, `lesson ${n} empty es for ${word.en}`);
      if (word.note !== undefined) {
        assert.ok(word.note.trim().length > 0, `lesson ${n} empty note for ${word.en}`);
      }
      assert.equal(word.es, word.es.trim(), `lesson ${n} ${word.en} es has stray spaces`);
      assert.match(word.es, /^[A-ZÁÉÍÓÚÑ¿¡]/, `lesson ${n} ${word.en} es starts with a capital`);
      if (!ALLOWED_IDENTICAL.has(norm(word.en))) {
        assert.notEqual(norm(word.es), norm(word.en), `lesson ${n} ${word.en} is untranslated`);
      }
    }
  }
});

test("phrases are full sentences and terms are not", () => {
  for (const [n, words] of Object.entries(ROOFING_LESSON_WORDS)) {
    for (const word of words) {
      if (word.kind !== "phrase") continue;
      assert.match(word.en, /[.?!]$/, `lesson ${n} phrase "${word.en}" ends with punctuation`);
      assert.match(word.es, /[.?!]$/, `lesson ${n} phrase "${word.es}" ends with punctuation`);
    }
  }
});

test("a term has the same Spanish in every lesson that uses it (install is noun vs verb)", () => {
  const seen = new Map();
  for (const [n, words] of Object.entries(ROOFING_LESSON_WORDS)) {
    for (const word of words) {
      if (word.kind === "term" && norm(word.en) === "install") continue; // verb in 13, phase noun in 30
      const key = `${word.kind}:${norm(word.en)}`;
      if (seen.has(key)) assert.deepEqual(word, seen.get(key), `${word.en} in lesson ${n}`);
      else seen.set(key, word);
    }
  }
});

test("entries that exist in roofing-content.ts reuse its exact Spanish", () => {
  const materials = new Map(
    [...ROOFING_GUIDE_MATERIALS, ...ROOFING_EXTRA_MATERIALS].map((pair) => [
      norm(pair.en),
      pair.es,
    ]),
  );
  const phraseMap = new Map(
    [...Object.values(ROOFING_GUIDE_PHRASES), ...Object.values(ROOFING_EXTRA_PHRASES)]
      .flat()
      .map((pair) => [norm(pair.en), pair.es]),
  );
  // Lesson labels that name an existing vocabulary entry under a shorter or variant English label.
  const aliases = new Map([
    ["tile", "tile (clay/concrete)"],
    ["roof deck", "roof deck / sheathing"],
    ["vent", "vent (ridge / box)"],
    ["soft deck", "soft or rotten deck"],
  ]);
  let termsChecked = 0;
  let phrasesChecked = 0;
  for (const words of Object.values(ROOFING_LESSON_WORDS)) {
    for (const word of words) {
      const key = norm(word.en);
      if (word.kind === "phrase") {
        if (!phraseMap.has(key)) continue;
        assert.equal(
          word.es,
          phraseMap.get(key),
          `phrase "${word.en}" reuses the existing Spanish`,
        );
        phrasesChecked++;
      } else {
        const materialKey = aliases.get(key) ?? key;
        if (!materials.has(materialKey)) continue;
        assert.equal(word.es, materials.get(materialKey), `${word.en} reuses the existing Spanish`);
        termsChecked++;
      }
    }
  }
  assert.ok(termsChecked >= 40, `expected many reused terms, checked ${termsChecked}`);
  assert.ok(phrasesChecked >= 20, `expected many reused phrases, checked ${phrasesChecked}`);
});
