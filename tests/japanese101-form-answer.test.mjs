import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isCorrectFormPracticeAnswer, isCorrectFormMeaning } from "../src/lib/language-form-practice.ts";

test("Japanese form meaning recognition uses the authored English cue", () => {
  assert.ok(isCorrectFormMeaning("Hello!", "Hello."));
  assert.equal(isCorrectFormMeaning("Goodbye", "Hello."), false);
  assert.equal(isCorrectFormMeaning("", "Hello."), false);
});

test("Japanese form answers keep source wording and exact language ownership", () => {
  const sections = ["foundation-1-10", "core-1-10", "core-11-20", "core-21-30", "master-1-10", "master-11-20"];
  let checked = 0;
  for (const section of sections) {
    const draft = JSON.parse(readFileSync(new URL(
      `../content/japanese-basics/private-form-practice-${section}-ja-en.json`, import.meta.url,
    )));
    assert.equal(draft.pairKey, "Japanese:English");
    assert.equal(draft.registered, false);
    for (const lesson of draft.lessons) {
      for (const source of lesson.prompts) {
        const prompt = { ...source, pairKey: draft.pairKey };
        assert.ok(isCorrectFormPracticeAnswer(source.japaneseAnswer, prompt, "Japanese:English"), source.id);
        assert.equal(isCorrectFormPracticeAnswer(source.englishPrompt, prompt, "Japanese:English"), false, source.id);
        assert.equal(isCorrectFormPracticeAnswer(source.japaneseAnswer, prompt, "French:English"), false, source.id);
        checked++;
      }
    }
  }
  assert.equal(checked, 235);
});
