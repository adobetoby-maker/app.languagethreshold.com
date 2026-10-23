import { z } from "zod";

export const LEGACY_GAMES = {
  gameConjugation: { key: "lt.conjugation.leaderboard.v1", label: "Conjugation game results" },
  gameWordMatch: { key: "lt.wordMatch.leaderboard.v1", label: "Word Match game results" },
  gameListening: { key: "lt.listeningDrill.leaderboard.v1", label: "Listening Drill game results" },
  gameIdioms: { key: "lt.idiomMaster.leaderboard.v1", label: "Idiom Master game results" },
  gameFalseFriends: { key: "lt.falseFriends.leaderboard.v1", label: "False Friends game results" },
  dailyChallenge: { key: "lt.dailyChallenge.v1", label: "Daily challenge progress" },
  languageMatch: { key: "lt.match.v2", label: "Language Match results and saved words" },
} as const;
export type LegacyGameKind = keyof typeof LEGACY_GAMES;
export function isLegacyGameKind(kind: string): kind is LegacyGameKind {
  return Object.hasOwn(LEGACY_GAMES, kind);
}
const n = z.number().finite().int().nonnegative();
const streak = z.object({
  bestStreak: n,
  currentStreak: n,
  perfectRuns: n,
  totalCorrect: n,
  totalAttempts: n,
});
const listening = streak.extend({ totalPlays: n.default(0) });
const falseFriends = streak.extend({ trapsCaught: n.default(0), trapsMissed: n.default(0) });
const wordMatch = z.object({
  bestTimeMs: n,
  bestFlips: n,
  perfectGames: n,
  totalGames: n,
  totalCompleted: n,
});
const daily = z.object({
  lastCompletedDay: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  currentStreak: n,
  longestStreak: n,
  totalCompletions: n,
});
const tier = z.enum(["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Champion", "Unreal"]);
const vocab = z.object({
  id: z.string(),
  word: z.string(),
  definition: z.string(),
  language: z.string(),
  cefr: z.string(),
  savedAt: z.number().finite(),
});
const match = z.object({
  tier,
  points: n,
  matchesPlayed: n,
  wins: n,
  losses: n,
  ties: n,
  currentWinStreak: n,
  longestWinStreak: n,
  lostLastMatch: z.boolean(),
  resilientUnlocked: z.boolean(),
  longestRound: n,
  highestTier: tier,
  savedVocab: z.array(vocab).default([]),
});
const safeEntries = <T>(value: Record<string, T>) =>
  Object.entries(value).filter(([key]) => !["__proto__", "constructor", "prototype"].includes(key));
export function normalizeLegacyGame(kind: LegacyGameKind, value: unknown): unknown {
  if (kind === "dailyChallenge") return daily.parse(value);
  if (kind === "languageMatch") return match.parse(value);
  const schema =
    kind === "gameWordMatch"
      ? wordMatch
      : kind === "gameListening"
        ? listening
        : kind === "gameFalseFriends"
          ? falseFriends
          : streak;
  return Object.fromEntries(safeEntries(z.record(z.string(), schema).parse(value)));
}
export function countLegacyGame(kind: LegacyGameKind, value: unknown) {
  if (kind === "dailyChallenge") return daily.parse(value).totalCompletions > 0 ? 1 : 0;
  if (kind === "languageMatch") {
    const data = match.parse(value);
    return (
      data.savedVocab.length +
      (data.matchesPlayed > 0 || data.points > 0 || data.tier !== "Bronze" ? 1 : 0)
    );
  }
  return Object.keys(normalizeLegacyGame(kind, value) as object).length;
}
export function mergeLegacyGame(kind: LegacyGameKind, older: unknown, current: unknown): unknown {
  if (kind === "dailyChallenge") {
    const a = daily.parse(older),
      b = daily.parse(current);
    // Do not invent a combined streak across two histories or add overlapping totals.
    return b.lastCompletedDay === null && b.totalCompletions === 0 ? a : b;
  }
  if (kind === "languageMatch") {
    const a = match.parse(older),
      b = match.parse(current);
    const hasCurrentCareer = b.matchesPlayed > 0 || b.points > 0 || b.tier !== "Bronze";
    const words = [
      ...new Map([...a.savedVocab, ...b.savedVocab].map((word) => [word.id, word])).values(),
    ];
    return { ...(hasCurrentCareer ? b : a), savedVocab: words };
  }
  // A record is one language/level's history. Current decisions, including resets,
  // win an overlap; only absent language/level histories are imported.
  const a = normalizeLegacyGame(kind, older) as Record<string, unknown>;
  const b = normalizeLegacyGame(kind, current) as Record<string, unknown>;
  return Object.fromEntries([...safeEntries(a), ...safeEntries(b)]);
}
