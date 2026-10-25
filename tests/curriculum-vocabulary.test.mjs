import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCurriculumVocabulary } from "../src/lib/curriculum-vocabulary.ts";
const data = {
  modules: [
    { id: "roofing", name: "Roofing", lessons: { 4: "Ladders" } },
    { id: "orthopedics", name: "Orthopedics", lessons: { 2: "Patient care" } },
  ],
  entries: [
    ["escalera", "ladder", 0, 4],
    ["alta", "high", 0, 4],
    ["alta", "discharge", 1, 2],
    ["protección contra caídas", "fall protection", 0, 4],
    ["cita / consulta", "appointment", 1, 2],
  ],
};
const lookup = buildCurriculumVocabulary(data);
test("exact bilingual authored matches contain working lesson links", () => {
  const [match] = lookup("¡ESCALERA!", "Spanish", "English");
  assert.equal(match.meaning, "ladder");
  const url = new URL(match.href, "https://app.languagethreshold.com");
  assert.equal(url.searchParams.get("module"), "roofing");
  assert.equal(url.searchParams.get("lesson"), "4");
  assert.equal(url.searchParams.get("tab"), "core30");
  assert.equal(lookup("ladder", "English", "Spanish")[0].meaning, "escalera");
  assert.equal(lookup("consulta", "Spanish", "English")[0].meaning, "appointment");
});
test("never invent inflections, strip accents, split phrases or reuse the wrong language", () => {
  for (const [word, language, native] of [
    ["escaleras", "Spanish", "English"],
    ["caídas", "Spanish", "English"],
    ["proteccion", "Spanish", "English"],
    ["escalera", "French", "English"],
    ["escalera", "Spanish", "German"],
  ])
    assert.equal(lookup(word, language, native).length, 0);
});
test("homonyms keep multiple authored meanings and prefer the current module", () => {
  const matches = lookup("alta", "Spanish", "English", "orthopedics");
  assert.equal(matches[0].moduleId, "orthopedics");
  assert.deepEqual(new Set(matches.map((m) => m.meaning)), new Set(["high", "discharge"]));
});
test("shipped index includes real medical and construction vocabulary without private user content", () => {
  const shipped = JSON.parse(
    readFileSync(new URL("../src/data/curriculum-word-index.json", import.meta.url), "utf8"),
  );
  const find = buildCurriculumVocabulary(shipped);
  assert.ok(
    find("escalera", "Spanish", "English").some(
      (m) =>
        m.moduleId.includes("roofing") ||
        m.moduleId.includes("electrician") ||
        m.moduleId.includes("gutters"),
    ),
  );
  assert.ok(shipped.modules.some((m) => m.id.includes("orthopedics")));
  assert.ok(
    find("examinar", "Spanish", "English").some(
      (m) => m.moduleId === "app-dictionary" && m.lesson === 0 && m.href.includes("tab=dictionary"),
    ),
  );
  assert.ok(shipped.modules.every((m) => !m.id.includes("fixture")));
});
