#!/usr/bin/env node
/** Deterministic private text/Reader/cards candidates; never writes public/. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CONTENT = path.join(ROOT, "content/japanese-construction-foreman");
const OUTPUT = path.join(CONTENT, "private-offline");
const CHECK = process.argv.includes("--check");
const sha = (value) => createHash("sha256").update(value).digest("hex");
const stable = (value) => JSON.stringify(value);
const read = (name) => readFileSync(path.join(CONTENT, name));
const stages = [
  { stage: "foundation", courseId: "foundation-construction-foreman-ja-en", count: 10,
    files: ["foundation-runtime-draft-ja-en.json"] },
  { stage: "core", courseId: "construction-foreman-ja-en", count: 30,
    files: Array.from({ length: 10 }, (_, i) => `core-runtime-pilot-${i * 3 + 1}-${i * 3 + 3}-ja-en.json`) },
  { stage: "master", courseId: "master-construction-foreman-ja-en", count: 20,
    files: [[1,3],[4,6],[7,9],[10,12],[13,15],[16,18],[19,20]].map(([a,b]) =>
      `master-runtime-pilot-${a}-${b}-ja-en.json`) },
];

function make(stage) {
  const parts = stage.files.map((file) => ({ file, bytes: read(file) }));
  const sourceBundles = parts.map(({ file, bytes }) => ({ file, sha256: sha(bytes) }));
  const bundles = parts.map(({ bytes }) => JSON.parse(bytes.toString("utf8")));
  for (const bundle of bundles) {
    if (bundle.state !== "private-runtime-draft" || bundle.reviewed !== false ||
        bundle.courseId !== stage.courseId || bundle.pairKey !== "Japanese:English" ||
        bundle.target !== "Japanese" || bundle.native !== "English" || bundle.locale !== "ja-JP") {
      throw Error(`Unsafe private ${stage.stage} source bundle`);
    }
  }
  const lessons = bundles.flatMap((bundle) => bundle.lessons).map((lesson) => {
    if (lesson.reviewed !== false || lesson.id !== `${stage.courseId}:lesson:${lesson.n}` ||
        lesson.reader?.id !== `reader-${lesson.id}` ||
        lesson.modes?.join("|") !== "see|recall|hear|type|say|write" ||
        lesson.reader.sentences.length === 0 ||
        lesson.reader.sentences.some((line) => !line.target || !line.native) ||
        lesson.words.some((word) => !word.es || !word.en || !word.cardId)) {
      throw Error(`Incomplete private ${stage.stage} lesson ${lesson.n}`);
    }
    return {
      id: lesson.id, n: lesson.n, title: lesson.title, objective: lesson.objective,
      words: lesson.words, reader: lesson.reader, checks: lesson.checks,
      modes: lesson.modes, speaking: { id: lesson.speaking.id, locale: lesson.speaking.locale },
    };
  });
  if (lessons.length !== stage.count || lessons.some((lesson, i) => lesson.n !== i + 1)) {
    throw Error(`Private ${stage.stage} lesson numbering is incomplete`);
  }
  const cards = [...new Map(bundles.flatMap((bundle) => bundle.cards).map((card) => [card.id, card])).values()];
  if (cards.some((card) => card.courseId !== stage.courseId || !card.target || !card.native) ||
      lessons.some((lesson) => lesson.words.some((word) => !cards.some((card) =>
        card.id === word.cardId && card.target === word.es && card.native === word.en)))) {
    throw Error(`Private ${stage.stage} card ownership or exact pair mismatch`);
  }
  const pack = {
    schema: 1, state: "private-unreleased-candidate", releaseEnabled: false,
    packId: stage.courseId, courseId: stage.courseId, stage: stage.stage,
    target: "Japanese", native: "English", pairKey: "Japanese:English", locale: "ja-JP",
    reviewed: false, audioFilesIncluded: false, aiConversationOffline: false,
    lessons, cards,
  };
  const content = stable(pack);
  const contentHash = sha(content);
  const contentName = `${stage.courseId}-${contentHash}.json`;
  const manifest = {
    schema: 1, state: "private-unreleased-candidate", releaseEnabled: false,
    packId: stage.courseId, pairKey: "Japanese:English", target: "Japanese", native: "English",
    stage: stage.stage, lessonCount: lessons.length, cardCount: cards.length,
    sourceBundles, sourceContentSha256: contentHash,
    content: { file: contentName, bytes: Buffer.byteLength(content), sha256: contentHash,
      routeCandidate: `/lesson-packs/${contentName}` },
    cacheNamespaceCandidate: `lt-lesson-pack-${stage.courseId}-${contentHash}`,
    workerAllowlistCandidate: stage.courseId,
    workerAllowlistEnabled: false,
    appAssetInventory: null,
    installationStatus: "not-built-not-installed",
  };
  return [{ name: contentName, value: content }, { name: `${stage.courseId}.manifest.json`, value: stable(manifest) }];
}

if (!CHECK) mkdirSync(OUTPUT, { recursive: true });
for (const stage of stages) {
  for (const { name, value } of make(stage)) {
    const destination = path.join(OUTPUT, name);
    if (CHECK) {
      if (!existsSync(destination) || readFileSync(destination, "utf8") !== value) {
        throw Error(`Private offline artifact is stale: ${name}`);
      }
    } else writeFileSync(destination, value);
  }
  console.log(`${stage.stage}: private ${stage.count} lesson candidate ${CHECK ? "verified" : "built"}; release disabled`);
}
