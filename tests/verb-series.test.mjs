// Built by TAC — 2026-10-22
// Verb pattern practice series: item generators and pass rules (pure, no runtime AI).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { FAMILIES } from "../src/lib/verb-games/families.ts";
import { keepsSpelling, learnerMistakes } from "../src/lib/verb-games/distractors.ts";
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
  personPrompt,
  pickChoices,
  readChoices,
  rateCard,
  seriesItems,
  seriesSlots,
  soundKey,
  soundsApart,
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

// ---- Distractor quality (review fix round 1) ------------------------------------------------

/** A qu / gu cluster with a vowel pair pushed into it ("qeudan", "sigeu", "queires"), or a lone q. */
const BROKEN_CLUSTER = /q(?!u)|[qg]e[iu]|[qg]u(?:ei|eu)/;

test("series distractors are real learner mistakes: wrong-person stem change, missing stem change, regular yo", () => {
  const has = (inf, person, form) => assert.ok(learnerMistakes(real, inf, person).includes(form), `${inf} ${person}: ${form} in ${learnerMistakes(real, inf, person).join(", ")}`);
  // The stem change applied to a person that keeps the plain stem.
  has("tener", "nosotros", "tienemos");
  has("poder", "nosotros", "puedemos");
  has("pensar", "nosotros", "piensamos");
  // The stem change left out.
  has("tener", "tú", "tenes");
  has("poder", "tú", "podes");
  has("pensar", "yo", "penso");
  // Over-regularized yo.
  has("poner", "yo", "pono");
  has("tener", "yo", "teno");
  has("salir", "yo", "salo");
  // -guir keeps its spelling: "sego", never "seguo" or "sigeu".
  has("seguir", "yo", "sego");
  // A regular form has no stem-change mistakes.
  assert.deepEqual(learnerMistakes(real, "quedar", "ellos_ustedes"), []);
  for (const v of real.verbs) {
    for (const f of v.forms) {
      for (const m of learnerMistakes(real, v.infinitive, f.person)) {
        assert.notEqual(norm(m), norm(f.full), `${v.infinitive} ${f.person}: the form itself`);
        assert.ok(keepsSpelling(m), `${v.infinitive} ${f.person}: ${m} breaks qu/gu/gü`);
      }
    }
  }
});

test("keepsSpelling rejects the old misplaced-stem non-words", () => {
  for (const bad of ["qeudan", "sigeu", "queires", "qeiro", "argüo"]) assert.equal(keepsSpelling(bad), false, bad);
  for (const good of ["quedan", "sigue", "quieres", "siguen", "seguimos", "averigüe", "tienemos"]) assert.equal(keepsSpelling(good), true, good);
});

test("Listen: one-letter swaps and a final n/m are too close to hear", () => {
  for (const [a, b] of [["pongo", "pomgo"], ["tengo", "tendo"], ["alcanzan", "alcanzam"], ["tiene", "tienen"], ["habla", "hablan"], ["hablo", "hablan"], ["pongo", "pono"]]) {
    assert.equal(soundsApart(a, b), false, `${a} / ${b}`);
  }
  for (const [a, b] of [["tengo", "tienes"], ["hablamos", "hablo"], ["puedo", "podemos"], ["tengo", "tenemos"]]) assert.equal(soundsApart(a, b), true, `${a} / ${b}`);
});

test("300 seeds x 7 families: no Pick or Listen distractor is a valid answer or breaks qu/gu, Listen never too close", () => {
  for (const f of FAMILIES) {
    for (let seed = 0; seed < 300; seed++) {
      const rng = createRng(seed);
      for (const item of seriesItems(real, f.id, core, seed)) {
        const pick = pickChoices(real, item, core, rng);
        const listen = listenChoices(real, item, core, rng);
        for (const [kind, choices] of [["pick", pick], ["listen", listen]]) {
          assert.equal(choices.length, 4, `${kind} ${f.id} seed ${seed} ${item.key}`);
          assert.equal(new Set(choices.map(norm)).size, 4, `${kind} ${item.key} unique`);
          assert.equal(choices.filter((c) => norm(c) === norm(item.answer)).length, 1, `${kind} ${item.key} answer once`);
          for (const c of choices) {
            if (norm(c) === norm(item.answer)) continue;
            assert.equal(isValidAnswer(real, item, c), false, `${kind} ${f.id} seed ${seed} ${item.key}: ${c} is valid`);
            assert.doesNotMatch(norm(c), BROKEN_CLUSTER, `${kind} ${f.id} seed ${seed} ${item.key}: ${c} breaks qu/gu`);
            if (kind === "listen") assert.ok(soundsApart(item.answer, c), `listen ${item.key}: ${c} sounds like ${item.answer}`);
          }
        }
      }
    }
  }
});

test("Listen read-instead: the form's person and English plus three other persons of the verb", () => {
  for (const f of FAMILIES) {
    for (const item of seriesItems(real, f.id, core, 4)) {
      const choices = readChoices(real, item, createRng(4));
      assert.equal(choices.length, 4, item.key);
      assert.equal(new Set(choices).size, 4, `${item.key} unique`);
      assert.equal(choices.filter((c) => c === personPrompt(item)).length, 1, `${item.key} answer once`);
      assert.equal(personPrompt(item), `${item.personLabel} · ${item.english}`);
    }
  }
  assert.deepEqual(readChoices(real, seriesItems(real, "es.present.ar", core, 4)[0], createRng(9)), readChoices(real, seriesItems(real, "es.present.ar", core, 4)[0], createRng(9)), "seeded");
});
