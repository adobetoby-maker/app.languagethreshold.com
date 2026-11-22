// Built by TAC — 2026-11-21
// Practice grading reads the language pack: typed answers (accent policy, ligatures, apostrophes,
// articles), verb-game answers (subjects, elision), recall lines, quiz answers and placement.
// Spanish keeps its behaviour (the first test pins it); French and Italian are QA drafts, so they
// are checked in a child process built with LT_QA=1.
import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { packFor } from "../src/data/language-packs/registry.ts";
import { isCorrectAnswer, typedAnswerHint } from "../src/lib/lesson-practice.ts";
import { gameAnswer, gameSubjects } from "../src/lib/lesson-verb-games.ts";
import { joinSubjectAndForm } from "../src/lib/lesson-recall.ts";
import { isCorrectGrammarAnswer } from "../src/lib/grammar-quiz.ts";
import { placementCloze, placementCorrect } from "../src/lib/module-placement.ts";
import { flashcardUsageExample } from "../src/lib/flashcard-usage.ts";

const es = packFor("es");

test("Spanish typed answers stay accent-blind until the owner decides section 18 delta 2", () => {
  assert.ok(isCorrectAnswer("canalon", "canalón", es));
  assert.ok(isCorrectAnswer("ano", "año", es));
  assert.equal(typedAnswerHint("techo", "tejado", es), null);
});

test("Spanish verb games keep strict marks and the feminine plural subject", () => {
  assert.equal(gameAnswer("hablé", "hable", [], es), false);
  const nosotros = gameSubjects("nosotros · hablar", es);
  assert.ok(nosotros.includes("nosotras"));
  assert.equal(gameAnswer("hablamos", "nosotras hablamos", nosotros, es), true);
  assert.deepEqual(gameSubjects("Present tense", es), []);
  assert.equal(joinSubjectAndForm("yo", "hablo", es), "yo hablo");
});

test("grammar quiz answers fold curly apostrophes and trailing punctuation but keep marks", () => {
  assert.ok(isCorrectGrammarAnswer("  Está. ", "está", es));
  assert.ok(!isCorrectGrammarAnswer("esta", "está", es));
});

test("placement cloze strips the pack's articles, and accents follow the pack", () => {
  const checks = placementCloze(
    [{ es: "el techo", en: "roof", kind: "term" }],
    [{ target: "Limpio el techo hoy.", native: "I clean the roof today." }],
    es,
  );
  assert.equal(checks[0].answer, "el techo");
  assert.equal(placementCorrect({ type: "typed", prompt: "x", answer: "sí", accents: "required" }, "si"), false);
  assert.equal(placementCorrect({ type: "typed", prompt: "x", answer: "sí", accents: "ignore" }, "si"), true);
});

test("usage lookup tolerates plurals only in cased scripts and fails closed without a pack", () => {
  const sentences = [{ target: "Los techos son altos.", native: "The roofs are high." }];
  const card = (language) => ({ word: "techo", language, example: "", exampleTranslation: "" });
  assert.equal(flashcardUsageExample(card("Spanish"), sentences)?.native, "The roofs are high.");
  assert.equal(flashcardUsageExample(card("Klingon"), sentences), null);
});

test("French and Italian QA packs grade typed, verb-game and recall answers from the pack", () => {
  const script = `
    import { packFor } from "./src/data/language-packs/registry.ts";
    import { isCorrectAnswer, typedAnswerHint } from "./src/lib/lesson-practice.ts";
    import { gameAnswer, gameSubjects } from "./src/lib/lesson-verb-games.ts";
    import { joinSubjectAndForm } from "./src/lib/lesson-recall.ts";
    const fr = packFor("fr"), it = packFor("it");
    const subj = gameSubjects("je · aimer", fr);
    console.log(JSON.stringify({
      ouAccent: isCorrectAnswer("ou", "où", fr),
      protectedPair: typedAnswerHint("ou", "où", fr)?.kind,
      accentHint: typedAnswerHint("cafe", "café", fr)?.kind,
      ligature: isCorrectAnswer("oeuf", "œuf", fr),
      elision: [isCorrectAnswer("leau", "l'eau", fr), isCorrectAnswer("l’eau", "l'eau", fr)],
      bareNoun: [isCorrectAnswer("eau", "l'eau", fr), typedAnswerHint("eau", "l'eau", fr)?.kind],
      itProtected: typedAnswerHint("e", "è", it)?.kind,
      subjects: subj,
      elidedPrefix: gameAnswer("aime", "j'aime", subj, fr),
      bareForm: gameAnswer("j'aime", "aime", subj, fr),
      ilsElles: gameAnswer("parlent", "elles parlent", gameSubjects("ils / elles · parler", fr), fr),
      join: joinSubjectAndForm("je", "aime", fr),
    }));
  `;
  const out = JSON.parse(
    execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      env: { ...process.env, LT_QA: "1" },
      encoding: "utf8",
      cwd: new URL("..", import.meta.url).pathname,
    }),
  );
  assert.equal(out.ouAccent, false);
  assert.equal(out.protectedPair, "different-word");
  assert.equal(out.accentHint, "accent");
  assert.equal(out.ligature, true);
  assert.deepEqual(out.elision, [true, true]);
  assert.deepEqual(out.bareNoun, [false, "article"]);
  assert.equal(out.itProtected, "different-word");
  assert.deepEqual(out.subjects, ["je", "j'"]);
  assert.equal(out.elidedPrefix, true);
  assert.equal(out.bareForm, true);
  assert.equal(out.ilsElles, true);
  assert.equal(out.join, "aime");
});
