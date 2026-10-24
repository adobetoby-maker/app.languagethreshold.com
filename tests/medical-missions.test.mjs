import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getCurriculum } from "../src/data/curriculum.ts";
import { MODULES } from "../src/data/modules.ts";
import { validateLessonContent, contentLimitsFor } from "../src/lib/lesson-content-core.ts";

const load = (module) =>
  JSON.parse(readFileSync(new URL(`../public/lesson-content/es/${module}.json`, import.meta.url)));
test("advertised mission roles have complete authored courses", () => {
  for (const base of [
    "orthopedics",
    "nursing",
    "physical-therapy",
    "general-surgery",
    "family-medicine",
    "medical-receptionist",
    "social-work",
  ]) {
    for (const [module, count] of [
      [`foundation-${base}`, 10],
      [base, 30],
      [`master-${base}`, 20],
    ]) {
      const curriculum = getCurriculum(module);
      assert.equal(curriculum?.lessons.length, count, module);
      const content = load(module);
      assert.equal(Object.keys(content.lessons).length, count, module);
      for (const lesson of curriculum.lessons) {
        const authored = content.lessons[lesson.n];
        assert.ok(authored?.passage && authored.verbs.length >= 3, `${module}/${lesson.n}`);
        assert.deepEqual(
          validateLessonContent(authored, {
            language: "Spanish",
            nativeLanguage: "English",
            parts: { passage: true, words: !lesson.words, verbs: true },
            words: lesson.words,
            limits: contentLimitsFor(module),
          }),
          [],
          `${module}/${lesson.n}`,
        );
      }
    }
  }
});
test("logistics is a Spanish medical Core 30 with complete lesson content", () => {
  const module = "medical-mission-logistics";
  assert.equal(MODULES.find((m) => m.id === module)?.category, "Medical");
  const curriculum = getCurriculum(module);
  assert.equal(curriculum.lessons.length, 30);
  assert.equal(new Set(curriculum.lessons.map((l) => l.title)).size, 30);
  const content = load(module);
  for (const lesson of curriculum.lessons) {
    assert.deepEqual(
      validateLessonContent(content.lessons[lesson.n], {
        language: "Spanish",
        nativeLanguage: "English",
        parts: { passage: true, words: true, verbs: true },
      }),
      [],
      `logistics/${lesson.n}`,
    );
  }
});

test("logistics lesson verbs do not invalidate the signed global Verb Games pool", async () => {
  const { readCompileInput } = await import("../scripts/build-verb-patterns.mts");
  const input = await readCompileInput(process.cwd());
  assert.equal(
    input.lessonFiles.some((f) => f.module === "medical-mission-logistics"),
    false,
  );
  assert.equal(load("medical-mission-logistics").lessons["5"].verbs.length, 3);
});
