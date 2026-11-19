import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { recordedSpanishPath, normalizedRecordingText } from "../src/lib/recorded-spanish.ts";
const read = (p) => JSON.parse(readFileSync(new URL("../" + p, import.meta.url), "utf8"));
test("every Dance and Cosmetology lesson line resolves to a bundled recording in both voices", () => {
  const script = read("content/interests-spanish/audio-script.json");
  assert.ok(script.length > 2000);
  for (const line of script)
    for (const gender of ["female", "male"]) {
      const voice = "es-US-Chirp3-HD-" + (gender === "female" ? "Aoede" : "Charon");
      const path = recordedSpanishPath(line.text, voice, "es-US");
      assert.ok(path, `${gender}: ${line.text}`);
      assert.ok(existsSync(new URL("../public" + path, import.meta.url)), path);
    }
});
test("recording script covers native cards, reading sentences and complete verb forms", () => {
  const script = new Set(
    read("content/interests-spanish/audio-script.json").map((l) => l.normalized),
  );
  const pack = read("content/interests-spanish/v4-course-pack.json");
  for (const module of pack.modules)
    for (const lesson of module.lessons) {
      const lines = [...lesson.items, ...lesson.passage].map((l) => l.target);
      for (const verb of lesson.verbs)
        lines.push(verb.infinitive, verb.example.target, ...Object.values(verb.forms));
      for (const line of lines)
        assert.ok(script.has(normalizedRecordingText(line)), `${module.id}: ${line}`);
    }
});
