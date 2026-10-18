import assert from "node:assert/strict";
import test from "node:test";
import { assessmentCsv } from "../src/lib/assessments/export.ts";
test("CSV preserves text and neutralizes spreadsheet formulas including leading whitespace", () => {
  const csv = assessmentCsv([
    ["=cmd()", " +SUM(A1)", "@bad", "-2", "Spanish, English", 'say "hello"', null, 0],
  ]);
  assert.equal(
    csv,
    '\uFEFF"\'=cmd()","\' +SUM(A1)","\'@bad","\'-2","Spanish, English","say ""hello""","","0"',
  );
});

import { assessedProgressRows } from "../src/lib/assessments/export.ts";
const labels = { learner: () => "Authorized learner", module: (id) => id, skill: (id) => id };
const exportPlan = () => ({
  user_id: "learner",
  role: "primary",
  module_id: "roofing",
  scope: "team",
  instruction_language: "English",
  target_language: "Spanish",
  timezone: "UTC",
  status: "active",
  checkpoints: [
    {
      checkpoint: "entrance",
      due_date: "2026-10-16",
      status: "scheduled",
      ready: true,
      attempts: [],
    },
    {
      checkpoint: "day45",
      due_date: "2026-11-29",
      status: "scheduled",
      ready: false,
      attempts: [],
    },
  ],
});
test("unstarted and unavailable checkpoints survive export with blank scores", () => {
  const rows = assessedProgressRows([exportPlan()], labels),
    header = rows[0];
  assert.equal(rows.length, 3);
  assert.equal(rows[1][header.indexOf("State")], "not_started");
  assert.equal(rows[2][header.indexOf("State")], "content_pending");
  for (const row of rows.slice(1)) {
    assert.equal(row.length, header.length);
    assert.equal(row[header.indexOf("Score")], null);
    assert.equal(row[header.indexOf("Attempt")], "");
  }
});
test("unfinished exam status is retained without implying a result", () => {
  const plan = exportPlan();
  plan.checkpoints[0].attempts = [
    {
      attempt_number: 1,
      designated: false,
      status: "scoring",
      submitted_at: "2026-10-16T12:00:00Z",
      profiles: [],
      comparisons: [],
    },
  ];
  const rows = assessedProgressRows([plan], labels),
    header = rows[0];
  assert.equal(rows[1][header.indexOf("Status")], "scoring");
  assert.equal(rows[1][header.indexOf("State")], "pending");
  assert.equal(rows[1][header.indexOf("Score")], null);
  assert.equal(rows[1].length, header.length);
});
test("zero assessed credit and zero comparable change stay distinct from missing evidence", () => {
  const plan = exportPlan();
  plan.checkpoints[0].attempts = [
    {
      attempt_number: 1,
      designated: true,
      status: "completed",
      submitted_at: "date",
      profiles: [
        {
          coverage: "module",
          skills: [
            {
              skill: "recall",
              score: 0,
              state: "scored",
              evidenceCount: 3,
              objectives: ["a", "b", "c"],
              reviewCount: 0,
              missingCount: 0,
              provisional: false,
            },
          ],
        },
      ],
      comparisons: [{ skill: "recall", change: 0 }],
    },
  ];
  const rows = assessedProgressRows([plan], labels),
    header = rows[0];
  assert.equal(rows[1][header.indexOf("Score")], 0);
  assert.equal(rows[1][header.indexOf("Change on comparable objectives")], 0);
  assert.equal(rows[1].length, header.length);
});
