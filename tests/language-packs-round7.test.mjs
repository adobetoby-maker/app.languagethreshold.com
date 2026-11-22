// Built by TAC — 2026-11-22
// Round-7 fixes: the Sentence Builder keeps base joining and the base prompt for Spanish and every
// language that is not a released pack; bare /exams and the legacy /?tab=exams link follow a saved
// French or Italian learner's language; the desktop V6 dock no longer covers the end of a page; the
// fr/it catalogs carry no gender tags in target text.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { packFor } from "../src/data/language-packs/registry.ts";
import { followsPackRules } from "../src/data/language-packs/pack-rules.ts";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("only French and Italian follow pack rules; Spanish and non-pack languages keep base", () => {
  for (const language of ["French", "Italian"])
    assert.equal(followsPackRules(packFor(language)), true, language);
  for (const language of ["Spanish", "Japanese", "Chinese", "Korean", "German", "Portuguese", "English", "Pashto"])
    assert.equal(followsPackRules(packFor(language)), false, language);
});

test("Sentence Builder 'You wrote:' uses the base CJK join unless the language follows pack rules", () => {
  const sb = read("src/components/sentence-build/SentenceBuilder.tsx");
  assert.ok(sb.includes('/^[぀-ヿ一-鿿가-힯]+$/.test(q.question.tokens.join(""))'), "base CJK test");
  assert.match(
    sb,
    /followsPackRules\(pack\)\s*\?\s*joinTokens\(q\.placed, pack\)\s*:\s*isCJK\s*\?\s*q\.placed\.join\(""\)\s*:\s*q\.placed\.join\(" "\)/,
  );
});

test("Sentence Builder generation keeps the base prompt and message for non-pack languages", () => {
  const fn = read("src/fns/sentence-build.functions.ts");
  assert.ok(
    fn.includes('For Japanese: split into meaningful chunks (bunsetsu-like), e.g. "私は学生です" → ["私は", "学生", "です"]'),
  );
  assert.ok(fn.includes('For Korean: split on natural spaces, e.g. "저는 학생입니다" → ["저는", "학생입니다"]'));
  assert.match(fn, /system: pack \? systemPrompt\(pack\) : SYSTEM/);
  assert.match(fn, /Generate ONE \$\{pack \? pack\.name : data\.language\} sentence-builder/);
  assert.match(fn, /followsPackRules\(packRules\) \? packRules : null/);
  assert.doesNotMatch(fn, /Sentence builder is not available for this language/);
});

test("a link to /exams without a target resolves the saved French or Italian learner's language", () => {
  const route = read("src/routes/exams.tsx");
  // No default target in the validated search: the page resolves it.
  assert.match(
    route,
    /target: LANGUAGES\.includes\(search\.target as Language\)\s*\?\s*\(search\.target as Language\)\s*:\s*undefined/,
  );
  assert.match(route, /catalogLessonPack\(\s*typeof saved\?\.selectedLanguage === "string"/);
  assert.match(route, /const target = \(pack \? pack\.name : historical\.target\) as Language/);
  assert.match(route, /const resolvingPair = !legacyExams && !search\.session && !search\.target/);
  // The legacy /?tab=exams redirect still drops a missing target, so it reaches the same resolution.
  const nav = read("src/lib/exam-navigation.ts");
  assert.match(nav, /if \(target\) params\.set\("target", target\)/);
});

test("desktop V6 pages reserve room for the fixed dock after the last content", () => {
  const css = read("src/styles.css");
  assert.match(
    css,
    /\.lt-v6-app:not\(:has\(\.lt-lesson-workspace-active, \.lt-native-speak\)\)\s*\.lt-main-column\s*> main\.lt-scroll-safe::after \{\s*content: "";\s*display: block;\s*height: 72px;/,
  );
  assert.match(css, /:has\(\.lt-v6-study-modes\)\s*\.lt-main-column\s*> main\.lt-scroll-safe::after \{\s*height: 132px;/);
});

test("French and Italian catalogs carry no gender tags in target text", () => {
  const ENGLISH_FIELDS = new Set(["note", "native", "explanation", "objective", "speakingPrompt"]);
  for (const code of ["fr", "it"]) {
    const dir = new URL(`../content/language-packs/${code}/`, import.meta.url);
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
      const walk = (value, key) => {
        if (Array.isArray(value)) return value.forEach((v) => walk(v, key));
        if (value && typeof value === "object")
          return Object.entries(value).forEach(([k, v]) => walk(v, k));
        if (typeof value === "string" && /\((?:m|f|adj)\.\)/.test(value))
          assert.ok(ENGLISH_FIELDS.has(key), `${code}/${file}: gender tag in "${key}": ${value.slice(0, 80)}`);
      };
      walk(JSON.parse(readFileSync(new URL(file, dir), "utf8")), null);
    }
  }
});
