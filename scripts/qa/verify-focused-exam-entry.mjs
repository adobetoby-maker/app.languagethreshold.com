import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
const base = process.env.LT_QA_STAGE_URL;
assert.match(
  base ?? "",
  /^https:\/\/language-threshold-[a-z0-9]+-adobetoby-5572s-projects\.vercel\.app$/,
);
const org = "11111111-2222-4333-8444-555555555555";
const attempt = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const legacy = await fetch(
  `${base}/?tab=exams&module=roofing&target=English&native=Spanish&org=${org}&attempt=${attempt}&review=1&fromPlan=${org}&lesson=15&way=write&access_token=QA_SYNTHETIC_DO_NOT_FORWARD&return=https://outside.invalid`,
  { redirect: "manual" },
);
assert.equal(legacy.status, 307);
const location = new URL(legacy.headers.get("location"), base);
assert.equal(location.origin, base);
assert.equal(location.pathname, "/exams");
for (const [key, value] of Object.entries({
  module: "roofing",
  target: "English",
  native: "Spanish",
  org,
  attempt,
  review: "1",
  fromPlan: org,
  lesson: "15",
  way: "write",
}))
  assert.equal(location.searchParams.get(key), value);
for (const key of ["access_token", "return", "tab"])
  assert.equal(location.searchParams.has(key), false);
assert.match(legacy.headers.get("cache-control") ?? "", /no-store/);
assert.equal(legacy.headers.get("referrer-policy"), "no-referrer");
assert.match(legacy.headers.get("x-robots-tag") ?? "", /noindex/);
const focused = await fetch(`${base}/exams?module=roofing&target=Spanish&native=English`);
assert.equal(focused.status, 200);
const html = await focused.text();
assert.equal(/<script[^>]+src=["'][^"']*(?:googletagmanager|\/insights\/script)/.test(html), false);
assert.match(html, /name="referrer" content="no-referrer"/);
for (const path of [
  "/exams",
  "/exam-content",
  "/exam-reviewers",
  "/team",
  "/account",
  "/owner",
  "/certificate?id=fixture",
  "/family-setup",
  "/subscribe/success",
  `/?module=roofing&tab=core30&plan=${org}`,
  `/?module=roofing&tab=core30&fromPlan=${org}`,
]) {
  const response = await fetch(base + path, { redirect: "manual" });
  assert.ok([200, 307].includes(response.status), `${path}: ${response.status}`);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/, path);
  assert.equal(response.headers.get("referrer-policy"), "no-referrer", path);
  if (response.status === 307) {
    const canonical = new URL(response.headers.get("location"), base);
    assert.equal(canonical.origin, base);
    assert.equal(canonical.pathname, new URL(path, base).pathname);
    const final = await fetch(canonical, { redirect: "manual" });
    assert.equal(final.status, 200, canonical.pathname);
    assert.match(final.headers.get("cache-control") ?? "", /no-store/);
    assert.equal(final.headers.get("referrer-policy"), "no-referrer");
  }
}
const ordinary = await fetch(`${base}/?tab=reader&module=roofing&target=Spanish&native=English`, {
  redirect: "manual",
});
assert.equal(ordinary.status, 200);
const report = {
  testedAt: new Date().toISOString(),
  target: base,
  sourceCommit: process.env.LT_QA_STAGE_COMMIT ?? null,
  scope:
    "Unauthenticated HTTP routing and SSR only; synthetic references, no assessment API mutation",
  checks: {
    legacyServerRedirect: true,
    modulePairTeamAttemptRetained: true,
    explicitLessonPlanReturnRetained: true,
    credentialsAndArbitraryReturnExcluded: true,
    noStoreRedirect: true,
    noReferrerRedirect: true,
    noIndexRedirect: true,
    focusedSsrNoAnalyticsScript: true,
    focusedSsrNoReferrer: true,
    privatePagesAndScopedLessonsNoStore: true,
    privatePagesAndScopedLessonsNoReferrerHeader: true,
    ordinaryReadingUnchanged: true,
  },
};
writeFileSync(
  "docs/reviews/qa-focused-exam-entry-http-2026-10-16.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report.checks));
