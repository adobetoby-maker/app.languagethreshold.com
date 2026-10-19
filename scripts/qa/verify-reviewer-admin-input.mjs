/** Anonymous admission denials only. No owner/reviewer access or allowed mutation. */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
const base = process.env.LT_QA_STAGE_URL,
  commit = process.env.LT_QA_STAGE_COMMIT;
assert.match(
  base ?? "",
  /^https:\/\/language-threshold-[a-z0-9]+-adobetoby-5572s-projects\.vercel\.app$/,
);
assert.match(commit ?? "", /^[a-f0-9]{40}$/);
const checks = [];
for (const [name, origin, body, status, error] of [
  ["missing-origin", undefined, "{}", 403, "Same-origin reviewer request required."],
  ["foreign-origin", "https://outside.invalid", "{}", 403, null],
  ["malformed", base, "synthetic-private-reviewer-detail", 400, "Invalid reviewer request."],
  ["invalid-UTF8", base, new Uint8Array([0xff]), 400, "Invalid reviewer request."],
  ["invalid-schema", base, "{}", 400, "Check the reviewer scope and confirmation."],
  [
    "oversized-UTF8",
    base,
    JSON.stringify({ reason: "é".repeat(9000) }),
    413,
    "Reviewer request is too large.",
  ],
]) {
  const response = await fetch(base + "/api/exam-reviewers", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) },
    body,
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.status, status, name);
  assert.match(response.headers.get("cache-control") ?? "", /private.*no-store/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  const text = await response.text();
  assert.doesNotMatch(text, /synthetic-private-reviewer-detail/);
  if (error) assert.deepEqual(JSON.parse(text), { error });
  checks.push({
    name,
    status,
    privateNoStore: true,
    nosniff: true,
    noBodyEcho: true,
    fixedGuidance: error !== null,
  });
}
writeFileSync(
  "docs/reviews/qa-reviewer-admin-input-http-2026-10-18.json",
  JSON.stringify(
    {
      testedAt: new Date().toISOString(),
      applicationCommit: commit,
      preview: base,
      checks,
      limits: [
        "Six anonymous invalid-origin/body denials only, no Authorization/session/cookies and no valid mutation or actual owner/reviewer operation. Foreign-origin rejection can occur at the hosted framework before the route; only status/privacy/no-echo is claimed for that case.",
        "Streaming timeout/disconnect/advertised-length/ignored-cancel and before-SDK call ordering are actual local handler/SDK tests; no hosted stalled upload, grant, revocation, reviewer approval, quota consumption or private registry read is attempted. No full endpoint or list-response repair claim.",
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ groups: checks.length, allPassed: true }));
