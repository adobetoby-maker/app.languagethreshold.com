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
  assert.equal(lookup("protección contra caídas", "Spanish", "English")[0].meaning, "fall protection");
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
test("French and Japanese entries keep exact-pair lesson links and distinct senses", () => {
  const find = buildCurriculumVocabulary({
    modules: [
      { id: "french-breakfast", name: "French Breakfast", target: "French", native: "English", lessons: { 1: "At the café", 2: "The drink" } },
      { id: "japanese-breakfast", name: "Japanese Breakfast", target: "Japanese", native: "English", lessons: { 1: "Order coffee" } },
    ],
    entries: [
      ["le café", "the café", 0, 1],
      ["le café", "the coffee", 0, 2],
      ["les fruits à coque", "tree nuts", 0, 2],
      ["コーヒー", "coffee", 1, 1],
    ],
  });
  assert.deepEqual(new Set(find("café", "French", "English").map(m => m.meaning)), new Set(["the café", "the coffee"]));
  assert.equal(find("le café", "French", "English", "french-breakfast")[0].moduleId, "french-breakfast");
  assert.equal(find("les fruits à coque", "French", "English")[0].meaning, "tree nuts");
  assert.equal(find("coque", "French", "English").length, 0);
  assert.equal(find("コーヒー", "Japanese", "English")[0].meaning, "coffee");
  assert.equal(find("coffee", "English", "Japanese")[0].meaning, "コーヒー");
  assert.equal(find("コーヒー", "Japanese", "English")[0].href.includes("target=Japanese"), true);
  assert.equal(find("café", "Spanish", "English").length, 0);
  assert.equal(find("コーヒー", "Japanese", "Spanish").length, 0);
  assert.equal(find("coffee", "English", "Spanish").length, 0);
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
  const japanese = find("こんにちは", "Japanese", "English");
  assert.ok(japanese.some(m => m.moduleId === "foundation-japanese-basics" && m.meaning === "hello"));
  assert.ok(japanese.every(m => new URL(m.href, "https://app.languagethreshold.com").searchParams.get("target") === "Japanese"));
  assert.equal(find("こんにちは", "Spanish", "English").length, 0);
});
