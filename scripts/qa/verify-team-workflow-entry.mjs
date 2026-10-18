/** Invalid input only; never an authenticated workflow or allowed action schema. */
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
for (const route of ["team", "team-billing", "module-request", "platform"]) {
  for (const [name, origin, body, status] of [
    ["missing-origin", undefined, "{}", 403],
    ["foreign-origin", "https://foreign.invalid", "{}", 403],
    ["malformed", base, "{", 400],
    ["invalid-schema", base, JSON.stringify({ invalid: "synthetic-private-entry-detail" }), 400],
    ["oversized", base, JSON.stringify({ padding: "x".repeat(65536) }), 413],
  ]) {
    const response = await fetch(`${base}/api/${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}) },
      body,
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
    });
    assert.equal(response.status, status, `${route}:${name}`);
    assert.match(response.headers.get("cache-control") ?? "", /private.*no-store/);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.doesNotMatch(await response.text(), /synthetic-private-entry-detail/);
    checks.push({ route, name, status, privateNoStore: true, nosniff: true, noTextEcho: true });
  }
}
writeFileSync(
  "docs/reviews/qa-team-workflow-entry-http-2026-10-18.json",
  JSON.stringify(
    {
      testedAt: new Date().toISOString(),
      applicationCommit: commit,
      preview: base,
      checks,
      limits: [
        "Twenty invalid origin/schema/JSON/size requests only, without Authorization. These cannot authorize writes even on historical handlers. No accepted company/invitation/billing/payment/module/ledger/grant/certificate/email/provider/consent/browser action. Local tests inspect CDN headers consumed by Vercel.",
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ groups: checks.length, allPassed: true }));
