import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const audioRoot = resolve(root, "public/audio/approved-specialty-pilots");
const index = JSON.parse(readFileSync(resolve(audioRoot, "manifest.json"), "utf8"));
const acceptance = JSON.parse(readFileSync(resolve(root, index.sourceAcceptanceLedger), "utf8"));
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("owner-approved specialty pilots are exact, isolated assets", () => {
  assert.equal(index.courseReleaseClaimed, false);
  assert.equal(index.runtimeRegistered, false);
  assert.equal(index.pilotCount, 10);
  assert.equal(index.clipCount, 100);
  let clips = 0;
  for (const pilot of index.pilots) {
    const approved = acceptance.manifests.find((row) => row.privateManifest === pilot.sourceManifest);
    assert.ok(approved);
    assert.equal(approved.ownerListeningAccepted, true);
    const manifestPath = resolve(audioRoot, pilot.sourceManifest);
    const raw = readFileSync(manifestPath);
    assert.equal(digest(raw), approved.manifestSha256);
    const manifest = JSON.parse(raw);
    assert.equal(manifest.listeningReviewed, true);
    assert.equal(manifest.textReviewed, false);
    assert.equal(manifest.locale, pilot.locale);
    assert.equal(manifest.listeningReview.reviewer, "owner");
    const folder = resolve(manifestPath, "..");
    const names = [];
    for (const [textHash, pair] of Object.entries(manifest.clips)) {
      assert.deepEqual(Object.keys(pair).sort(), ["female", "male"]);
      for (const gender of ["female", "male"]) {
        const clip = pair[gender];
        assert.equal(digest(clip.text), textHash);
        assert.equal(clip.locale, manifest.locale);
        assert.equal(clip.voice, manifest.voices[gender]);
        assert.equal(clip.listeningReviewed, true);
        assert.ok(clip.durationSeconds > 0);
        assert.match(clip.name, /\.mp3$/);
        const file = readFileSync(resolve(folder, clip.name));
        assert.equal(file.length, clip.bytes);
        assert.equal(digest(file), clip.sha256);
        names.push(clip.name);
        clips++;
      }
    }
    assert.equal(names.length, pilot.clipCount);
    assert.deepEqual(readdirSync(folder).filter((name) => name.endsWith(".mp3")).sort(), names.sort());
  }
  assert.equal(clips, index.clipCount);
});
