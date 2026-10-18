/** Inadmissible input only: no model call, durable counter or consent write. */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
const base = process.env.LT_QA_STAGE_URL;
assert.match(
  base ?? "",
  /^https:\/\/language-threshold-[a-z0-9]+-adobetoby-5572s-projects\.vercel\.app$/,
);
assert.match(process.env.LT_QA_STAGE_COMMIT ?? "", /^[a-f0-9]{40}$/);
const checks = [];
for (const [path, limit, value] of [
  ["speak", 384 * 1024, { mode: "challenge", language: "Spanish", level: "A1" }],
  ["speaking-consent", 1024, { attested: true }],
]) {
  for (const [name, origin, body, status] of [
    ["missing-origin", undefined, JSON.stringify(value), 403],
    ["foreign-origin", "https://outside.invalid", JSON.stringify(value), 403],
    ["malformed", base, "{", 400],
    ["invalid-schema", base, JSON.stringify({ invalid: "synthetic-private-entry-detail" }), 400],
    ["oversized-valid-json", base, JSON.stringify({ ...value, padding: "x".repeat(limit) }), 413],
  ]) {
    const response = await fetch(`${base}/api/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) },
      body,
      redirect: "error",
      credentials: "omit",
      cache: "no-store",
    });
    assert.equal(response.status, status, `${path}:${name}`);
    assert.match(response.headers.get("cache-control") ?? "", /private.*no-store/);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    const text = await response.text();
    assert.doesNotMatch(text, /synthetic-private-entry-detail/);
    if (path === "speaking-consent") assert.equal(JSON.parse(text).writeOutcome, "not_started");
    checks.push({
      route: path,
      name,
      status,
      privateNoStore: true,
      nosniff: true,
      noTextEcho: true,
    });
  }
}
writeFileSync(
  "docs/reviews/qa-speaking-admission-entry-http-2026-10-18.json",
  JSON.stringify(
    {
      testedAt: new Date().toISOString(),
      applicationCommit: process.env.LT_QA_STAGE_COMMIT,
      preview: base,
      checks,
      limits: [
        "Inadmissible input only; no allowed speaking or consent read/write request, counter consumption, model/provider call, native playback or human approval. CDN-specific no-store headers are consumed by Vercel; local route tests inspect all directives.",
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ checks: checks.length, providerCallOrConsentWriteAttempted: false }));
