/** Read-only hosted checkpoint filtering against existing dedicated QA enrollments. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const base = process.env.LT_QA_STAGE_URL;
assert.match(
  base ?? "",
  /^https:\/\/language-threshold-[a-z0-9]+-adobetoby-5572s-projects\.vercel\.app$/,
);
const qa = JSON.parse(
  readFileSync("/Users/drive/.codex/tmp/language-threshold-qa/roofing-20261015.json", "utf8"),
);
assert.equal(qa.project, "pollhlkgltdkdskdzsgd");
assert.equal(qa.run, "roofing-20261015");
const keys = JSON.parse(
  execFileSync(
    "/opt/homebrew/bin/supabase",
    ["projects", "api-keys", "--project-ref", qa.project, "--output", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ),
);
const url = `https://${qa.project}.supabase.co`;
const anon = keys.find((key) => key.name === "anon").api_key;
const clients = [];
async function login(email, password) {
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  clients.push(client);
  const result = await client.auth.signInWithPassword({ email, password });
  assert.equal(result.error, null);
  return { client, token: result.data.session.access_token };
}
let requests = 0;
async function request(token, query = "", expected = 200) {
  const response = await fetch(base + "/api/exams" + query, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), Origin: base },
  });
  requests++;
  assert.equal(response.status, expected);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.equal(JSON.stringify(body).includes('"form_snapshot"'), false);
  assert.equal(JSON.stringify(body).includes('"correctOptionId"'), false);
  assert.equal(JSON.stringify(body).includes('"answer"'), false);
  return body;
}
try {
  const [personal, admin] = await Promise.all([
    login(qa.personalEmail, qa.personalPassword),
    login(qa.adminEmail, qa.adminPassword),
  ]);
  const teamQuery = "?org=" + qa.organizationId;
  const originalTeam = await request(admin.token, teamQuery);
  const originalPersonal = await request(personal.token);
  assert.ok(originalTeam.enrollments.some((row) => row.id === qa.exams.teamEnrollmentId));
  assert.ok(originalPersonal.enrollments.some((row) => row.id === qa.exams.personalEnrollmentId));
  for (const checkpoint of ["entrance", "day45", "day90"]) {
    const team = await request(admin.token, teamQuery + "&checkpoint=" + checkpoint);
    assert.deepEqual(
      team.enrollments.map((row) => row.id),
      originalTeam.enrollments.map((row) => row.id),
    );
    assert.ok(
      team.enrollments.every(
        (row) => row.scope === "team" && row.organization_id === qa.organizationId,
      ),
    );
    assert.ok(team.enrollments.every((row) => row.checkpoints.length === 3));
    const mine = await request(personal.token, "?checkpoint=" + checkpoint);
    assert.deepEqual(
      mine.enrollments.map((row) => row.id),
      originalPersonal.enrollments.map((row) => row.id),
    );
  }
  const pending45 = await request(personal.token, "?checkpoint=day45&state=in_progress");
  assert.ok(pending45.enrollments.some((row) => row.id === qa.exams.personalEnrollmentId));
  const entrance = await request(personal.token, "?checkpoint=entrance&state=in_progress");
  assert.equal(
    entrance.enrollments.some((row) => row.id === qa.exams.personalEnrollmentId),
    false,
  );
  await request(personal.token, "?checkpoint=made-up", 400);
  await request(personal.token, "?checkpoint=", 400);
  await request(personal.token, teamQuery + "&checkpoint=day45", 403);
  await request(admin.token, "?checkpoint=day45&learner=" + qa.personalId, 403);
  await request(null, teamQuery + "&checkpoint=day45", 403);
  const guest = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  for (const client of [guest, personal.client]) {
    const denied = await client.rpc("assessment_overview_checkpoint_page", {
      p_actor: qa.adminId,
      p_org: qa.organizationId,
      p_checkpoint: "day45",
    });
    assert.ok(denied.error, "Clients cannot forge a report actor through direct RPC");
  }
  const report = {
    testedAt: new Date().toISOString(),
    sourceCommit: process.env.LT_QA_STAGE_COMMIT,
    preview: base,
    requests,
    checks: {
      threeCheckpointFiltersOnTeamAndPersonal: true,
      checkpointActivityDoesNotMatchAnotherCheckpoint: true,
      allThreeComparisonSummariesRetained: true,
      invalidCheckpointRejected: true,
      teamCannotReadPersonal: true,
      nonmemberCannotReadTeam: true,
      anonymousDenied: true,
      directRpcActorSpoofDenied: true,
      noStoreAndNoRawEvidence: true,
      oldAllCheckpointViewPreserved: true,
    },
    limits: [
      "Existing synthetic QA records only; no exam, score, review, schedule, assignment, approval or certificate mutation",
      "Pagination beyond50 is proven by rolled-back local SQL, not invented hosted learners",
    ],
  };
  writeFileSync(
    "docs/reviews/qa-checkpoint-filter-2026-10-16.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
} finally {
  await Promise.allSettled(clients.map((client) => client.auth.signOut({ scope: "local" })));
}
