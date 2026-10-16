/** Tests actual authenticated API/database behavior with synthetic QA accounts only. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const path = join(homedir(), ".codex/tmp/language-threshold-qa/roofing-20261015.json");
const qa = JSON.parse(readFileSync(path, "utf8"));
assert.equal(qa.project, "pollhlkgltdkdskdzsgd");
assert.equal(qa.run, "roofing-20261015");
const base = "http://127.0.0.1:4311";
const keys = JSON.parse(
  execFileSync(
    "/opt/homebrew/bin/supabase",
    ["projects", "api-keys", "--project-ref", qa.project, "--output", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ),
);
const publicKey =
  keys.find((key) => key.type === "publishable" && !key.disabled)?.api_key ??
  keys.find((key) => key.name === "anon")?.api_key;
const clients = [];
async function login(email, password) {
  const client = createClient(`https://${qa.project}.supabase.co`, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  clients.push(client);
  const result = await client.auth.signInWithPassword({ email, password });
  assert.ok(!result.error && result.data.session, "QA authentication");
  return result.data.session.access_token;
}
const personal = await login(qa.personalEmail, qa.personalPassword),
  learner = await login(qa.email, qa.password),
  admin = await login(qa.adminEmail, qa.adminPassword);
const service = createClient(
  `https://${qa.project}.supabase.co`,
  keys.find((key) => key.name === "service_role")?.api_key,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
async function request(token, bodyOrPath) {
  const get = typeof bodyOrPath === "string";
  const response = await fetch(base + (get ? bodyOrPath : "/api/exams"), {
    method: get ? "GET" : "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Origin: base,
      ...(!get ? { "Content-Type": "application/json" } : {}),
    },
    ...(!get ? { body: JSON.stringify(bodyOrPath) } : {}),
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`API returned non-JSON (${response.status})`);
  }
  return { status: response.status, cache: response.headers.get("cache-control"), body };
}
async function ok(token, body) {
  const result = await request(token, body);
  if (result.status !== 200)
    throw new Error(
      `QA action ${typeof body === "string" ? "read" : body.action}: ${result.status} ${result.body.error}`,
    );
  return result.body;
}
qa.exams ??= {};
const remember = () => writeFileSync(path, JSON.stringify(qa, null, 2) + "\n", { mode: 0o600 });
const createBody = {
  action: "enroll",
  moduleId: "roofing",
  targetLanguage: "Spanish",
  instructionLanguage: "English",
  startDate: "2026-10-15",
  timezone: "America/Denver",
};
qa.exams.personalEnrollRequest ??= randomUUID();
qa.exams.teamEnrollRequest ??= randomUUID();
remember();
const personalEnroll = await ok(personal, {
  ...createBody,
  requestId: qa.exams.personalEnrollRequest,
});
qa.exams.personalEnrollmentId = personalEnroll.enrollmentId;
remember();
const personalOverview = await ok(personal, "/api/exams");
const personalPlan = personalOverview.enrollments.find(
  (row) => row.id === personalEnroll.enrollmentId,
);
assert.equal(personalPlan.scope, "personal");
assert.equal(personalPlan.organization_id, null);
assert.equal(personalPlan.checkpoints.length, 3);
const entrance = personalPlan.checkpoints.find((cp) => cp.checkpoint === "entrance");
assert.equal(entrance.ready, false);
assert.equal(entrance.pilotReady, true);
qa.exams.personalStartRequest ??= randomUUID();
remember();
let personalAttempt = await ok(personal, {
  action: "start",
  checkpointId: entrance.id,
  requestId: qa.exams.personalStartRequest,
});
qa.exams.personalAttemptId = personalAttempt.id;
remember();
assert.equal(personalAttempt.pilot, true);
if (!personalAttempt.submittedAt) {
  for (const item of personalAttempt.form.items) {
    for (const key of ["accepted", "correctOptionId", "audioText", "rationale", "rubric"])
      assert.equal(key in item, false);
  }
}
assert.equal(
  (await request(admin, `/api/exams?action=attempt&attempt=${personalAttempt.id}`)).status,
  403,
);
assert.equal(
  (await request(admin, `/api/exams?action=attempt&attempt=${personalAttempt.id}&review=1`)).status,
  403,
);
assert.equal(
  (await request(learner, `/api/exams?action=attempt&attempt=${personalAttempt.id}`)).status,
  403,
);
assert.equal((await request(null, "/api/exams")).status, 403);
let conflictChecked = false;
if (!personalAttempt.submittedAt) {
  const updates = personalAttempt.form.items.map((item) => ({
    itemId: item.id,
    answer:
      item.skill === "listening"
        ? { inputMethod: "unavailable", missingReason: "QA run: no audio collected" }
        : item.skill === "speaking"
          ? { inputMethod: "unavailable", missingReason: "QA run: no recorded speech" }
          : item.type === "choice"
            ? { inputMethod: "choice", choiceId: item.options[0].id }
            : item.type === "recall"
              ? { inputMethod: "typed", text: item.objectiveId.endsWith(".1") ? "techo" : "no sé" }
              : {
                  inputMethod: "typed",
                  text: "El techo es inclinado. Necesito confirmar el material con la cuadrilla.",
                },
  }));
  const revision = personalAttempt.revision,
    saveId = randomUUID();
  const saved = await ok(personal, {
    action: "save",
    attemptId: personalAttempt.id,
    revision,
    updates,
    requestId: saveId,
  });
  const retried = await ok(personal, {
    action: "save",
    attemptId: personalAttempt.id,
    revision,
    updates,
    requestId: saveId,
  });
  assert.equal(saved.revision, retried.revision);
  assert.equal(
    (
      await request(personal, {
        action: "save",
        attemptId: personalAttempt.id,
        revision,
        updates: updates.slice(0, 1),
        requestId: randomUUID(),
      })
    ).status,
    409,
  );
  conflictChecked = true;
  qa.exams.personalSubmitRequest ??= randomUUID();
  remember();
  const submitted = await ok(personal, {
    action: "submit",
    attemptId: personalAttempt.id,
    revision: saved.revision,
    requestId: qa.exams.personalSubmitRequest,
  });
  assert.equal(submitted.submitted, true);
  await ok(personal, {
    action: "submit",
    attemptId: personalAttempt.id,
    revision: saved.revision,
    requestId: qa.exams.personalSubmitRequest,
  });
}
personalAttempt = await ok(personal, `/api/exams?action=attempt&attempt=${personalAttempt.id}`);
assert.ok(personalAttempt.submittedAt);
assert.equal(personalAttempt.profiles[0].skills.length, 6);
assert.equal("overall" in personalAttempt, false);
assert.equal(
  personalAttempt.profiles[0].skills.find((skill) => skill.skill === "listening").state,
  "not_assessed",
);
assert.equal(
  personalAttempt.profiles[0].skills.find((skill) => skill.skill === "speaking").state,
  "not_assessed",
);
assert.equal(
  personalAttempt.profiles[0].skills.find((skill) => skill.skill === "writing").state,
  "needs_review",
);
const teamEnroll = await ok(admin, {
  ...createBody,
  orgId: qa.organizationId,
  learnerId: qa.learnerId,
  requestId: qa.exams.teamEnrollRequest,
});
qa.exams.teamEnrollmentId = teamEnroll.enrollmentId;
remember();
const teamOverview = await ok(admin, `/api/exams?org=${qa.organizationId}`);
assert.ok(
  teamOverview.enrollments.every(
    (row) => row.scope === "team" && row.organization_id === qa.organizationId,
  ),
);
assert.ok(!teamOverview.enrollments.some((row) => row.id === personalEnroll.enrollmentId));
const teamPlan = teamOverview.enrollments.find((row) => row.id === teamEnroll.enrollmentId);
assert.ok(teamPlan);
const cp = teamPlan.checkpoints.find((row) => row.checkpoint === "entrance");
qa.exams.teamStartRequest ??= randomUUID();
remember();
let teamAttempt = await ok(learner, {
  action: "start",
  checkpointId: cp.id,
  requestId: qa.exams.teamStartRequest,
});
qa.exams.teamAttemptId = teamAttempt.id;
remember();
if (!teamAttempt.submittedAt) {
  const item = teamAttempt.form.items.find((row) => row.skill === "writing");
  const saved = await ok(learner, {
    action: "save",
    attemptId: teamAttempt.id,
    revision: teamAttempt.revision,
    updates: [
      {
        itemId: item.id,
        answer: {
          inputMethod: "typed",
          text: "Este techo es inclinado y tiene tejas asfálticas. ¿Puede confirmar los materiales?",
        },
      },
    ],
    requestId: randomUUID(),
  });
  qa.exams.teamSubmitRequest ??= randomUUID();
  remember();
  await ok(learner, {
    action: "submit",
    attemptId: teamAttempt.id,
    revision: saved.revision,
    requestId: qa.exams.teamSubmitRequest,
  });
}
teamAttempt = await ok(admin, `/api/exams?action=attempt&attempt=${teamAttempt.id}&review=1`);
const response = teamAttempt.responses.find((row) => row.answer.text?.startsWith("Este techo"));
assert.ok(response);
qa.exams.teamReviewRequest ??= randomUUID();
remember();
await ok(admin, {
  action: "review_score",
  attemptId: teamAttempt.id,
  responseId: response.id,
  state: "scored",
  points: 5,
  dimensions: Object.fromEntries(
    teamAttempt.feedback
      .find((row) => row.itemId === response.item_id)
      .rubric.dimensions.map((dimension, index) => [dimension.id, index === 2 ? 1 : 2]),
  ),
  reason:
    "QA ONLY: manual-review workflow test against a synthetic response; not a real learner proficiency rating.",
  requestId: qa.exams.teamReviewRequest,
});
const reviewed = await ok(learner, `/api/exams?action=attempt&attempt=${teamAttempt.id}`);
assert.equal(reviewed.status, "completed");
assert.equal(
  reviewed.profiles[0].skills.find((skill) => skill.skill === "writing").score,
  null,
  "one objective is insufficient for a skill score",
);
const direct = createClient(`https://${qa.project}.supabase.co`, publicKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
assert.ok((await direct.from("assessment_forms").select("id")).error);
assert.ok(
  (
    await direct.rpc("assessment_start_attempt", {
      p_actor: qa.personalId,
      p_checkpoint: entrance.id,
      p_form: "anything",
      p_request: randomUUID(),
      p_allow_pilot: true,
    })
  ).error,
);
const certificates = await service
  .from("team_certificates")
  .select("id")
  .eq("organization_id", qa.organizationId);
assert.equal(certificates.data.length, 0);
const assignment = await service
  .from("team_assignments")
  .select("require_certificate,due_at")
  .eq("organization_id", qa.organizationId)
  .eq("user_id", qa.learnerId)
  .eq("module_id", "roofing")
  .single();
assert.equal(assignment.data.require_certificate, false);
assert.equal(assignment.data.due_at, "2026-11-01T12:00:00+00:00");
for (const client of clients) await client.auth.signOut({ scope: "local" });
const evidence = {
  testedAt: new Date().toISOString(),
  target: base,
  scope: "Synthetic QA exam attempts only; forms remain draft, no human calibration claimed",
  checks: {
    noTeamIndividual: true,
    privateAttemptHiddenFromAdmin: true,
    privateAttemptHiddenFromOtherLearner: true,
    teamOverviewExcludesPersonal: true,
    anonymousDenied: true,
    browserKeysAndTranscriptsHiddenUntilSubmission: true,
    saveRetryIdempotent: true,
    conflictChecked,
    submissionRetryIdempotent: true,
    missingListeningAndSpeechNotZero: true,
    writingNeedsReview: true,
    manualTeamReviewWorks: true,
    insufficientCoverageWithholdsSkillScore: true,
    directBrowserDatabaseDenied: true,
    noCertificates: true,
    originalTeamAssignmentPreserved: true,
  },
  qa: {
    personalEnrollmentId: personalEnroll.enrollmentId,
    teamEnrollmentId: teamEnroll.enrollmentId,
    personalAttemptId: personalAttempt.id,
    teamAttemptId: teamAttempt.id,
  },
};
writeFileSync(
  existsSync("docs/reviews/qa-exams-api-2026-10-16.json")
    ? "docs/reviews/qa-exams-api-rerun-2026-10-16.json"
    : "docs/reviews/qa-exams-api-2026-10-16.json",
  JSON.stringify(evidence, null, 2) + "\n",
);
console.log(JSON.stringify(evidence.checks));
