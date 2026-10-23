// Built by TAC — 2026-10-20
// Verb Games: tempting wrong answers for a frame. Pure and seeded; no runtime AI.

import { PERSON_ENDINGS, regularPresent, splitForm } from "./classify.ts";
import type { Frame } from "./frames.ts";
import { shuffle } from "./rng.ts";
import type { Rng } from "./rng.ts";
import { PERSONS } from "./types.ts";
import type { FamilyId, PatternData, Person, VerbEntry } from "./types.ts";

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

// ---- Pattern series ------------------------------------------------------------------------
// The series has its own distractor builder. `forFrame` above stays exactly as it is: Bubble Pop
// draws from it with the round's seeded rng, so any change there would make old round logs replay
// to different boards.

const STEM_CHANGE: readonly FamilyId[] = ["es.present.e-ie", "es.present.o-ue", "es.present.e-i"];

/**
 * False when a candidate breaks Spanish qu / gu / gü spelling: a q not followed by ue/ui, a vowel
 * pair pushed into the cluster ("qeudan", "sigeu", "queires"), or a ü not followed by e/i.
 */
export function keepsSpelling(candidate: string): boolean {
  const c = norm(candidate);
  return !/q(?!u[ei])/.test(c) && !/[qg]e[iu]/.test(c) && !/[qg]u(?:ei|eu)/.test(c) && !/ü(?![ei])/.test(c);
}

/** The regular prediction for one person. -guir yo drops the u ("sego", like "sigo"), so it stays a spelling a learner writes. */
function regularized(infinitive: string, person: Person): string | null {
  const r = regularPresent(infinitive)?.[person] ?? null;
  if (r === null) return null;
  const inf = norm(infinitive);
  if (person === "yo" && inf.endsWith("guir") && r.endsWith("guo")) return `${r.slice(0, -3)}go`;
  return r;
}

/** The verb's changed stem ("tien", "pued", "piens", "sigu"), read off a stem-changed form, or null. */
function changedStem(verb: VerbEntry): string | null {
  const order: Person[] = ["tú", "él_ella_usted", "ellos_ustedes", "yo"];
  for (const person of order) {
    const f = verb.forms.find((x) => x.person === person);
    if (!f || !f.families.some((id) => STEM_CHANGE.includes(id))) continue;
    const { stem, ending } = splitForm(verb.infinitive, person, norm(f.full), f.families);
    if (ending !== "" && stem !== "") return stem;
  }
  return null;
}

/**
 * The mistakes learners really make on this form, most telling first, never the form itself:
 * - stem change missing ("tenes", "podes", "penso") and over-regularized yo ("pono", "teno", "salo"):
 *   the regular prediction, when it differs from the real form;
 * - stem change in the wrong person ("tienemos", "puedemos", "piensamos" for nosotros; "tieno" for a
 *   -go yo): the verb's changed stem on a person that keeps the plain stem.
 */
export function learnerMistakes(data: PatternData, infinitive: string, person: Person): string[] {
  const verb = data.verbs.find((v) => v.infinitive === infinitive);
  const form = verb?.forms.find((f) => f.person === person);
  if (!verb || !form) return [];
  const answer = norm(form.full);
  const out: string[] = [];
  const add = (c: string | null) => {
    if (c && c !== answer && !out.includes(c) && keepsSpelling(c)) out.push(c);
  };
  add(regularized(verb.infinitive, person));
  const stem = changedStem(verb);
  if (stem !== null && !form.families.some((id) => STEM_CHANGE.includes(id))) {
    const { ending } = splitForm(verb.infinitive, person, answer, form.families);
    // Endings on a/o after c, g, qu or gu change the sound or the spelling: skip those.
    const shifts = /^[ao]/.test(ending) && /(c|g|qu|gu)$/.test(stem);
    if (ending !== "" && !shifts && (person === "nosotros" || person === "yo")) add(stem + ending);
  }
  return out;
}

/**
 * Up to `n` series distractors in priority order: learner mistakes, then other persons of the same
 * verb (shuffled), then, only as filler, the same person of other verbs in the family and then of any
 * verb in the pool. Never the valid answer for (infinitive, person), never a broken qu / gu / gü
 * spelling, no duplicates. `accept` (called once per candidate, in order) can turn a candidate down,
 * e.g. Listen's sound rules; a turned-down candidate does not count toward `n`.
 */
export function seriesDistractors(
  data: PatternData,
  slot: { infinitive: string; person: Person; familyId: FamilyId },
  pool: readonly VerbEntry[],
  n: number,
  rng: Rng,
  accept: (candidate: string) => boolean = () => true,
): string[] {
  const verb = data.verbs.find((v) => v.infinitive === slot.infinitive);
  const valid = verb?.forms.find((f) => f.person === slot.person);
  const answer = valid ? norm(valid.full) : null;
  const out: string[] = [];
  const tried = new Set<string>();
  const add = (c: string | null | undefined) => {
    if (!c || out.length >= n) return;
    const x = norm(c);
    if (x === "" || x === answer || tried.has(x)) return;
    tried.add(x);
    if (keepsSpelling(x) && accept(x)) out.push(x);
  };
  for (const c of learnerMistakes(data, slot.infinitive, slot.person)) add(c);
  if (verb) for (const f of shuffle(rng, verb.forms.filter((x) => x.person !== slot.person))) add(f.full);
  if (out.length >= n) return out;
  const others = pool.filter((v) => v.infinitive !== slot.infinitive);
  const samePerson = (v: VerbEntry) => v.forms.find((x) => x.person === slot.person);
  for (const v of shuffle(rng, others.filter((v) => samePerson(v)?.families.includes(slot.familyId)))) add(samePerson(v)?.full);
  if (out.length >= n) return out;
  for (const v of shuffle(rng, others)) add(samePerson(v)?.full);
  return out;
}
