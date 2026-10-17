import assert from "node:assert/strict";
import test from "node:test";
import { core30ScopeKey, claimLegacyCore30 } from "../src/lib/core30-scope.ts";
import { mergeCore30Log } from "../src/lib/core30-plan.ts";
import { describeCore30Tracks, describeCore30, extractCore30Log } from "../src/lib/team-core30.ts";
import { lessonPositionKey } from "../src/lib/lesson-drafts.ts";
import { initialPracticeStreak } from "../src/lib/practice-streak.ts";
import { loadModule } from "./helpers/bundle.mjs";
const { reducer } = await loadModule("src/state/app-state.tsx", {
  stubs: [/^sonner$/, /supabase\/client$/],
});
const es = { targetLanguage: "Spanish", instructionLanguage: "English" };
const it = { ...es, targetLanguage: "Italian" };
const planA = { ...es, enrollmentId: "plan-a" };
const planB = { ...es, enrollmentId: "plan-b" };
const at = "2026-10-16T10:00:00.000Z";
const earlier = "2026-10-15T10:00:00.000Z";
const key = (context) => core30ScopeKey("roofing", context);
const base = () => ({
  selectedLanguage: "Spanish",
  nativeLanguage: "English",
  xp: 50,
  lessonsCompleted: 2,
  core30Log: {},
  lessonProgress: {},
  lastPracticeDateByLanguage: {},
  practiceStreak: initialPracticeStreak(),
});
const visit = (state, context, lesson = 1) =>
  reducer(state, {
    type: "CORE30_WAY_OPENED",
    payload: { moduleId: "roofing", context, lesson, way: "see", at },
  });

test("actual reducer writes new records by pair and plan, preserving unlabeled history without inheriting it", () => {
  const legacy = { lessons: { 1: { visits: { 0: earlier }, masteredAt: earlier } } };
  let state = { ...base(), core30Log: { roofing: legacy }, lessonProgress: { roofing: 8 } };
  state = visit(state, es);
  assert.equal(state.core30Log.roofing, legacy);
  assert.equal(state.core30Log[key(es)].lessons["1"].masteredAt, undefined);
  assert.equal(state.lessonProgress[key(es)], undefined);
  state = visit(state, it, 2);
  state = visit(state, planA, 3);
  state = visit(state, planB, 4);
  for (const [context, lesson] of [
    [es, 1],
    [it, 2],
    [planA, 3],
    [planB, 4],
  ])
    assert.deepEqual(Object.keys(state.core30Log[key(context)].lessons), [String(lesson)]);
  assert.notEqual(key(es), key({ ...es, instructionLanguage: "French" }));
});

test("mastery, review and plan dates stay in their exact context", () => {
  let state = visit(visit(base(), planA), planB);
  state = reducer(state, {
    type: "CORE30_SET_MASTERED",
    payload: { moduleId: "roofing", context: planA, lesson: 1, mastered: true, at },
  });
  state = reducer(state, {
    type: "CORE30_SET_START_DATE",
    payload: { moduleId: "roofing", context: planA, date: "2026-10-16", at },
  });
  state = reducer(state, {
    type: "CORE30_RECORD_REVIEW",
    payload: { moduleId: "roofing", context: planA, at, results: [{ lesson: 1, ok: false }] },
  });
  assert.equal(state.core30Log[key(planA)].lessons["1"].needsPractice, true);
  assert.equal(state.core30Log[key(planB)].lessons["1"].masteredAt, undefined);
  assert.equal(state.core30Log[key(planB)].lastReviewAt, undefined);
  assert.equal(state.core30Log[key(planB)].startDate, undefined);
  assert.equal(state.xp, 50);
});

test("captured completion context survives a later active-language change", () => {
  const state = reducer(
    { ...base(), selectedLanguage: "Italian" },
    { type: "COMPLETE_LESSON", payload: { moduleId: "roofing", context: planA } },
  );
  assert.equal(state.lessonProgress[key(planA)], 1);
  assert.equal(state.lessonProgress[key(it)], undefined);
  assert.equal(state.lessonProgress.roofing, undefined);
  assert.ok(state.lastPracticeDateByLanguage.Spanish);
  assert.equal(state.lastPracticeDateByLanguage.Italian, undefined);
});

