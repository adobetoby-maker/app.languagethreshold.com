/** Read-only export acceptance against existing dedicated QA records. Never manufacture history. */
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
const url = `https://${qa.project}.supabase.co`,
  anon = keys.find((k) => k.name === "anon").api_key;
const options = { auth: { persistSession: false, autoRefreshToken: false } },
  service = createClient(url, keys.find((k) => k.name === "service_role").api_key, options),
  clients = [];
async function login(email, password) {
  const client = createClient(url, anon, options);
  clients.push(client);
  const result = await client.auth.signInWithPassword({ email, password });
  assert.equal(result.error, null);
  return result.data.session.access_token;
}
function parseCsv(raw) {
  const rows = [],
    row = [];
  let value = "",
    quoted = false;
  raw = raw.replace(/^\uFEFF/, "");
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === '"') {
      if (quoted && raw[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && c === ",") {
      row.push(value);
      value = "";
    } else if (!quoted && (c === "\n" || c === "\r")) {
      if (c === "\r" && raw[i + 1] === "\n") i++;
      row.push(value);
      rows.push([...row]);
      row.length = 0;
      value = "";
    } else value += c;
  }
  assert.equal(quoted, false);
  if (row.length || value) {
    row.push(value);
    rows.push([...row]);
  }
  return rows;
}
let requests = 0;
async function fetchExport(token, enrollment, expected = 200) {
  const response = await fetch(
    base + "/api/exam-plans?" + new URLSearchParams({ action: "history_export", enrollment }),
    { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } },
  );
  requests++;
  assert.equal(response.status, expected);
  assert.equal(response.headers.get("cache-control"), "no-store");
  if (expected !== 200) {
    assert.ok((await response.json()).error);
    return null;
  }
  assert.match(response.headers.get("content-type"), /^text\/csv/);
  assert.match(response.headers.get("content-disposition"), /^attachment;/);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.match(response.headers.get("x-robots-tag"), /noindex/);
  const records = parseCsv(await response.text()),
    header = records.shift();
  assert.equal(header.length, 31);
  assert.equal(header.includes("Event ID"), true);
  for (const forbidden of [
    "answer",
    "form_snapshot",
    "payloadHash",
    "audioText",
    "originalTranscript",
    "mediaEvidenceId",
  ])
    assert.equal(header.includes(forbidden), false);
  assert.equal(records.length, Number(response.headers.get("x-lt-export-events")));
  assert.ok(
    records.every(
      (row) => row.length === header.length && row[header.indexOf("Enrollment ID")] === enrollment,
    ),
  );
  const actual = await service
    .from("assessment_events")
    .select("id", { count: "exact", head: true })
    .eq("enrollment_id", enrollment);
  assert.equal(actual.error, null);
  assert.equal(records.length, actual.count);
  const eventIds = records.map((row) => row[header.indexOf("Event ID")]);
  assert.equal(new Set(eventIds).size, eventIds.length);
  return {
    events: records.length,
    scope: records[0]?.[header.indexOf("Scope")] ?? null,
    exceedsVisibleHistoryPage: records.length > 20,
  };
}
try {
  const [personal, admin, learner] = await Promise.all([
    login(qa.personalEmail, qa.personalPassword),
    login(qa.adminEmail, qa.adminPassword),
    login(qa.email, qa.password),
  ]);
  await fetchExport(admin, "invalid-id", 400);
  const personalResult = await fetchExport(personal, qa.exams.personalEnrollmentId);
  const teamResult = await fetchExport(admin, qa.exams.teamEnrollmentId);
  const ownTeam = await fetchExport(learner, qa.exams.teamEnrollmentId);
  assert.equal(personalResult.scope, "personal");
  assert.equal(teamResult.scope, "team");
  assert.equal(ownTeam.events, teamResult.events);
  await fetchExport(admin, qa.exams.personalEnrollmentId, 403);
  await fetchExport(personal, qa.exams.teamEnrollmentId, 403);
  await fetchExport(learner, qa.exams.personalEnrollmentId, 403);
  await fetchExport(null, qa.exams.teamEnrollmentId, 403);
  const report = {
    testedAt: new Date().toISOString(),
    sourceCommit: process.env.LT_QA_STAGE_COMMIT,
    preview: base,
    requests,
    personal: personalResult,
    team: teamResult,
    checks: {
      completeStoredEventCounts: true,
      noDuplicateEvents: true,
      authorizedPersonalAndTeamExports: true,
      ownLearnerTeamExport: true,
      crossScopeDenied: true,
      anonymousDenied: true,
      invalidIdRejected: true,
      privateDownloadHeaders: true,
      noRawPayloadColumns: true,
    },
    limits: [
      "Read-only existing synthetic QA histories; no score, history, assignment, approval, schedule or certificate writes",
      "Batched500-row server scans and failure/revocation/resource/cancellation cases use controlled production-handler tests; this report records actual hosted event counts",
    ],
  };
  writeFileSync(
    "docs/reviews/qa-history-export-2026-10-16.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
} finally {
  await Promise.allSettled(clients.map((client) => client.auth.signOut({ scope: "local" })));
}
