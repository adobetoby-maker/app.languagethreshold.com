// Built by TAC — 2026-10-22
// Verb pattern practice series: item generators and pass rules (pure, no runtime AI).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { FAMILIES } from "../src/lib/verb-games/families.ts";
import { createRng } from "../src/lib/verb-games/rng.ts";
import {
  AGAIN_GAP,
  MATCH_SIZE,
  SERIES_STEPS,
  SESSION_SIZE,
  checkTyped,
  choicePassed,
  isValidAnswer,
  listenChoices,
  matchBoard,
  matchPassed,
  missText,
  pickChoices,
  rateCard,
  seriesItems,
  seriesSlots,
  soundKey,
  startCards,
  cardsPassed,
} from "../src/lib/verb-games/series.ts";
import { miniData } from "./helpers/verb-fixture.mjs";

const real = JSON.parse(readFileSync(new URL("../src/data/verb-patterns/es.json", import.meta.url), "utf8"));
const core = { kind: "core" };
const norm = (s) => s.normalize("NFC").toLowerCase();

test("the series has five steps in order, ending with Type it", () => {
  assert.deepEqual([...SERIES_STEPS], ["pick", "match", "cards", "listen", "type"]);
  assert.equal(SESSION_SIZE, 10);
  assert.equal(MATCH_SIZE, 5);
});

test("session items: 10 from the family's source pool, seeded and repeatable", () => {
  for (const data of [miniData(), real]) {
    for (const f of FAMILIES) {
      const slots = seriesSlots(data, f.id, core);
      if (slots.length === 0) continue;
      const a = seriesItems(data, f.id, core, 7);
      assert.equal(a.length, 10, f.id);
      assert.deepEqual(seriesItems(data, f.id, core, 7), a, `${f.id} same seed`);
      for (const item of a) {
        assert.equal(item.familyId, f.id);
        assert.ok(slots.some((s) => s.infinitive === item.infinitive && s.person === item.person), `${item.key} in pool`);
        assert.ok(f.appliesTo.includes(item.person));
        const form = data.verbs.find((v) => v.infinitive === item.infinitive).forms.find((x) => x.person === item.person);
        assert.equal(item.answer, form.full);
        assert.equal(item.english, form.english);
      }
    }
  }
});

test("session items spread the persons evenly", () => {
  const items = seriesItems(real, "es.present.ar", core, 3);
  const counts = {};
  for (const i of items) counts[i.person] = (counts[i.person] ?? 0) + 1;
  assert.deepEqual(Object.values(counts), [2, 2, 2, 2, 2]);
  const ie = seriesItems(real, "es.present.e-ie", core, 3);
  const c2 = {};
  for (const i of ie) c2[i.person] = (c2[i.person] ?? 0) + 1;
  assert.equal(Object.keys(c2).length, 4);
  assert.ok(Math.max(...Object.values(c2)) - Math.min(...Object.values(c2)) <= 1);
  assert.ok(!("nosotros" in c2), "stem changes skip nosotros");
});

test("session items never repeat back to back when the pool has more than one slot", () => {
  for (const f of FAMILIES) {
    for (const seed of [1, 2, 3, 99]) {
      const items = seriesItems(real, f.id, core, seed);
      for (let i = 1; i < items.length; i++) assert.notEqual(items[i].key, items[i - 1].key, `${f.id} seed ${seed} at ${i}`);
    }
  }
});

test("session items are empty when the family has nothing in the source", () => {
  assert.deepEqual(seriesItems(miniData(), "es.present.ar", { kind: "module", moduleId: "nope" }, 1), []);
});

test("Pick: four choices, exactly one valid, distractors never a valid answer", () => {
  for (const data of [miniData(), real]) {
    for (const f of FAMILIES) {
      for (const seed of [1, 5]) {
        for (const item of seriesItems(data, f.id, core, seed)) {
          const choices = pickChoices(data, item, core, createRng(seed));
          assert.equal(choices.length, 4, item.key);
          assert.equal(new Set(choices.map(norm)).size, 4, `${item.key} unique`);
          assert.equal(choices.filter((c) => norm(c) === norm(item.answer)).length, 1, `${item.key} has the answer once`);
          for (const c of choices) {
            if (norm(c) === norm(item.answer)) continue;
            assert.equal(isValidAnswer(data, item, c), false, `${item.key}: ${c} is a valid answer`);
          }
        }
      }
    }
  }
});

test("Listen: four choices, distractors never valid and never sound like the answer", () => {
  assert.equal(soundKey("conoces"), soundKey("conoses"));
  assert.equal(soundKey("vive"), soundKey("bibe"));
  assert.equal(soundKey("está"), soundKey("esta"));
  assert.equal(soundKey("hago"), soundKey("ago"));
  assert.notEqual(soundKey("tengo"), soundKey("tenso"));
  for (const data of [miniData(), real]) {
    for (const f of FAMILIES) {
      for (const item of seriesItems(data, f.id, core, 11)) {
        const choices = listenChoices(data, item, core, createRng(11));
        assert.equal(choices.length, 4, item.key);
        assert.equal(choices.filter((c) => norm(c) === norm(item.answer)).length, 1);
        assert.equal(new Set(choices.map(soundKey)).size, 4, `${item.key}: two choices sound the same (${choices.join(", ")})`);
        for (const c of choices) if (norm(c) !== norm(item.answer)) assert.equal(isValidAnswer(data, item, c), false);
      }
    }
  }
});

