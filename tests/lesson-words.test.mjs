import assert from "node:assert/strict";
import test from "node:test";
import {
  cleanLessonWords,
  hasEnoughWords,
  isCorrectTypedAnswer,
  isLatinScript,
  languageCode,
  languageTag,
  lessonWordsKey,
  normalizeScriptAnswer,
  pickAuthoredWords,
  readCachedLessonWords,
  readCachedWords,
  wordsFromModelOutput,
  writeCachedWords,
} from "../src/lib/lesson-words-core.ts";

const pair = (native, target, extra = {}) => ({ native, target, ...extra });
const terms = (n) => Array.from({ length: n }, (_, i) => pair(`term ${i}`, `terme ${i}`));
const phrases = (n) => Array.from({ length: n }, (_, i) => pair(`phrase ${i}`, `phrase fr ${i}`));

function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => void data.set(k, v),
  };
}

test("cache key includes module, lesson, language and native language", () => {
  assert.equal(
    lessonWordsKey("orthopedics", 5, "French", "English"),
    "lt.lessonWords.v1.orthopedics.5.French.English",
  );
  assert.notEqual(
    lessonWordsKey("m", 1, "French", "English"),
    lessonWordsKey("m", 1, "French", "Spanish"),
  );
});

test("model output maps native/target to en/es with kinds, terms first", () => {
  const out = wordsFromModelOutput({
    terms: [pair(" drill ", " perceuse ", { note: " tool " })],
    phrases: [pair("Where does it hurt?", "Où avez-vous mal ?")],
  });
  assert.deepEqual(out, [
    { en: "drill", es: "perceuse", kind: "term", note: "tool" },
    { en: "Where does it hurt?", es: "Où avez-vous mal ?", kind: "phrase" },
  ]);
});

test("cleaning drops empty, oversized and duplicate entries (case-insensitive, both sides)", () => {
  const out = wordsFromModelOutput({
    terms: [
      pair("saw", "scie"),
      pair("SAW", "scie 2"), // duplicate native
      pair("blade", "SCIE"), // duplicate target
      pair("", "vide"),
      pair("x", "   "),
      pair("long", "y".repeat(500)),
      { native: 3, target: "oops" },
      null,
      pair("hammer", "marteau"),
    ],
    phrases: "not an array",
  });
  assert.deepEqual(
    out.map((w) => w.es),
    ["scie", "marteau"],
  );
});

test("cleaning caps at 12 terms and 6 phrases", () => {
  const out = wordsFromModelOutput({ terms: terms(20), phrases: phrases(20) });
  assert.equal(out.filter((w) => w.kind === "term").length, 12);
  assert.equal(out.filter((w) => w.kind === "phrase").length, 6);
  assert.ok(hasEnoughWords(out));
});

test("too few words is not enough for a kit", () => {
  assert.equal(hasEnoughWords(wordsFromModelOutput({ terms: terms(5), phrases: phrases(6) })), false);
  assert.equal(hasEnoughWords(wordsFromModelOutput({ terms: terms(8), phrases: phrases(2) })), false);
  assert.equal(hasEnoughWords(wordsFromModelOutput({ terms: terms(6), phrases: phrases(3) })), true);
});

test("model output of the wrong shape yields nothing", () => {
  for (const bad of [null, undefined, 4, "x", [], {}, { terms: null }]) {
    assert.deepEqual(wordsFromModelOutput(bad), []);
  }
});

test("authored words are used only for Spanish", () => {
  const authored = [{ en: "roof", es: "techo", kind: "term" }];
  assert.deepEqual(pickAuthoredWords(authored, "Spanish"), authored);
  assert.equal(pickAuthoredWords(authored, "French"), null);
  assert.equal(pickAuthoredWords(undefined, "Spanish"), null);
  assert.equal(pickAuthoredWords([], "Spanish"), null);
});

