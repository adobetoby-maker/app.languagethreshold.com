import assert from "node:assert/strict";
import test from "node:test";
import { buildFrame, nextSlot } from "../src/lib/verb-games/frames.ts";
import { frameSlots, poolVerbs } from "../src/lib/verb-games/pool.ts";
import { createRng, pickIndex, shuffle } from "../src/lib/verb-games/rng.ts";
import { miniData } from "./helpers/verb-fixture.mjs";

test("rng is reproducible", () => {
  const r = createRng(1);
  assert.deepEqual([r(), r(), r()], [0.6270739405881613, 0.002735721180215478, 0.5274470399599522]);
});

test("slots respect family, persons and source", () => {
  const data = miniData();
  const go = frameSlots(data, ["es.present.go-yo"], "family", { kind: "core" });
  assert.ok(go.length > 0 && go.every((s) => s.person === "yo"));
  assert.deepEqual(
    frameSlots(data, ["es.present.go-yo"], "family", { kind: "module", moduleId: "roofing" })
      .map((s) => s.infinitive)
      .sort(),
    ["tener", "venir"],
  );
  assert.deepEqual(frameSlots(data, ["es.present.go-yo"], ["tú"], { kind: "core" }), []);
});

test("frames show person and meaning, never repeat back-to-back", () => {
  const data = miniData();
  const f = buildFrame(data, { infinitive: "venir", person: "yo", familyId: "es.present.go-yo" }, 0, false);
  assert.deepEqual([f.prompt, f.answer, f.english], ["yo ___", "vengo", "I come"]);
  const slots = frameSlots(data, ["es.present.go-yo"], "family", { kind: "core" });
  const rng = createRng(3);
  let prev = null;
  for (let i = 0; i < 50; i++) {
    const s = nextSlot(rng, slots, prev);
    assert.notDeepEqual(s, prev);
    prev = s;
  }
});

test("sentence mode swaps in the sentence and its translation", () => {
  const data = miniData();
  const withSentence = data.verbs
    .flatMap((v) => v.forms.map((f) => ({ v, f })))
    .find(({ f }) => f.sentence && f.families.length > 0);
  assert.ok(withSentence, "fixture has a form with a sentence");
  const { v, f } = withSentence;
  const slot = { infinitive: v.infinitive, person: f.person, familyId: f.families[0] };
  const on = buildFrame(data, slot, 4, true);
  assert.deepEqual([on.prompt, on.english, on.index], [f.sentence.target, f.sentence.native, 4]);
  const off = buildFrame(data, slot, 4, false);
  assert.deepEqual([off.english, off.answer], [f.english, f.full]);
  assert.ok(off.prompt.endsWith(" ___"));
});

test("source filter: core, module and both", () => {
  const data = miniData();
  const names = (s) => poolVerbs(data, s).map((v) => v.infinitive);
  const core = names({ kind: "core" });
  const mod = names({ kind: "module", moduleId: "roofing" });
  const both = names({ kind: "both", moduleId: "roofing" });
  assert.ok(core.length > 0 && mod.length > 0);
  assert.deepEqual([...new Set([...core, ...mod])].sort(), [...both].sort());
  assert.deepEqual(names({ kind: "module", moduleId: "nope" }), []);
});

test("shuffle is a seeded permutation that leaves its input alone", () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8];
  const a = shuffle(createRng(5), items);
  assert.deepEqual(a, shuffle(createRng(5), items));
  assert.deepEqual([...a].sort((x, y) => x - y), items);
  assert.deepEqual(items, [1, 2, 3, 4, 5, 6, 7, 8]);
  const r = createRng(2);
  for (let i = 0; i < 200; i++) {
    const n = pickIndex(r, 3);
    assert.ok(Number.isInteger(n) && n >= 0 && n < 3);
  }
});
