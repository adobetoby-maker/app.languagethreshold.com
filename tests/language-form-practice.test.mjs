import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isCorrectFormPracticeAnswer } from "../src/lib/language-form-practice.ts";

test("French form checking accepts explicit variants and punctuation differences but preserves accents", () => {
  const prompt = {
    pairKey: "French:English",
    frenchAnswer: "Qu’est-ce que tu étudies ce semestre ?",
    knownFrenchVariants: ["Qu'étudies-tu ce semestre ?"],
  };
  assert.equal(isCorrectFormPracticeAnswer("qu est ce que tu etudies ce semestre", prompt, "French:English"), false);
  assert.ok(isCorrectFormPracticeAnswer("qu est ce que tu étudies ce semestre", prompt, "French:English"));
  assert.ok(isCorrectFormPracticeAnswer("Qu'étudies-tu ce semestre?", prompt, "French:English"));
  assert.equal(isCorrectFormPracticeAnswer("Que fais-tu ce semestre ?", prompt, "French:English"), false);
  assert.equal(isCorrectFormPracticeAnswer("", prompt, "French:English"), false);
  assert.equal(isCorrectFormPracticeAnswer("Qu'étudies-tu ce semestre?", prompt, "Japanese:English"), false);
});

test("all accented French 101 source forms reject an accentless rewrite", () => {
  const preview = JSON.parse(readFileSync(new URL(
    "../content/french-basics/private-form-runtime-preview-fr-en.json", import.meta.url,
  )));
  let accented = 0;
  for (const lesson of preview.lessons) {
    for (const activity of lesson.activities.filter((item) => item.mode === "produce-target")) {
      const withoutMarks = activity.answer.normalize("NFD").replace(/\p{M}/gu, "");
      if (withoutMarks === activity.answer) continue;
      accented += 1;
      assert.equal(isCorrectFormPracticeAnswer(withoutMarks, {
        pairKey: "French:English", frenchAnswer: activity.answer,
        knownFrenchVariants: activity.knownFrenchVariants,
      }, "French:English"), false, activity.id);
    }
  }
  assert.equal(accented, 235);
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
    "core-10-12",
    "core-13-18",
    "core-19-30",
    "master-1-20",
  ];
  let checked = 0;
  const ids = new Set();
  for (const section of files) {
    const path = new URL(`../content/french-basics/private-form-practice-${section}-fr-en.json`, import.meta.url);
    const draft = JSON.parse(readFileSync(path, "utf8"));
    assert.equal(draft.pairKey, "French:English");
    assert.match(draft.sourceFile, /^(?:content\/french-basics\/)?[^/]+\.json$/);
    const sourcePath = draft.sourceFile.startsWith("content/")
      ? `../${draft.sourceFile}`
      : `../content/french-basics/${draft.sourceFile}`;
    const source = readFileSync(new URL(sourcePath, import.meta.url));
    assert.equal(draft.sourceSha256, createHash("sha256").update(source).digest("hex"));
    assert.equal(draft.registered, false);
    assert.equal(draft.reviewed, false);
    for (const lesson of draft.lessons) {
      for (const sourcePrompt of lesson.prompts) {
        assert.equal(ids.has(sourcePrompt.id), false, sourcePrompt.id);
        ids.add(sourcePrompt.id);
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
  assert.equal(checked, 329);
  assert.equal(ids.size, 329);
});

test("Master form answers preserve the exact spoken source without speaker labels", () => {
  const draft = JSON.parse(readFileSync(new URL(
    "../content/french-basics/private-form-practice-master-1-20-fr-en.json", import.meta.url,
  )));
  const source = JSON.parse(readFileSync(new URL(`../${draft.sourceFile}`, import.meta.url)));
  for (const lesson of draft.lessons) {
    const reader = source.support[lesson.lesson - 1].reader;
    for (const prompt of lesson.prompts) {
      const index = prompt.sourceReaderTurn - 1;
      assert.equal(prompt.sourceFrenchLine, reader.target[index]);
      assert.equal(prompt.sourceEnglishLine, reader.native[index]);
      assert.equal(`${prompt.sourceFrenchSpeaker} : ${prompt.frenchAnswer}`, reader.target[index]);
      assert.equal(`${prompt.sourceEnglishSpeaker}: ${prompt.englishPrompt}`, reader.native[index]);
      assert.equal(prompt.audioDisplayText, reader.target[index]);
    }
  }
});
