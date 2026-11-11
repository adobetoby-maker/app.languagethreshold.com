#!/usr/bin/env node
/** Build content-addressed private text candidates from the pinned Lunch runtime source. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inspectPrivateJapaneseTravelLunch } from "../src/lib/private-japanese-travel-lunch-runtime.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COURSE = path.join(ROOT, "content/japanese-travel-lunch");
const SOURCE = path.join(COURSE, "private-runtime-candidate.json");
const DICTIONARY = path.join(COURSE, "private-dictionary-candidates.json");
const OUTPUT = path.join(COURSE, "private-offline");
const STAGES = [
  { id: "foundation-travel-lunch-ja-en", moduleId: "foundation-travel-lunch", count: 10 },
  { id: "travel-lunch-ja-en", moduleId: "travel-lunch", count: 30 },
  { id: "master-travel-lunch-ja-en", moduleId: "master-travel-lunch", count: 20 },
];
const byId = new Map(STAGES.map(stage => [stage.id, stage]));
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function sourceLessons(source, stage) {
  const runtime = inspectPrivateJapaneseTravelLunch(source);
  const lessons = [];
  const cards = [];
  for (let n = 1; n <= stage.count; n++) {
    const original = runtime.getLesson(stage.moduleId, n, "Japanese", "English");
    if (!original || runtime.cacheNamespace(stage.moduleId, n, "Japanese", "English") !==
        `private:Japanese:English:travel-lunch:${stage.moduleId}:${n}`)
      throw new Error(`Missing exact Japanese Lunch lesson ${stage.moduleId}:${n}`);
    const { cards: sourceCards, ...lesson } = original;
    lessons.push({ ...lesson, cardIds: sourceCards.map(card => card.id) });
    cards.push(...sourceCards);
  }
  return { lessons, cards };
}

export function verifyPrivateJapaneseTravelLunchOfflineCandidate(manifest, contentBytes, sourceBytes, dictionaryBytes, expectedId) {
  const stage = byId.get(expectedId);
  if (!stage) throw new Error("Unknown Japanese Lunch pack ID");
  const bytes = Buffer.from(contentBytes);
  const sourceRaw = Buffer.from(sourceBytes);
  const dictionaryRaw = Buffer.from(dictionaryBytes);
  let pack, source, dictionary;
  try {
    pack = JSON.parse(bytes.toString("utf8"));
    source = JSON.parse(sourceRaw.toString("utf8"));
    dictionary = JSON.parse(dictionaryRaw.toString("utf8"));
  }
  catch { throw new Error("Invalid private Japanese Lunch JSON"); }
  const digest = sha(bytes);
  const sourceDigest = sha(sourceRaw);
  const progress = `private:Japanese:English:${stage.moduleId}:ja-en`;
  const cache = `private:Japanese:English:${expectedId}:${digest}`;
  const expected = sourceLessons(source, stage);
  const dictionaryDigest = sha(dictionaryRaw);
  const dictionaryIds = new Set(expected.cards.map(card => card.dictionaryId));
  const expectedEntries = dictionary.entries?.filter(entry => dictionaryIds.has(entry.id));
  if (source.dictionarySha256 !== dictionaryDigest ||
      dictionary.pairKey !== "Japanese:English" || dictionary.reviewed !== false ||
      dictionary.runtimeRegistered !== false || !Array.isArray(expectedEntries) ||
      expectedEntries.length !== dictionaryIds.size ||
      expectedEntries.some(entry => entry.reviewed !== false || entry.runtimeRegistered !== false))
    throw new Error("Private Japanese Lunch dictionary source or review gate mismatch");
  if (!manifest || manifest.schema !== 1 || manifest.state !== "private-unreleased-candidate" ||
      manifest.releaseEnabled !== false || manifest.workerAllowlistEnabled !== false ||
      manifest.appAssetInventory !== null || manifest.installationStatus !== "not-installed" ||
      manifest.packId !== expectedId || manifest.moduleId !== stage.moduleId ||
      manifest.pairKey !== "Japanese:English" || manifest.target !== "Japanese" ||
      manifest.native !== "English" || manifest.lessonCount !== stage.count ||
      manifest.cardCount !== expected.cards.length || manifest.sourceSha256 !== sourceDigest ||
      manifest.dictionarySourceSha256 !== dictionaryDigest ||
      manifest.dictionaryEntryCount !== expectedEntries.length ||
      manifest.content?.file !== `${expectedId}-${digest}.json` ||
      manifest.content.sha256 !== digest || manifest.content.bytes !== bytes.length ||
      manifest.content.routeCandidate !== null || manifest.cacheNamespaceCandidate !== cache ||
      manifest.progressScopeCandidate !== progress ||
      pack?.schema !== 1 || pack.state !== "private-unreleased-candidate" ||
      pack.releaseEnabled !== false || pack.reviewed !== false || pack.registered !== false ||
      pack.audioFilesIncluded !== false || pack.deviceVoiceIncluded !== false ||
      pack.aiConversationOffline !== false || pack.packId !== expectedId ||
      pack.moduleId !== stage.moduleId || pack.pairKey !== "Japanese:English" ||
      pack.target !== "Japanese" || pack.native !== "English" || pack.locale !== "ja-JP" ||
      pack.sourceSha256 !== sourceDigest || pack.progressScopeCandidate !== progress ||
      pack.dictionarySourceSha256 !== dictionaryDigest ||
      !same(pack.lessons, expected.lessons) || !same(pack.cards, expected.cards) ||
      !same(pack.dictionaryEntries, expectedEntries))
    throw new Error("Private Japanese Lunch source, pair, hash, or content mismatch");
  return pack;
}

function build(stage, sourceBytes, dictionaryBytes) {
  const source = JSON.parse(sourceBytes.toString("utf8"));
  const { lessons, cards } = sourceLessons(source, stage);
  const dictionary = JSON.parse(dictionaryBytes.toString("utf8"));
  const dictionaryIds = new Set(cards.map(card => card.dictionaryId));
  const dictionaryEntries = dictionary.entries.filter(entry => dictionaryIds.has(entry.id));
  if (source.dictionarySha256 !== sha(dictionaryBytes) ||
      dictionaryEntries.length !== dictionaryIds.size)
    throw new Error("Private Japanese Lunch dictionary coverage changed");
  const sourceDigest = sha(sourceBytes);
  const progress = `private:Japanese:English:${stage.moduleId}:ja-en`;
  const pack = {
    schema: 1, state: "private-unreleased-candidate", releaseEnabled: false,
    reviewed: false, registered: false, audioFilesIncluded: false,
    deviceVoiceIncluded: false, aiConversationOffline: false,
    packId: stage.id, moduleId: stage.moduleId, pairKey: "Japanese:English",
    target: "Japanese", native: "English", locale: "ja-JP",
    sourceSha256: sourceDigest, dictionarySourceSha256: sha(dictionaryBytes),
    progressScopeCandidate: progress, lessons, cards, dictionaryEntries,
  };
  const bytes = Buffer.from(JSON.stringify(pack));
  const digest = sha(bytes);
  const filename = `${stage.id}-${digest}.json`;
  const manifest = {
    schema: 1, state: "private-unreleased-candidate", releaseEnabled: false,
    workerAllowlistEnabled: false, appAssetInventory: null, installationStatus: "not-installed",
    packId: stage.id, moduleId: stage.moduleId, pairKey: "Japanese:English",
    target: "Japanese", native: "English", lessonCount: lessons.length,
    cardCount: cards.length, sourceSha256: sourceDigest,
    dictionaryEntryCount: dictionaryEntries.length,
    dictionarySourceSha256: sha(dictionaryBytes),
    content: { file: filename, sha256: digest, bytes: bytes.length, routeCandidate: null },
    cacheNamespaceCandidate: `private:Japanese:English:${stage.id}:${digest}`,
    progressScopeCandidate: progress,
  };
  verifyPrivateJapaneseTravelLunchOfflineCandidate(manifest, bytes, sourceBytes, dictionaryBytes, stage.id);
  return [
    { name: filename, bytes },
    { name: `${stage.id}.manifest.json`, bytes: Buffer.from(JSON.stringify(manifest) + "\n") },
  ];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes("--check");
  if (process.argv.some(arg => arg.startsWith("--") && arg !== "--check"))
    throw new Error("Unknown build argument");
  execFileSync("python3", [path.join(COURSE, "build-private-runtime-candidate.py"), "--check"],
    { cwd: ROOT, stdio: "pipe" });
  const sourceBytes = readFileSync(SOURCE);
  const dictionaryBytes = readFileSync(DICTIONARY);
  if (!check) mkdirSync(OUTPUT, { recursive: true });
  const expectedNames = new Set();
  for (const stage of STAGES) {
    for (const artifact of build(stage, sourceBytes, dictionaryBytes)) {
      expectedNames.add(artifact.name);
      const destination = path.join(OUTPUT, artifact.name);
      if (check) {
        if (!existsSync(destination) || !readFileSync(destination).equals(artifact.bytes))
          throw new Error(`Stale private Japanese Lunch pack: ${artifact.name}`);
      } else writeFileSync(destination, artifact.bytes);
    }
    console.log(`${stage.moduleId}: ${stage.count} private text lessons ${check ? "verified" : "built"}`);
  }
  if (check && !same(readdirSync(OUTPUT).sort(), [...expectedNames].sort()))
    throw new Error("Unexpected private Japanese Lunch pack files");
}
