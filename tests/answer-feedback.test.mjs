import assert from "node:assert/strict";
import test from "node:test";
import { SLIP_HEADLINE, compareAnswer, verdictHeadline } from "../src/lib/answer-feedback.ts";

const text = (segments) => segments.map((s) => s.text).join("");
const statuses = (segments) => segments.map((s) => s.status);

test("an exact answer is correct with one ok segment and no tips", () => {
  const result = compareAnswer("techo", "techo", "Spanish");
  assert.equal(result.verdict, "correct");
  assert.deepEqual(result.segments, [{ text: "techo", status: "ok" }]);
  assert.deepEqual(result.tips, []);
});

test("case, punctuation and extra spaces are ignored", () => {
  const result = compareAnswer("  DONDE   esta el tejado ", "¿Dónde está el tejado?", "Spanish");
  assert.equal(result.verdict, "accent");
  const exact = compareAnswer("  ¡CUIDADO!  ", "¡Cuidado!", "Spanish");
  assert.equal(exact.verdict, "correct");
  assert.equal(text(exact.segments), "¡Cuidado!");
  assert.equal(compareAnswer("teja asfaltica", "Teja asfáltica", "Spanish").verdict, "accent");
});

test("a missing tilde is an accent verdict with the tilde tip", () => {
  const result = compareAnswer("nino", "niño", "Spanish");
  assert.equal(result.verdict, "accent");
  assert.deepEqual(result.tips, ["Add the tilde: ñ"]);
  assert.deepEqual(result.segments, [
    { text: "ni", status: "ok" },
    { text: "ñ", status: "accent", given: "n" },
    { text: "o", status: "ok" },
  ]);
});

test("a missing accent mark names the letter", () => {
  const result = compareAnswer("tejado asfaltico", "tejado asfáltico", "Spanish");
  assert.equal(result.verdict, "accent");
  assert.deepEqual(result.tips, ["Accent on the á"]);
});

test("dots and cedilla tips", () => {
  assert.deepEqual(compareAnswer("uber", "über", "German").tips, ["Add the dots: ü"]);
  assert.deepEqual(compareAnswer("facade", "façade", "French").tips, ["Add the cedilla: ç"]);
});

test("an accent that should not be there, and the wrong accent", () => {
  assert.deepEqual(compareAnswer("téjado", "tejado", "Spanish").tips, ["No accent on the e"]);
  assert.deepEqual(compareAnswer("cafè", "café", "French").tips, ["Use é, not è"]);
});

test("a missing letter is close and marks where it goes", () => {
  const miss = compareAnswer("teho", "techo", "Spanish");
  assert.equal(miss.verdict, "close");
  assert.deepEqual(miss.segments, [
    { text: "te", status: "ok" },
    { text: "c", status: "missing" },
    { text: "ho", status: "ok" },
  ]);
  assert.deepEqual(miss.tips, ["Missing letter: c"]);
});

test("two missing letters in a row read as one tip", () => {
  const result = compareAnswer("tjado", "tejado", "Spanish");
  assert.deepEqual(result.tips, ["Missing letter: e"]);
  const both = compareAnswer("teado", "tejado", "Spanish");
  assert.deepEqual(both.tips, ["Missing letter: j"]);
  const pair = compareAnswer("tdo", "tejado", "Spanish");
  assert.deepEqual(pair.tips, ["Missing letters: eja"]);
});

test("an extra letter is struck through and tipped", () => {
  const result = compareAnswer("tejaado", "tejado", "Spanish");
  assert.equal(result.verdict, "close");
  assert.deepEqual(statuses(result.segments), ["ok", "extra", "ok"]);
  assert.equal(result.segments[1].text, "a");
  assert.deepEqual(result.tips, ["Extra letter: a"]);
});

test("a wrong letter shows the expected letter and what was written", () => {
  const result = compareAnswer("tejodo", "tejado", "Spanish");
  assert.equal(result.verdict, "close");
  assert.deepEqual(result.segments, [
    { text: "tej", status: "ok" },
    { text: "a", status: "wrong", given: "o" },
    { text: "do", status: "ok" },
  ]);
  assert.deepEqual(result.tips, ["Use a instead of o"]);
});

test("a wrong ending gets an ending tip", () => {
  const result = compareAnswer("tejos", "tejas", "Spanish");
  assert.equal(result.verdict, "close");
  assert.deepEqual(result.tips, ["Ending should be -as"]);
  assert.equal(text(result.segments), "tejas");
  assert.deepEqual(compareAnswer("clavo", "clavos", "Spanish").tips, ["Ending should be -s"]);
});

