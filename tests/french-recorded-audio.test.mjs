import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

import { recordedFrenchPath } from "../src/lib/recorded-french.ts";
import manifest from "../src/data/french-101-recordings.json" with { type: "json" };

const root = resolve(import.meta.dirname, "..");
const female = "fr-FR-Chirp3-HD-Aoede";
const male = "fr-FR-Chirp3-HD-Charon";

test("French 101 pilot uses only the exact accepted language, voice and source text", () => {
  assert.equal(manifest.pairKey, "French:English");
  assert.equal(manifest.listeningReview.reviewer, "owner");
  assert.equal(manifest.listeningReview.decision, "accepted-all-pilot-clips");
  assert.match(recordedFrenchPath("bonjour", female, "fr-FR"), /female\.mp3$/);
  assert.match(recordedFrenchPath("Bonjour", male, "fr-FR"), /male\.mp3$/);
  assert.equal(recordedFrenchPath("Bonjour!", female, "fr-FR"), null);
  assert.equal(recordedFrenchPath("bonjour", "es-US-Chirp3-HD-Aoede", "fr-FR"), null);
  assert.equal(recordedFrenchPath("bonjour", female, "es-US"), null);
  assert.equal(recordedFrenchPath("bonsoir", female, "fr-FR"), null);
  assert.equal(recordedFrenchPath("je m'appelle", female, "fr-FR"), null);
  assert.equal(recordedFrenchPath("bonjour", female, "fr-FR", { ...manifest, listeningReviewed: false }), null);
  assert.equal(recordedFrenchPath("bonjour", female, "fr-FR", { ...manifest, pairKey: "Spanish:English" }), null);
  assert.equal(recordedFrenchPath("bonjour", female, "fr-FR", { ...manifest, listeningReview: { reviewer: "ai", decision: "accepted-all-pilot-clips" } }), null);
});

test("the ten public clips match approved private metadata and exact Foundation 1 words", () => {
  const publicManifest = JSON.parse(readFileSync(resolve(root, "public/audio/french-101/manifest.json"), "utf8"));
  assert.deepEqual(publicManifest, manifest);
  const sourceBytes = readFileSync(resolve(root, "content/french-basics/private-runtime-foundation-1-10.json"));
  assert.equal(createHash("sha256").update(sourceBytes).digest("hex"), manifest.sourceSha256);
  const source = JSON.parse(sourceBytes);
  assert.equal(source.registered, false);
  assert.equal(source.reviewed, false);
  assert.equal(source.stageFile.language, "French");
  assert.equal(source.stageFile.nativeLanguage, "English");
  const words = new Set(source.stageFile.lessons[0].words.map((word) => word.es));
  assert.equal(Object.keys(manifest.entries).length, 5);
  assert.deepEqual(Object.keys(manifest.entries).sort(), ["bonjour", "je m’appelle", "Comment vous appelez-vous ?", "enchantée", "Ça va bien, merci."].sort());
  let clips = 0;
  const names = [];
  for (const [text, pair] of Object.entries(manifest.entries)) {
    assert.ok(words.has(text), `missing source word: ${text}`);
    assert.deepEqual(Object.keys(pair).sort(), ["female", "male"]);
    for (const [gender, clip] of Object.entries(pair)) {
      assert.equal(clip.text, text);
      assert.equal(clip.locale, "fr-FR");
      assert.equal(clip.voice, manifest.voices[gender]);
      assert.equal(clip.listeningReviewed, true);
      const file = readFileSync(resolve(root, "public/audio/french-101", clip.name));
      names.push(clip.name);
      assert.equal(file.length, clip.bytes);
      assert.equal(createHash("sha256").update(file).digest("hex"), clip.sha256);
      clips++;
    }
  }
  assert.equal(clips, 10);
  assert.deepEqual(readdirSync(resolve(root, "public/audio/french-101")).filter((name) => name.endsWith(".mp3")).sort(), names.sort());
});
