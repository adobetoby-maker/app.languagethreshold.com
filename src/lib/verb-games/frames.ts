// Built by TAC — 2026-10-20
// Verb Games: one question ("frame") per slot, and the no-repeat slot picker.

import { PERSON_LABEL } from "./families.ts";
import type { FrameSlot } from "./pool.ts";
import { pickIndex } from "./rng.ts";
import type { Rng } from "./rng.ts";
import type { FamilyId, PatternData, Person } from "./types.ts";

export interface Frame {
  index: number;
  infinitive: string;
  person: Person;
  familyId: FamilyId;
  answer: string;
  english: string;
  prompt: string;
  sentence: { target: string; native: string } | null;
}

export function buildFrame(data: PatternData, slot: FrameSlot, index: number, useSentence: boolean): Frame {
  const verb = data.verbs.find((v) => v.infinitive === slot.infinitive);
  const form = verb?.forms.find((f) => f.person === slot.person);
  if (!verb || !form) throw new Error(`No form for ${slot.infinitive} ${slot.person}`);
  const sentence = form.sentence;
  const showSentence = useSentence && sentence !== null;
  return {
    index,
    infinitive: slot.infinitive,
    person: slot.person,
    familyId: slot.familyId,
    answer: form.full,
    english: showSentence ? sentence.native : form.english,
    prompt: showSentence ? sentence.target : `${PERSON_LABEL[slot.person]} ___`,
    sentence,
  };
}

/** Random slot that is not the previous infinitive + person, unless nothing else exists. */
export function nextSlot(rng: Rng, slots: readonly FrameSlot[], previous: FrameSlot | null): FrameSlot {
  if (slots.length === 0) throw new Error("No slots to pick from");
  const others = previous
    ? slots.filter((s) => s.infinitive !== previous.infinitive || s.person !== previous.person)
    : slots;
  const from = others.length > 0 ? others : slots;
  return from[pickIndex(rng, from.length)] as FrameSlot;
}
