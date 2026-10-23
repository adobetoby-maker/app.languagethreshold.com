// Built by TAC — 2026-10-22
// Verb pattern practice series: five mini games per family, built only from the signed pattern
// data (no runtime AI). Pure and seeded; persistence lives in device.ts.

import { forFrame, norm } from "./distractors.ts";
import { PERSON_LABEL, familyById } from "./families.ts";
import { buildFrame } from "./frames.ts";
import { frameSlots, poolVerbs } from "./pool.ts";
import type { FrameSlot } from "./pool.ts";
import { createRng, shuffle } from "./rng.ts";
import type { Rng } from "./rng.ts";
import { PERSONS } from "./types.ts";
import type { FamilyId, PatternData, Person, SourceFilter } from "./types.ts";

/** The five steps, in unlock order. Type it is the mastery check. */
export const SERIES_STEPS = ["pick", "match", "cards", "listen", "type"] as const;
export type SeriesStep = (typeof SERIES_STEPS)[number];

export function isSeriesStep(value: unknown): value is SeriesStep {
  return typeof value === "string" && (SERIES_STEPS as readonly string[]).includes(value);
}

/** Items per Pick, Listen and Type session. */
export const SESSION_SIZE = 10;
/** Pairs on a Match board. */
export const MATCH_SIZE = 5;
/** Mistakes a Match board may have and still pass. */
export const MATCH_MAX_MISTAKES = 2;
/** Share of a Pick, Listen or Type session that must be right (8 of 10). */
export const CHOICE_PASS_SHARE = 0.8;
/** Cards rated Again come back this many cards later (or last, if fewer are left). */
export const AGAIN_GAP = 3;

export interface SeriesItem {
  /** "infinitive|person": unique per verb form in a family. */
  key: string;
  infinitive: string;
  /** The verb's gloss, e.g. "to come". */
  verbEnglish: string;
  person: Person;
  personLabel: string;
  familyId: FamilyId;
  answer: string;
  /** English for this form, e.g. "I come". */
  english: string;
  /** The form's example sentence with the blank filled in, when the data has one. */
  example: { target: string; native: string } | null;
}

/** Every (verb, person) of the family in the learner's source, in the family's own persons. */
export function seriesSlots(data: PatternData, familyId: FamilyId, source: SourceFilter): FrameSlot[] {
  return frameSlots(data, [familyId], "family", source);
}

export function itemOf(data: PatternData, slot: FrameSlot): SeriesItem {
  const verb = data.verbs.find((v) => v.infinitive === slot.infinitive);
  const form = verb?.forms.find((f) => f.person === slot.person);
  if (!verb || !form) throw new Error(`No form for ${slot.infinitive} ${slot.person}`);
  const s = form.sentence;
  return {
    key: `${slot.infinitive}|${slot.person}`,
    infinitive: verb.infinitive,
    verbEnglish: verb.english,
    person: slot.person,
    personLabel: PERSON_LABEL[slot.person],
    familyId: slot.familyId,
    answer: form.full,
    english: form.english,
    example: s && s.target.includes("___") ? { target: s.target.replace("___", form.full), native: s.native } : null,
  };
}

/**
 * Persons round-robin (in a seeded order), each person's slots shuffled and cycled, so a session
 * spreads persons evenly and never shows the same form twice in a row when there is a choice.
 */
function spreadSlots(slots: readonly FrameSlot[], rng: Rng, n: number): FrameSlot[] {
  if (slots.length === 0 || n <= 0) return [];
  const groups = shuffle(
    rng,
    PERSONS.map((p) => shuffle(rng, slots.filter((s) => s.person === p))).filter((g) => g.length > 0),
  );
  const cursor = groups.map(() => 0);
  const out: FrameSlot[] = [];
  const same = (a: FrameSlot | undefined, b: FrameSlot) => a !== undefined && a.infinitive === b.infinitive && a.person === b.person;
  while (out.length < n) {
    for (let g = 0; g < groups.length && out.length < n; g++) {
      const group = groups[g] as FrameSlot[];
      let next = group[(cursor[g] as number) % group.length] as FrameSlot;
      // Only one person group: a cycle wrap could repeat the last form, so skip one ahead.
      if (same(out[out.length - 1], next) && group.length > 1) {
        cursor[g] = (cursor[g] as number) + 1;
        next = group[(cursor[g] as number) % group.length] as FrameSlot;
      }
      cursor[g] = (cursor[g] as number) + 1;
      out.push(next);
    }
  }
  return out;
}

/** The session's items: `n` from the family's verbs in the source pool, persons spread, seeded. */
export function seriesItems(data: PatternData, familyId: FamilyId, source: SourceFilter, seed: number, n = SESSION_SIZE): SeriesItem[] {
  const slots = seriesSlots(data, familyId, source);
  return spreadSlots(slots, createRng(seed), n).map((s) => itemOf(data, s));
}

/** True when `candidate` is the data's form of the item's verb for the item's person. */
export function isValidAnswer(data: PatternData, item: SeriesItem, candidate: string): boolean {
  const form = data.verbs.find((v) => v.infinitive === item.infinitive)?.forms.find((f) => f.person === item.person);
  return form !== undefined && norm(form.full) === norm(candidate.trim());
}

function distractorsFor(data: PatternData, item: SeriesItem, source: SourceFilter, rng: Rng, n: number): string[] {
  const frame = buildFrame(data, { infinitive: item.infinitive, person: item.person, familyId: item.familyId }, 0, false);
  return forFrame(frame, data, poolVerbs(data, source), n, rng).filter((c) => !isValidAnswer(data, item, c));
}

