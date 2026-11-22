// Built by TAC — 2026-11-22
// Round-5 fixes for the owner rules of 2026-11-22: French and Italian learners never reach a
// Spanish-authored module or Spanish text (deep links, saved modules, module tabs, Field Prep, the
// Cognate Bridge); the fr/it Verbs hub names exactly what is unavailable; Spanish and the languages
// that are not packs keep the base dictionary search, voice gender table, guide tips and Baseball tabs.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { MODULES, packCourseModuleId } from "../src/data/modules.ts";
import { getCognateRules, getCognateSources } from "../src/data/cognate-patterns.ts";
import { deviceVoiceGender, deviceVoiceIdentity } from "../src/data/voice-identity.ts";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("a link or saved module opens the French or Italian course of the same module", () => {
  const cases = [
    ["roofing", "French", "roofing-fr"],
    ["roofing", "Italian", "roofing-it"],
    ["foundation-roofing", "French", "foundation-roofing-fr"],
    ["master-roofing", "Italian", "master-roofing-it"],
    ["foundation-spanish-basics", "French", "foundation-french-basics-fr"],
    ["spanish-basics", "Italian", "italian-basics"],
    ["spanish-conjugation-patterns", "French", "french-conjugation-patterns"],
    ["spanish-common-patterns", "Italian", "italian-common-patterns"],
    ["orthopedics", "French", "orthopedics"],
    ["roofing-fr", "French", "roofing-fr"],
  ];
  for (const [id, language, expected] of cases) {
    assert.equal(packCourseModuleId(id, language), expected, `${id} ${language}`);
    assert.ok(
      MODULES.some((module) => module.id === expected),
      expected,
    );
  }
});

test("a Spanish-only module is never opened for French or Italian", () => {
  for (const language of ["French", "Italian"])
    for (const id of ["soccer", "baseball", "lds-missionary", "rock-climbing", "or-evs", "fmg"])
      assert.equal(packCourseModuleId(id, language), null, `${id} ${language}`);
  assert.equal(packCourseModuleId("roofing-fr", "Italian"), null);
});

test("Spanish and the languages that are not packs keep module ids as they are", () => {
  for (const language of ["Spanish", "German", "Japanese", "English", "Portuguese"])
    assert.equal(packCourseModuleId("roofing", language), undefined, language);
});

test("the French and Italian Cognate Bridge names no Spanish", () => {
  for (const target of ["French", "Italian"]) {
    assert.ok(!getCognateSources(target).includes("Spanish"), target);
    for (const rule of getCognateRules(target)) {
      const text = [rule.hook, rule.watchOut ?? "", ...rule.examples.map((e) => e.gloss)].join(" ");
      assert.doesNotMatch(text, /Spanish|ñ/, `${target} ${rule.id}`);
    }
  }
  // Spanish keeps its rules; the base prose stays for every other learner.
  assert.ok(getCognateRules("Spanish").length > 0);
  assert.match(
    read("src/components/cognates/CognateBridge.tsx"),
    /common but risky \(ñ → gn\/nn\)/,
  );
});

test("Spanish and English device voices keep the base gender table", () => {
  assert.equal(
    deviceVoiceGender("Microsoft Paola Online (Natural) - Spanish (Venezuela)", "es-VE"),
    null,
  );
  assert.equal(
    deviceVoiceGender("Microsoft Lorenzo Online (Natural) - Spanish (Chile)", "es-CL"),
    null,
  );
  assert.equal(deviceVoiceGender("Microsoft Emma Online (Natural) - English", "en-US"), null);
  assert.equal(
    deviceVoiceIdentity({ name: "Microsoft Paola - Spanish", lang: "es-VE", voiceURI: "p" }).gender,
    null,
  );
  // French and Italian voices are recognised.
  assert.equal(deviceVoiceGender("Microsoft Denise Online (Natural) - French", "fr-FR"), "woman");
  assert.equal(deviceVoiceGender("Cosimo", "it-IT"), "man");
});

test("base behaviour for Spanish and non-pack learners: dictionary trim, guide tips, Baseball tabs", () => {
  assert.match(
    read("src/components/dictionary/DictionaryTab.tsx"),
    /const q = key\(query\.trim\(\)\);/,
  );
  const guide = read("src/components/guide/AppGuide.tsx");
  assert.match(guide, /!followsPackRules\(tipPack\) \|\| tipPack\?\.content\.guideTips/);
  assert.match(guide, /!followsPackRules\(pack\)\s*\?\s*"¿Dónde le duele\?"/);
  const baseball = read("src/components/baseball/BaseballHome.tsx");
  assert.match(baseball, /\{TABS\.map\(\(tab\) => \(/);
  assert.doesNotMatch(baseball, /dugoutColumn/);
  const voices = read("src/lib/voices.ts");
  assert.match(voices, /family === "es" && v\.name === "Paulina"/);
  assert.match(voices, /family === "es" \|\| packRules/);
});

test("French and Italian: module tabs, Field Prep, Verbs and Reader show their unavailable state", () => {
  assert.match(read("src/components/tab-registry.ts"), /export function packHidesTab\(/);
  assert.match(read("src/components/TabShell.tsx"), /packHidesTab\(/);
  assert.match(read("src/components/modules/FieldPrepRouter.tsx"), /field-prep-unavailable/);
  const hub = read("src/components/verbs/VerbsHub.tsx");
  assert.match(hub, /verbs-pack-notice/);
  assert.doesNotMatch(hub, /Coming soon in \{catalogPack\.name\}/);
  const card = read("src/components/games/verbs/VerbsSection.tsx");
  assert.doesNotMatch(card, /verb patterns are coming soon/);
  assert.match(
    read("src/components/reader/ParallelReader.tsx"),
    /reader-course-readings-unavailable/,
  );
});

test("a French or Italian link without a native language opens that course (?module=roofing&target=French)", async () => {
  const { linkLearningPair } = await import("../src/data/modules.ts");
  assert.deepEqual(linkLearningPair("French", null), { target: "French", native: "English" });
  assert.deepEqual(linkLearningPair("Italian", ""), { target: "Italian", native: "English" });
  assert.deepEqual(linkLearningPair("French", "English"), { target: "French", native: "English" });
  // The route resolves the module with the link's target, never the learner's saved language.
  const pair = linkLearningPair("French", null);
  assert.equal(packCourseModuleId("roofing", pair.target), "roofing-fr");
  assert.match(
    read("src/routes/index.tsx"),
    /linkLearningPair\(params\.get\("target"\), params\.get\("native"\)\)/,
  );
  // Spanish and the languages that are not packs keep base behaviour: both parameters are needed.
  for (const target of ["Spanish", "German", "Japanese", "Portuguese", "English"])
    assert.equal(linkLearningPair(target, null), null, target);
  assert.deepEqual(linkLearningPair("Spanish", "English"), { target: "Spanish", native: "English" });
  assert.equal(linkLearningPair("French", "Klingon"), null);
  assert.equal(linkLearningPair("Klingon", "English"), null);
  assert.equal(linkLearningPair(null, "English"), null);
});
