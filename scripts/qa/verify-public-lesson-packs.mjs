/** Public deployment check: no identity, learner data or provider calls. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
const base = process.env.LT_QA_STAGE_URL;
assert.match(
  base ?? "",
  /^https:\/\/language-threshold-[a-z0-9]+-adobetoby-5572s-projects\.vercel\.app$/,
);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const results = [];
for (const moduleId of ["roofing", "landscaper"]) {
  const packId = `${moduleId}-es-en`;
  const response = await fetch(`${base}/lesson-packs/${packId}.json`, {
    redirect: "error",
    credentials: "omit",
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  const manifest = await response.json();
  assert.equal(manifest.packId, packId);
  assert.equal(sha(JSON.stringify(manifest.assets)), manifest.appVersion);
  assert.equal(sha(`${manifest.content.sha256}:${manifest.appVersion}`), manifest.version);
  assert.ok(manifest.assets.every((a) => a.url.startsWith("/assets/") && !a.url.includes("..")));
  const data = await fetch(new URL(manifest.content.url, base), {
    redirect: "error",
    credentials: "omit",
  });
  assert.equal(data.status, 200);
  assert.match(data.headers.get("cache-control"), /immutable/);
  const bytes = Buffer.from(await data.arrayBuffer());
  assert.equal(bytes.length, manifest.content.bytes);
  assert.equal(sha(bytes), manifest.content.sha256);
  const pack = JSON.parse(bytes);
  assert.equal(pack.moduleId, moduleId);
  assert.equal(pack.targetLanguage, "Spanish");
  assert.equal(pack.instructionLanguage, "English");
  assert.equal(pack.contentStatus, "draft");
  assert.equal(pack.officialAssessmentsIncluded, false);
  assert.equal(pack.audioFilesIncluded, false);
  assert.equal(pack.lessons.length, 30);
  for (const [i, l] of pack.lessons.entries()) {
    assert.equal(l.lessonNumber, i + 1);
    assert.equal(l.objectiveId, `${moduleId}.lesson.${i + 1}`);
    assert.ok(l.words.every((w) => w.es.trim() && w.en.trim()));
    assert.ok(l.reading.sentences.every((s) => s.target.trim() && s.native.trim()));
    assert.equal(l.modes.length, 6);
    assert.equal("responses" in l, false);
    assert.equal("score" in l, false);
  }
  results.push({
    packId,
    version: manifest.version,
    lessons: 30,
    appAssets: manifest.assets.length,
    totalBytes: manifest.totalBytes,
    draft: true,
    manifestNoStore: true,
    contentHashVerified: true,
    contentImmutable: true,
  });
}
assert.notEqual(results[0].version, results[1].version);
const report = {
  testedAt: new Date().toISOString(),
  applicationCommit: process.env.LT_QA_STAGE_COMMIT,
  target: base,
  packs: results,
  limits: [
    "Public HTTP/content integrity only; browser installation and actual cold offline reload are separate checks.",
  ],
};
writeFileSync(
  "docs/reviews/qa-public-lesson-packs-2026-10-16.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    publicPacks: 2,
    lessonsPerPack: 30,
    hashesAndCacheHeaders: true,
    privateExamPayloadsIncluded: false,
  }),
);
