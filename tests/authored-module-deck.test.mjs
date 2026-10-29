import test from "node:test";
import assert from "node:assert/strict";
import { loadModule } from "./helpers/bundle.mjs";
import { build } from "esbuild";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
const { authoredModuleDeck } = await loadModule("src/lib/authored-module-deck.ts");
const { getCurriculum } = await loadModule("src/data/curriculum.ts");
const key = (native, target) =>
  JSON.stringify([
    native.normalize("NFC").trim().toLocaleLowerCase("en"),
    target.normalize("NFC").trim().toLocaleLowerCase("en"),
  ]);

test("each complete authored module deck covers every lesson term and phrase without losing different senses", () => {
  for (const moduleId of ["roofing", "landscaper", "construction-foreman"]) {
    const deck = authoredModuleDeck(moduleId, "Spanish", "English");
    assert.equal(deck.lessonCount, 30);
    assert.equal(deck.readiness, "draft");
    const pairs = new Set(deck.pairs.map((p) => key(p.english, p.translation)));
    assert.equal(pairs.size, deck.pairs.length);
    for (const lesson of getCurriculum(moduleId).lessons)
      for (const word of lesson.words) {
        assert.ok(pairs.has(key(word.en, word.es)), `${moduleId} lesson ${lesson.n}: ${word.en}`);
      }
    assert.ok(deck.pairs.some((p) => p.kind === "phrase"));
    assert.deepEqual(authoredModuleDeck(moduleId, "Spanish", "English"), deck);
  }
  assert.ok(
    authoredModuleDeck("landscaper", "Spanish", "English").pairs.some((p) => p.english.toLowerCase() === "crew"),
  );
});

test("an unbuilt or different language track cannot borrow the Spanish English authored deck", () => {
  for (const [module, target, native] of [
    [null, "Spanish", "English"],
    ["unknown", "Spanish", "English"],
    ["orthopedics", "Spanish", "English"],
    ["landscaper", "English", "Spanish"],
    ["roofing", "Spanish", "French"],
    ["construction-foreman", "Italian", "English"],
  ]) {
    assert.equal(authoredModuleDeck(module, target, native), null);
  }
});

test("actual flashcard reducer preserves reviewed cards, adds missing lesson words and retains distinct meanings", async () => {
  const root = mkdtempSync(path.resolve("node_modules/.cache/lesson-deck-reducer-"));
  try {
    const file = path.resolve("src/state/flashcard-state.tsx"),
      out = path.join(root, "state.mjs");
    await build({
      stdin: {
        contents: readFileSync(file, "utf8") + "\nexport { reducer as reduce };",
        resolveDir: path.dirname(file),
        loader: "tsx",
      },
      outfile: out,
      bundle: true,
      format: "esm",
      platform: "node",
      external: ["react"],
      logLevel: "silent",
      plugins: [
        {
          name: "storage-boundary",
          setup(b) {
            b.onResolve({ filter: /use-learner-device-store/ }, () => ({
              path: "store",
              namespace: "stub",
            }));
            b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
              contents: "export function useLearnerDeviceStore(){}",
            }));
          },
        },
      ],
    });
    const { reduce } = await import(out);
    const initial = { cards: {}, seededLanguages: [], seededDecks: [], hydrated: true };
    const add = (state, origin, pairs) =>
      reduce(state, {
        type: "ADD_MODULE_CARDS",
        payload: { moduleId: "landscaper", language: "Spanish", origin, pairs, now: 1000 },
      });
    const old = add(initial, "generated", [
      { english: "crew", translation: "cuadrilla", kind: "term" },
    ]);
    const id = Object.keys(old.cards)[0];
    old.cards[id].srs = { ...old.cards[id].srs, dueDate: 12345, interval: 10 };
    const pairs = [
      { english: "CREW", translation: "cuadrilla", kind: "term" },
      { english: "crew", translation: "equipo", kind: "term" },
      { english: "shift", translation: "turno", kind: "term" },
    ];
    const next = add(old, "lesson", pairs);
    assert.equal(Object.keys(next.cards).length, 3);
    assert.strictEqual(next.cards[id], old.cards[id]);
    assert.equal(next.cards[id].srs.dueDate, 12345);
    assert.deepEqual(
      new Set(
        Object.values(next.cards)
          .filter((c) => c.translation.toLowerCase() === "crew")
          .map((c) => c.word),
      ),
      new Set(["cuadrilla", "equipo"]),
    );
    assert.strictEqual(add(next, "lesson", pairs), next);
    assert.equal(Object.keys(old.cards).length, 1);
    const reviewed = reduce(next, { type: "REVIEW_CARD", payload: { id, grade: "again", now: 50000 } });
    assert.equal(reviewed.cards[id].srs.repetitions, 0);
    assert.equal(reviewed.cards[id].srs.dueDate, 50000 + 86400000);
    assert.deepEqual(reviewed.cards[id].reviewHistory, [{ grade: "again", at: 50000 }]);
    const resynced = add(reviewed, "lesson", pairs);
    assert.strictEqual(resynced.cards[id], reviewed.cards[id]);
    const hydrated = reduce(initial, { type: "HYDRATE", payload: JSON.parse(JSON.stringify(resynced)) });
    assert.deepEqual(hydrated.cards[id], reviewed.cards[id]);

  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
