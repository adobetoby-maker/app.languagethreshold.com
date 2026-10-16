/** Denials never spend model calls. A single synthetic Tutor request requires --live-tutor-smoke. */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
const base = process.env.LT_QA_STAGE_URL;
assert.match(
  base ?? "",
  /^https:\/\/language-threshold-[a-z0-9]+-adobetoby-5572s-projects\.vercel\.app$/,
);
const checks = [];
for (const route of ["tutor", "discussion", "field-prep", "module-field-prep"]) {
  for (const [name, body, origin, status] of [
    ["cross-origin", "{}", "https://outside.invalid", 403],
    ["absent-origin", "{}", null, 403],
    ["invalid-json", "not JSON", base, 400],
    ["oversized-body", " ".repeat(96 * 1024 + 1), base, 413],
  ]) {
    const response = await fetch(`${base}/api/${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) },
      body,
      signal: AbortSignal.timeout(20000),
    });
    assert.equal(response.status, status, `${route} ${name}`);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const result = await response.json();
    assert.equal(typeof result.error, "string");
    checks.push({ route, case: name, status, noStore: true });
  }
}
let liveTutor = { attempted: false };
if (process.argv.includes("--live-tutor-smoke")) {
  const response = await fetch(`${base}/api/tutor`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Please reply with one short Spanish greeting." }],
      context: {
        language: "Spanish",
        nativeLanguage: "English",
        level: "A1",
        textTitle: "Synthetic QA conversation check",
      },
    }),
    signal: AbortSignal.timeout(60000),
  });
  assert.equal(response.status, 200, "Single synthetic Tutor request");
  assert.match(response.headers.get("content-type"), /text\/event-stream/);
  assert.match(response.headers.get("cache-control"), /no-store/);
  const stream = await response.text();
  const events = stream
    .split("\n")
    .filter((line) => line.startsWith("data: ") && !line.includes("[DONE]"))
    .map((line) => JSON.parse(line.slice(6)));
  assert.ok(events.some((event) => event.choices?.some((choice) => choice.delta?.content?.trim())));
  assert.ok(stream.includes("data: [DONE]"));
  liveTutor = {
    attempted: true,
    requests: 1,
    status: 200,
    textDeltaReceived: true,
    completionMarkerReceived: true,
    usageReceiptReceived: events.some((event) => !!event.metering),
    noStore: true,
    rawPromptOrReplyIncluded: false,
    learnerOrAssessmentMutation: false,
  };
}
const report = {
  testedAt: new Date().toISOString(),
  sourceCommit: process.env.LT_QA_STAGE_COMMIT,
  preview: base,
  scope:
    "Hosted origin/body denials; optional one explicitly requested synthetic Tutor inference. No quota exhaustion or learner/assessment writes.",
  checks,
  liveTutor,
};
writeFileSync(
  "docs/reviews/qa-conversation-entry-2026-10-16.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify({ denialChecks: checks.length, liveTutor }));
