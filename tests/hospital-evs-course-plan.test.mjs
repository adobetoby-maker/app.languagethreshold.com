import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { validateLessonContent, contentLimitsFor } from "../src/lib/lesson-content-core.ts";

const plan = JSON.parse(
  readFileSync(new URL("../content/hospital-evs/course-plan.json", import.meta.url), "utf8"),
);
const pilot = JSON.parse(
  readFileSync(new URL("../content/hospital-evs/pilot-lessons.json", import.meta.url), "utf8"),
);

test("Hospital EVS is separate from OR EVS and has two exact learning directions", () => {
  assert.equal(plan.baseCourse, "hospital-evs");
  assert.equal(plan.reviewed, false);
  assert.deepEqual(
    plan.courses.map(({ id, target, native }) => [id, target, native]),
    [
      ["hospital-evs-en", "English", "Spanish"],
      ["hospital-evs-es", "Spanish", "English"],
    ],
  );
  for (const course of plan.courses) {
    assert.equal(course.stages.length, 3);
    assert.ok(course.stages.every((id) => id.includes(course.id)));
    assert.ok(course.stages.every((id) => !id.includes("or-evs")));
  }
});

test("each direction has a unique 10/30/20 hospital-wide authoring path", () => {
  assert.equal(plan.lessons.length, 60);
  const expected = { foundation: 10, core: 30, master: 20 };
  const ids = new Set();
  const areas = new Set();
  for (const [stage, count] of Object.entries(expected)) {
    const lessons = plan.lessons.filter((lesson) => lesson.stage === stage);
    assert.equal(lessons.length, count);
    assert.deepEqual(lessons.map((lesson) => lesson.n), Array.from({ length: count }, (_, i) => i + 1));
  }
  for (const lesson of plan.lessons) {
    const id = `${lesson.stage}:${lesson.slug}`;
    assert.ok(!ids.has(id), `duplicate ${id}`);
    ids.add(id);
    areas.add(lesson.area);
    assert.ok(lesson.englishTargetBrief.length > 35, `${id} English brief`);
    assert.ok(lesson.spanishTargetBrief.length > 35, `${id} Spanish brief`);
    assert.notEqual(lesson.englishTargetBrief, lesson.spanishTargetBrief, `${id} directions differ`);
  }
  assert.deepEqual([...areas].sort(), ["bathroom", "biohazard", "or", "patient-room", "shift"]);
  assert.match(plan.safetyBoundary, /Instrument reprocessing and sterilization are outside/);
});

test("first pilot lesson is independently authored and validates for each exact pair", () => {
  assert.equal(pilot.status, "unreviewed-authoring-pilot-not-shipped");
  assert.equal(pilot.lessons.length, 2);
  for (const row of pilot.lessons) {
    const course = plan.courses.find(({ id }) => id === row.courseId);
    assert.ok(course, row.courseId);
    assert.equal(row.stage, "foundation");
    assert.equal(row.n, 1);
    assert.equal(row.lesson.speaking.length > 60, true);
    assert.deepEqual(
      validateLessonContent(row.content, {
        language: course.target,
        nativeLanguage: course.native,
        parts: { passage: true, words: true, verbs: true },
        limits: contentLimitsFor(course.stages[0]),
      }),
      [],
      row.courseId,
    );
  }
  assert.notDeepEqual(pilot.lessons[0].content.passage.target, pilot.lessons[1].content.passage.native);
});