/** Pick it: the answer plus three distractors (distractors.ts, never a valid answer), shuffled. */
export function pickChoices(data: PatternData, item: SeriesItem, source: SourceFilter, rng: Rng, n = 4): string[] {
  const wrong = distractorsFor(data, item, source, rng, n - 1).slice(0, n - 1);
  return shuffle(rng, [item.answer, ...wrong]);
}

/**
 * How a form sounds in Latin American Spanish, for Listen: accents and silent h dropped, b = v,
 * s = z = soft c, y = ll, k = qu = hard c, j = soft g. Two forms with one key cannot be told apart by ear.
 */
export function soundKey(s: string): string {
  return foldAccents(norm(s.trim()))
    .replace(/(^|[^c])h+/g, "$1")
    .replace(/v/g, "b")
    .replace(/z/g, "s")
    .replace(/c([ei])/g, "s$1")
    .replace(/qu([ei])/g, "k$1")
    .replace(/c/g, "k")
    .replace(/g([ei])/g, "j$1")
    .replace(/gu([ei])/g, "g$1")
    .replace(/ll/g, "y")
    .replace(/x/g, "ks");
}

/** Listen: like Pick, but no distractor may sound like the answer or like another choice. */
export function listenChoices(data: PatternData, item: SeriesItem, source: SourceFilter, rng: Rng, n = 4): string[] {
  const heard = new Set([soundKey(item.answer)]);
  const wrong: string[] = [];
  for (let ask = n * 3; ask <= 60 && wrong.length < n - 1; ask += 20) {
    for (const c of distractorsFor(data, item, source, rng, ask)) {
      if (wrong.length >= n - 1) break;
      const key = soundKey(c);
      if (heard.has(key)) continue;
      heard.add(key);
      wrong.push(c);
    }
  }
  return shuffle(rng, [item.answer, ...wrong]);
}

export interface MatchPair {
  id: number;
  form: string;
  /** Person + English, e.g. "yo · I come". */
  prompt: string;
  item: SeriesItem;
}

export interface MatchBoard {
  pairs: MatchPair[];
  /** Pair ids in the order the forms column shows them. */
  formOrder: number[];
  /** Pair ids in the order the prompts column shows them. */
  promptOrder: number[];
}

/** Match it: up to five pairs, no form or prompt twice, so every prompt has exactly one form on the board. */
export function matchBoard(data: PatternData, familyId: FamilyId, source: SourceFilter, seed: number, size = MATCH_SIZE): MatchBoard {
  const rng = createRng(seed);
  const slots = seriesSlots(data, familyId, source);
  const candidates = spreadSlots(slots, rng, slots.length);
  const pairs: MatchPair[] = [];
  const forms = new Set<string>();
  const prompts = new Set<string>();
  for (const slot of candidates) {
    if (pairs.length >= size) break;
    const item = itemOf(data, slot);
    const prompt = `${item.personLabel} · ${item.english}`;
    if (forms.has(norm(item.answer)) || prompts.has(prompt)) continue;
    forms.add(norm(item.answer));
    prompts.add(prompt);
    pairs.push({ id: pairs.length, form: item.answer, prompt, item });
  }
  const ids = pairs.map((p) => p.id);
  return { pairs, formOrder: shuffle(rng, ids), promptOrder: shuffle(rng, ids) };
}

export function matchPassed(matched: number, total: number, mistakes: number): boolean {
  return total > 0 && matched === total && mistakes <= MATCH_MAX_MISTAKES;
}

/** 8 of 10: Pick, Listen and Type. */
export function choicePassed(correct: number, total: number): boolean {
  return total > 0 && correct >= Math.ceil(total * CHOICE_PASS_SHARE);
}

/** Every combining mark removed (á → a, ñ → n, ü → u). */
export function foldAccents(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC");
}

export type TypeCheck = "exact" | "almost" | "wrong";

/**
 * Type it: exact means the same letters and accents (NFC, case and outer spaces ignored).
 * Same letters with an accent off is "almost": it is pointed out, but it never counts.
 */
export function checkTyped(input: string, answer: string): TypeCheck {
  const typed = norm(input.trim());
  const want = norm(answer.trim());
  if (typed === "") return "wrong";
  if (typed === want) return "exact";
  return foldAccents(typed) === foldAccents(want) ? "almost" : "wrong";
}

// ---- Cards --------------------------------------------------------------------------------

export type CardRating = "again" | "good" | "easy";

export interface CardsState {
  /** Item keys still due; the first is the card on screen. */
  queue: string[];
  /** Keys rated Good or Easy, in the order they were rated. */
  done: string[];
}

export function startCards(items: readonly SeriesItem[]): CardsState {
  return { queue: [...new Set(items.map((i) => i.key))], done: [] };
}

/** Again puts the card back AGAIN_GAP cards later; Good or Easy clears it for this session. */
export function rateCard(s: CardsState, rating: CardRating): CardsState {
  const [current, ...rest] = s.queue;
  if (current === undefined) return s;
  if (rating === "again") {
    const at = Math.min(AGAIN_GAP, rest.length);
    return { queue: [...rest.slice(0, at), current, ...rest.slice(at)], done: s.done };
  }
  return { queue: rest, done: [...s.done, current] };
}

export function cardsPassed(s: CardsState): boolean {
  return s.queue.length === 0 && s.done.length > 0;
}

// ---- Feedback -----------------------------------------------------------------------------

/** What a miss shows: the family's rule line and the right form with its English. */
export function missText(item: SeriesItem): { rule: string; right: string } {
  return { rule: familyById(item.familyId).rule, right: `${item.answer} · ${item.english}` };
}
