/** Hosted cross-origin denials only: never intentionally spends a model request. */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { toJSONAsync } from "seroval";
const base = process.env.LT_QA_STAGE_URL;
assert.match(
  base ?? "",
  /^https:\/\/language-threshold-[a-z0-9]+-adobetoby-5572s-projects\.vercel\.app$/,
);
const assets = "dist/server/assets";
const built = readdirSync(assets)
  .filter(
    (name) => name.endsWith(".js") && /^(lesson-words|module-deck|library\.functions)/.test(name),
  )
  .map((name) => readFileSync(`${assets}/${name}`, "utf8"))
  .join("\n");
const checks = [];
for (const [name, data] of [
  [
    "generateLessonWords",
    { moduleId: "roofing", lessonNumber: 1, language: "Spanish", nativeLanguage: "English" },
  ],
  ["generateModuleDeck", { moduleId: "roofing", language: "Spanish", nativeLanguage: "English" }],
  [
    "generateCultureEssay",
    { country: "Spain", targetLanguage: "Spanish", nativeLanguage: "English" },
  ],
]) {
  const id = built.match(new RegExp(`id: "([a-f0-9]{64})",\\s*name: "${name}"`))?.[1];
  assert.ok(id, `Current built identifier for ${name}`);
  const body = JSON.stringify(await toJSONAsync({ data }));
  const frameworkResponse = await fetch(`${base}/_serverFn/${id}`, {
    method: "POST",
    headers: {
      Origin: "https://outside.invalid",
      "Sec-Fetch-Site": "cross-site",
      "Content-Type": "application/json",
      "x-tsr-serverFn": "true",
      Accept: "application/json",
    },
    body,
  });
  assert.equal(frameworkResponse.status, 403, `${name} framework CSRF status`);
  assert.equal(frameworkResponse.headers.get("cache-control"), "no-store");
  assert.equal(await frameworkResponse.text(), "Forbidden");
  const response = await fetch(`${base}/_serverFn/${id}`, {
    method: "POST",
    headers: {
      Origin: "https://outside.invalid",
      "Sec-Fetch-Site": "same-origin", // Conflicting metadata must not bypass our strict Origin check.
      "Content-Type": "application/json",
      "x-tsr-serverFn": "true",
      Accept: "application/json",
    },
    body,
  });
  const text = await response.text();
  assert.equal(response.status, 403, `${name} cross-origin status`);
  assert.equal(response.headers.get("cache-control"), "no-store", `${name} denial is not cached`);
  assert.ok(
    text.includes("Open the app to create new practice content."),
    `${name} reaches the production budget guard`,
  );
  checks.push({
    handler: name,
    frameworkCrossSiteDenied: true,
    conflictingOriginMetadataDeniedByApplication: true,
    noStore: true,
    applicationBudgetGuardReached: true,
  });
}
const result = {
  testedAt: new Date().toISOString(),
  sourceCommit: process.env.LT_QA_STAGE_COMMIT ?? null,
  preview: base,
  scope:
    "Actual hosted framework CSRF and application conflicting-origin denial for three builders (six HTTP requests). No allowed requests, quota exhaustion or model generation are attempted.",
  checks,
};
writeFileSync(
  "docs/reviews/qa-learning-generation-entry-2026-10-16.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify({ passed: checks.length, scope: result.scope }));
