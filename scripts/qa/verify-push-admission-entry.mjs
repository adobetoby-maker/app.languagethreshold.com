/** Inadmissible reminder input only; no counter, subscription or delivery operation. */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
const base = process.env.LT_QA_STAGE_URL;
assert.match(
  base ?? "",
  /^https:\/\/language-threshold-[a-z0-9]+-adobetoby-5572s-projects\.vercel\.app$/,
);
assert.match(process.env.LT_QA_STAGE_COMMIT ?? "", /^[a-f0-9]{40}$/);
const context = {
  version: 1,
  language: "Spanish",
  topicTitle: null,
  lastPracticeDate: null,
  mission: null,
  trip: null,
  stack: null,
};
const value = { action: "sync-context", context };
const checks = [];
for (const [name, origin, body, status] of [
  ["missing-origin", undefined, JSON.stringify(value), 403],
  ["foreign-origin", "https://outside.invalid", JSON.stringify(value), 403],
  ["malformed", base, "{", 400],
  ["invalid-schema", base, JSON.stringify({ invalid: "synthetic-private-entry-detail" }), 400],
  ["oversized-valid-json", base, JSON.stringify({ ...value, padding: "x".repeat(16 * 1024) }), 413],
]) {
  const response = await fetch(`${base}/api/push`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) },
    body,
    redirect: "error",
    credentials: "omit",
    cache: "no-store",
  });
  assert.equal(response.status, status, name);
  assert.match(response.headers.get("cache-control") ?? "", /private.*no-store/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.doesNotMatch(await response.text(), /synthetic-private-entry-detail/);
  checks.push({ name, status, privateNoStore: true, nosniff: true, noTextEcho: true });
}
writeFileSync(
  "docs/reviews/qa-push-admission-entry-http-2026-10-18.json",
  JSON.stringify(
    {
      testedAt: new Date().toISOString(),
      applicationCommit: process.env.LT_QA_STAGE_COMMIT,
      preview: base,
      checks,
      limits: [
        "Inadmissible POST input only, before durable counters/auth/subscription/preferences/delivery. No allowed settings read/write, permission prompt, service worker, push send, scheduler or real provider operation. Local tests inspect CDN headers consumed by Vercel.",
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ groups: checks.length, allPassed: true }));
