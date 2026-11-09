import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isCorrectFormPracticeAnswer } from "../src/lib/language-form-practice.ts";

test("French form checking accepts explicit variants and common typing differences", () => {
  const prompt = {
    pairKey: "French:English",
    frenchAnswer: "Qu’est-ce que tu étudies ce semestre ?",
    knownFrenchVariants: ["Qu'étudies-tu ce semestre ?"],
  };
  assert.ok(isCorrectFormPracticeAnswer("qu est ce que tu etudies ce semestre", prompt, "French:English"));
  assert.ok(isCorrectFormPracticeAnswer("Qu'étudies-tu ce semestre?", prompt, "French:English"));
  assert.equal(isCorrectFormPracticeAnswer("Que fais-tu ce semestre ?", prompt, "French:English"), false);
  assert.equal(isCorrectFormPracticeAnswer("", prompt, "French:English"), false);
  assert.equal(isCorrectFormPracticeAnswer("Qu'étudies-tu ce semestre?", prompt, "Japanese:English"), false);
});

test("Japanese form checking tolerates editorial spaces but preserves wording", () => {
  const prompt = {
    pairKey: "Japanese:English",
    japaneseAnswer: "明日、駅に行きます。",
    knownJapaneseVariants: ["明日は駅に行きます。"],
  };
  assert.ok(isCorrectFormPracticeAnswer("明日 駅に行きます", prompt, "Japanese:English"));
  assert.ok(isCorrectFormPracticeAnswer("明日は駅に行きます", prompt, "Japanese:English"));
  assert.equal(isCorrectFormPracticeAnswer("昨日駅に行きます", prompt, "Japanese:English"), false);
  assert.equal(isCorrectFormPracticeAnswer("明日駅に行きます", prompt, "French:English"), false);
});

test("every private French 101 prompt is accepted only for its exact pair", () => {
  const files = [
    "foundation-1-10",
    "core-1-3",
    "core-4-6",
    "core-7-9",
  ];
  let checked = 0;
  for (const section of files) {
    const path = new URL(`../content/french-basics/private-form-practice-${section}-fr-en.json`, import.meta.url);
    const draft = JSON.parse(readFileSync(path, "utf8"));
    assert.equal(draft.pairKey, "French:English");
    for (const lesson of draft.lessons) {
      for (const sourcePrompt of lesson.prompts) {
        const prompt = { ...sourcePrompt, pairKey: draft.pairKey };
        assert.ok(isCorrectFormPracticeAnswer(sourcePrompt.frenchAnswer, prompt, "French:English"), sourcePrompt.id);
        for (const variant of sourcePrompt.knownFrenchVariants ?? []) {
          assert.ok(isCorrectFormPracticeAnswer(variant, prompt, "French:English"), sourcePrompt.id);
        }
        assert.equal(isCorrectFormPracticeAnswer(sourcePrompt.englishPrompt, prompt, "French:English"), false, sourcePrompt.id);
        assert.equal(isCorrectFormPracticeAnswer(sourcePrompt.frenchAnswer, prompt, "Japanese:English"), false, sourcePrompt.id);
        checked++;
      }
    }
  }
  assert.equal(checked, 77);
});
