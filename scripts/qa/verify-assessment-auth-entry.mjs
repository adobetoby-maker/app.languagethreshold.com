/** Missing-bearer requests only: cannot create/review/submit any assessment record. */
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
for (const [route, error] of [
  ["exams", "Sign in to continue."],
  ["exam-plans", "Sign in to continue."],
  ["exam-content", "Sign in with an authorized content reviewer or platform owner account."],
  ["exam-reviewers", "Registered platform owner access required."],
]) {
  for (const method of ["GET", "POST"]) {
    const response = await fetch(`${base}/api/${route}`, {
      method,
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
      ...(method === "POST"
        ? { headers: { Origin: base, "Content-Type": "application/json" }, body: "{}" }
        : {}),
    });
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error });
    const cache = response.headers.get("cache-control");
    assert.match(cache ?? "", /no-store/);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    checks.push({
      path: `/api/${route}`,
      method,
      status: 403,
      cacheControl: cache,
      nosniff: true,
      fixedGuidance: true,
    });
  }
}
writeFileSync(
  "docs/reviews/qa-assessment-auth-entry-http-2026-10-18.json",
  JSON.stringify(
    {
      testedAt: new Date().toISOString(),
      applicationCommit: commit,
      preview: base,
      checks,
      limits: [
        "Eight missing-bearer GET/POST requests only. POST bodies are empty objects with exact Origin; no Authorization/session/credentials, valid mutation input, allowed start/save/submit/review/role/content change or provider action.",
        "Asserts final no-store/nosniff and exact established denial bodies, not CDN header visibility or current expiry/reauth/browser behavior. Unexpected backend failures are covered by local controlled actual-handler tests; no hosted outage manufactured.",
        "No main/production/accepted-hostname/schema/grant/role/policy/schedule action. Full goal and human/device/session gates remain open.",
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ groups: checks.length, allPassed: true }));
