import assert from "node:assert/strict";
import test from "node:test";
import { compilePatterns } from "../src/lib/verb-games/compile.ts";
import { fixtureInput, miniData } from "./helpers/verb-fixture.mjs";

const REFLEXIVE = {
  infinitive: "cruzarse",
  native: "to cross over",
  forms: { yo: "me cruzo", tú: "te cruzas", él_ella_usted: "se cruza", nosotros: "nos cruzamos", ellos_ustedes: "se cruzan" },
  example: { target: "Me cruzo.", native: "I cross." },
};

test("verified verbs carry five forms with families and English", () => {
  const { data } = compilePatterns(fixtureInput());
  const tener = data.verbs.find((v) => v.infinitive === "tener");
  assert.equal(tener.status, "verified");
  assert.deepEqual(tener.forms.map((f) => f.full), ["tengo", "tienes", "tiene", "tenemos", "tienen"]);
  assert.deepEqual(tener.forms[0].families, ["es.present.go-yo"]);
  assert.equal(tener.forms[2].english, "he/she has");
  assert.match(data.dataHash, /^[0-9a-f]{16}$/);
});

test("reflexive forms never emit clitics", () => {
  const only = compilePatterns(fixtureInput({ extraLessons: [REFLEXIVE] }));
  assert.ok(only.report.some((r) => r.infinitive === "cruzarse" && r.kind === "excluded" && r.detail === "reflexive-only"));
  assert.ok(only.data.verbs.every((v) => v.forms.every((f) => !/\s/.test(f.full) && !/\s/.test(f.stem))));
  assert.equal(only.data.verbs.some((v) => v.infinitive === "cruzarse" || v.infinitive === "cruzar"), false);
});

test("a reflexive lesson entry only adds its module to a base that has a profile", () => {
  const input = fixtureInput({
    extraLessons: [{ ...REFLEXIVE, infinitive: "sentirse", native: "to feel (oneself)",
      forms: { yo: "me siento", tú: "te sientes", él_ella_usted: "se siente", nosotros: "nos sentimos", ellos_ustedes: "se sienten" } }],
  });
  input.lessonFiles.push({ module: "medical", lessons: { l1: { verbs: [input.lessonFiles[0].lessons.l1.verbs.at(-1)] } } });
  const { data, report } = compilePatterns(input);
  const sentir = data.verbs.find((v) => v.infinitive === "sentir");
  assert.deepEqual(sentir.sources, [{ kind: "core", rank: 11 }, { kind: "module", moduleId: "medical" }, { kind: "module", moduleId: "roofing" }]);
  assert.deepEqual(sentir.forms.map((f) => f.full), ["siento", "sientes", "siente", "sentimos", "sienten"]);
  assert.equal(sentir.english, "to feel");
  assert.equal(data.verbs.some((v) => v.infinitive === "sentirse"), false);
  assert.equal(report.some((r) => r.infinitive === "sentirse"), false);
});

test("profile labels and notes never drive families or reasons", () => {
  const { data } = compilePatterns(fixtureInput({ profileExtras: {
    poder: { irregularType: "stem-change", notes: ["E→UE stem change"] },
    conocer: { irregularType: "go-verb", notes: ["yo-form adds -zc- before o"] } } }));
  const poder = data.verbs.find((v) => v.infinitive === "poder");
  assert.deepEqual(poder.forms[1].families, ["es.present.o-ue"]);
  assert.deepEqual(data.verbs.find((v) => v.infinitive === "conocer").forms[0].families, []);
  assert.ok(!JSON.stringify(data).includes("E→UE"));
  assert.ok(!JSON.stringify(data).includes("go-verb"));
  // Same output with and without the misleading labels.
  assert.deepEqual(data.verbs, compilePatterns(fixtureInput()).data.verbs);
});

