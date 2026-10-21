// Built by TAC — 2026-10-21
// Round recap helpers (no JSX): misses grouped by family, the practice target and the mastery picks.
import { FAMILIES, familyById } from "@/lib/verb-games/families";
import type { FamilyId, Miss, Person, RoundResult } from "@/lib/verb-games/types";

export interface MissRow {
  /** `${infinitive}|${person}`, the same key the saved-card list uses. */
  key: string;
  infinitive: string;
  person: Person;
  /** What the player chose; null when the bubble ran out of time. */
  attempted: string | null;
  correct: string;
  english: string;
  /** How many times this verb and person were missed in the round. */
  times: number;
}

export interface MissGroup {
  familyId: FamilyId | null;
  label: string;
  /** Misses in the group, repeats included. */
  count: number;
  rows: MissRow[];
}

export const OTHER_LABEL = "Other";

/** The key for a saved card: infinitive and person. */
export const cardKey = (infinitive: string, person: Person): string => `${infinitive}|${person}`;

const ladderIndex = (id: FamilyId): number => FAMILIES.findIndex((f) => f.id === id);

/**
 * Misses grouped by family, most misses first (ties follow the pattern ladder), "Other" last.
 * A miss without a family goes under "Other". Repeats of one verb and person share a row.
 */
export function groupMisses(misses: readonly Miss[]): MissGroup[] {
  const groups = new Map<FamilyId | null, MissGroup>();
  for (const m of misses) {
    let group = groups.get(m.familyId);
    if (!group) {
      group = { familyId: m.familyId, label: m.familyId ? familyById(m.familyId).label : OTHER_LABEL, count: 0, rows: [] };
      groups.set(m.familyId, group);
    }
    group.count += 1;
    const key = cardKey(m.infinitive, m.person);
    const row = group.rows.find((r) => r.key === key);
    if (row) row.times += 1;
    else group.rows.push({ key, infinitive: m.infinitive, person: m.person, attempted: m.attempted, correct: m.correct, english: m.english, times: 1 });
  }
  return [...groups.values()].sort((a, b) => {
    if ((a.familyId === null) !== (b.familyId === null)) return a.familyId === null ? 1 : -1;
    if (a.count !== b.count) return b.count - a.count;
    return a.familyId && b.familyId ? ladderIndex(a.familyId) - ladderIndex(b.familyId) : 0;
  });
}

/** The family with the most misses, or null when every miss has no family (or there are none). */
export function practiceFamily(misses: readonly Miss[]): FamilyId | null {
  return groupMisses(misses).find((g) => g.familyId !== null)?.familyId ?? null;
}

/**
 * Mastery picks for a finished round: each goal form counts as correct, each answered miss as wrong.
 * A bubble that timed out was not a pick, and a miss with no family has no mastery to feed.
 */
export function picksOf(result: Pick<RoundResult, "completions" | "misses">): { familyId: FamilyId; infinitive: string; correct: boolean }[] {
  const picks: { familyId: FamilyId; infinitive: string; correct: boolean }[] = [];
  for (const c of result.completions) picks.push({ familyId: c.familyId, infinitive: c.infinitive, correct: true });
  for (const m of result.misses) {
    if (m.familyId !== null && m.attempted !== null) picks.push({ familyId: m.familyId, infinitive: m.infinitive, correct: false });
  }
  return picks;
}
