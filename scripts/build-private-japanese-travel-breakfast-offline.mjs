#!/usr/bin/env node
/** Deterministic private text candidate; never writes public/ or changes worker registration. */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { inspectPrivateJapaneseTravelBreakfast } from "../src/lib/private-japanese-travel-breakfast-readiness.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const CONTENT = path.join(ROOT, "content/japanese-travel-breakfast");
const OUTPUT = path.join(CONTENT, "private-offline");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const stages = [
  { packId: "foundation-travel-breakfast-ja-en", stageId: "foundation-travel-breakfast", count: 10,
    sourceFile: "foundation-1-10-draft.json" },
  { packId: "travel-breakfast-ja-en", stageId: "travel-breakfast", count: 30,
    sourceFile: "core-1-30-draft.json" },
];
const stageByPackId = new Map(stages.map((stage) => [stage.packId, stage]));

/** Verify bytes, exact pair, source, card ownership and cache/progress identity before any future registration. */
export function verifyPrivateJapaneseTravelOfflineCandidate(manifest, contentBytes, expectedPackId, sourceBytes) {
  const stage = stageByPackId.get(expectedPackId);
  if (!stage) throw new Error("Unknown private Japanese Breakfast pack ID");
  const bytes = Buffer.from(contentBytes);
  const source = Buffer.from(sourceBytes);
  const digest = sha(bytes);
  const filename = `${expectedPackId}-${digest}.json`;
  const progressScope = `private:Japanese:English:${stage.stageId}:ja-en`;
  const cacheNamespace = `private:Japanese:English:${expectedPackId}:${digest}`;
  let pack;
  try { pack = JSON.parse(bytes.toString("utf8")); } catch { throw new Error("Invalid private Japanese Breakfast payload"); }
  if (!manifest || manifest.schema !== 1 || manifest.state !== "private-unreleased-candidate" ||
      manifest.releaseEnabled !== false || manifest.workerAllowlistEnabled !== false ||
      manifest.appAssetInventory !== null || manifest.installationStatus !== "not-installed" ||
      manifest.packId !== expectedPackId || manifest.stageId !== stage.stageId ||
      manifest.pairKey !== "Japanese:English" || manifest.target !== "Japanese" || manifest.native !== "English" ||
      manifest.lessonCount !== stage.count || manifest.sourceFile !== stage.sourceFile ||
      manifest.sourceSha256 !== sha(source) || manifest.content.file !== filename ||
      manifest.content.sha256 !== digest || manifest.content.bytes !== bytes.length ||
      manifest.content.routeCandidate !== null || manifest.cacheNamespaceCandidate !== cacheNamespace ||
      manifest.progressScopeCandidate !== progressScope ||
      pack.schema !== 1 || pack.state !== "private-unreleased-candidate" ||
      pack.releaseEnabled !== false || pack.reviewed !== false || pack.registered !== false ||
      pack.audioFilesIncluded !== false || pack.aiConversationOffline !== false ||
      pack.packId !== expectedPackId || pack.stageId !== stage.stageId ||
      pack.pairKey !== "Japanese:English" || pack.target !== "Japanese" || pack.native !== "English" ||
      pack.locale !== "ja-JP" || pack.sourceSha256 !== sha(source) ||
      pack.progressScopeCandidate !== progressScope || pack.lessons?.length !== stage.count ||
      !Array.isArray(pack.cards) || pack.cards.length !== manifest.cardCount) {
    throw new Error("Private Japanese Breakfast identity or hash mismatch");
  }
  const cards = new Map();
  for (const card of pack.cards) {
    if (!card || cards.has(card.id) || card.packId !== expectedPackId ||
        !card.id.startsWith(`${stage.stageId}:`) || !card.target || !card.native) {
      throw new Error("Private Japanese Breakfast card ownership mismatch");
    }
    cards.set(card.id, card);
  }
  for (const [index, lesson] of pack.lessons.entries()) {
    if (lesson.n !== index + 1 || lesson.id !== `${stage.stageId}:${lesson.n}:ja-en` ||
        lesson.reader?.lessonId !== lesson.id || !lesson.reader.lines?.length ||
        lesson.reader.lines.some((line) => !line.ja || !line.en) ||
        lesson.speaking?.locale !== "ja-JP" ||
        lesson.modes?.join("|") !== "see|recall|hear|type|say|write" ||
        !lesson.modeInputs || lesson.cardIds?.length === 0 ||
        lesson.cardIds.some((id) => !cards.has(id) || !id.startsWith(`${lesson.id}:card:`))) {
      throw new Error("Private Japanese Breakfast lesson or card identity mismatch");
    }
  }
  let sourceBundle;
  try { sourceBundle = JSON.parse(source.toString("utf8")); } catch { throw new Error("Invalid private Japanese Breakfast source"); }
  for (const lesson of pack.lessons) {
    const input = inspectPrivateJapaneseTravelBreakfast(sourceBundle, lesson.n, "Japanese", "English");
    if (!input || input.stageId !== stage.stageId || input.lessonId !== lesson.id ||
        JSON.stringify(lesson.reader) !== JSON.stringify(input.readerHandoff) ||
        JSON.stringify(lesson.speaking) !== JSON.stringify(input.speaking) ||
        JSON.stringify(lesson.modeInputs) !== JSON.stringify(input.modeInputs) ||
        JSON.stringify(lesson.cardIds) !== JSON.stringify(input.cards.map((card) => card.cardId))) {
      throw new Error("Private Japanese Breakfast source/payload mismatch");
    }
    for (const card of input.cards) {
      const packed = cards.get(card.cardId);
      if (packed?.target !== card.ja || packed?.native !== card.en || packed?.kind !== card.kind) {
        throw new Error("Private Japanese Breakfast source/card mismatch");
      }
    }
  }
  return pack;
}

