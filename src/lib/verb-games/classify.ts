// Built by TAC — 2026-10-20
// Verb Games: per-form classifier. Pure, deterministic, no runtime AI.

import { conjugateRegular } from "../conjugate-regular.ts";
import type { FamilyId, Person } from "./types.ts";

/** Regular present-tense endings per person. The single owner of this table. */
export const PERSON_ENDINGS: Record<Person, readonly string[]> = {
  yo: ["o"],
  tú: ["as", "es"],
  él_ella_usted: ["a", "e"],
  nosotros: ["amos", "emos", "imos"],
  ellos_ustedes: ["an", "en"],
};

/** The person a regular ending belongs to, or null when it is not a regular ending. */
export function personForEnding(ending: string): Person | null {
  for (const person of Object.keys(PERSON_ENDINGS) as Person[]) {
    if (PERSON_ENDINGS[person].includes(ending)) return person;
  }
  return null;
}

function norm(value: string): string {
  return value.normalize("NFC").toLowerCase();
}

/** The regular present-tense form per person, or null when no regular prediction exists. */
export function regularPresent(infinitive: string): Record<Person, string> | null {
  const set = conjugateRegular("Spanish", norm(infinitive));
  const p = set?.presentTense;
  if (!p) return null;
  return {
    yo: norm(p.firstSingular),
    tú: norm(p.secondSingular),
    él_ella_usted: norm(p.thirdSingular),
    nosotros: norm(p.firstPlural),
    ellos_ustedes: norm(p.thirdPlural),
  };
}

function replaceLast(text: string, letters: string, replacement: string): string | null {
  const at = text.lastIndexOf(letters);
  if (at < 0) return null;
  return text.slice(0, at) + replacement + text.slice(at + letters.length);
}

/** Which families explain this exact form. Empty when none does. */
export function formFamilies(infinitive: string, person: Person, full: string): FamilyId[] {
  const inf = norm(infinitive);
  const form = norm(full);
  const regular = regularPresent(inf);
  if (!regular) return [];
  const r = regular[person];
  if (form === r) {
    return [`es.present.${inf.slice(-2)}` as FamilyId];
  }
  const stem = inf.slice(0, -2);
  const tail = r.slice(stem.length);
  if (person !== "nosotros") {
    const oLetters = inf === "jugar" ? "u" : "o";
    const candidates: [string, string, FamilyId][] = [
      ["e", "ie", "es.present.e-ie"],
      [oLetters, "ue", "es.present.o-ue"],
      ["e", "i", "es.present.e-i"],
    ];
    for (const [from, to, id] of candidates) {
      const changed = replaceLast(stem, from, to);
      if (changed !== null && form === changed + tail) return [id];
    }
  }
  if (person === "yo" && form.endsWith("go") && !inf.endsWith("guir")) return ["es.present.go-yo"];
  return [];
}

/** Split a form into the piece the learner types (ending) and what stays (stem). */
export function splitForm(
  _infinitive: string,
  person: Person,
  full: string,
  families: FamilyId[],
): { stem: string; ending: string } {
  if (families.includes("es.present.go-yo") && person === "yo" && full.endsWith("go")) {
    return { stem: full.slice(0, -2), ending: "go" };
  }
  const endings = [...PERSON_ENDINGS[person]].sort((a, b) => b.length - a.length);
  for (const ending of endings) {
    if (full.endsWith(ending) && full.length > ending.length) {
      return { stem: full.slice(0, -ending.length), ending };
    }
  }
  return { stem: full, ending: "" };
}
