import assert from "node:assert/strict";
import { test } from "node:test";
import { examsLocation, legacyExamsLocation } from "../src/lib/exam-navigation.ts";
import { isPrivateAssessmentUrl } from "../src/lib/assessment-privacy.ts";
const org = "11111111-2222-4333-8444-555555555555";
const attempt = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

test("focused Exams links retain the selected module/pair and validated team/attempt references", () => {
  const destination = examsLocation({
    moduleId: "landscaper",
    target: "Spanish",
    native: "English",
    orgId: org,
    attemptId: attempt,
    review: true,
  });
  const url = new URL(destination, "https://app.example");
  assert.equal(url.pathname, "/exams");
  assert.equal(url.searchParams.get("module"), "landscaper");
  assert.equal(url.searchParams.get("target"), "Spanish");
  assert.equal(url.searchParams.get("native"), "English");
  assert.equal(url.searchParams.get("org"), org);
  assert.equal(url.searchParams.get("attempt"), attempt);
  assert.equal(url.searchParams.get("review"), "1");
  assert.equal(isPrivateAssessmentUrl(destination), true);
});
test("legacy root exam entry is private before rendering and copies no credentials or arbitrary redirects", () => {
  const current = `/?tab=exams&module=roofing&target=English&native=Spanish&org=${org}&attempt=${attempt}&review=1&access_token=never-forward&email=never-forward&return=https://outside.invalid#token=never-forward`;
  assert.equal(isPrivateAssessmentUrl("/?tab=exams&module=roofing"), true);
  const url = new URL(legacyExamsLocation(current), "https://app.example");
  assert.equal(url.origin, "https://app.example");
  assert.equal(url.pathname, "/exams");
  assert.equal(url.searchParams.get("target"), "English");
  assert.equal(url.searchParams.get("native"), "Spanish");
  assert.equal(url.searchParams.get("org"), org);
  assert.equal(url.searchParams.get("attempt"), attempt);
  assert.equal(url.hash, "");
  for (const key of ["access_token", "email", "return", "token", "tab"])
    assert.equal(url.searchParams.has(key), false);
});
test("invalid references are dropped and language values use known defaults", () => {
  const url = new URL(
    examsLocation({
      moduleId: "core",
      target: "unknown",
      native: "unknown",
      orgId: "other-account",
      attemptId: "../attempt",
    }),
    "https://app.example",
  );
  assert.equal(url.searchParams.has("module"), false);
  assert.equal(url.searchParams.has("org"), false);
  assert.equal(url.searchParams.has("attempt"), false);
  assert.equal(url.searchParams.get("target"), "Spanish");
  assert.equal(url.searchParams.get("native"), "English");
});
test("ordinary app/private routes neither redirect to Exams nor lose their destination", () => {
  for (const current of [
    "/",
    "/?tab=reader",
    "/?module=roofing&tab=core30&lesson=3&way=type",
    "/exams?tab=exams",
    "/team?tab=exams",
  ])
    assert.equal(legacyExamsLocation(current), null);
  assert.equal(isPrivateAssessmentUrl("/?tab=reader&module=roofing"), false);
});

test("lesson → Exams → lesson preserves plan and activity through a safe relative return", async () => {
  const { examsFromLessonLocation, examLessonReturn } =
    await import("../src/lib/exam-navigation.ts");
  const source = `/?module=landscaper&tab=core30&target=Spanish&native=English&plan=${org}&lesson=15&way=write&access_token=secret#refresh_token=secret`;
  const entry = new URL(
    examsFromLessonLocation(source, {
      moduleId: "landscaper",
      target: "Spanish",
      native: "English",
    }),
    "https://owned.invalid",
  );
  assert.equal(entry.searchParams.get("fromPlan"), org);
  assert.equal(entry.searchParams.get("lesson"), "15");
  assert.equal(entry.searchParams.get("way"), "write");
  assert.equal(entry.searchParams.has("access_token"), false);
  assert.equal(entry.hash, "");
  const result = new URL(
    examLessonReturn({
      moduleId: entry.searchParams.get("module"),
      target: entry.searchParams.get("target"),
      native: entry.searchParams.get("native"),
      returnPlanId: entry.searchParams.get("fromPlan"),
      lesson: Number(entry.searchParams.get("lesson")),
      way: entry.searchParams.get("way"),
    }),
    "https://owned.invalid",
  );
  assert.equal(result.pathname, "/");
  assert.equal(result.searchParams.get("plan"), org);
  assert.equal(result.searchParams.get("lesson"), "15");
  assert.equal(result.searchParams.get("way"), "write");
  assert.equal(result.searchParams.get("tab"), "core30");
});
test("a stale route from another module, pair or tab cannot supply a lesson return", async () => {
  const { examsFromLessonLocation } = await import("../src/lib/exam-navigation.ts");
  for (const source of [
    `/?tab=core30&module=roofing&target=Spanish&native=English&plan=${org}&lesson=15&way=write`,
    `/?tab=core30&module=landscaper&target=French&native=English&plan=${org}&lesson=15&way=write`,
    `/?tab=reader&module=landscaper&target=Spanish&native=English&plan=${org}&lesson=15&way=write`,
  ]) {
    const entry = new URL(
      examsFromLessonLocation(source, {
        moduleId: "landscaper",
        target: "Spanish",
        native: "English",
      }),
      "https://owned.invalid",
    );
    for (const key of ["fromPlan", "lesson", "way"])
      assert.equal(entry.searchParams.has(key), false);
  }
});
test("return metadata drops malformed plan/lesson/activity and never accepts an arbitrary return URL", async () => {
  const { examLessonReturn, examLessonNumber } = await import("../src/lib/exam-navigation.ts");
  for (const value of [0, -1, 31, 1.5, "1e1", "../15", null, {}, Infinity])
    assert.equal(examLessonNumber(value), undefined);
  assert.equal(examLessonNumber("015"), 15);
  assert.equal(
    examLessonReturn({
      moduleId: "roofing",
      target: "Spanish",
      native: "English",
      returnPlanId: "https://outside.invalid",
      lesson: 99,
      way: "script",
    }),
    null,
  );
  const destination = new URL(
    examsLocation({
      moduleId: "roofing",
      target: "Spanish",
      native: "English",
      returnPlanId: org,
      lesson: 2,
      way: "script",
    }),
    "https://owned.invalid",
  );
  assert.equal(destination.searchParams.has("way"), false);
  assert.equal(destination.searchParams.get("fromPlan"), org);
  assert.equal(
    examLessonReturn({
      moduleId: "core",
      target: "Spanish",
      native: "English",
      returnPlanId: org,
      lesson: 2,
    }),
    null,
  );
});
