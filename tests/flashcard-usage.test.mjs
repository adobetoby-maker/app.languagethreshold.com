import assert from "node:assert/strict";
import test from "node:test";
import { flashcardUsageExample } from "../src/lib/flashcard-usage.ts";

const card = {
  word: "Teja asfáltica",
  language: "Spanish",
  example: "Teja asfáltica",
  exampleTranslation: "Shingle",
};
test("uses an existing card's sentence before searching other readings", () => {
  assert.deepEqual(
    flashcardUsageExample(
      { ...card, example: "Trae una teja.", exampleTranslation: "Bring a shingle." },
      [],
    ),
    { target: "Trae una teja.", native: "Bring a shingle." },
  );
});
test("finds an authored plural example for a Spanish term instead of repeating its label", () => {
  const example = {
    target: "Necesitamos más tejas asfálticas.",
    native: "We need more asphalt shingles.",
  };
  assert.equal(flashcardUsageExample(card, [example]), example);
});
test("matches whole words, supports supplied alternatives and never invents a missing example", () => {
  const example = { target: "Mira el canalón.", native: "Look at the gutter." };
  assert.equal(
    flashcardUsageExample({ ...card, word: "Canal / Canalón", example: "" }, [example]),
    example,
  );
  assert.equal(
    flashcardUsageExample({ ...card, word: "can", example: "" }, [
      { target: "cantar", native: "sing" },
    ]),
    null,
  );
  assert.equal(flashcardUsageExample(card, []), null);
});
test("handles scripts without spaces and canonically equivalent accents", () => {
  const chinese = { target: "我回家了。", native: "I came home." };
  assert.equal(
    flashcardUsageExample({ ...card, word: "家", language: "Chinese", example: "" }, [chinese]),
    chinese,
  );
  const example = {
    target: "Mira la teja asfa\u0301ltica.",
    native: "Look at the asphalt shingle.",
  };
  assert.equal(flashcardUsageExample(card, [example]), example);
});
