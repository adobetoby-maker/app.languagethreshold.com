/** Rejected requests only: no provider call or durable request-counter consumption. */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
const base = process.env.LT_QA_STAGE_URL;
assert.match(
  base ?? "",
  /^https:\/\/language-threshold-[a-z0-9]+-adobetoby-5572s-projects\.vercel\.app$/,
);
assert.match(process.env.LT_QA_STAGE_COMMIT ?? "", /^[a-f0-9]{40}$/);
const body = JSON.stringify({
  text: "Synthetic-google-entry-guard",
  voiceName: "es-US-Standard-A",
  languageCode: "es-US",
  speakingRate: 1,
  usage: "learning",
});
const checks = [];
for (const [name, path, options, status] of [
  [
    "missing-origin-denied",
    "/api/mission-tts",
    { method: "POST", headers: { "Content-Type": "application/json" }, body },
    403,
  ],
  [
    "cross-origin-denied",
    "/api/mission-tts",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://outside.invalid" },
      body,
    },
    403,
  ],
  [
    "foreign-catalog-origin-denied",
    "/api/mission-tts?languageCode=es-US",
    { headers: { Origin: "https://outside.invalid" } },
    403,
  ],
  [
    "cross-site-catalog-denied",
    "/api/mission-tts?languageCode=es-US",
    { headers: { "Sec-Fetch-Site": "cross-site" } },
    403,
  ],
  ["unsupported-catalog-language-denied", "/api/mission-tts?languageCode=unsupported", {}, 400],
  [
    "malformed-body-denied",
    "/api/mission-tts",
    { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: "{" },
    400,
  ],
  [
    "oversized-body-denied",
    "/api/mission-tts",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: base },
      body: " ".repeat(16 * 1024 + 1),
    },
    413,
  ],
  [
    "oversized-text-denied",
    "/api/mission-tts",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: base },
      body: JSON.stringify({ ...JSON.parse(body), text: "x".repeat(1201) }),
    },
    400,
  ],
]) {
  const response = await fetch(base + path, {
    ...options,
    redirect: "error",
    credentials: "omit",
    cache: "no-store",
  });
  assert.equal(response.status, status, name);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.doesNotMatch(await response.text(), /Synthetic-google-entry-guard/);
  checks.push({ name, status, noStore: true, noTextEcho: true });
}
writeFileSync(
  "docs/reviews/qa-google-speech-entry-http-2026-10-18.json",
  JSON.stringify(
    {
      testedAt: new Date().toISOString(),
      applicationCommit: process.env.LT_QA_STAGE_COMMIT,
      preview: base,
      checks,
      limits: [
        "Rejected entry requests only; no admissible speech/catalog request, provider transport, native/browser playback, guard-counter consumption or human approval is exercised.",
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ checks: checks.length, providerCallAttempted: false }));
