// Built by TAC — 2026-11-21
// The language-pack foundation: registry, QA gating of draft packs, stage ids with language codes,
// catalog fail-closed checks and the pack-driven text helpers.
import assert from "node:assert/strict";
import test from "node:test";
import { isQaBuild } from "../src/lib/qa-build.ts";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  LANGUAGE_CODES,
  PACKS,
  getPack,
  isBundledPack,
  listedPacks,
  packFor,
  packIndexEntry,
  remoteFallbackPack,
  sameLanguage,
} from "../src/data/language-packs/registry.ts";
import {
  catalogHasModule,
  catalogModuleUrl,
  parseCatalogModuleFile,
} from "../src/data/language-packs/catalog.ts";
import {
  defaultAccentTag,
  listeningLocaleFor,
  normalizeKey,
  recognitionLocales,
  specialCharacters,
  specialLetters,
  tokenizeWords,
} from "../src/lib/language-pack-text.ts";
import { manifestStageModuleId } from "../src/lib/core60-stage-core.ts";
import { moduleBaseId } from "../src/lib/module-order.ts";
import { languageTag } from "../src/lib/lesson-words-core.ts";

const es = getPack("es");
const ja = getPack("ja");

test("every PWA target resolves to one pack, by code and by its stored legacy name", () => {
  for (const name of ["Spanish", "French", "German", "Italian", "Japanese", "Chinese", "Korean", "Portuguese", "Pashto", "English"]) {
    const pack = packFor(name);
    assert.ok(pack, name);
    assert.equal(packFor(pack.code), pack);
    assert.equal(languageTag(name), pack.code);
  }
  assert.equal(packFor("Klingon"), null);
  assert.equal(packFor(""), null);
  assert.equal(packFor("Dutch"), null, "a native-only language has no target pack");
  assert.throws(() => getPack("xx"));
  assert.deepEqual([...new Set(LANGUAGE_CODES)], LANGUAGE_CODES);
  assert.ok(sameLanguage("Spanish", "es"));
  assert.ok(!sameLanguage("Spanish", "Italian"));
  assert.ok(!sameLanguage("Klingon", "Klingon"), "two unknown names are not the same language");
});

test("a normal build registers no draft pack: French and Italian keep their legacy adapters", { skip: isQaBuild() && "QA build registers draft packs" }, () => {
  for (const code of ["fr", "it"]) {
    const pack = getPack(code);
    assert.equal(isBundledPack(pack), false);
    assert.notEqual(pack.status.availability, "draft");
    assert.equal(packIndexEntry(pack), null);
    assert.equal(catalogHasModule(pack, "orthopedics"), false);
  }
  assert.ok(PACKS.every((pack) => pack.status.availability !== "draft"));
  assert.ok(listedPacks(false).every((pack) => pack.status.availability !== "draft"));
  assert.equal(isBundledPack(es), true);
  assert.equal(isBundledPack(ja), true);
});

test("a QA build (VITE_LT_QA=1) registers the bundled draft packs with their catalogs", () => {
  const script = `
    const r = await import(${JSON.stringify(new URL("../src/data/language-packs/registry.ts", import.meta.url).href)});
    const c = await import(${JSON.stringify(new URL("../src/data/language-packs/catalog.ts", import.meta.url).href)});
    const fr = r.getPack("fr"), it = r.getPack("it");
    console.log(JSON.stringify({
      fr: [fr.status.availability, r.isBundledPack(fr), c.catalogHasModule(fr, "orthopedics")],
      it: [it.status.availability, r.isBundledPack(it)],
      listed: r.listedPacks().map((p) => p.code).sort(),
    }));`;
  const out = JSON.parse(
    execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      env: { ...process.env, LT_QA: "1" },
      encoding: "utf8",
    }),
  );
  assert.deepEqual(out.fr, ["draft", true, true]);
  assert.deepEqual(out.it, ["draft", true]);
  assert.ok(out.listed.includes("fr") && out.listed.includes("it"));
});

test("bundled packs match the pipeline copy and declare the code they are filed under", () => {
  const index = JSON.parse(readFileSync(new URL("../src/data/language-packs/packs.json", import.meta.url), "utf8"));
  for (const entry of index) {
    const raw = JSON.parse(readFileSync(new URL(`../src/data/language-packs/${entry.code}.json`, import.meta.url), "utf8"));
    assert.equal(raw.code, entry.code);
    assert.equal(raw.schemaVersion, 1);
    assert.equal(raw.status.availability, entry.availability);
    assert.equal(raw.speech.accents.filter((a) => a.default).length, 1, `${entry.code}: one default accent`);
  }
});

