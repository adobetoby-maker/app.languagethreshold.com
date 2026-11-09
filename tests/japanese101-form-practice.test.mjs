import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Japanese 101 Foundation and Core 1–30 form prompts retain exact source pairs", () => {
  const batches = [
    ["foundation", "1-10", 10, 38, "foundation-japanese-basics"],
    ["core", "1-10", 10, 33, "japanese-basics"],
    ["core", "11-20", 10, 39, "japanese-basics"],
    ["core", "21-30", 10, 42, "japanese-basics"],
  ];
  const ids = new Set();
  for (const [stage, range, lessonCount, promptCount, moduleId] of batches) {
    const sourceBytes = readFileSync(new URL(`../content/japanese-basics/${stage}.json`, import.meta.url));
    const source = JSON.parse(sourceBytes);
    const draft = JSON.parse(readFileSync(new URL(
      `../content/japanese-basics/private-form-practice-${stage}-${range}-ja-en.json`, import.meta.url,
    )));
    assert.equal(draft.sourceSha256, createHash("sha256").update(sourceBytes).digest("hex"));
    assert.equal(draft.pairKey, "Japanese:English");
    assert.equal(draft.registered, false);
    assert.equal(draft.reviewed, false);
    assert.equal(draft.lessons.length, lessonCount);
    let batchCount = 0;
    for (const lesson of draft.lessons) {
      assert.equal(lesson.moduleId, moduleId);
      assert.equal(lesson.reviewed, false);
      const dialogue = source.lessons[lesson.lesson - 1].dialogue;
      for (const prompt of lesson.prompts) {
        const [japanese, english] = dialogue[prompt.sourceDialogueTurn - 1].split("|", 2);
        assert.equal(prompt.japaneseAnswer, japanese);
        assert.equal(prompt.englishPrompt, english);
        assert.deepEqual(prompt.knownJapaneseVariants, [japanese]);
        assert.equal(prompt.pairKey, "Japanese:English");
        assert.equal(prompt.reviewed, false);
        assert.equal(ids.has(prompt.id), false);
        ids.add(prompt.id);
        batchCount++;
      }
    }
    assert.equal(batchCount, promptCount);
  }
  assert.equal(ids.size, 152);
});
