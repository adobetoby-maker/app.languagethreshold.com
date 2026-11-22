import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getCurriculum } from "../src/data/curriculum.ts";
import { getModule, moduleSupportsLearningPair } from "../src/data/modules.ts";
import { getLessonDefinition } from "../src/lib/lesson-definition.ts";
import {
  parseLessonContent,
  validateLessonContent,
  contentLimitsFor,
} from "../src/lib/lesson-content-core.ts";
import {
  CHALLENGES,
  PLACES,
  acceptsPlace,
  initialPosition,
  validPlacement,
} from "../src/lib/place-directions-game.ts";
import { getSpeakingMissions } from "../src/data/speaking-missions.ts";
const stages = [
  ["foundation-place-directions", 10],
  ["place-directions", 30],
  ["master-place-directions", 20],
];
test("60 lessons have exact pair, aligned readings, content validation and all six modes", () => {
  const missions = getSpeakingMissions("Spanish");
  for (const [id, count] of stages) {
    const m = getModule(id);
    assert.ok(m);
    assert.ok(moduleSupportsLearningPair(m, "Spanish", "English"));
    assert.equal(moduleSupportsLearningPair(m, "Japanese", "English"), false);
    assert.equal(moduleSupportsLearningPair(m, "Spanish", "French"), false);
    assert.equal(getCurriculum(id).lessons.length, count);
    const content = parseLessonContent(
      JSON.parse(readFileSync(`public/lesson-content/es/${id}.json`, "utf8")),
      { moduleId: id, language: "Spanish" },
    );
    assert.ok(content);
    for (let n = 1; n <= count; n++) {
      assert.deepEqual(
        validateLessonContent(content.lessons[n], {
          language: "Spanish",
          nativeLanguage: "English",
          parts: { passage: true, words: true, verbs: true },
          limits: contentLimitsFor(id),
        }),
        [],
        `${id}/${n}`,
      );
      const d = getLessonDefinition({
        moduleId: id,
        lessonNumber: n,
        targetLanguage: "Spanish",
        instructionLanguage: "English",
        contentVersion: "draft",
      });
      assert.ok(d.reading);
      assert.equal(d.modes.length, 6);
      assert.ok(d.teaching);
      assert.ok(
        missions.some(
          (x) =>
            x.moduleId === id &&
            x.openingLine === content.lessons[n].words.find((w) => w.kind === "phrase").es,
        ),
      );
      const unsupported = getLessonDefinition({
        moduleId: id,
        lessonNumber: n,
        targetLanguage: "Japanese",
        instructionLanguage: "English",
        contentVersion: "draft",
      });
      assert.equal(unsupported.reading, null);
      assert.equal(unsupported.words.length, 0);
    }
  }
});
test("inside, under and on are distinct and invalid coordinates never pass", () => {
  for (const p of PLACES) {
    assert.ok(acceptsPlace(p.id, p.point), p.id);
    for (const point of [
      { x: NaN, y: 0.5 },
      { x: 1.1, y: 0.5 },
      { x: 0.5, y: Infinity },
    ])
      assert.equal(acceptsPlace(p.id, point), false);
  }
  assert.equal(acceptsPlace("inside", PLACES.find((p) => p.id === "under").point), false);
  assert.equal(acceptsPlace("under", PLACES.find((p) => p.id === "on").point), false);
  assert.equal(acceptsPlace("on", PLACES.find((p) => p.id === "inside").point), false);
});
test("pickup is required for chained instructions; demonstrations cannot earn credit", () => {
  for (const c of CHALLENGES) {
    const p = PLACES.find((p) => p.id === c.place).point;
    assert.equal(acceptsPlace(c.place, initialPosition(c.place)), false, c.es);
    assert.equal(validPlacement(c.place, p, c.pickup, true, false), true);
    assert.equal(validPlacement(c.place, p, c.pickup, true, true), false);
    if (c.pickup) assert.equal(validPlacement(c.place, p, true, false, false), false);
  }
});