test("cache write then read round-trips and validates", () => {
  const storage = fakeStorage();
  const words = cleanLessonWords(
    wordsFromModelOutput({ terms: terms(8), phrases: phrases(4) }),
  );
  const key = lessonWordsKey("m", 2, "French", "English");
  assert.equal(writeCachedWords(key, words, storage), true);
  assert.deepEqual(readCachedWords(key, storage), words);
  assert.deepEqual(readCachedLessonWords("m", 2, "French", "English", storage), words);
  assert.equal(readCachedLessonWords("m", 3, "French", "English", storage), null);
});

test("cache read survives bad JSON, junk shapes and throwing storage", () => {
  const key = "k";
  assert.equal(readCachedWords(key, fakeStorage({ k: "{not json" })), null);
  assert.equal(readCachedWords(key, fakeStorage({ k: JSON.stringify({ a: 1 }) })), null);
  assert.equal(readCachedWords(key, fakeStorage({ k: JSON.stringify([{ en: 1 }]) })), null);
  const throwing = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
  assert.equal(readCachedWords(key, throwing), null);
  assert.equal(writeCachedWords(key, [{ en: "a", es: "b", kind: "term" }], throwing), false);
  assert.equal(readCachedWords(key, null), null);
  assert.equal(writeCachedWords(key, [], fakeStorage()), false);
});

test("language tags and short codes", () => {
  assert.equal(languageTag("Spanish"), "es");
  assert.equal(languageTag("Chinese"), "zh");
  assert.equal(languageTag("Klingon"), "und");
  assert.equal(languageCode("Spanish"), "ES");
  assert.equal(languageCode("English"), "EN");
  assert.equal(languageCode("Chinese (Simplified)"), "ZH");
});

test("script detection", () => {
  assert.equal(isLatinScript("perceuse à main"), true);
  assert.equal(isLatinScript("ドリル"), false);
  assert.equal(isLatinScript("OSHA 안전"), false);
  assert.equal(isLatinScript("12 / 3"), true);
});

test("Latin typed answers stay accent- and case-insensitive", () => {
  assert.equal(isCorrectTypedAnswer("Perceuse", "perceuse"), true);
  assert.equal(isCorrectTypedAnswer("ou avez-vous mal", "Où avez-vous mal ?"), true);
  assert.equal(isCorrectTypedAnswer("marteau", "perceuse"), false);
  assert.equal(isCorrectTypedAnswer("tecnico", "técnico"), true);
});

test("CJK typed answers compare exact after trimming and punctuation", () => {
  assert.equal(isCorrectTypedAnswer("  ドリル ", "ドリル"), true);
  assert.equal(isCorrectTypedAnswer("ドリル。", "ドリル"), true);
  assert.equal(isCorrectTypedAnswer("ドリー", "ドリル"), false);
  assert.equal(isCorrectTypedAnswer("痛 在 哪 里", "痛在哪里？"), true);
  assert.equal(isCorrectTypedAnswer("痛在哪", "痛在哪里"), false);
  assert.equal(isCorrectTypedAnswer("한국", "한국어"), false);
  assert.equal(isCorrectTypedAnswer("한국어", "한국어"), true);
  assert.equal(isCorrectTypedAnswer("", "ドリル"), false);
});

test("non-Latin answers keep diacritics and accept slash and parenthesis variants", () => {
  // Pashto: the vowel mark is part of the answer; dropping it is wrong, not "close enough".
  assert.equal(isCorrectTypedAnswer("کتاب", "کتاب"), true);
  assert.equal(isCorrectTypedAnswer("کِتاب", "کتاب"), false);
  assert.equal(isCorrectTypedAnswer("ドリル", "ドリル (電動)"), true);
  assert.equal(isCorrectTypedAnswer("のこぎり", "鋸 / のこぎり"), true);
  assert.equal(normalizeScriptAnswer("ＡＢＣ　テスト"), "abcテスト");
});