test("an ending tip is not used when the mistake is earlier in the word", () => {
  const result = compareAnswer("tijas", "tejas", "Spanish");
  assert.deepEqual(result.tips, ["Use e instead of i"]);
});

test("a very different answer is wrong with a single plain tip", () => {
  const result = compareAnswer("martillo", "techo", "Spanish");
  assert.equal(result.verdict, "wrong");
  assert.equal(result.tips.length, 1);
  assert.equal(text(result.segments).replace(/\s/g, "").length > 0, true);
});

test("an empty answer is wrong and marks every letter missing", () => {
  const result = compareAnswer("   ", "techo", "Spanish");
  assert.equal(result.verdict, "wrong");
  assert.deepEqual(result.segments, [{ text: "techo", status: "missing" }]);
  assert.deepEqual(result.tips, ["Nothing written yet"]);
});

test("a missing space between words is tipped", () => {
  const result = compareAnswer("tejaasfaltica", "teja asfaltica", "Spanish");
  assert.equal(result.verdict, "close");
  assert.deepEqual(result.tips, ["Missing space"]);
});

test("an entry with sides is compared with the nearest side and shows that side", () => {
  const result = compareAnswer("forro de techo", "Cubierta / Forro de techo", "Spanish");
  assert.equal(result.verdict, "correct");
  assert.equal(result.target, "Forro de techo");
  const near = compareAnswer("cubierta", "Cubierta / Forro de techo", "Spanish");
  assert.equal(near.verdict, "correct");
  const paren = compareAnswer("teja", "Teja (de barro/concreto)", "Spanish");
  assert.equal(paren.verdict, "correct");
  assert.equal(paren.target, "Teja");
});

test("CJK is compared per character, not accent-stripped", () => {
  const ok = compareAnswer("屋 根", "屋根", "Japanese");
  assert.equal(ok.verdict, "correct");
  const bad = compareAnswer("屋板", "屋根", "Japanese");
  assert.equal(bad.verdict, "close");
  assert.deepEqual(bad.segments, [
    { text: "屋", status: "ok" },
    { text: "根", status: "wrong", given: "板" },
  ]);
  assert.deepEqual(bad.tips, ["Use 根 instead of 板"]);
  assert.equal(compareAnswer("やね", "屋根", "Japanese").verdict, "wrong");
});

test("non-Latin scripts keep diacritics significant", () => {
  const result = compareAnswer("ملا", "مَلا", "Pashto");
  assert.notEqual(result.verdict, "correct");
});

test("segments always spell the chosen target, with extras left out", () => {
  const cases = [
    ["tecnho", "techo"],
    ["nino", "niño"],
    ["xx", "techo"],
    ["Donde esta tejado", "¿Dónde está el tejado?"],
  ];
  for (const [given, expected] of cases) {
    const result = compareAnswer(given, expected, "Spanish");
    const spelled = result.segments
      .filter((s) => s.status !== "extra")
      .map((s) => s.text)
      .join("");
    assert.equal(spelled, result.target, `${given} vs ${expected}`);
  }
});

test("the headline follows the letter verdict when the scorer has not forgiven the answer", () => {
  assert.equal(verdictHeadline("correct"), "Correct");
  assert.equal(verdictHeadline("accent"), "Right word, check the accent");
  assert.equal(verdictHeadline("close"), "Close");
  assert.equal(verdictHeadline("wrong"), "Not quite");
  assert.equal(verdictHeadline("close", false), "Close");
});

test("a slip the scorer counted correct reads Correct, small slip, never Close", () => {
  assert.equal(SLIP_HEADLINE, "Correct \u2014 small slip");
  for (const verdict of ["accent", "close", "wrong"]) {
    assert.equal(verdictHeadline(verdict, true), SLIP_HEADLINE);
  }
  assert.equal(verdictHeadline("correct", true), "Correct");
});

test("a one-letter slip in a phrase is close, and the tips stay for the learner", () => {
  const result = compareAnswer(
    "Revisen la pendiente del tecno antes de empezar",
    "Revisen la pendiente del techo antes de empezar",
    "Spanish",
  );
  assert.equal(result.verdict, "close");
  assert.ok(result.tips.length > 0);
  assert.equal(verdictHeadline(result.verdict, true), SLIP_HEADLINE);
});
