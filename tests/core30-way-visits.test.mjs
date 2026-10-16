import assert from "node:assert/strict";
import test from "node:test";
import { core30WayOpened } from "../src/lib/core30-state.ts";
import { CORE30_WAYS, mergeCore30Log, summarizeCore30 } from "../src/lib/core30-plan.ts";
const first = "2026-10-15T10:00:00Z",
  later = "2026-10-15T11:00:00Z";
test("six modes keep separate first visits without creating mastery or legacy step visits", () => {
  let log = {};
  for (const way of CORE30_WAYS)
    log = core30WayOpened(log, { moduleId: "roofing", lesson: 1, way, at: first });
  const lesson = log.roofing.lessons["1"];
  assert.equal(Object.keys(lesson.wayVisits).length, 6);
  assert.deepEqual(lesson.visits, {});
  assert.equal(lesson.masteredAt, undefined);
  assert.equal(
    core30WayOpened(log, { moduleId: "roofing", lesson: 1, way: "write", at: later }),
    log,
  );
});
test("cloud merge unions mode visits, keeps earliest timestamps, and preserves old step evidence", () => {
  const local = {
    roofing: { lessons: { 1: { visits: { 0: first }, wayVisits: { write: later, hear: later } } } },
  };
  const remote = {
    roofing: { lessons: { 1: { visits: { 2: later }, wayVisits: { write: first, say: first } } } },
  };
  for (const merged of [mergeCore30Log(local, remote), mergeCore30Log(remote, local)]) {
    const lesson = merged.roofing.lessons["1"];
    assert.deepEqual(lesson.visits, { 0: first, 2: later });
    assert.deepEqual(lesson.wayVisits, { hear: later, say: first, write: first });
    assert.equal(lesson.masteredAt, undefined);
  }
  assert.equal(local.roofing.lessons["1"].wayVisits.write, later);
});
test("opening only handwriting counts as a lesson opened for the team summary", () => {
  const log = core30WayOpened({}, { moduleId: "roofing", lesson: 2, way: "write", at: first });
  const summary = summarizeCore30(log.roofing, 30, "2026-10-15");
  assert.equal(summary.lessonsOpened, 1);
  assert.equal(summary.mastered, 0);
  const old = mergeCore30Log({ roofing: { lessons: { 1: { visits: { 0: first } } } } }, {});
  assert.equal(old.roofing.lessons["1"].wayVisits, undefined);
});
