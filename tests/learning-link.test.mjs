import assert from "node:assert/strict";
import { test } from "node:test";
import { learningLinkIdentity } from "../src/lib/learning-link.ts";

const ready = {
  hydrated: true,
  authLoading: false,
  userId: "learner",
  profileReadyUserId: "learner",
  appliedFor: null,
};

test("an assigned Roofing link waits until profile restoration cannot overwrite it", () => {
  assert.equal(learningLinkIdentity({ ...ready, hydrated: false }), null);
  assert.equal(learningLinkIdentity({ ...ready, authLoading: true }), null);
  assert.equal(learningLinkIdentity({ ...ready, profileReadyUserId: null }), null);
  assert.equal(learningLinkIdentity(ready), "learner");
});

test("the assignment link applies once and does not prevent later module choices", () => {
  assert.equal(learningLinkIdentity({ ...ready, appliedFor: "learner" }), null);
});

test("guest links still open without an account", () => {
  assert.equal(learningLinkIdentity({ ...ready, userId: null, profileReadyUserId: null }), "guest");
});

test("signing in after following a guest link reapplies it after cloud restoration", () => {
  assert.equal(
    learningLinkIdentity({ ...ready, appliedFor: "guest", profileReadyUserId: null }),
    null,
  );
  assert.equal(learningLinkIdentity({ ...ready, appliedFor: "guest" }), "learner");
});

test("a previous account's restoration cannot authorize the new account's link", () => {
  assert.equal(learningLinkIdentity({ ...ready, profileReadyUserId: "old-learner" }), null);
});

const { lessonLocation, requestedLesson } = await import("../src/lib/learning-link.ts");
const track = { moduleId: "roofing", target: "Spanish", native: "English" };
const linked =
  "/?module=roofing&target=Spanish&native=English&tab=core30&lesson=1&way=see&plan=existing-plan#practice";
test("a lesson address follows the visible way and round-trips on refresh", () => {
  const changed = lessonLocation(linked, track, { lesson: 1, way: "type" });
  const params = new URL(changed, "https://example.invalid").searchParams;
  assert.deepEqual(requestedLesson(params, "roofing", 30), { lesson: 1, way: "type" });
  assert.equal(params.get("plan"), "existing-plan");
  assert.ok(changed.endsWith("#practice"));
  assert.equal(lessonLocation(changed, track, { lesson: 1, way: "type" }), changed);
});
test("previous and next lesson addresses restore the displayed lesson", () => {
  for (const lesson of [2, 1, 30]) {
    const next = lessonLocation(linked, track, { lesson, way: "say" });
    assert.deepEqual(
      requestedLesson(new URL(next, "https://example.invalid").searchParams, "roofing", 30),
      { lesson, way: "say" },
    );
  }
});
test("exiting removes a stale lesson link and retains this enrollment's plan", () => {
  const params = new URL(lessonLocation(linked, track, null), "https://example.invalid")
    .searchParams;
  assert.equal(params.get("lesson"), null);
  assert.equal(params.get("way"), null);
  assert.equal(params.get("plan"), "existing-plan");
  assert.equal(params.get("tab"), "core30");
});
test("switching modules or pairs never carries the previous enrollment plan", () => {
  for (const changed of [
    { ...track, moduleId: "landscaper" },
    { ...track, target: "French" },
    { ...track, native: "German" },
  ]) {
    const params = new URL(
      lessonLocation(linked, changed, { lesson: 1, way: "see" }),
      "https://example.invalid",
    ).searchParams;
    assert.equal(params.get("plan"), null);
    assert.equal(params.get("module"), changed.moduleId);
    assert.equal(params.get("target"), changed.target);
    assert.equal(params.get("native"), changed.native);
  }
});
test("lesson updates cannot redirect private pages or accept invalid positions", () => {
  assert.equal(lessonLocation("/team", track, { lesson: 1, way: "see" }), null);
  for (const position of [
    { lesson: 0, way: "see" },
    { lesson: 1.5, way: "see" },
    { lesson: 1, way: "unknown" },
  ])
    assert.equal(lessonLocation(linked, track, position), null);
});

const { lessonOverviewLocation, canRestoreLessonReturn } =
  await import("../src/lib/learning-link.ts");
test("a cached Core 30 overview cannot consume an incoming Reader or Exams link", () => {
  for (const tab of ["reader", "exams", "speak"]) {
    const incoming = linked.replace("tab=core30", `tab=${tab}`);
    assert.equal(lessonOverviewLocation(incoming, track), null);
    assert.equal(canRestoreLessonReturn(incoming, track), false);
  }
});
test("a previous module or pair cannot rewrite a pending lesson assignment", () => {
  for (const incoming of [
    linked.replace("module=roofing", "module=landscaper"),
    linked.replace("target=Spanish", "target=French"),
    linked.replace("native=English", "native=German"),
  ]) {
    assert.equal(lessonOverviewLocation(incoming, track), null);
    assert.equal(canRestoreLessonReturn(incoming, track), false);
  }
});
test("Exit still clears the current track and a matching return marker may restore", () => {
  const cleared = lessonOverviewLocation(linked, track);
  assert.equal(new URL(cleared, "https://example.invalid").searchParams.get("lesson"), null);
  assert.equal(canRestoreLessonReturn(linked, track), true);
});
test("a normal app launch without an explicit conflicting route may restore its lesson return", () => {
  assert.equal(canRestoreLessonReturn("/", track), true);
  assert.equal(lessonOverviewLocation("/", track), null);
});
