import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const stages = ["foundation-spanish-cognates", "spanish-cognates", "master-spanish-cognates"];
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
test("Cognates has sixty distinct contextual readings and every glossary term occurs in its own passage", () => {
  const passages = [];
  for (const module of stages) {
    const content = read(`public/lesson-content/es/${module}.json`);
    assert.equal(content.reviewed, false);
    for (const lesson of Object.values(content.lessons)) {
      const text = lesson.passage.target.join(" ").normalize("NFC");
      passages.push(text);
      for (const word of lesson.words.filter((w) => w.kind === "term")) {
        const escaped = word.es.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        assert.match(
          text,
          new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, "iu"),
          `${module}: ${word.es}`,
        );
      }
    }
  }
  assert.equal(passages.length, 60);
  assert.equal(new Set(passages).size, 60);
});
test("Cognate reading lines have both gender-specific authored HD recordings", () => {
  const recordings = read("src/data/spanish-next-recordings.json").entries;
  for (const module of stages)
    for (const lesson of Object.values(read(`public/lesson-content/es/${module}.json`).lessons)) {
      for (const line of lesson.passage.target) {
        const key = line
          .normalize("NFC")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, " ")
          .replace(/[.!?¿¡,;:]+$/, "");
        for (const gender of ["female", "male"]) {
          const name = recordings[key]?.[gender];
          assert.match(
            name ?? "",
            new RegExp(`^es-next-[a-f0-9]{20}-${gender}$`),
            `${module}: ${key}`,
          );
          assert.ok(readFileSync(`public/audio/spanish-next/${name}.mp3`).length > 500);
        }
      }
    }
});
