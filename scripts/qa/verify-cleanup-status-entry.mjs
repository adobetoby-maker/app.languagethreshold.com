/** Anonymous/short-token denials only; never supplies an operator secret or enables work. */
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
for (const [path, token, status, error] of [
  ["/api/exam-cleanup?view=status", null, 403, "Platform owner access required."],
  ["/api/exam-cleanup", null, 401, "Cleanup operator authorization required."],
  ["/api/exam-cleanup", "synthetic-short-token", 401, "Cleanup operator authorization required."],
]) {
  const response = await fetch(base + path, {
    method: "GET",
    cache: "no-store",
    credentials: "omit",
    redirect: "error",
    signal: AbortSignal.timeout(15000),
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  });
  assert.equal(response.status, status);
  assert.deepEqual(await response.json(), { error });
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  checks.push({
    path,
    shortSyntheticToken: !!token,
    status,
    noStore: true,
    noReferrer: true,
    nosniff: true,
    fixedError: true,
  });
}
writeFileSync(
  "docs/reviews/qa-cleanup-status-entry-http-2026-10-18.json",
  JSON.stringify(
    {
      testedAt: new Date().toISOString(),
      applicationCommit: commit,
      preview: base,
      checks,
      limits: [
        "Missing user bearer plus missing/short synthetic operator token only. Short token cannot match the required32byte-minimum cron secret. No real operator credential, allowed invocation, owner/history read, deletion, policy/schedule/retention/role action.",
        "Does not prove actual owner acceptance, expiry, deletion or installed platform scheduling. Controlled local tests cover status service/deadline/abort behavior. Full release/device/human gates remain open.",
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ groups: 3, allPassed: true }));