test("stage ids carry the language code, except for packs whose ids predate packs", () => {
  const entry = (language) => ({ base: "orthopedics", language, foundation: {}, master: {} });
  assert.equal(manifestStageModuleId(entry("Spanish"), "foundation"), "foundation-orthopedics");
  assert.equal(manifestStageModuleId(entry("English"), "master"), "master-orthopedics");
  assert.equal(manifestStageModuleId(entry("French"), "foundation"), "foundation-orthopedics-fr");
  assert.equal(manifestStageModuleId(entry("Italian"), "master"), "master-orthopedics-it");
  assert.equal(
    manifestStageModuleId({ ...entry("French"), foundation: { moduleId: "foundation-x" } }, "foundation"),
    "foundation-x",
  );
  assert.equal(moduleBaseId("foundation-orthopedics-fr"), "orthopedics");
  assert.equal(moduleBaseId("master-orthopedics"), "orthopedics");
  assert.equal(moduleBaseId("foundation-spanish-basics"), "spanish-basics");
  assert.equal(moduleBaseId("orthopedics"), "orthopedics");
});

test("catalog module files are refused unless they match the asking pack exactly", () => {
  const listed = packIndexEntry(es).modules[0];
  const lessons = Array.from({ length: listed.lessonCount }, (_, i) => ({ id: `x:${i}`, number: i + 1, title: "t", objective: "o", items: [] }));
  const good = {
    version: 2,
    languageCode: "es",
    nativeCode: "en",
    packVersion: packIndexEntry(es).packVersion,
    module: { id: listed.id, title: "T", kind: "general", lessonCount: listed.lessonCount, lessons },
  };
  assert.ok(parseCatalogModuleFile(good, es, listed.id));
  assert.equal(parseCatalogModuleFile({ ...good, languageCode: "fr" }, es, listed.id), null);
  assert.equal(parseCatalogModuleFile({ ...good, packVersion: "es@old" }, es, listed.id), null);
  assert.equal(parseCatalogModuleFile({ ...good, nativeCode: "de" }, es, listed.id), null);
  assert.equal(parseCatalogModuleFile(good, es, "not-listed"), null);
  assert.equal(parseCatalogModuleFile({ ...good, module: { ...good.module, lessons: lessons.slice(1) } }, es, listed.id), null);
  assert.equal(parseCatalogModuleFile(good, getPack("de"), listed.id), null, "a legacy adapter has no catalog");
  assert.equal(catalogModuleUrl(es, "roofing"), "/lesson-content/es/catalog/roofing.json");
});

test("text, keyboard and voice helpers read only the pack", () => {
  assert.equal(normalizeKey("  ¿Qué  tal?  ", es), "qué tal");
  assert.equal(normalizeKey("l’eau ", es), "l'eau");
  assert.equal(normalizeKey("こんにちは 。", ja), "こんにちは");
  assert.deepEqual(tokenizeWords("¿Dónde está el tejado?", es), ["dónde", "está", "el", "tejado"]);
  assert.deepEqual(specialCharacters(es), es.keyboard.specialCharacters);
  assert.deepEqual(specialLetters(es), ["á", "é", "í", "ó", "ú", "ü", "ñ"]);
  assert.deepEqual(specialCharacters(ja), [], "IME scripts show no accent row");
  assert.equal(defaultAccentTag(es), "es-CR");
  assert.equal(listeningLocaleFor("es-MX", es), "es-MX");
  assert.equal(listeningLocaleFor("es-MX", ja), "ja-JP", "never another language's accent");
  assert.equal(recognitionLocales("fr-FR", es)[0], "es-MX");
  assert.equal(remoteFallbackPack("ps")?.speech.remoteFallback?.languageCode, "ps");
  assert.equal(remoteFallbackPack("es"), null);
});

test("no language literal in the foundation's logic files", () => {
  const files = [
    "../src/data/language-packs/registry.ts",
    "../src/data/language-packs/catalog.ts",
    "../src/lib/language-pack-text.ts",
    "../src/lib/speech-word-similarity.ts",
    "../src/hooks/use-listening-speaker.ts",
  ];
  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8").replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "");
    assert.doesNotMatch(source, /"(Spanish|French|Italian|Japanese|German|Portuguese|Chinese|Korean|Pashto|English)"|"(es|fr|it|ja|de|pt|zh|ko|ps)(-[A-Z0-9]+)?"/, file);
  }
});
