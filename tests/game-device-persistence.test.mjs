import assert from "node:assert/strict";
import { test } from "node:test";
import { loadModule } from "./helpers/bundle.mjs";
import { LEGACY_GAMES } from "../src/lib/legacy-game-recovery.ts";
import { recoverLegacyPractice } from "../src/lib/legacy-practice-recovery.ts";
import { createLearnerDeviceStore } from "../src/lib/learner-device-store.ts";
function checkedReducer(reducer) {
  return (...args) => {
    let writes = 0;
    const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
    const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        setItem() {
          writes++;
        },
      },
    });
    try {
      const result = reducer(...args);
      assert.equal(writes, 0, "reducers must leave persistence to the account-owned provider");
      return result;
    } finally {
      if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor);
      else delete globalThis.window;
      if (storageDescriptor) Object.defineProperty(globalThis, "localStorage", storageDescriptor);
      else delete globalThis.localStorage;
    }
  };
}
const stats = {
  bestStreak: 5,
  currentStreak: 5,
  perfectRuns: 2,
  totalCorrect: 5,
  totalAttempts: 5,
};
for (const file of ["conjugation", "listening-drill", "idiom-master", "false-friends"]) {
  const { reducer: rawReducer } = await loadModule(`src/state/${file}-state.tsx`, {
    stubs: [/use-learner-device-store/],
  });
  const reducer = checkedReducer(rawReducer);
  test(`${file}: finishing a run is pure and counts once even if React evaluates it twice`, () => {
    const original = {
      leaderboard: { "Spanish-1": { ...stats, totalPlays: 5, trapsCaught: 2, trapsMissed: 0 } },
      run: {
        language: "Spanish",
        level: 1,
        index: 4,
        questions: Array.from({ length: 5 }, () => ({ correct: true })),
      },
      loading: false,
      error: null,
    };
    const before = structuredClone(original);
    const a = reducer(original, { type: "END_RUN" }),
      b = reducer(original, { type: "END_RUN" });
    assert.deepEqual(a, b);
    assert.deepEqual(original, before);
    assert.equal(a.leaderboard["Spanish-1"].perfectRuns, 3);
    assert.equal(a.leaderboard["Spanish-1"].totalCorrect, 5);
    assert.equal(a.run, null);
  });
}
const { reducer: rawMatchReducer } = await loadModule("src/state/word-match-state.tsx", {
  stubs: [/use-learner-device-store/],
});
const matchReducer = checkedReducer(rawMatchReducer);
test("Word Match starts and finishes without global storage writes", () => {
  const state = { leaderboard: {}, game: null, loading: false, error: null, result: null };
  const started = matchReducer(state, {
    type: "START_GAME",
    payload: { language: "Spanish", level: 1 },
  });
  const finished = matchReducer(
    {
      ...started,
      game: {
        ...started.game,
        board: { pairs: [{}, {}] },
        flipCount: 4,
        startedAt: Date.now() - 10,
      },
    },
    { type: "END_GAME" },
  );
  assert.equal(finished.leaderboard["Spanish-1"].totalGames, 1);
  assert.equal(finished.leaderboard["Spanish-1"].totalCompleted, 1);
  assert.equal(finished.leaderboard["Spanish-1"].perfectGames, 1);
  assert.deepEqual(state.leaderboard, {});
});
const { reducer: rawDailyReducer } = await loadModule("src/state/daily-challenge-state.tsx", {
  stubs: [/use-learner-device-store/],
});
const dailyReducer = checkedReducer(rawDailyReducer);
test("daily challenge updates and resets remain pure", () => {
  const state = {
    data: { lastCompletedDay: null, currentStreak: 0, longestStreak: 0, totalCompletions: 0 },
  };
  const first = dailyReducer(state, { type: "RECORD_COMPLETION" });
  const second = dailyReducer(state, { type: "RECORD_COMPLETION" });
  assert.deepEqual(first, second);
  assert.equal(first.data.currentStreak, 1);
  assert.equal(first.data.totalCompletions, 1);
  assert.deepEqual(dailyReducer(first, { type: "RESET" }), state);
  assert.equal(state.data.totalCompletions, 0);
});
function recovery(kind, old, current) {
  const entries = new Map([[LEGACY_GAMES[kind].key, JSON.stringify(old)]]);
  const storage = { getItem: (k) => entries.get(k) ?? null, setItem: (k, v) => entries.set(k, v) };
  const device = createLearnerDeviceStore({ kind, actor: "a", storage, isCurrent: () => true });
  if (current) device.write(current);
  const options = { kind, actor: "a", storage, confirmed: true, isCurrent: () => true };
  recoverLegacyPractice(options);
  recoverLegacyPractice(options);
  assert.equal(storage.getItem(LEGACY_GAMES[kind].key), JSON.stringify(old));
  assert.throws(() => recoverLegacyPractice({ ...options, actor: "b" }), /another account/);
  return device.read();
}
test("game recovery imports absent language histories and preserves current resets without summing totals", () => {
  for (const kind of [
    "gameConjugation",
    "gameIdioms",
    "gameListening",
    "gameFalseFriends",
    "gameWordMatch",
  ]) {
    const oldStats =
      kind === "gameWordMatch"
        ? { bestTimeMs: 1000, bestFlips: 12, perfectGames: 2, totalGames: 5, totalCompleted: 4 }
        : { ...stats, totalPlays: 8, trapsCaught: 2, trapsMissed: 0 };
    const reset = Object.fromEntries(Object.keys(oldStats).map((key) => [key, 0]));
    const saved = recovery(
      kind,
      { "Spanish-1": oldStats, "French-1": oldStats },
      { "Spanish-1": reset },
    );
    assert.equal(saved["Spanish-1"][kind === "gameWordMatch" ? "totalGames" : "totalAttempts"], 0);
    assert.equal(saved["French-1"][kind === "gameWordMatch" ? "totalGames" : "totalAttempts"], 5);
  }
});
test("daily recovery accepts an untouched baseline but never manufactures a combined streak", () => {
  const old = {
    lastCompletedDay: "2026-10-01",
    currentStreak: 7,
    longestStreak: 7,
    totalCompletions: 12,
  };
  const empty = { lastCompletedDay: null, currentStreak: 0, longestStreak: 0, totalCompletions: 0 };
  assert.deepEqual(recovery("dailyChallenge", old, empty), old);
  const current = { ...old, lastCompletedDay: "2026-10-16", currentStreak: 1, totalCompletions: 1 };
  assert.deepEqual(recovery("dailyChallenge", old, current), current);
});
test("older optional game counters migrate to zero and invalid statistics remain untouched", () => {
  assert.equal(recovery("gameListening", { "Spanish-1": stats }, null)["Spanish-1"].totalPlays, 0);
  assert.equal(
    recovery("gameFalseFriends", { "Spanish-1": stats }, null)["Spanish-1"].trapsCaught,
    0,
  );
  const kind = "gameConjugation",
    key = LEGACY_GAMES[kind].key;
  const entries = new Map([
    [key, JSON.stringify({ "Spanish-1": { ...stats, totalAttempts: -1 } })],
  ]);
  const before = new Map(entries);
  const storage = { getItem: (k) => entries.get(k) ?? null, setItem: (k, v) => entries.set(k, v) };
  assert.throws(() =>
    recoverLegacyPractice({ kind, actor: "a", storage, confirmed: true, isCurrent: () => true }),
  );
  assert.deepEqual(entries, before);
});
test("Language Match recovery keeps one consistent career and merges saved words by ID", () => {
  const old = {
    tier: "Gold",
    points: 30,
    matchesPlayed: 12,
    wins: 8,
    losses: 4,
    ties: 0,
    currentWinStreak: 1,
    longestWinStreak: 3,
    lostLastMatch: false,
    resilientUnlocked: true,
    longestRound: 8,
    highestTier: "Gold",
    savedVocab: [
      { id: "w1", word: "QA", definition: "old", language: "Spanish", cefr: "A1", savedAt: 1 },
    ],
  };
  const baseline = {
    ...old,
    tier: "Bronze",
    points: 0,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    highestTier: "Bronze",
    savedVocab: [{ ...old.savedVocab[0], definition: "current" }],
  };
  const restored = recovery("languageMatch", old, baseline);
  assert.equal(restored.matchesPlayed, 12);
  assert.equal(restored.tier, "Gold");
  assert.equal(restored.savedVocab.length, 1);
  assert.equal(restored.savedVocab[0].definition, "current");
  const active = { ...baseline, tier: "Silver", matchesPlayed: 1, wins: 1 };
  assert.equal(recovery("languageMatch", old, active).tier, "Silver");
});
