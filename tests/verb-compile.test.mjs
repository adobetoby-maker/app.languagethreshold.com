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
  // R1 reason lists every failing person (was "no family for yo")
  assert.ok(has("zzzar", "excluded", "form/tag mismatch yo: xx, tú: yy, él_ella_usted: zz, nosotros: ww, ellos_ustedes: vv"));
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

test("gloss: most frequent lesson native, then shared first sense, then longer; stored English is the full variant", () => {
  const input = fixtureInput({ extraLessons: [
    { infinitive: "subir", native: "to go up", forms: { yo: "subo", tú: "subes", él_ella_usted: "sube", nosotros: "subimos", ellos_ustedes: "suben" }, example: { target: "Subo.", native: "I go up." } },
    { infinitive: "subir", native: "to climb, to ascend", forms: { yo: "subo", tú: "subes", él_ella_usted: "sube", nosotros: "subimos", ellos_ustedes: "suben" }, example: { target: "Subo.", native: "I climb." } },
  ] });
  const { report, data } = compilePatterns(input);
  assert.ok(report.some((r) => r.infinitive === "subir" && r.kind === "gloss-variants"));
  const subir = data.verbs.find((v) => v.infinitive === "subir");
  // all three natives occur once; first sense "to climb" occurs twice, so "to climb" vs "to climb, to ascend": longer wins
  assert.equal(subir.english, "to climb, to ascend");
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

const lesson = (infinitive, native, f, example) => ({
  infinitive, native,
  forms: { yo: f[0], tú: f[1], él_ella_usted: f[2], nosotros: f[3], ellos_ustedes: f[4] },
  example: example ?? { target: "Hay que hacerlo.", native: "It has to be done." },
});
const PLANCHAR = ["plancho", "planchas", "plancha", "planchamos", "planchan"];

test("R1: a profile form that no family or rule explains excludes the verb", () => {
  const wrong = ["plancho", "planchas", "plancha", "planchamos", "plancha"];
  const { data, report } = compilePatterns(fixtureInput({
    extraProfiles: { planchar: [wrong, "to iron"] }, extraLessons: [lesson("planchar", "to iron", wrong)] }));
  assert.equal(data.verbs.some((v) => v.infinitive === "planchar"), false);
  assert.ok(report.some((r) => r.infinitive === "planchar" && r.kind === "excluded" && r.detail === "form/tag mismatch ellos_ustedes: plancha"));
});

test("R1: a stem-change verb whose profile yo is the regular form is excluded", () => {
  const wrong = ["renovo", "renuevas", "renueva", "renovamos", "renuevan"];
  const { data, report } = compilePatterns(fixtureInput({
    extraProfiles: { renovar: [wrong, "to renew"] }, extraLessons: [lesson("renovar", "to renew", wrong)] }));
  assert.equal(data.verbs.some((v) => v.infinitive === "renovar"), false);
  assert.ok(report.some((r) => r.infinitive === "renovar" && r.kind === "excluded" && r.detail === "form/tag mismatch yo: renovo"));
});

test("R2: the agreeing lesson form wins when only it passes the classifier", () => {
  const { data, report } = compilePatterns(fixtureInput({
    extraProfiles: {
      planchar: [["plancho", "planchas", "plancha", "planchamos", "plancha"], "to iron"],
      renovar: [["renovo", "renuevas", "renueva", "renovamos", "renuevan"], "to renew"],
    },
    extraLessons: [
      lesson("planchar", "to iron", PLANCHAR),
      lesson("renovar", "to renew", ["renuevo", "renuevas", "renueva", "renovamos", "renuevan"]),
    ],
  }));
  const planchar = data.verbs.find((v) => v.infinitive === "planchar");
  assert.equal(planchar.status, "verified");
  assert.equal(planchar.forms[4].full, "planchan");
  assert.deepEqual(planchar.forms[4].families, ["es.present.ar"]);
  assert.equal(data.verbs.find((v) => v.infinitive === "renovar").forms[0].full, "renuevo");
  assert.ok(report.some((r) => r.infinitive === "planchar" && r.kind === "profile-conflict"
    && r.detail === 'ellos_ustedes profile "plancha" vs lesson "planchan"; lesson used'));
  assert.ok(report.some((r) => r.infinitive === "renovar" && r.kind === "profile-conflict" && r.detail.endsWith("lesson used")));
});

test("R2: unresolved conflicts (neither passes, or both pass) exclude the verb", () => {
  const { data, report } = compilePatterns(fixtureInput({
    extraProfiles: {
      planchar: [["plancho", "planchas", "plancha", "planchamos", "plancha"], "to iron"],
      cortar: [["corto", "cortas", "corta", "cortamos", "cortan"], "to cut"],
    },
    extraLessons: [
      lesson("planchar", "to iron", ["plancho", "planchas", "plancha", "planchamos", "planchen"]),
      // lesson yo "corte" is not a yo form; only the profile "corto" passes, so the profile wins
      lesson("cortar", "to cut", ["corte", "cortas", "corta", "cortamos", "cortan"]),
    ],
  }));
  assert.equal(data.verbs.some((v) => v.infinitive === "planchar"), false);
  assert.ok(report.some((r) => r.infinitive === "planchar" && r.kind === "excluded" && r.detail === "profile-conflict unresolved"));
  assert.ok(report.some((r) => r.infinitive === "planchar" && r.kind === "profile-conflict" && r.detail.endsWith("unresolved")));
  assert.equal(data.verbs.find((v) => v.infinitive === "cortar").forms[0].full, "corto");
  // both sides pass but differ: a regular profile vs a consistent o → ue lesson -> unresolved
  const both = compilePatterns(fixtureInput({
    extraProfiles: { mondar: [["mondo", "mondas", "monda", "mondamos", "mondan"], "to peel"] },
    extraLessons: [lesson("mondar", "to peel", ["muendo", "muendas", "muenda", "mondamos", "muendan"])],
  }));
  assert.equal(both.data.verbs.some((v) => v.infinitive === "mondar"), false);
  assert.ok(both.report.some((r) => r.infinitive === "mondar" && r.kind === "excluded" && r.detail === "profile-conflict unresolved"));
});

test("R5: overrides fix gloss, per-form English, forms, exclusions and frames, and appear in the report", () => {
  const overrides = {
    gloss: { subir: "to go up, to climb" },
    formEnglish: { comer: { yo: "I eat (a meal)" } },
    exclude: { hablar: "test exclusion" },
    dropFrames: { subir: ["él_ella_usted"] },
    forms: { zzlatir: { tú: "zzlates" } },
  };
  const input = fixtureInput({ overrides, extraLessons: [lesson("zzlatir", "to beat", ["zzlato", "zzlatés", "zzlate", "zzlatimos", "zzlaten"])] });
  const { data, report, reportMarkdown } = compilePatterns(input);
  const subir = data.verbs.find((v) => v.infinitive === "subir");
  assert.equal(subir.english, "to go up, to climb");
  assert.equal(subir.forms[2].english, "he/she goes up");
  assert.equal(subir.forms[2].sentence, null);
  assert.equal(data.verbs.find((v) => v.infinitive === "comer").forms[0].english, "I eat (a meal)");
  assert.equal(data.verbs.some((v) => v.infinitive === "hablar"), false);
  assert.ok(report.some((r) => r.infinitive === "hablar" && r.kind === "excluded" && r.detail === "override: test exclusion"));
  assert.ok(report.some((r) => r.infinitive === "zzlatir" && r.kind === "classified" && r.detail.includes("tú zzlates [es.present.ir]")));
  assert.ok(reportMarkdown.includes("## overrides"));
  assert.ok(reportMarkdown.includes('"test exclusion"'));
  // the overrides are part of the signed text
  assert.notEqual(compilePatterns({ ...input, overrides: undefined }).data.reportSha256, compilePatterns(input).data.reportSha256);
});

test("R5: overrides naming an unknown verb, person or section fail the build", () => {
  assert.throws(() => compilePatterns(fixtureInput({ overrides: { gloss: { nadaar: "to swim" } } })), /nadaar/);
  assert.throws(() => compilePatterns(fixtureInput({ overrides: { dropFrames: { subir: ["vosotros"] } } })), /vosotros/);
  assert.throws(() => compilePatterns(fixtureInput({ overrides: { glosses: {} } })), /glosses/);
});

test("R6: a frame whose English is a command is rejected; the next example is tried", () => {
  const BEBER = ["bebo", "bebes", "bebe", "bebemos", "beben"];
  const beber = (example) => lesson("beber", "to drink", BEBER, example);
  const extraProfiles = { beber: [BEBER, "to drink"] };
  const { data } = compilePatterns(fixtureInput({ extraProfiles, extraLessons: [
    beber({ target: "Bebe agua todo el día.", native: "Drink water all day." }),
    beber({ target: "Marcos, bebe el agua.", native: "Marcos, drink the water." }),
    beber({ target: "Primero bebe agua.", native: "First drink water." }),
    beber({ target: "Ana bebe agua.", native: "Ana drinks water." }),
  ] }));
  const forms = data.verbs.find((v) => v.infinitive === "beber").forms;
  assert.deepEqual(forms[2].sentence, { target: "Ana ___ agua.", native: "Ana drinks water." });
  const only = compilePatterns(fixtureInput({ extraProfiles, extraLessons: [beber({ target: "Bebe agua todo el día.", native: "Drink water all day." })] }));
  assert.ok(only.data.verbs.find((v) => v.infinitive === "beber").forms.every((f) => f.sentence === null));
  // a question with a subject is not a command
  const q = compilePatterns(fixtureInput({ extraLessons: [
    lesson("vivir", "to live", ["vivo", "vives", "vive", "vivimos", "viven"], { target: "¿Vive usted aquí?", native: "Do you live here?" }),
  ] }));
  assert.equal(q.data.verbs.find((v) => v.infinitive === "vivir").forms[2].sentence.native, "Do you live here?");
});
