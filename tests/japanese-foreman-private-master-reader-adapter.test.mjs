import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  JAPANESE_FOREMAN_MASTER_MODES,
  JAPANESE_FOREMAN_MASTER_READER_REGISTERED,
  inspectPrivateForemanMasterReader,
} from "../src/data/core60/private-japanese-foreman-master-reader.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const content = join(root, "content/japanese-construction-foreman");
const ranges = [[1, 3], [4, 6], [7, 9], [10, 12], [13, 15], [16, 18], [19, 20]];
const read = (name) => JSON.parse(readFileSync(join(content, name), "utf8"));

test("all 20 original Master scenes hand off to the matching private lesson and six modes", () => {
  assert.equal(JAPANESE_FOREMAN_MASTER_READER_REGISTERED, false);
  assert.deepEqual(JAPANESE_FOREMAN_MASTER_MODES, ["see", "recall", "hear", "type", "say", "write"]);
  const ids = new Set();
  for (const [first, last] of ranges) {
    const bundle = read(`master-runtime-pilot-${first}-${last}-ja-en.json`);
    const source = read(`master-original-reader-${first}-${last}-draft.json`);
    for (let n = first; n <= last; n++) {
      const input = inspectPrivateForemanMasterReader(bundle, source, n, "Japanese", "English");
      const lesson = bundle.lessons.find((item) => item.n === n);
      const scene = source.lessons.find((item) => item.n === n);
      assert.equal(input.registration, "disabled");
      assert.equal(input.lessonId, `master-construction-foreman-ja-en:lesson:${n}`);
      assert.equal(input.readerHandoff.readerId, `reader-${input.lessonId}`);
      assert.equal(input.readerHandoff.lessonId, input.lessonId);
      assert.deepEqual(input.readerHandoff.sentences, scene.sentences);
      assert.deepEqual(input.modeInputs.see, lesson.words);
      assert.deepEqual(input.modeInputs.recall, lesson.words);
      assert.deepEqual(input.modeInputs.hear, lesson.words);
      assert.deepEqual(input.modeInputs.type, lesson.words);
      assert.deepEqual(input.modeInputs.say.words, lesson.words);
      assert.equal(input.modeInputs.say.speakingId, lesson.speaking.id);
      assert.equal(input.modeInputs.say.locale, "ja-JP");
      assert.deepEqual(input.modeInputs.write, lesson.checks);
      assert.equal(input.readerHandoff.sentences.length, 8);
      assert.equal(input.modeInputs.write.length, 3);
      assert.equal(inspectPrivateForemanMasterReader(bundle, source, n, "Spanish", "English"), null);
      assert.equal(inspectPrivateForemanMasterReader(bundle, source, n, "Japanese", "Spanish"), null);
      assert.ok(!ids.has(input.lessonId));
      ids.add(input.lessonId);
    }
  }
  assert.equal(ids.size, 20);
  const manifest = readFileSync(join(root, "src/data/core60/manifest.ts"), "utf8");
  assert.doesNotMatch(manifest, /master-construction-foreman-ja-en/);
});

test("the adapter rejects a changed English source hash or Reader content", () => {
  const bundle = read("master-runtime-pilot-1-3-ja-en.json");
  const source = read("master-original-reader-1-3-draft.json");
  assert.throws(() => inspectPrivateForemanMasterReader(bundle, {
    ...source,
    sourceEnglishSubsetSha256: "wrong",
  }, 1, "Japanese", "English"), /does not match/);
  const changed = structuredClone(source);
  changed.lessons[0].sentences[0].native = "Wrong source line";
  assert.throws(() => inspectPrivateForemanMasterReader(bundle, changed, 1, "Japanese", "English"), /inconsistent/);
});
