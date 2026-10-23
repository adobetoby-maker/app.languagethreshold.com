#!/usr/bin/env node
// A stand-in for `claude -p` used by tests/trade-packs-generator.test.mjs: reads the prompt the
// generator sends on stdin and prints a CLI-shaped JSON reply with made-up content. No network.
// The message's "area" says what is asked: none = Word Match boards, "sentence" = Sentence
// Builder questions, "conjugation" = conjugation questions, "conjugation-review" = the review gate.
// STUB_MODE=dupes      every first board of a call repeats a target (the validator must reject it)
// STUB_MODE=identical  the first board of a first attempt has a pair whose two faces are the same word
// STUB_MODE=a1         the first level 3 board of a first attempt is padded with A1 everyday words
// STUB_MODE=vosotros   the first sentence / question of a first attempt uses a vosotros form
// STUB_MODE=review-reject  the review gate finds two acceptable answers for the first question of every call
// STUB_MODE=auth       prints a login error
import { appendFileSync } from "node:fs";

let input = "";
for await (const chunk of process.stdin) input += chunk;
if (process.env.STUB_LOG) appendFileSync(process.env.STUB_LOG, "call\n");

if (process.env.STUB_MODE === "auth") {
  console.log(JSON.stringify({ type: "result", subtype: "success", is_error: true, api_error_status: 401, result: "Please run /login" }));
  process.exit(1);
}

const start = input.indexOf("{");
const message = JSON.parse(input.slice(start, input.indexOf("\n\nYOUR PREVIOUS ANSWER") > 0 ? input.indexOf("\n\nYOUR PREVIOUS ANSWER") : undefined));
const firstAttempt = !input.includes("YOUR PREVIOUS ANSWER");
// Letters only, so a made-up word can never look like a figure with a unit ("4cm").
const salt = Array.from({ length: 6 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");
const letter = (n) => String.fromCharCode(97 + (n % 26)) + String.fromCharCode(97 + Math.floor(n / 26));

function reply(structured) {
  console.log(
    JSON.stringify({
      type: "result",
      subtype: "success",
      is_error: false,
      result: "",
      structured_output: structured,
      usage: { input_tokens: 100, output_tokens: 50 },
      modelUsage: { "stub-model": {} },
      total_cost_usd: 0,
      num_turns: 1,
      duration_ms: 5,
    }),
  );
}

if (message.area === "sentence") {
  const filler = ["va", "aquí", "hoy", "bien", "ahora", "también", "luego", "después", "otra", "vez", "sin", "duda"];
  const items = [];
  for (let i = 0; i < message.count; i++) {
    const tokens = [`Frase${salt}${letter(i)}`, ...filler.slice(0, message.tokensMin - 1)];
    if (process.env.STUB_MODE === "vosotros" && firstAttempt && i === 0) tokens[1] = "revisáis";
    tokens[tokens.length - 1] += ".";
    items.push({
      targetSentence: tokens.join(" "),
      englishTranslation: `Sentence ${salt}${letter(i)} goes here.`,
      tokens,
      topic: `topic ${salt}`,
      cefr: message.cefr,
      explanation: "Synthetic explanation.",
    });
  }
  reply({ items });
} else if (message.area === "conjugation") {
  const atLimit = new Set(message.verbsAtLimit ?? []);
  const verbs = message.moduleVerbs.map((line) => line.split(" = ")[0]).filter((verb) => !atLimit.has(verb));
  const items = [];
  for (let i = 0; i < message.count; i++) {
    const id = `${salt}${letter(i)}`;
    const verb = verbs[Math.floor(Math.random() * verbs.length)];
    items.push({
      phrase: `Hoy ___ ${id} aquí.`,
      phraseTranslation: `Today we [verb] ${id} here.`,
      infinitive: verb,
      infinitiveTranslation: "to do",
      correctConjugation: process.env.STUB_MODE === "vosotros" && firstAttempt && i === 0 ? "revisáis" : `f${id}c`,
      wrongOptions: [`f${id}x`, `f${id}y`, `f${id}z`],
      explanation: "Synthetic explanation.",
      axisTested: message.axisTested,
      cefr: message.cefr,
    });
  }
  reply({ items });
} else if (message.area === "conjugation-review") {
  const reviews = message.questions.map((question, i) => {
    const correct = question.options.filter((option) => option.endsWith("c"));
    const tricky = process.env.STUB_MODE === "review-reject" && i === 0;
    return {
      id: question.id,
      acceptableAnswers: tricky ? [...correct, question.options.find((option) => !option.endsWith("c"))] : correct,
      unambiguous: true,
      explanationAccurate: true,
      axisAccurate: true,
      levelAppropriate: true,
    };
  });
  reply({ reviews });
} else {
  const cefr = { 6: "A2", 8: "B1", 10: "B2" }[message.pairsPerBoard];
  const boards = [];
  for (let b = 0; b < message.boards; b++) {
    const pairs = [];
    for (let p = 0; p < message.pairsPerBoard; p++) {
      pairs.push({ target: `palabra ${salt}${b}${p}`, english: `word ${salt}${b}${p}` });
    }
    if (process.env.STUB_MODE === "dupes" && b === 0 && firstAttempt) pairs[1] = { ...pairs[0] };
    const first = b === 0 && firstAttempt;
    if (process.env.STUB_MODE === "identical" && first) pairs[0] = { target: `fascia ${salt}`, english: `Fascia ${salt}` };
    if (process.env.STUB_MODE === "a1" && first && message.pairsPerBoard === 10) {
      pairs[0] = { target: "hoy", english: "today" };
      pairs[1] = { target: "trabajo", english: "job" };
    }
    boards.push({ topic: `topic ${salt} ${b}`, cefr, pairs });
  }
  reply({ boards });
}
