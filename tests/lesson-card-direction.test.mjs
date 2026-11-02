import assert from "node:assert/strict";
import test from "node:test";
import { LANGUAGES, NATIVE_LANGUAGES } from "../src/data/languages.ts";
import { lessonCardFaces } from "../src/lib/lesson-card-direction.ts";

test("Core cards use native and target faces for every selectable language pair", () => {
  for (const target of LANGUAGES) {
    for (const native of NATIVE_LANGUAGES.filter((language) => language !== target)) {
      const word = Object.freeze({ en: `native in ${native}`, es: `target in ${target}` });
      const nativeFirst = lessonCardFaces(word, "native-to-target");
      const targetFirst = lessonCardFaces(word, "target-to-native");
      assert.deepEqual(nativeFirst, {
        front: { text: word.en, role: "native" },
        back: { text: word.es, role: "target" },
      }, `${native} → ${target}`);
      assert.deepEqual(targetFirst, {
        front: { text: word.es, role: "target" },
        back: { text: word.en, role: "native" },
      }, `${target} → ${native}`);
      assert.equal(word.en, `native in ${native}`);
      assert.equal(word.es, `target in ${target}`);
    }
  }
});

test("English-for-work cards put English on the target face", () => {
  const word = { es: "the doctor", en: "el médico" };
  assert.equal(lessonCardFaces(word, "target-to-native").front.text, "the doctor");
  assert.equal(lessonCardFaces(word, "native-to-target").front.text, "el médico");
});
