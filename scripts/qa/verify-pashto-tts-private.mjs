/** Denial-only hosted checks; no valid generation body or provider request. */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
const base = process.env.LT_QA_STAGE_URL;
assert.match(
  base ?? "",
  /^https:\/\/language-threshold-[a-z0-9]+-adobetoby-5572s-projects\.vercel\.app$/,
);
assert.match(process.env.LT_QA_STAGE_COMMIT ?? "", /^[a-f0-9]{40}$/);
const checks = [];
for (const [name, path, opts, status] of [
  ["legacy-url-refused", "/api/tts?lang=ps&text=Synthetic-privacy-guard", {}, 405],
  [
    "malformed-body-refused",
    "/api/tts",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" },
    400,
  ],
  [
    "unsupported-language-refused",
    "/api/tts",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Synthetic-privacy-guard", lang: "unsupported" }),
    },
    400,
  ],
]) {
  const response = await fetch(base + path, {
    ...opts,
    redirect: "error",
    credentials: "omit",
    cache: "no-store",
  });
  assert.equal(response.status, status, name);
  // Vercel consumes its CDN-specific headers; browser Cache-Control must survive.
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.doesNotMatch(await response.text(), /Synthetic-privacy-guard/);
  checks.push({ name, status, noStore: true, noTextEcho: true });
}
writeFileSync(
  "docs/reviews/qa-pashto-tts-private-http-2026-10-18.json",
  JSON.stringify(
    {
      testedAt: new Date().toISOString(),
      applicationCommit: process.env.LT_QA_STAGE_COMMIT,
      preview: base,
      checks,
      limits: [
        "Denial-only HTTP checks. No valid generation, real provider, browser/native playback or previous-cache purge proof. Guest access policy remains unchanged.",
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ checks: checks.length, providerGenerationAttempted: false }));
