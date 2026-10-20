import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { verifyLessonReviewContent } from "../scripts/verify-lesson-review-content.mjs";
import { loadModule } from "./helpers/bundle.mjs";

const { lessonReviewSnapshot, lessonReviewFingerprint, serializeLessonReviewSnapshot } =
  await loadModule("src/lib/lesson-review.ts");
const { currentLessonReviewSnapshot, readGeneratedReviewMaterial } = await loadModule(
  "src/lib/lesson-review-server.ts",
  { stubs: [/^@tanstack\/react-start\/server-only$/] },
);
const { lessonReleaseReadiness } = await loadModule("src/lib/assessments/release-readiness.ts", {
  stubs: [/^@tanstack\/react-start\/server-only$/],
});
const { LessonReviewSnapshotView } = await loadModule(
  "src/components/exams/LessonReviewSnapshotView.tsx",
);
const { renderToStaticMarkup } = await import("react-dom/server");
const { createElement } = await import("react");
const roofing = () => currentLessonReviewSnapshot("roofing", "Spanish", "English");
const material = (root) => readGeneratedReviewMaterial("roofing", "Spanish", "English", root);

test("historical shared-only constructor ignores a real generated verb change; current identity includes it", async () => {
  const dir = mkdtempSync(resolve("node_modules/.cache/generated-review-baseline-"));
  try {
    // Exact git-show bytes retained so a clean/shallow checkout needs no historical objects.
    const source = readFileSync("tests/fixtures/lesson-review-650da6a.ts.txt", "utf8");
    assert.equal(
      createHash("sha256").update(source).digest("hex"),
      "3ef0e11242ab6138cad5c1deb81dbf7480571cfdde9a0bd623a5122926c1842c",
    );
    await build({
      stdin: { contents: source, resolveDir: resolve("src/lib"), loader: "ts" },
      outfile: join(dir, "old.mjs"),
      bundle: true,
      format: "esm",
      platform: "node",
      logLevel: "silent",
    });
    const old = await import(join(dir, "old.mjs"));
    const original = readGeneratedReviewMaterial("roofing", "Spanish", "English");
    const changed = structuredClone(original);
    changed.file.lessons["1"].verbs[0].forms.yo += " cambio";
    changed.source.sha256 = "a".repeat(64);
    const priorA = old.lessonReviewSnapshot("roofing", "Spanish", "English", original);
    const priorB = old.lessonReviewSnapshot("roofing", "Spanish", "English", changed);
    assert.equal(priorA.generatedMaterial, undefined);
    assert.equal(
      await old.lessonReviewFingerprint(priorA),
      await old.lessonReviewFingerprint(priorB),
    );
    assert.notEqual(
      await lessonReviewFingerprint(
        lessonReviewSnapshot("roofing", "Spanish", "English", original),
      ),
      await lessonReviewFingerprint(lessonReviewSnapshot("roofing", "Spanish", "English", changed)),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("artifact guard rejects different, absent and extra packaged review files", () => {
  const root = mkdtempSync(join(tmpdir(), "lt-review-package-"));
  try {
    const source = resolve("public/lesson-content"),
      packaged = join(root, "server"),
      staticRoot = join(root, "static");
    cpSync(source, packaged, { recursive: true });
    cpSync(source, staticRoot, { recursive: true });
    assert.equal(verifyLessonReviewContent(source, packaged, staticRoot), 62);
    const path = join(packaged, "es/roofing.json"),
      bytes = readFileSync(path);
    writeFileSync(path, "changed");
    assert.throws(() => verifyLessonReviewContent(source, packaged, staticRoot), /bytes differ/);
    rmSync(path);
    assert.throws(
      () => verifyLessonReviewContent(source, packaged, staticRoot),
      /inventory differs/,
    );
    writeFileSync(path, bytes);
    writeFileSync(join(staticRoot, "extra.json"), "{}");
    assert.throws(
      () => verifyLessonReviewContent(source, packaged, staticRoot),
      /inventory differs/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("current snapshot binds exact generated source and verbs while inline words/readings win", () => {
  const current = roofing(),
    shared = lessonReviewSnapshot("roofing", "Spanish", "English");
  const file = JSON.parse(readFileSync("public/lesson-content/es/roofing.json"));
  assert.equal(current.generatedMaterial.sourcePath, "/lesson-content/es/roofing.json");
  assert.match(current.generatedMaterial.sourceSha256, /^[a-f0-9]{64}$/);
  assert.equal(current.generatedMaterial.fileReviewedFlag, false);
  assert.equal(current.status, "current-app-draft");
  for (const lesson of current.lessons) {
    const prior = shared.lessons.find((l) => l.lessonNumber === lesson.lessonNumber);
    assert.deepEqual(lesson.words, prior.words);
    assert.deepEqual(lesson.reading, prior.reading);
    assert.deepEqual(lesson.verbs, file.lessons[String(lesson.lessonNumber)].verbs);
    assert.deepEqual(lesson.materialSources, {
      words: "shared-definition",
      reading: "shared-definition",
      verbs: "generated-content",
    });
  }
  current.lessons[0].verbs[0].forms.yo = "changed";
  assert.notEqual(roofing().lessons[0].verbs[0].forms.yo, "changed");
});

test("generated fallback words/passage/listening are visible without invented teaching or thirty lessons", () => {
  const snapshot = currentLessonReviewSnapshot("travel-breakfast", "Spanish", "English");
  assert.equal(snapshot.lessons.length, 15);
  assert.ok(snapshot.gaps.some((g) => /requires 30/.test(g)));
  for (const lesson of snapshot.lessons) {
    assert.ok(lesson.words.length >= 12);
    assert.ok(lesson.reading.sentences.length >= 5);
    assert.ok(lesson.verbs.length >= 3);
    assert.equal(lesson.materialSources.words, "generated-content");
    assert.equal(lesson.materialSources.reading, "generated-content");
    assert.deepEqual(lesson.listeningItems, lesson.words);
    assert.equal(lesson.teaching, null);
  }
});

test("wrong instruction pairs and absent language files cannot borrow generated material", () => {
  for (const [target, native] of [
    ["Spanish", "French"],
    ["French", "English"],
  ]) {
    const snapshot = currentLessonReviewSnapshot("roofing", target, native);
    assert.equal(snapshot.generatedMaterial.sourcePath, null);
    assert.ok(snapshot.lessons.every((l) => l.verbs.length === 0 && l.words.length === 0));
  }
  assert.equal(currentLessonReviewSnapshot("unknown", "Spanish", "English"), null);
});

test("generated verbs, fallback passages and words each change frozen identity independently", async () => {
  const root = mkdtempSync(join(tmpdir(), "lt-review-material-"));
  try {
    cpSync("public/lesson-content", root, { recursive: true });
    const path = join(root, "es/travel-breakfast.json");
    const original = JSON.parse(readFileSync(path));
    const build = () =>
      lessonReviewSnapshot(
        "travel-breakfast",
        "Spanish",
        "English",
        readGeneratedReviewMaterial("travel-breakfast", "Spanish", "English", root),
      );
    const fingerprint = await lessonReviewFingerprint(build());
    for (const mutate of [
      (f) => {
        f.lessons["1"].verbs[0].forms.yo += " cambio";
      },
      (f) => {
        f.lessons["1"].passage.target[0] += " Cambio.";
      },
      (f) => {
        f.lessons["1"].words[0].es += " cambio";
      },
    ]) {
      const changed = structuredClone(original);
      mutate(changed);
      writeFileSync(path, JSON.stringify(changed));
      assert.notEqual(await lessonReviewFingerprint(build()), fingerprint);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("legacy shared-only binding and changed packaged source fail current release readiness", async () => {
  const current = roofing();
  const fingerprint = await lessonReviewFingerprint(current);
  const release = {
    module_id: "roofing",
    target_language: "Spanish",
    instruction_language: "English",
    status: "verified",
    lesson_manifest: { reviewed: true, lessonSnapshotFingerprint: fingerprint },
  };
  const binding = { snapshot_text: serializeLessonReviewSnapshot(current), fingerprint };
  assert.equal((await lessonReleaseReadiness(release, binding)).available, true); // fictional release only
  const legacy = lessonReviewSnapshot("roofing", "Spanish", "English");
  const legacyFingerprint = await lessonReviewFingerprint(legacy);
  assert.equal(
    (
      await lessonReleaseReadiness(
        {
          ...release,
          lesson_manifest: { reviewed: true, lessonSnapshotFingerprint: legacyFingerprint },
        },
        { snapshot_text: serializeLessonReviewSnapshot(legacy), fingerprint: legacyFingerprint },
      )
    ).available,
    false,
  );
  const root = mkdtempSync(join(tmpdir(), "lt-review-gate-"));
  const priorRoot = process.env.LT_INTERNAL_LESSON_CONTENT_ROOT;
  try {
    cpSync("public/lesson-content", root, { recursive: true });
    const path = join(root, "es/roofing.json"),
      file = JSON.parse(readFileSync(path));
    file.lessons["1"].verbs[0].forms.yo += " cambio";
    writeFileSync(path, JSON.stringify(file));
    process.env.LT_INTERNAL_LESSON_CONTENT_ROOT = root;
    const readiness = await lessonReleaseReadiness(release, binding);
    assert.equal(readiness.current, false);
    assert.equal(readiness.reviewed, false);
    assert.equal(readiness.available, false);
  } finally {
    if (priorRoot === undefined) delete process.env.LT_INTERNAL_LESSON_CONTENT_ROOT;
    else process.env.LT_INTERNAL_LESSON_CONTENT_ROOT = priorRoot;
    rmSync(root, { recursive: true, force: true });
  }
});

test("missing/corrupt/ambiguous packaged source is a failure rather than shared-only success", () => {
  const root = mkdtempSync(join(tmpdir(), "lt-review-corrupt-"));
  try {
    assert.throws(() => material(root));
    cpSync("public/lesson-content", root, { recursive: true });
    const path = join(root, "es/roofing.json"),
      bytes = readFileSync(path);
    rmSync(path);
    assert.throws(() => material(root));
    writeFileSync(path, "not JSON");
    assert.throws(() => material(root));
    const file = JSON.parse(bytes);
    file.nativeLanguage = "French";
    writeFileSync(path, JSON.stringify(file));
    assert.throws(() => material(root));
    writeFileSync(path, bytes);
    const indexPath = join(root, "index.json"),
      index = JSON.parse(readFileSync(indexPath));
    index.files.push(index.files.find((f) => f.module === "roofing"));
    writeFileSync(indexPath, JSON.stringify(index));
    assert.throws(() => material(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("reviewer display exposes effective generated content, verbs and source; historical display remains usable", async () => {
  for (const snapshot of [
    currentLessonReviewSnapshot("travel-breakfast", "Spanish", "English"),
    lessonReviewSnapshot("roofing", "Spanish", "English"),
  ]) {
    const html = renderToStaticMarkup(
      createElement(LessonReviewSnapshotView, {
        data: {
          snapshot,
          releaseContentVersion: "synthetic",
          fingerprint: await lessonReviewFingerprint(snapshot),
          storedFingerprint: null,
          matchesStoredSnapshot: false,
        },
      }),
    );
    if (snapshot.generatedMaterial) {
      assert.ok(html.includes(snapshot.lessons[0].verbs[0].infinitive));
      assert.ok(html.includes(snapshot.lessons[0].reading.title));
      assert.ok(html.includes(snapshot.generatedMaterial.sourceSha256));
      assert.match(html, /generated-content/);
    } else assert.match(html, /Historical shared-definition snapshot/);
  }
});
