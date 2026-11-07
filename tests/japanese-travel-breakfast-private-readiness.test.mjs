import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  JAPANESE_TRAVEL_BREAKFAST_MODES,
  JAPANESE_TRAVEL_BREAKFAST_RELEASED,
  assemblePrivateJapaneseTravelMaster,
  inspectPrivateJapaneseTravelBreakfast,
  releasedJapaneseTravelBreakfastInput,
} from "../src/lib/private-japanese-travel-breakfast-readiness.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => JSON.parse(readFileSync(join(root, "content/japanese-travel-breakfast", file), "utf8"));
const foundation = read("foundation-1-10-draft.json");
const core = read("core-1-30-draft.json");
const masterChunks = ["1-3", "4-6", "7-9", "10-12", "13-15", "16-18", "19-20"]
  .map((range) => read(`master-${range}-draft.json`));
const master = assemblePrivateJapaneseTravelMaster(masterChunks);

test("all sixty private inputs retain pair, stage, Reader, card and speaking identity", () => {
  assert.equal(JAPANESE_TRAVEL_BREAKFAST_RELEASED, false);
  assert.deepEqual(JAPANESE_TRAVEL_BREAKFAST_MODES, ["see", "recall", "hear", "type", "say", "write"]);
  const cacheNamespaces = new Set();
  const cardIds = new Set();
  for (const bundle of [foundation, core, master]) {
    for (const lesson of bundle.lessons) {
      const input = inspectPrivateJapaneseTravelBreakfast(bundle, lesson.n, "Japanese", "English");
      assert.equal(input.registration, "disabled");
      assert.equal(input.pairKey, "Japanese:English");
      assert.equal(input.lessonId, lesson.stableId);
      assert.equal(input.readerHandoff.lessonId, lesson.stableId);
      assert.deepEqual(input.readerHandoff.lines, lesson.reader);
      assert.equal(input.speaking.locale, "ja-JP");
      assert.deepEqual(input.modeInputs, lesson.modes);
      assert.ok(input.cacheNamespace.startsWith(`private:Japanese:English:travel-breakfast:${bundle.stageId}:`));
      assert.ok(!cacheNamespaces.has(input.cacheNamespace));
      cacheNamespaces.add(input.cacheNamespace);
      for (const card of input.cards) {
        assert.ok(card.cardId.startsWith(`${lesson.stableId}:card:`));
        assert.ok(!cardIds.has(card.cardId));
        cardIds.add(card.cardId);
      }
      assert.equal(releasedJapaneseTravelBreakfastInput(bundle, lesson.n, "Japanese", "English"), null);
    }
  }
  assert.equal(cacheNamespaces.size, 60);
  assert.equal(cardIds.size, [foundation, core, master].flatMap((bundle) => bundle.lessons).reduce((n, lesson) => n + lesson.cards.length, 0));
  assert.equal(inspectPrivateJapaneseTravelBreakfast(core, 31, "Japanese", "English"), null);
  assert.equal(inspectPrivateJapaneseTravelBreakfast(master, 21, "Japanese", "English"), null);
});

test("Master segments reject missing, repeated, reordered or mismatched lessons", () => {
  assert.deepEqual(master.lessons.map((lesson) => lesson.n), Array.from({ length: 20 }, (_, index) => index + 1));
  assert.throws(() => assemblePrivateJapaneseTravelMaster(masterChunks.slice(0, -1)));
  assert.throws(() => assemblePrivateJapaneseTravelMaster([...masterChunks.slice(0, -1), masterChunks[0]]));
  assert.throws(() => assemblePrivateJapaneseTravelMaster([masterChunks[1], masterChunks[0], ...masterChunks.slice(2)]));
  const changed = structuredClone(masterChunks);
  changed[0].source.readerSha256 = "changed";
  assert.throws(() => assemblePrivateJapaneseTravelMaster(changed));
});

test("wrong language pair cannot inspect or release the candidate", () => {
  for (const [target, native] of [["Spanish", "English"], ["Japanese", "Spanish"], ["English", "Japanese"], ["japanese", "English"]]) {
    for (const bundle of [core, master]) {
      assert.equal(inspectPrivateJapaneseTravelBreakfast(bundle, 1, target, native), null);
      assert.equal(releasedJapaneseTravelBreakfastInput(bundle, 1, target, native), null);
    }
  }
});

test("same-pair source, stage, identity, Reader and card corruption fails closed", () => {
  const cases = [
    (copy) => { copy.source.readerSha256 = "changed"; },
    (copy) => { copy.lessons[0].stableId = "travel-breakfast:1:es-en"; },
    (copy) => { copy.lessons[1].n = 1; },
    (copy) => { copy.lessons[0].cards[0].ja = copy.lessons[0].cards[0].en; },
    (copy) => { copy.lessons[0].reader[0].en = copy.lessons[0].reader[0].ja; },
    (copy) => { copy.lessons[0].modes.say = ""; },
    (copy) => { copy.registered = true; },
  ];
  for (const mutate of cases) {
    const copy = structuredClone(core);
    mutate(copy);
    assert.throws(() => inspectPrivateJapaneseTravelBreakfast(copy, 1, "Japanese", "English"));
  }
});

test("candidate is absent from public registry, offline worker and route modules", () => {
  for (const file of ["src/data/core60/manifest.ts", "src/routes/index.tsx", "public/sw.js"]) {
    try {
      const source = readFileSync(join(root, file), "utf8");
      assert.doesNotMatch(source, /private-japanese-travel-breakfast-readiness|private:Japanese:English:travel-breakfast/);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
});
