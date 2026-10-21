import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { forFrame, isAnyPresentForm, norm } from "../src/lib/verb-games/distractors.ts";
import { buildFrame } from "../src/lib/verb-games/frames.ts";
import { poolVerbs } from "../src/lib/verb-games/pool.ts";
import { createRng } from "../src/lib/verb-games/rng.ts";
import { miniData } from "./helpers/verb-fixture.mjs";

test("homograph from another verb is never a distractor", () => {      // Review Focus 2
  const data = miniData(); const pool = poolVerbs(data, { kind: "core" });
  const frame = buildFrame(data, { infinitive: "sentar", person: "yo", familyId: "es.present.e-ie" }, 0, false);
  for (let seed = 0; seed < 200; seed++) assert.ok(!forFrame(frame, data, pool, 5, createRng(seed)).includes("siento"));
});
test("irregular targets always include the regularized form", () => {
  const data = miniData(); const pool = poolVerbs(data, { kind: "core" });
  const frame = buildFrame(data, { infinitive: "salir", person: "yo", familyId: "es.present.go-yo" }, 0, false);
  assert.ok(forFrame(frame, data, pool, 5, createRng(9)).includes("salo"));
});
test("misplaced stem change and same-seed determinism", () => {
  const data = miniData(); const pool = poolVerbs(data, { kind: "core" });
  const frame = buildFrame(data, { infinitive: "pensar", person: "yo", familyId: "es.present.e-ie" }, 0, false);
  const a = forFrame(frame, data, pool, 5, createRng(4));
  assert.deepEqual(a, forFrame(frame, data, pool, 5, createRng(4)));
  assert.equal(a[0], "penso");
  assert.ok(a.includes("peinso"));
  assert.ok(!a.includes("pienso"));
});
test("isAnyPresentForm compares NFC lower-case", () => {
  const data = miniData();
  assert.ok(isAnyPresentForm(data, "SIENTO"));
  assert.ok(isAnyPresentForm(data, "tú".normalize("NFD")) === false);
  assert.ok(!isAnyPresentForm(data, "salo"));
  assert.equal(norm("É"), "é");
});
test("over every frame in the dataset: five distinct candidates, none valid for the target", () => {
  const data = JSON.parse(readFileSync("src/data/verb-patterns/es.json", "utf8"));
  const pool = poolVerbs(data, { kind: "core" });
  const short = [];
  let frames = 0;
  for (const v of data.verbs) for (const f of v.forms) for (const familyId of f.families) {
    frames++;
    const frame = buildFrame(data, { infinitive: v.infinitive, person: f.person, familyId }, 0, false);
    const out = forFrame(frame, data, pool, 5, createRng(1));
    const normed = out.map(norm);
    // Invalid output is always a hard failure, even for a short frame.
    assert.equal(new Set(normed).size, normed.length, `duplicate ${v.infinitive} ${f.person}`);
    assert.ok(normed.every((c) => c !== norm(f.full) && c !== norm(frame.answer)), `valid form returned ${v.infinitive} ${f.person}`);
    if (out.length !== 5) short.push(`${v.infinitive} ${f.person} ${familyId} (${out.length})`);
  }
  assert.ok(frames > 0);
  assert.deepEqual(short, [], `frames short of 5 distractors, exclude these: ${short.join("; ")}`);
});
