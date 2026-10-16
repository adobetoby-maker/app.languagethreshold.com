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