test("explicit history claim preserves originals, merges existing work, records provenance and awards no completion or XP", () => {
  const legacy = { lessons: { 1: { visits: { 0: earlier }, masteredAt: earlier } } };
  const original = {
    ...base(),
    core30Log: { roofing: legacy, [key(es)]: { lessons: { 2: { visits: { 0: at } } } } },
    lessonProgress: { roofing: 3 },
  };
  const action = { type: "CORE30_CLAIM_LEGACY", payload: { moduleId: "roofing", context: es, at } };
  const claimed = reducer(original, action);
  assert.deepEqual(original.core30Log.roofing, legacy);
  assert.deepEqual(claimed.core30Log.roofing, legacy);
  assert.deepEqual(Object.keys(claimed.core30Log[key(es)].lessons), ["1", "2"]);
  assert.equal(claimed.core30Log[key(es)].legacyImportedAt, at);
  assert.equal(claimed.lessonProgress[key(es)], 3);
  assert.equal(claimed.lessonProgress.roofing, 3);
  assert.equal(claimed.xp, original.xp);
  assert.equal(claimed.lessonsCompleted, original.lessonsCompleted);
  assert.equal(claimed.core30Log[key(it)], undefined);
  const again = reducer(claimed, action);
  assert.equal(again.core30Log, claimed.core30Log);
  assert.equal(again.lessonProgress, claimed.lessonProgress);
});

test("cloud merge keeps independent scopes and explicit claim provenance", () => {
  const legacy = { roofing: { lessons: { 1: { visits: { 0: earlier } } } } };
  const claimed = claimLegacyCore30(legacy, {}, "roofing", planA, at);
  const merged = mergeCore30Log(claimed.log, visit(base(), planB, 2).core30Log);
  assert.equal(merged[key(planA)].legacyImportedAt, at);
  assert.deepEqual(Object.keys(merged[key(planB)].lessons), ["2"]);
  assert.deepEqual(Object.keys(merged.roofing.lessons), ["1"]);
});

test("team summaries disclose only explicitly authorized enrollment keys, never personal or other-plan fallback", () => {
  let state = visit(base(), es, 1);
  state = visit(state, planA, 2);
  state = visit(state, planB, 3);
  state.core30Log.roofing = { lessons: { 9: { visits: { 0: earlier }, masteredAt: earlier } } };
  const tracks = describeCore30Tracks({ core30Log: state.core30Log, privateNotes: "private" }, [
    {
      id: "plan-a",
      module_id: "roofing",
      target_language: "Spanish",
      instruction_language: "English",
    },
  ]);
  assert.equal(tracks.length, 1);
  assert.equal(tracks[0].opened, 1);
  assert.equal(tracks[0].mastered, 0);
  assert.equal(tracks[0].enrollmentId, "plan-a");
  assert.equal(JSON.stringify(tracks).includes("private"), false);
  const other = describeCore30Tracks({ core30Log: state.core30Log }, [
    {
      id: "absent",
      module_id: "roofing",
      target_language: "Spanish",
      instruction_language: "English",
    },
  ]);
  assert.equal(other[0].opened, 0);
  assert.equal(other[0].mastered, 0);
});

test("team extraction whitelists activity fields rather than spreading arbitrary profile content", () => {
  const log = extractCore30Log(
    {
      core30Log: {
        roofing: {
          privateNotes: "secret",
          startDate: "2026-10-16",
          lessons: {
            1: {
              visits: { 0: at, private: "secret" },
              wayVisits: { see: at, secret: "secret" },
              masteredAt: at,
              privateResponse: "secret",
              reviews: [{ private: "secret" }],
            },
            bad: { visits: { 0: at } },
          },
        },
      },
    },
    ["roofing"],
  );
  assert.equal(JSON.stringify(log).includes("secret"), false);
  assert.deepEqual(Object.keys(log.roofing.lessons), ["1"]);
  assert.equal(log.roofing.lessons["1"].wayVisits.see, at);
});

test("lesson resume keys distinguish plans while retaining the existing independent-practice key", () => {
  const personal = lessonPositionKey("learner", "roofing", "Spanish", "English");
  const a = lessonPositionKey("learner", "roofing", "Spanish", "English", "plan-a");
  const b = lessonPositionKey("learner", "roofing", "Spanish", "English", "plan-b");
  assert.notEqual(a, b);
  assert.notEqual(a, personal);
  assert.notEqual(a, lessonPositionKey("another", "roofing", "Spanish", "English", "plan-a"));
});

test("team plan summaries use their approved calendar and frozen paused day", () => {
  const k = key(planA);
  const log = { lessons: {}, lastReviewAt: "2026-10-02T01:00:00.000Z" };
  const track = {
    id: "plan-a",
    module_id: "roofing",
    target_language: "Spanish",
    instruction_language: "English",
    start_date: "2026-09-01",
    studyStartDate: "2026-10-01",
    timezone: "America/Denver",
    status: "paused",
    paused_on: "2026-10-01",
  };
  const result = describeCore30Tracks({ core30Log: { [k]: log } }, [track])[0];
  const expected = describeCore30(
    { learner: { [k]: { ...log, startDate: "2026-10-01" } } },
    "learner",
    k,
    30,
    "2026-10-01",
  );
  assert.equal(result.status, expected.status);
  assert.equal(result.statusLabel, `Plan paused · ${expected.statusLabel}`);
  assert.equal(result.lastReview, "2026-10-01");
  assert.equal(result.startDate, "2026-09-01");
});