test("Match: pairs are unique on both sides and each prompt has one form", () => {
  for (const data of [miniData(), real]) {
    for (const f of FAMILIES) {
      if (seriesSlots(data, f.id, core).length === 0) continue;
      for (const seed of [1, 2, 3, 4, 5]) {
        const board = matchBoard(data, f.id, core, seed);
        assert.ok(board.pairs.length >= 2 && board.pairs.length <= 5, `${f.id} size`);
        if (seriesSlots(data, f.id, core).length >= 5 && data === real) assert.equal(board.pairs.length, 5, `${f.id} full board`);
        assert.equal(new Set(board.pairs.map((p) => norm(p.form))).size, board.pairs.length, `${f.id} forms unique`);
        assert.equal(new Set(board.pairs.map((p) => p.prompt)).size, board.pairs.length, `${f.id} prompts unique`);
        assert.equal(new Set(board.pairs.map((p) => p.id)).size, board.pairs.length);
        assert.deepEqual([...board.formOrder].sort(), board.pairs.map((p) => p.id).sort());
        assert.deepEqual([...board.promptOrder].sort(), board.pairs.map((p) => p.id).sort());
        for (const p of board.pairs) {
          assert.match(p.prompt, / · /);
          // No other form on the board answers this prompt.
          for (const q of board.pairs) if (q.id !== p.id) assert.notEqual(norm(q.form), norm(p.item.answer));
        }
        assert.deepEqual(matchBoard(data, f.id, core, seed), board, "seeded");
      }
    }
  }
});

test("Match pass rule: all pairs, at most two mistakes", () => {
  assert.equal(matchPassed(5, 5, 0), true);
  assert.equal(matchPassed(5, 5, 2), true);
  assert.equal(matchPassed(5, 5, 3), false);
  assert.equal(matchPassed(4, 5, 0), false);
});

test("Pick / Listen / Type pass rule: 8 of 10", () => {
  assert.equal(choicePassed(8, 10), true);
  assert.equal(choicePassed(10, 10), true);
  assert.equal(choicePassed(7, 10), false);
  assert.equal(choicePassed(0, 0), false);
});

test("Type accepts only exact matches; an accent slip is 'almost' and never exact", () => {
  assert.equal(checkTyped("vengo", "vengo"), "exact");
  assert.equal(checkTyped("  vengo ", "vengo"), "exact");
  assert.equal(checkTyped("Vengo", "vengo"), "exact");
  assert.equal(checkTyped("vengo".normalize("NFD"), "vengo"), "exact");
  assert.equal(checkTyped("pidó", "pido"), "almost");
  assert.equal(checkTyped("esta", "está"), "almost");
  assert.equal(checkTyped("oigo", "oígo"), "almost");
  assert.equal(checkTyped("tienén", "tienen"), "almost");
  assert.equal(checkTyped("tiene", "tienen"), "wrong");
  assert.equal(checkTyped("pienzo", "pienso"), "wrong");
  assert.equal(checkTyped("vengo.", "vengo"), "wrong");
  assert.equal(checkTyped("", "vengo"), "wrong");
});

test("Cards: Again repeats the card later in the session; each card needs Good or Easy once", () => {
  const items = seriesItems(real, "es.present.go-yo", core, 2);
  let s = startCards(items);
  const unique = new Set(items.map((i) => i.key)).size;
  assert.equal(s.queue.length, unique);
  assert.equal(cardsPassed(s), false);
  const first = s.queue[0];
  s = rateCard(s, "again");
  assert.notEqual(s.queue[0], first);
  assert.equal(s.queue.indexOf(first), Math.min(AGAIN_GAP, s.queue.length - 1));
  assert.equal(s.queue.length, unique, "Again keeps the card due");
  while (s.queue.length > 0) s = rateCard(s, s.queue.length % 2 ? "good" : "easy");
  assert.equal(cardsPassed(s), true);
  assert.equal(s.done.length, unique);
  assert.equal(new Set(s.done).size, unique);
  // A single card rated Again stays at the front until it is rated Good.
  let one = startCards(items.slice(0, 1));
  one = rateCard(one, "again");
  assert.equal(one.queue.length, 1);
  assert.equal(cardsPassed(rateCard(one, "good")), true);
});

test("a miss shows the family's rule line and the right form with English", () => {
  const item = seriesItems(real, "es.present.go-yo", core, 1)[0];
  const text = missText(item);
  assert.equal(text.rule, "The yo form ends in -go. Everything else stays regular.");
  assert.equal(text.right, `${item.answer} · ${item.english}`);
});