test("classified verbs ship only after sign-off of this exact report", () => {
  const input = fixtureInput({ dropProfiles: ["pensar"] });
  const unsigned = compilePatterns(input);
  assert.ok(unsigned.report.some((r) => r.infinitive === "pensar" && r.kind === "classified"));
  assert.equal(unsigned.data.verbs.some((v) => v.infinitive === "pensar"), false);
  const signed = compilePatterns({ ...input, signoff: { reportSha256: unsigned.data.reportSha256, signedBy: "Reviewer", signedAt: "2026-10-21" } });
  assert.equal(signed.data.signedOff, true);
  assert.equal(signed.data.verbs.find((v) => v.infinitive === "pensar").status, "classified");
  assert.equal(signed.reportMarkdown, unsigned.reportMarkdown);
  const stale = compilePatterns({ ...input, signoff: { reportSha256: "0".repeat(64), signedBy: "Reviewer", signedAt: "2026-10-21" } });
  assert.equal(stale.data.signedOff, false);
  assert.equal(stale.data.verbs.some((v) => v.infinitive === "pensar"), false);
});

test("lesson sentence becomes a frame with one blank", () => {
  const { data } = compilePatterns(fixtureInput());
  assert.deepEqual(data.verbs.find((v) => v.infinitive === "subir").forms[2].sentence,
    { target: "El techador ___ la escalera.", native: "The roofer climbs the ladder." });
  // tener and venir examples contain the infinitive, not a form: no frame.
  for (const inf of ["tener", "venir"]) {
    assert.ok(data.verbs.find((v) => v.infinitive === inf).forms.every((f) => f.sentence === null));
  }
});

test("core verb with no profile and no lesson forms is excluded as no forms", () => {
  const input = fixtureInput({ dropProfiles: ["pensar"] });
  input.lessonFiles[0].lessons.l1.verbs = input.lessonFiles[0].lessons.l1.verbs.filter((v) => v.infinitive !== "pensar");
  const { report, data } = compilePatterns(input);
  assert.ok(report.some((r) => r.infinitive === "pensar" && r.kind === "excluded" && r.detail === "no forms"));
  assert.equal(data.verbs.some((v) => v.infinitive === "pensar"), false);
});

test("lesson forms: missing person, conflicting modules and no family are excluded", () => {
  const input = fixtureInput({ extraLessons: [
    { infinitive: "mirar", native: "to look", forms: { yo: "miro", tú: "miras" }, example: { target: "Miro.", native: "I look." } },
    { infinitive: "cortar", native: "to cut", forms: { yo: "corto", tú: "cortas", él_ella_usted: "corta", nosotros: "cortamos", ellos_ustedes: "cortan" }, example: { target: "Corto.", native: "I cut." } },
    { infinitive: "zzzar", native: "to zzz", forms: { yo: "xx", tú: "yy", él_ella_usted: "zz", nosotros: "ww", ellos_ustedes: "vv" }, example: { target: "Zzz.", native: "Zzz." } },
  ] });
  input.lessonFiles.push({ module: "other", lessons: { l1: { verbs: [
    { infinitive: "cortar", native: "to cut", forms: { yo: "corte", tú: "cortas", él_ella_usted: "corta", nosotros: "cortamos", ellos_ustedes: "cortan" }, example: { target: "Corte.", native: "Cut." } },
  ] } } });
  const { report, data } = compilePatterns(input);
  const has = (inf, kind, detail) => report.some((r) => r.infinitive === inf && r.kind === kind && (detail === undefined || r.detail === detail));
  assert.ok(has("mirar", "excluded", "missing nosotros") || has("mirar", "excluded", "missing él_ella_usted"));
  assert.ok(has("cortar", "lesson-conflict"));
  assert.ok(has("cortar", "excluded"));
  assert.ok(has("zzzar", "excluded", "no family for yo"));
  for (const inf of ["mirar", "cortar", "zzzar"]) assert.equal(data.verbs.some((v) => v.infinitive === inf), false);
});

test("profile wins over a disagreeing lesson and is reported", () => {
  const { report, data } = compilePatterns(fixtureInput({ extraLessons: [
    { infinitive: "TENER", native: "to have", forms: { yo: "tengo", tú: "tienes", él_ella_usted: "tiene", nosotros: "tenemos", ellos_ustedes: "tenen" }, example: { target: "Tenen.", native: "They have." } },
  ] }));
  assert.ok(report.some((r) => r.infinitive === "tener" && r.kind === "profile-conflict"));
  const tener = data.verbs.find((v) => v.infinitive === "tener");
  assert.equal(tener.status, "verified");
  assert.equal(tener.forms[4].full, "tienen");
});

