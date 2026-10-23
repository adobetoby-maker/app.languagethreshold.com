#!/usr/bin/env node
// A stand-in for `claude -p` used by tests/trade-packs-generator.test.mjs: reads the prompt the
// generator sends on stdin and prints a CLI-shaped JSON reply with made-up boards. No network.
// STUB_MODE=dupes  every first board of a call repeats a target (the validator must reject it)
// STUB_MODE=identical  the first board of a first attempt has a pair whose two faces are the same word
// STUB_MODE=a1         the first level 3 board of a first attempt is padded with A1 everyday words
// STUB_MODE=auth   prints a login error
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
const cefr = { 6: "A2", 8: "B1", 10: "B2" }[message.pairsPerBoard];
const salt = Math.random().toString(36).slice(2, 8);
const boards = [];
for (let b = 0; b < message.boards; b++) {
  const pairs = [];
  for (let p = 0; p < message.pairsPerBoard; p++) {
    pairs.push({ target: `palabra ${salt}${b}${p}`, english: `word ${salt}${b}${p}` });
  }
  if (process.env.STUB_MODE === "dupes" && b === 0 && !input.includes("YOUR PREVIOUS ANSWER")) pairs[1] = { ...pairs[0] };
  const first = b === 0 && !input.includes("YOUR PREVIOUS ANSWER");
  if (process.env.STUB_MODE === "identical" && first) pairs[0] = { target: `fascia ${salt}`, english: `Fascia ${salt}` };
  if (process.env.STUB_MODE === "a1" && first && message.pairsPerBoard === 10) {
    pairs[0] = { target: "hoy", english: "today" };
    pairs[1] = { target: "trabajo", english: "job" };
  }
  boards.push({ topic: `topic ${salt} ${b}`, cefr, pairs });
}
console.log(
  JSON.stringify({
    type: "result",
    subtype: "success",
    is_error: false,
    result: "",
    structured_output: { boards },
    usage: { input_tokens: 100, output_tokens: 50 },
    modelUsage: { "stub-model": {} },
    total_cost_usd: 0,
    num_turns: 1,
    duration_ms: 5,
  }),
);
