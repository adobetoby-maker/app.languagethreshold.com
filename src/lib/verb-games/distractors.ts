// Built by TAC — 2026-10-20
// Verb Games: tempting wrong answers for a frame. Pure and seeded; no runtime AI.

import { PERSON_ENDINGS, regularPresent, splitForm } from "./classify.ts";
import type { Frame } from "./frames.ts";
import { shuffle } from "./rng.ts";
import type { Rng } from "./rng.ts";
import { PERSONS } from "./types.ts";
import type { PatternData, VerbEntry } from "./types.ts";

/** NFC + lower-case: the one comparison used for every form. */
export const norm = (s: string): string => s.normalize("NFC").toLowerCase();

/** True when `candidate` is a present-tense form (any person) of any verb in the data. */
export function isAnyPresentForm(data: PatternData, candidate: string): boolean {
  const c = norm(candidate);
  return data.verbs.some((v) => v.forms.some((f) => norm(f.full) === c));
}

/** Single-letter near-neighbors, applied left to right. */
const NEIGHBOR: Record<string, string> = { g: "d", c: "s", n: "m", r: "l", t: "d", d: "t" };

/** All regular endings, longest first, for the last-resort ending swap. */
const ALL_ENDINGS: readonly string[] = [
  ...new Set(PERSONS.flatMap((p) => PERSON_ENDINGS[p])),
].sort((a, b) => b.length - a.length || a.localeCompare(b));

export function forFrame(
  frame: Frame,
  data: PatternData,
  pool: readonly VerbEntry[],
  n: number,
  rng: Rng,
): string[] {
  const target = data.verbs.find((v) => v.infinitive === frame.infinitive);
  const targetForm = target?.forms.find((f) => f.person === frame.person);
  const answer = norm(frame.answer);

  // Never the answer, never the target verb's own form for the target person.
  const forbidden = new Set<string>([answer]);
  if (targetForm) forbidden.add(norm(targetForm.full));
  const seen = new Set<string>();
  const ordered: string[] = [];

  const add = (candidate: string | null | undefined): boolean => {
    if (!candidate) return false;
    const c = norm(candidate);
    if (c === "" || forbidden.has(c) || seen.has(c)) return false;
    seen.add(c);
    ordered.push(c);
    return true;
  };

  // 1. Regularized form, only when the answer is not already the regular pattern.
  let regularized: string | null = null;
  const regularFamily = `es.present.${norm(frame.infinitive).slice(-2)}`;
  const answerFamilies: readonly string[] = targetForm?.families ?? [frame.familyId];
  if (!answerFamilies.includes(regularFamily)) {
    const candidate = regularPresent(frame.infinitive)?.[frame.person] ?? null;
    if (add(candidate)) regularized = ordered[ordered.length - 1] as string;
  }

  // 2. Misplaced stem change (ie -> ei, ue -> eu).
  for (const [from, to] of [["ie", "ei"], ["ue", "eu"]] as const) {
    if (answer.includes(from)) add(answer.replace(from, to));
  }

  // 3. Up to 2 other persons of the same verb.
  if (target) {
    const others = target.forms.filter((f) => f.person !== frame.person);
    let taken = 0;
    for (const f of shuffle(rng, others)) {
      if (taken >= 2) break;
      if (add(f.full)) taken++;
    }
  }

  // 4. Up to 2 same-family, same-person forms of other pool verbs.
  {
    const sameFamily: string[] = [];
    for (const v of pool) {
      if (v.infinitive === frame.infinitive) continue;
      const f = v.forms.find((x) => x.person === frame.person);
      if (f && f.families.includes(frame.familyId)) sameFamily.push(f.full);
    }
    let taken = 0;
    for (const full of shuffle(rng, sameFamily)) {
      if (taken >= 2) break;
      if (add(full)) taken++;
    }
  }

  // 5. Near-neighbor single-letter substitutions, left to right, until enough.
  for (let i = 0; i < answer.length && ordered.length < n; i++) {
    const swap = NEIGHBOR[answer[i] as string];
    if (swap) add(answer.slice(0, i) + swap + answer.slice(i + 1));
  }

  // 6. Deterministic fallback, tried last. Every candidate still passes `add`.
  if (ordered.length < n) {
    // 6a. Forms of OTHER verbs for the same person.
    const sameDistinct: string[] = [];
    for (const v of pool) {
      if (v.infinitive === frame.infinitive) continue;
      const f = v.forms.find((x) => x.person === frame.person);
      if (f) sameDistinct.push(f.full);
    }
    for (const full of shuffle(rng, sameDistinct)) {
      if (ordered.length >= n) break;
      add(full);
    }
  }
  if (ordered.length < n) {
    // 6b. Regular-ending swaps on the answer's stem and on the infinitive's stem.
    const split = splitForm(frame.infinitive, frame.person, frame.answer, targetForm?.families ?? [frame.familyId]);
    const stems = [norm(split.stem), norm(frame.infinitive).slice(0, -2)];
    const swaps: string[] = [];
    for (const stem of stems) for (const ending of ALL_ENDINGS) swaps.push(stem + ending);
    for (const c of shuffle(rng, swaps)) {
      if (ordered.length >= n) break;
      add(c);
    }
  }

  // Regularized form is always kept; the rest are cut to fit and shuffled.
  if (regularized !== null) {
    const rest = ordered.filter((c) => c !== regularized).slice(0, Math.max(0, n - 1));
    return n <= 0 ? [] : [regularized, ...shuffle(rng, rest)];
  }
  return shuffle(rng, ordered.slice(0, Math.max(0, n)));
}
