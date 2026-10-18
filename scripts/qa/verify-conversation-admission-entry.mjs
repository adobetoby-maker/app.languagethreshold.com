/** Invalid input only; no conversation counter/model operation. */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
const base = process.env.LT_QA_STAGE_URL;
assert.match(
  base ?? "",
  /^https:\/\/language-threshold-[a-z0-9]+-adobetoby-5572s-projects\.vercel\.app$/,
);
assert.match(process.env.LT_QA_STAGE_COMMIT ?? "", /^[a-f0-9]{40}$/);
const checks = [];
for (const route of ["tutor", "discussion", "field-prep", "module-field-prep"]) {
  for (const [name, origin, body, status] of [
    ["missing-origin", undefined, "{}", 403],
    ["foreign-origin", "https://outside.invalid", "{}", 403],
    ["malformed", base, "{", 400],
    ["invalid-schema", base, JSON.stringify({ invalid: "synthetic-private-entry-detail" }), 400],
    ["oversized-json", base, JSON.stringify({ padding: "x".repeat(96 * 1024) }), 413],
  ]) {
    const response = await fetch(`${base}/api/${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) },
      body,
      redirect: "error",
      credentials: "omit",
      cache: "no-store",
    });
    assert.equal(response.status, status, `${route}:${name}`);
    assert.match(response.headers.get("cache-control") ?? "", /private.*no-store/);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.doesNotMatch(await response.text(), /synthetic-private-entry-detail/);
    checks.push({ route, name, status, privateNoStore: true, nosniff: true, noTextEcho: true });
  }
}
writeFileSync(
  "docs/reviews/qa-conversation-admission-entry-http-2026-10-18.json",
  JSON.stringify(
    {
      testedAt: new Date().toISOString(),
      applicationCommit: process.env.LT_QA_STAGE_COMMIT,
      preview: base,
      checks,
      limits: [
        "Invalid origin/JSON/schema/size only, before durable conversation budgets/model work. No admitted conversation, provider, quota exhaustion, native speech, consent or browser action. Local tests inspect CDN headers consumed by Vercel.",
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ groups: checks.length, allPassed: true }));
