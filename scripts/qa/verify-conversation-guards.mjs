/** Rejected HTTP inputs only: no valid model request, identity or learner content. */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { assertQaStage } from "./stage-origin.mjs";
import { MAX_CONVERSATION_BODY_BYTES } from "../../src/lib/conversation-request.ts";
const base = process.env.LT_QA_STAGE_URL;
assertQaStage(base);
const checks = [];
for (const route of ["tutor", "discussion", "field-prep", "module-field-prep"]) {
  for (const [kind, origin, body, expected] of [
    ["cross-origin", "https://outside.invalid", "{}", 403],
    ["missing-origin", null, "{}", 403],
    ["invalid-payload", base, "{}", 400],
    ["oversize-body", base, " ".repeat(MAX_CONVERSATION_BODY_BYTES + 1), 413],
  ]) {
    const response = await fetch(`${base}/api/${route}`, {
      method: "POST",
      redirect: "error",
      credentials: "omit",
      headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) },
      body,
      signal: AbortSignal.timeout(15_000),
    });
    assert.equal(response.status, expected, `${route}: ${kind}`);
    assert.match(response.headers.get("cache-control"), /no-store/);
    const payload = await response.json();
    assert.equal(typeof payload.error, "string");
    assert.equal(payload.choices, undefined);
    checks.push({ route, input: kind, status: response.status, noStore: true });
  }
}
const report = {
  testedAt: new Date().toISOString(),
  base,
  sourceCommit: process.env.LT_QA_STAGE_COMMIT ?? null,
  checks,
  validModelRequests: 0,
  limits: [
    "Rejected request/origin/body HTTP boundaries only.",
    "No actual model call, billing, stream timeout/cancellation or browser acceptance is claimed.",
  ],
};
writeFileSync(
  "docs/reviews/qa-conversation-http-guards-2026-10-17.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({ rejectedHttpGroups: checks.length, validModelRequests: 0, allNoStore: true }),
);
