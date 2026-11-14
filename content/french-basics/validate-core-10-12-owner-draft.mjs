import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const candidate = JSON.parse(read("./private-core-10-12-owner-candidate-fr-en.json"));
const modes = JSON.parse(read("./private-core-10-12-mode-prompts-fr-en.json"));
const forms = JSON.parse(read("./private-form-practice-core-10-12-fr-en.json"));
const draft = read("./core-10-12-draft.json");
const english = read("./source-english-core-10-12.json");
const spanish = read("../../src/data/spanish-basics-core.json");
const practice = read("../../src/data/spanish-basics-practice.json");
const expectedSource = "6d200aae866bbd1561e9bc9b035a516641b555592561bb51168bbecae9f74af5";
assert.equal(candidate.sourceFile, "content/french-basics/private-runtime-core-1-30.json");
assert.equal(candidate.sourceSha256, expectedSource);
assert.equal(candidate.draftSha256, sha(draft));
assert.equal(candidate.englishSourceSha256, sha(english));
assert.equal(candidate.sourceFileSha256["src/data/spanish-basics-core.json"], sha(spanish));
assert.equal(candidate.sourceFileSha256["src/data/spanish-basics-practice.json"], sha(practice));
assert.equal(candidate.target, "French");
assert.equal(candidate.native, "English");
assert.equal(candidate.reviewed, false);
assert.equal(candidate.registered, false);
for (const sidecar of [modes, forms]) {
  assert.equal(sidecar.pairKey, "French:English");
  assert.equal(sidecar.sourceFile, "content/french-basics/private-runtime-core-1-30.json");
  assert.equal(sidecar.sourceSha256, expectedSource);
  assert.equal(sidecar.reviewed, false);
  assert.equal(sidecar.registered, false);
}
assert.deepEqual(candidate.lessons.map((lesson) => lesson.n), [10, 11, 12]);
assert.deepEqual(modes.lessons.map((lesson) => lesson.lesson), [10, 11, 12]);
assert.deepEqual(forms.lessons.map((lesson) => lesson.lesson), [10, 11, 12]);
for (let i = 0; i < 3; i++) {
  const lesson = candidate.lessons[i];
  const activity = modes.lessons[i];
  const practiceLesson = forms.lessons[i];
  const stable = `french-basics:${i + 10}`;
  assert.equal(activity.stableLessonKey, stable);
  assert.equal(practiceLesson.stableLessonKey, stable);
  assert.equal(practiceLesson.reviewed, false);
  assert.equal(lesson.words.length, 14);
  assert.equal(lesson.reader.length, 6);
  assert.ok(lesson.speaking.trim());
  assert.deepEqual(Object.keys(activity.modes).sort(), ["see", "recall", "hear", "type", "say", "write"].sort());
  const targets = [...lesson.words.map((word) => word.fr), ...lesson.reader.map((line) => line.fr),
    ...practiceLesson.prompts.map((prompt) => prompt.frenchAnswer)];
  for (const mode of Object.values(activity.modes)) {
    assert.ok(mode.prompt?.trim());
    assert.ok(mode.targetText?.trim());
    assert.ok(targets.some((target) => target.includes(mode.targetText)), `Core ${i + 10} mode target absent from cards, Reader and forms`);
  }
  assert.equal(new Set(practiceLesson.prompts.map((prompt) => prompt.id)).size, practiceLesson.prompts.length);
  for (const prompt of practiceLesson.prompts) {
    assert.equal(prompt.reviewed, false);
    assert.ok(prompt.englishPrompt?.trim());
    assert.ok(prompt.frenchAnswer?.trim());
    if (prompt.source === "aligned-reader") {
      assert.equal(prompt.frenchAnswer, lesson.reader[prompt.sourceReaderTurn - 1]?.fr);
      assert.equal(prompt.englishPrompt, lesson.reader[prompt.sourceReaderTurn - 1]?.en);
    }
  }
}
console.log("French 101 Core 10–12 source, mode, form, ID and closed-gate checks passed");
