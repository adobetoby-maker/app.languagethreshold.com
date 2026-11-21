// Built by TAC — 2026-11-21
// A French lesson page in a QA build (LT_QA=1) is built only from the French pack and its catalog:
// French lesson text, a French voice and recognition locale, French person labels, French keyboard
// letters and typing prompts, and nothing Spanish anywhere a learner reads. A normal build has no
// French catalog lessons at all (the draft pack is not registered).
import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const root = new URL("..", import.meta.url).pathname;
const CATALOG = `${root}content/language-packs/fr/orthopedics.json`;

const SPANISH =
  /Spanish|[Ee]spañol|[¿¡ñÑ]|\b(?:el|los|usted|ustedes|nosotros|vosotros|ellos|está|estoy|tengo|hablo|yo)\b|Escribe|es-(?:419|MX|CR|US|ES)/u;

function run(script, qa) {
  return JSON.parse(
    execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      env: { ...process.env, LT_QA: qa ? "1" : "" },
      encoding: "utf8",
      cwd: root,
    }),
  );
}

const PAGE = `
  import { readFileSync } from "node:fs";
  import { packFor } from "./src/data/language-packs/registry.ts";
  import { parseCatalogModuleFile } from "./src/data/language-packs/catalog.ts";
  import {
    catalogContentFile, catalogCurriculum, catalogLessonPack,
  } from "./src/data/language-packs/catalog-lessons.ts";
  import { typeInPlaceholder, typeFormPlaceholder } from "./src/data/language-packs/ui-text.ts";
  import {
    conjugationItems, isCorrectForm, verbFormKeys, verbFormLabel,
  } from "./src/lib/lesson-content-core.ts";
  import {
    defaultAccentTag, listeningLocaleFor, recognitionLocales, specialCharacters,
  } from "./src/lib/language-pack-text.ts";
  const pack = catalogLessonPack("French");
  const fr = packFor("French");
  if (!pack) { console.log(JSON.stringify({ catalogPack: null, name: fr.name })); process.exit(0); }
  const raw = JSON.parse(readFileSync(${JSON.stringify(CATALOG)}, "utf8"));
  const module = parseCatalogModuleFile(raw, pack, "orthopedics");
  const content = catalogContentFile(module, "working", "orthopedics", "French", pack);
  const curriculum = catalogCurriculum(module, "working", "orthopedics");
  const lesson = content.lessons["1"];
  const keys = verbFormKeys("French");
  const items = conjugationItems(lesson.verbs, "French");
  const first = items.find((item) => item.key === "ils_elles");
  console.log(JSON.stringify({
    catalogPack: pack.code,
    lessons: curriculum.lessons.length,
    title: curriculum.lessons[0].title,
    nativeLanguage: content.nativeLanguage,
    passage: lesson.passage.target,
    words: lesson.words.map((w) => w.es),
    kinds: lesson.words.map((w) => w.kind),
    verbs: lesson.verbs.map((v) => [v.infinitive, ...Object.values(v.forms), v.example.target]),
    labels: keys.map((key) => verbFormLabel(key, "French")),
    prompt: first.pronoun,
    bareForm: isCorrectForm(first.expected.split(" ").pop(), first.expected, pack),
    oneSubject: isCorrectForm("elles " + first.expected.split(" ").pop(), first.expected, pack),
    wrongForm: isCorrectForm("zzz", first.expected, pack),
    typeIn: typeInPlaceholder(pack, "French"),
    typeForm: typeFormPlaceholder(pack),
    keyboard: specialCharacters(pack),
    voice: listeningLocaleFor(defaultAccentTag(pack), pack),
    voiceForSpanishAccent: listeningLocaleFor("es-CR", pack),
    recognition: recognitionLocales(null, pack),
  }));
`;

test("a French QA lesson page is built only from the French pack and catalog: no Spanish", {
  skip: existsSync(CATALOG) ? false : "content/language-packs/fr is not imported",
}, () => {
  const page = run(PAGE, true);
  assert.equal(page.catalogPack, "fr");
  assert.equal(page.lessons, 30);
  assert.equal(page.nativeLanguage, "English");
  assert.ok(page.passage.length > 0 && page.words.length >= 9 && page.verbs.length > 0);
  assert.ok(page.kinds.includes("term") && page.kinds.includes("phrase"));
  assert.deepEqual(page.labels, ["je", "tu", "il / elle / on", "nous", "vous", "ils / elles"]);
  assert.equal(page.prompt, "ils / elles");
  assert.equal(page.bareForm, true);
  assert.equal(page.oneSubject, true);
  assert.equal(page.wrongForm, false);
  assert.equal(page.typeIn, "Type in French");
  assert.equal(page.typeForm, "Type the form");
  assert.ok(page.keyboard.includes("ç") && page.keyboard.includes("œ") && !page.keyboard.includes("ñ"));
  assert.equal(page.voice, "fr-FR");
  // A Spanish accent left in settings never becomes the French voice.
  assert.equal(page.voiceForSpanishAccent, "fr-FR");
  assert.equal(page.recognition[0], "fr-FR");
  assert.ok(page.recognition.every((locale) => locale.startsWith("fr-")));
  const learnerText = [
    page.title,
    ...page.passage,
    ...page.words,
    ...page.verbs.flat(),
    ...page.labels,
    page.typeIn,
    page.typeForm,
    ...page.keyboard,
  ];
  const leaks = learnerText.filter((text) => SPANISH.test(text));
  assert.deepEqual(leaks, []);
});

test("a normal build has no French catalog lessons (the draft pack is QA only)", () => {
  const page = run(PAGE, false);
  assert.equal(page.catalogPack, null);
  assert.equal(page.name, "French");
});