function make(stage) {
  const source = readFileSync(path.join(CONTENT, stage.sourceFile));
  const bundle = JSON.parse(source.toString("utf8"));
  const lessons = [];
  const cards = [];
  for (let number = 1; number <= stage.count; number++) {
    const input = inspectPrivateJapaneseTravelBreakfast(bundle, number, "Japanese", "English");
    if (!input || input.stageId !== stage.stageId || input.registration !== "disabled") {
      throw new Error(`Incomplete private ${stage.stageId} lesson ${number}`);
    }
    const authored = bundle.lessons.find((lesson) => lesson.n === number);
    const cardIds = [];
    for (const card of input.cards) {
      cards.push({ id: card.cardId, packId: stage.packId, target: card.ja, native: card.en, kind: card.kind });
      cardIds.push(card.cardId);
    }
    lessons.push({
      id: input.lessonId, n: number, title: authored.title, objective: authored.objective,
      cardIds, reader: input.readerHandoff, speaking: input.speaking,
      modes: ["see", "recall", "hear", "type", "say", "write"], modeInputs: input.modeInputs,
    });
  }
  const progressScope = `private:Japanese:English:${stage.stageId}:ja-en`;
  const pack = {
    schema: 1, state: "private-unreleased-candidate", releaseEnabled: false,
    reviewed: false, registered: false, audioFilesIncluded: false, aiConversationOffline: false,
    packId: stage.packId, stageId: stage.stageId, pairKey: "Japanese:English",
    target: "Japanese", native: "English", locale: "ja-JP", sourceSha256: sha(source),
    progressScopeCandidate: progressScope, lessons, cards,
  };
  const content = JSON.stringify(pack);
  const digest = sha(content);
  const filename = `${stage.packId}-${digest}.json`;
  const manifest = {
    schema: 1, state: "private-unreleased-candidate", releaseEnabled: false,
    workerAllowlistEnabled: false, appAssetInventory: null, installationStatus: "not-installed",
    packId: stage.packId, stageId: stage.stageId, pairKey: "Japanese:English",
    target: "Japanese", native: "English", lessonCount: lessons.length, cardCount: cards.length,
    sourceFile: stage.sourceFile, sourceSha256: sha(source),
    content: { file: filename, sha256: digest, bytes: Buffer.byteLength(content), routeCandidate: null },
    cacheNamespaceCandidate: `private:Japanese:English:${stage.packId}:${digest}`,
    progressScopeCandidate: progressScope,
  };
  verifyPrivateJapaneseTravelOfflineCandidate(manifest, Buffer.from(content), stage.packId, source);
  return [{ name: filename, value: content }, { name: `${stage.packId}.manifest.json`, value: JSON.stringify(manifest) }];
}

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  const check = process.argv.includes("--check");
  if (!check) mkdirSync(OUTPUT, { recursive: true });
  for (const stage of stages) {
    const artifacts = make(stage);
    const expectedNames = new Set(artifacts.map(({ name }) => name));
    for (const { name, value } of artifacts) {
      const destination = path.join(OUTPUT, name);
      if (check) {
        if (!existsSync(destination) || readFileSync(destination, "utf8") !== value) {
          throw new Error(`Stale private Japanese Breakfast artifact: ${name}`);
        }
      } else writeFileSync(destination, value);
    }
    if (!check) {
      for (const name of readdirSync(OUTPUT)) {
        if (new RegExp(`^${stage.packId}-[a-f0-9]{64}\\.json$`).test(name) && !expectedNames.has(name)) {
          unlinkSync(path.join(OUTPUT, name));
        }
      }
    }
    console.log(`${stage.stageId}: private ${stage.count}-lesson offline candidate ${check ? "verified" : "built"}; release disabled`);
  }
}
