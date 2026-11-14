import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url));
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const batches = [
  { start: 1, sourceBytes: read("./foundation-1-3-draft.json"), modes: JSON.parse(read("./private-foundation-1-3-mode-prompts-fr-en.json")) },
  { start: 4, sourceBytes: read("./foundation-4-6-draft.json"), modes: JSON.parse(read("./private-foundation-4-6-mode-prompts-fr-en.json")) },
  { start: 7, sourceBytes: read("./foundation-7-8-draft.json"), modes: JSON.parse(read("./private-foundation-7-8-mode-prompts-fr-en.json")) },
];
const forms = JSON.parse(read("./private-form-practice-foundation-1-10-fr-en.json"));
const spanishBytes = read("../../src/data/core60/es/foundation-spanish-basics.json");
assert.equal(forms.reviewed, false);
assert.equal(forms.registered, false);
assert.equal(forms.lessons.length, 10);

for (const { start, sourceBytes, modes } of batches) {
  const source = JSON.parse(sourceBytes);
  assert.equal(sha(spanishBytes), source.source.sourceSha256);
  assert.equal(modes.sourceSha256, sha(sourceBytes));
  assert.equal(source.target, "French");
  assert.equal(source.native, "English");
  assert.equal(source.reviewed, false);
  assert.equal(modes.reviewed, false);
  assert.equal(modes.registered, false);
  assert.equal(source.lessons.length, modes.lessons.length);
  assert.equal(source.lessons.length, start === 7 ? 2 : 3);
  for (let i = 0; i < source.lessons.length; i++) {
    const lesson = source.lessons[i];
    const activity = modes.lessons[i];
    const n = start + i;
    const practice = forms.lessons[n - 1];
    const stable = `foundation-french-basics:${n}`;
    assert.equal(lesson.n, n);
    assert.equal(lesson.locale, "fr-FR");
    assert.equal(activity.stableLessonKey, stable);
    assert.equal(practice.stableLessonKey, stable);
    assert.equal(practice.reviewed, false);
    assert.equal(new Set(practice.prompts.map((entry) => entry.id)).size, practice.prompts.length);
    const lines = lesson.dialogue.map((line) => {
      const pieces = line.split("|");
      assert.equal(pieces.length, 2);
      return pieces[0];
    });
    assert.ok(lesson.words.length > 0);
    assert.ok(lesson.speaking);
    assert.deepEqual(Object.keys(activity.modes).sort(), ["see", "recall", "hear", "type", "say", "write"].sort());
    for (const mode of Object.values(activity.modes)) {
      assert.ok(mode.prompt?.trim());
      assert.ok(mode.targetText?.trim());
      assert.ok([...lesson.words.map((word) => word.fr), ...lines].some((text) => text.includes(mode.targetText)),
        `Foundation ${n} mode target is absent from cards and Reader`);
    }
    for (const prompt of practice.prompts) {
      assert.equal(prompt.reviewed, false);
      assert.equal(prompt.sourceReaderTarget, lines[prompt.sourceReaderTurn - 1]);
      assert.ok(prompt.sourceReaderTarget.includes(prompt.frenchAnswer));
    }
  }
}
console.log("French 101 Foundation 1–8 source, modes, forms, IDs and closed gates pass");
