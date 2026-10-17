import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { loadModule } from "./helpers/bundle.mjs";
import {
  offlineAssetInventory,
  buildOfflineLessonPack,
} from "../scripts/build-offline-lesson-pack.mjs";
const { roofingOfflinePack, publicLessonOfflinePack } = await loadModule(
  "src/lib/lesson-offline-pack.ts",
);
const { getLessonDefinition } = await loadModule("src/lib/lesson-definition.ts");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("Roofing practice pack covers all30 objectives, level settings and six ways without private exam evidence", () => {
  const pack = roofingOfflinePack();
  assert.equal(pack.lessons.length, 30);
  assert.equal(pack.contentStatus, "draft");
  assert.equal(pack.audioFilesIncluded, false);
  assert.equal(pack.officialAssessmentsIncluded, false);
  assert.match(pack.capabilities.hear, /device-voice/);
  assert.match(pack.capabilities.say, /requires-connection/);
  assert.match(pack.capabilities.write, /requires-connection/);
  assert.notEqual(pack.lessons[0].teaching.stage, pack.lessons[29].teaching.stage);
  for (const [index, lesson] of pack.lessons.entries()) {
    assert.equal(lesson.objectiveId, `roofing.lesson.${index + 1}`);
    assert.equal(lesson.modes.length, 6);
    assert.ok(lesson.words.length >= 12 && lesson.reading.sentences.length >= 5);
    assert.ok(!("source" in lesson));
    assert.ok(!("responses" in lesson));
    assert.ok(!("score" in lesson));
  }
  assert.deepEqual(roofingOfflinePack(), pack);
});

test("an incomplete or different language track cannot produce a complete Roofing download", () => {
  const definitions = Array.from({ length: 30 }, (_, index) =>
    getLessonDefinition({
      moduleId: "roofing",
      lessonNumber: index + 1,
      targetLanguage: "Spanish",
      instructionLanguage: "English",
      contentVersion: "qa",
    }),
  );
  assert.throws(() => roofingOfflinePack(definitions.slice(1)), /thirty ordered/);
  assert.throws(
    () => roofingOfflinePack(definitions.map((d, i) => (i === 0 ? { ...d, reading: null } : d))),
    /complete/,
  );
  assert.throws(
    () =>
      roofingOfflinePack(
        definitions.map((d, i) => (i === 0 ? { ...d, instructionLanguage: "French" } : d)),
      ),
    /Spanish\/English/,
  );
  assert.throws(() => roofingOfflinePack([...definitions].reverse()), /ordered/);
});

test("build emits content-addressed lesson data and bounded app inventory, excluding server/private files", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "lt-pack-"));
  try {
    mkdirSync(path.join(root, "assets"));
    mkdirSync(path.join(root, "functions"));
    writeFileSync(path.join(root, "assets", "app-123.js"), "export const publicApp=true;");
    writeFileSync(path.join(root, "assets", "app-123.js.map"), "excluded source map");
    writeFileSync(path.join(root, "functions", "server.cjs"), "excluded server output");
    writeFileSync(path.join(root, "exams.html"), "excluded private route");
    const first = await buildOfflineLessonPack(root);
    assert.equal(first.assets.length, 1);
    assert.equal(first.assets[0].url, "/assets/app-123.js");
    assert.equal(first.assets[0].sha256, sha("export const publicApp=true;"));
    assert.equal(first.installationStatus, "not-installed");
    const data = readFileSync(path.join(root, first.content.url));
    assert.equal(first.content.sha256, sha(data));
    assert.equal(first.content.bytes, data.length);
    assert.equal(JSON.parse(data).lessons.length, 30);
    assert.equal(first.totalBytes, data.length + first.assets[0].bytes);
    assert.match(first.content.url, /^\/lesson-packs\/roofing-es-en-[a-f0-9]{64}\.json$/);
    const repeat = await buildOfflineLessonPack(root);
    assert.deepEqual(repeat, first);
    writeFileSync(path.join(root, "assets", "app-123.js"), "export const publicApp=false;");
    const next = await buildOfflineLessonPack(root);
    assert.notEqual(next.appVersion, first.appVersion);
    assert.notEqual(next.version, first.version);
    assert.equal(next.content.sha256, first.content.sha256);
    writeFileSync(path.join(root, "assets", "huge.js"), Buffer.alloc(65 * 1024 * 1024));
    assert.throws(() => offlineAssetInventory(root), /bounded size/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Landscaper pack uses its own30 contextual definitions and refuses another track's data", () => {
  const pack = publicLessonOfflinePack("landscaper-es-en");
  assert.equal(pack.moduleId, "landscaper");
  assert.equal(pack.contentStatus, "draft");
  assert.equal(pack.lessons.length, 30);
  assert.equal(pack.lessons[1].reading.title, "El plan de corte");
  assert.equal(pack.lessons[29].teaching.response.suggestedSentences, 3);
  assert.equal(pack.officialAssessmentsIncluded, false);
  assert.equal(pack.audioFilesIncluded, false);
  const roof = Array.from({ length: 30 }, (_, i) =>
    getLessonDefinition({
      moduleId: "roofing",
      lessonNumber: i + 1,
      targetLanguage: "Spanish",
      instructionLanguage: "English",
      contentVersion: "qa",
    }),
  );
  assert.throws(() => publicLessonOfflinePack("landscaper-es-en", roof), /complete/);
});

test("building both manifests keeps each module's data, version and shared app assets distinct", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "lt-multi-pack-"));
  try {
    mkdirSync(path.join(root, "assets"));
    writeFileSync(path.join(root, "assets", "app.js"), "public app");
    const roof = await buildOfflineLessonPack(root),
      land = await buildOfflineLessonPack(root, "landscaper-es-en");
    assert.equal(land.packId, "landscaper-es-en");
    assert.notEqual(roof.version, land.version);
    assert.equal(roof.appVersion, land.appVersion);
    assert.deepEqual(roof.assets, land.assets);
    assert.equal(
      JSON.parse(readFileSync(path.join(root, land.content.url))).moduleId,
      "landscaper",
    );
    assert.equal(
      JSON.parse(readFileSync(path.join(root, "lesson-packs", "roofing-es-en.json"))).packId,
      "roofing-es-en",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("download availability belongs to an authored exact pair, not every module or translation", async () => {
  const { offlineLessonPackId } = await loadModule("src/lib/offline-lesson-tracks.ts");
  assert.equal(offlineLessonPackId("landscaper", "Spanish", "English"), "landscaper-es-en");
  assert.equal(offlineLessonPackId("roofing", "Spanish", "English"), "roofing-es-en");
  assert.equal(offlineLessonPackId("construction-foreman", "Spanish", "English"), "construction-foreman-es-en");
  for (const input of [
    ["landscaper", "Spanish", "French"],
    ["landscaper", "French", "English"],
    ["roofing", "English", "Spanish"],
    ["construction-foreman", "Spanish", "French"],
    ["framer", "Spanish", "English"],
  ])
    assert.equal(offlineLessonPackId(...input), null);
});
