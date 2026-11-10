import test from "node:test";
import assert from "node:assert/strict";
import {
  JAPANESE_101_COURSE_AUDIO_REGISTERED,
  JAPANESE_101_COURSE_SOURCE_SHA256,
  recordedJapaneseCoursePath,
  recordedJapanesePath,
} from "../src/lib/recorded-japanese.ts";
import manifest from "../src/data/japanese-101-recordings.json" with { type: "json" };
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const unreviewedFixture = { ...manifest, listeningReviewed: false };

test("Japanese pilot resolves exact displayed lines for selected female and male voices", () => {
  assert.match(recordedJapanesePath("わたしは あきです。", "ja-JP-Chirp3-HD-Aoede", "ja-JP"), /female\.mp3$/);
  assert.match(recordedJapanesePath("わたしは あきです。", "ja-JP-Chirp3-HD-Charon", "ja-JP"), /male\.mp3$/);
});

test("owner-accepted pilot is available; an unreviewed manifest remains gated", () => {
  assert.equal(manifest.listeningReviewed, true);
  assert.equal(manifest.listeningReview.reviewer, "owner");
  assert.equal(manifest.listeningReview.decision, "accepted-all-pilot-clips");
  assert.match(recordedJapanesePath("こんにちは。", "ja-JP-Chirp3-HD-Aoede", "ja-JP"), /female\.mp3$/);
  assert.equal(recordedJapanesePath("こんにちは。", "ja-JP-Chirp3-HD-Aoede", "ja-JP", unreviewedFixture), null);
});

test("public clips and the lookup manifest match exact Foundation 1 source and hashes", () => {
  const root = resolve(import.meta.dirname, "..");
  const publicManifest = JSON.parse(readFileSync(resolve(root, "public/audio/japanese-101/manifest.json"), "utf8"));
  assert.deepEqual(publicManifest, manifest);
  const foundation = JSON.parse(readFileSync(resolve(root, "public/lesson-content/ja/foundation-japanese-basics.json"), "utf8"));
  const lines = foundation.lessons["1"].passage.target.slice(0, 5);
  assert.deepEqual(Object.keys(manifest.entries).sort(), lines.map(line => line.normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("ja-JP")).sort());
  for (const pair of Object.values(manifest.entries)) for (const clip of Object.values(pair)) {
    const file = readFileSync(resolve(root, "public/audio/japanese-101", clip.name));
    assert.equal(file.length, clip.bytes);
    assert.equal(createHash("sha256").update(file).digest("hex"), clip.sha256);
  }
});

test("Japanese pilot never borrows audio for another line, voice or locale", () => {
  for (const [text, voice, locale] of [
    ["わたしは あきです", "ja-JP-Chirp3-HD-Aoede", "ja-JP"],
    ["わたしは あおきです。", "ja-JP-Chirp3-HD-Aoede", "ja-JP"],
    ["わたしは あきです。", "ja-JP-Chirp3-HD-Zephyr", "ja-JP"],
    ["わたしは あきです。", "ja-JP-Chirp3-HD-Aoede", "en-US"],
  ]) assert.equal(recordedJapanesePath(text, voice, locale), null);
});

test("full-course lookup stays separate from the accepted pilot and rejects private review gates", () => {
  const text = "こんにちは。";
  const voice = manifest.voices.female;
  const course = {
    schema: 1,
    locale: "ja-JP",
    voices: manifest.voices,
    sourceSHA256: JAPANESE_101_COURSE_SOURCE_SHA256,
    scope: { module: "foundation-japanese-basics", lesson: 1 },
    registered: false,
    listeningReviewed: false,
    clips: { [text]: {
      female: { ...manifest.entries[text].female, listeningReviewed: false },
      male: { ...manifest.entries[text].male, listeningReviewed: false },
    } },
  };
  const lookup = (candidate, selectedText = text, selectedVoice = voice,
    moduleId = "foundation-japanese-basics", lessonNumber = 1) =>
    recordedJapaneseCoursePath(selectedText, selectedVoice, "ja-JP", moduleId, lessonNumber, candidate);
  assert.equal(JAPANESE_101_COURSE_AUDIO_REGISTERED, false);
  assert.equal(lookup(course), null);
  assert.equal(lookup(null), null);
  const manifestReviewed = { ...course, listeningReviewed: true };
  assert.equal(lookup(manifestReviewed), null, "each clip still needs listening approval");
  const fullyReviewed = structuredClone(manifestReviewed);
  fullyReviewed.clips[text].female.listeningReviewed = true;
  assert.equal(lookup(fullyReviewed), null, "private audio is still unregistered");
  const installed = { ...fullyReviewed, registered: true };
  assert.match(lookup(installed), /^\/audio\/japanese-101\/course\/foundation-1\/ja-101-.*-female\.mp3$/);
  assert.equal(lookup(installed, "さようなら。"), null);
  assert.equal(lookup(installed, text, manifest.voices.male), null);
  assert.equal(lookup(installed, text, voice, "japanese-basics"), null);
  assert.equal(lookup(installed, text, voice, "foundation-japanese-basics", 2), null);
  assert.equal(lookup({ ...installed, sourceSHA256: "0".repeat(64) }), null);
  assert.equal(lookup({ ...installed, voices: { ...installed.voices, female: "ja-JP-Chirp3-HD-Zephyr" } }), null);
  const wrongHash = structuredClone(installed);
  wrongHash.clips[text].female.sha256 = "bad";
  assert.equal(lookup(wrongHash), null);
});
