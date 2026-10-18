/** Denials only: no valid certificate lookup or authenticated entitlement read. */
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
for (const [path, status, error] of [
  ["/api/certificate", 400, "Check the certificate link and try again."],
  ["/api/certificate?id=", 400, "Check the certificate link and try again."],
  [
    "/api/certificate?id=synthetic-private-entry-detail",
    400,
    "Check the certificate link and try again.",
  ],
  ["/api/team-entitlement", 403, "Sign in to continue."],
]) {
  const response = await fetch(base + path, {
    method: "GET",
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
  });
  assert.equal(response.status, status);
  assert.match(response.headers.get("cache-control") ?? "", /private.*no-store/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(await response.json(), { error });
  checks.push({ path, status, privateNoStore: true, nosniff: true, fixedError: true });
}
for (const route of ["team", "team-billing", "module-request", "platform"]) {
  for (const method of ["GET", "POST"]) {
    const path = `/api/${route}`;
    const response = await fetch(base + path, {
      method,
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      ...(method === "POST" ? { headers: { "Content-Type": "application/json" }, body: "{}" } : {}),
    });
    assert.equal(response.status, 403);
    assert.match(response.headers.get("cache-control") ?? "", /private.*no-store/);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.deepEqual(await response.json(), { error: "Sign in to continue." });
    checks.push({
      path,
      method,
      status: 403,
      privateNoStore: true,
      nosniff: true,
      fixedError: true,
    });
  }
}
writeFileSync(
  "docs/reviews/qa-team-read-entry-http-2026-10-18.json",
  JSON.stringify(
    {
      testedAt: new Date().toISOString(),
      applicationCommit: commit,
      preview: base,
      checks,
      limits: [
        "Three invalid certificate IDs, missing-bearer entitlement and eight missing-bearer workflow GET/POST denials only. No valid certificate lookup, issuance, qualification, authenticated entitlement, team mutation, payment, invitation, email, consent or browser action. CDN headers checked in local actual-handler tests; Vercel consumes them.",
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ groups: checks.length, allPassed: true }));
