import assert from "node:assert/strict";
import { test } from "node:test";
import { describeCore30, extractCore30Log, core30StatusLabel } from "../src/lib/team-core30.ts";

test("extractCore30Log returns only core30Log and drops malformed shapes", () => {
  assert.deepEqual(extractCore30Log(null), {});
  assert.deepEqual(extractCore30Log({ email: "a@b.c", subscription_status: "active" }), {});
  assert.deepEqual(extractCore30Log({ core30Log: [] }), {});
  const out = extractCore30Log({
    secret: "x",
    core30Log: {
      roofing: { startDate: "2026-10-01", lessons: { 1: { visits: {} } } },
      bad: "nope",
      worse: { lessons: [] },
    },
  });
  assert.deepEqual(Object.keys(out), ["roofing"]);
  assert.equal("secret" in out, false);
});

test("describeCore30 tolerates missing core30 and summarizes a log", () => {
  const empty = describeCore30(undefined, "u1", "roofing", 30, "2026-10-14");
  assert.equal(empty.status, "not-started");
  assert.equal(empty.statusLabel, "Not started");
  assert.equal(empty.total, 30);

  const core30 = {
    u1: {
      roofing: {
        startDate: "2026-10-01",
        lastReviewAt: "2026-10-13T10:00:00.000Z",
        lessons: {
          1: { visits: { 0: "2026-10-01T10:00:00.000Z" }, masteredAt: "2026-10-01T11:00:00.000Z" },
          2: {
            visits: { 0: "2026-10-04T10:00:00.000Z" },
            masteredAt: "2026-10-04T11:00:00.000Z",
            needsPractice: true,
          },
        },
      },
    },
  };
  const d = describeCore30(core30, "u1", "roofing", 30, "2026-10-14");
  assert.equal(d.mastered, 1);
  assert.equal(d.opened, 2);
  assert.equal(d.needsPractice, 1);
  assert.equal(d.status, "behind");
  assert.match(d.statusLabel, /^Behind by \d+$/);
  assert.equal(d.lastReview, "2026-10-13");
  assert.equal(core30StatusLabel("ahead", 0), "Ahead");
  assert.equal(core30StatusLabel("on-track", 0), "On track");
});

test("describeCore30 shows lastReview as the local calendar date, not the UTC slice", () => {
  const lastReviewAt = new Date(2026, 9, 13, 23, 30).toISOString(); // late evening local time
  const core30 = {
    u1: { roofing: { startDate: "2026-10-01", lastReviewAt, lessons: {} } },
  };
  const d = describeCore30(core30, "u1", "roofing", 30, "2026-10-14");
  assert.equal(d.lastReview, "2026-10-13");
});

test("team summary excludes personal modules without an assignment in this organization", () => {
  const profile = {
    core30Log: {
      roofing: { lessons: { 1: { masteredAt: "2026-10-15T12:00:00Z" } } },
      nursing: { startDate: "2026-10-01", lessons: {} },
    },
    privateNotes: "Do not share",
  };
  assert.deepEqual(Object.keys(extractCore30Log(profile, ["roofing"])), ["roofing"]);
  assert.deepEqual(extractCore30Log(profile, []), {});
  assert.deepEqual(extractCore30Log(profile, ["unassigned"]), {});
  assert.equal(profile.core30Log.nursing.startDate, "2026-10-01");
});