test("gloss: most frequent lesson native, ties lexicographic, variants reported; stored English is the primary gloss", () => {
  const input = fixtureInput({ extraLessons: [
    { infinitive: "subir", native: "to go up", forms: { yo: "subo", tú: "subes", él_ella_usted: "sube", nosotros: "subimos", ellos_ustedes: "suben" }, example: { target: "Subo.", native: "I go up." } },
    { infinitive: "subir", native: "to climb, to ascend", forms: { yo: "subo", tú: "subes", él_ella_usted: "sube", nosotros: "subimos", ellos_ustedes: "suben" }, example: { target: "Subo.", native: "I climb." } },
  ] });
  const { report, data } = compilePatterns(input);
  assert.ok(report.some((r) => r.infinitive === "subir" && r.kind === "gloss-variants"));
  const subir = data.verbs.find((v) => v.infinitive === "subir");
  assert.equal(subir.english, "to climb"); // "to climb" (1) ties "to climb, to ascend" (1) and "to go up" (1): first by code unit
  assert.equal(subir.forms[0].english, "I climb");
  // no lesson native and no core english: the dictionary englishParallel is used
  const bare = fixtureInput();
  bare.lessonFiles[0].lessons.l1.verbs.find((v) => v.infinitive === "tener").native = "";
  bare.core.find((c) => c.infinitive === "tener").english = "";
  assert.equal(compilePatterns(bare).data.verbs.find((v) => v.infinitive === "tener").english, "to have");
});

test("sources list core rank first, then modules sorted; verbs sorted by infinitive", () => {
  const { data } = compilePatterns(fixtureInput());
  assert.deepEqual(data.verbs.find((v) => v.infinitive === "tener").sources, [{ kind: "core", rank: 1 }, { kind: "module", moduleId: "roofing" }]);
  assert.deepEqual(data.verbs.find((v) => v.infinitive === "subir").sources, [{ kind: "module", moduleId: "roofing" }]);
  const names = data.verbs.map((v) => v.infinitive);
  assert.deepEqual(names, [...names].sort());
  assert.equal(names.length, 16);
});

test("report is grouped by kind, sorted, independent of sign-off; hash is stable", () => {
  const input = fixtureInput({ dropProfiles: ["pensar", "sentar"], extraLessons: [REFLEXIVE] });
  const a = compilePatterns(input);
  const b = compilePatterns({ ...input, signoff: { reportSha256: a.data.reportSha256, signedBy: "R", signedAt: "2026-10-21" } });
  assert.equal(a.reportMarkdown, b.reportMarkdown);
  assert.ok(a.reportMarkdown.indexOf("## classified") < a.reportMarkdown.indexOf("## excluded"));
  assert.ok(a.reportMarkdown.indexOf("- pensar:") < a.reportMarkdown.indexOf("- sentar:"));
  assert.match(a.data.reportSha256, /^[0-9a-f]{64}$/);
  assert.equal(compilePatterns(input).data.dataHash, a.data.dataHash);
  assert.notEqual(b.data.dataHash, a.data.dataHash); // signed adds two verbs
});

test("keys are NFC: decomposed person keys and infinitives still compile", () => {
  const input = fixtureInput({ dropProfiles: ["pensar"] });
  const verbs = input.lessonFiles[0].lessons.l1.verbs;
  const pensar = verbs.find((v) => v.infinitive === "pensar");
  pensar.forms = Object.fromEntries(Object.entries(pensar.forms).map(([k, v]) => [k.normalize("NFD"), v]));
  const { report } = compilePatterns(input);
  assert.ok(report.some((r) => r.infinitive === "pensar" && r.kind === "classified"));
});

test("miniData is the compiled fixture", () => {
  assert.deepEqual(miniData(), compilePatterns(fixtureInput()).data);
  assert.equal(miniData().crushLevels.length, 4);
});
