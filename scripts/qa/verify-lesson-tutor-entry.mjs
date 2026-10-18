/** Invalid lesson contexts only: no accepted request or paid model call. */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { currentTutorLesson } from "../../src/lib/lesson-tutor-context.ts";
const base = process.env.LT_QA_STAGE_URL;
assert.match(
  base ?? "",
  /^https:\/\/language-threshold-[a-z0-9]+-adobetoby-5572s-projects\.vercel\.app$/,
);
const lesson = currentTutorLesson("?lesson=15", {
  currentTab: "core30",
  activeModuleId: "roofing",
  selectedLanguage: "Spanish",
  nativeLanguage: "English",
});
assert.ok(lesson);
const checks = [];
for (const [name, reference, language, status] of [
  ["stale-source-version", { ...lesson, contentVersion: "old-source-version" }, "Spanish", 409],
  ["wrong-target-language", lesson, "French", 400],
  ["missing-lesson", { ...lesson, lessonNumber: 31 }, "Spanish", 400],
  [
    "unknown-module",
    { ...lesson, moduleId: "qa-unknown-module", contentVersion: "unversioned-app-draft" },
    "Spanish",
    400,
  ],
]) {
  const response = await fetch(`${base}/api/tutor`, {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: "Synthetic QA context denial check" }],
      context: { language, level: "C2", nativeLanguage: "English", lesson: reference },
    }),
    signal: AbortSignal.timeout(20000),
  });
  assert.equal(response.status, status, name);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match((await response.json()).error, /Reopen/);
  checks.push({ name, status, noStore: true });
}
const report = {
  testedAt: new Date().toISOString(),
  sourceCommit: process.env.LT_QA_STAGE_COMMIT,
  preview: base,
  scope:
    "Actual hosted lesson-reference rejection before budget/provider use; no allowed inference or learner/assessment changes",
  checks,
};
writeFileSync(
  "docs/reviews/qa-lesson-tutor-entry-2026-10-16.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify({ passed: checks.length, modelRequests: 0 }));
