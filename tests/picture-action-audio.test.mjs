import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const script = JSON.parse(
  readFileSync(new URL("../content/picture-action/audio-script.json", import.meta.url)),
);
const manifest = JSON.parse(
  readFileSync(new URL("../src/data/picture-action-audio.json", import.meta.url)),
);
test("every exact command has both HD voices in each supported language", () => {
  assert.equal(script.length, 36);
  assert.equal(manifest.clips.length, 144);
  for (const c of script)
    for (const language of ["es", "en"])
      for (const gender of ["female", "male"]) {
        const matches = manifest.clips.filter(
          (r) => r.id === c.id && r.language === language && r.gender === gender,
        );
        assert.equal(matches.length, 1);
        const r = matches[0];
        assert.equal(r.text, c[language]);
        assert.match(r.voice, /Chirp3-HD/);
        assert.ok(r.durationSeconds > 0.2);
        const bytes = readFileSync(new URL("../public" + r.url, import.meta.url));
        assert.ok(bytes.length > 500);
        assert.equal(createHash("sha256").update(bytes).digest("hex"), r.sha256);
      }
});
