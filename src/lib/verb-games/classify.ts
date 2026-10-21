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

const STEM_FAMILIES: readonly FamilyId[] = ["es.present.e-ie", "es.present.o-ue", "es.present.e-i"];

/**
 * R3: a stem-changed yo form can also shift its spelling before -o (seguir sigo, corregir corrijo,
 * torcer tuerzo). Applied only to a stem that already carries a vowel change, so a bare spelling
 * shift (vencer venzo, dirigir dirijo) is never read as a stem change.
 */
function shiftSpelling(stem: string, tail: string, inf: string): string {
  if (!/^[oa]/.test(tail) || inf.endsWith("ar")) return stem + tail;
  if (stem.endsWith("gu") && inf.endsWith("guir")) return stem.slice(0, -1) + tail;
  if (stem.endsWith("g")) return `${stem.slice(0, -1)}j${tail}`;
  if (stem.endsWith("c")) return `${stem.slice(0, -1)}z${tail}`;
  return stem + tail;
}

/** Which families explain this exact form. Empty when none does. */
export function formFamilies(infinitive: string, person: Person, full: string): FamilyId[] {
  const inf = norm(infinitive);
  const form = norm(full);
  // oír, reír: predict from the unaccented infinitive (the accent only marks the hiatus).
  const base = inf.endsWith("ír") ? `${inf.slice(0, -2)}ir` : inf;
  const regular = regularPresent(base);
  if (!regular) return [];
  const r = regular[person];
  if (form === r && base === inf) {
    return [`es.present.${inf.slice(-2)}` as FamilyId];
  }
  const stem = base.slice(0, -2);
  const tail = r.slice(stem.length);
  if (person !== "nosotros") {
    const oLetters = base === "jugar" ? "u" : "o";
    const candidates: [string, string, FamilyId][] = [
      ["e", "ie", "es.present.e-ie"],
      [oLetters, "ue", "es.present.o-ue"],
      ["e", "i", "es.present.e-i"],
    ];
    for (const [from, to, id] of candidates) {
      const changed = replaceLast(stem, from, to);
      if (changed !== null && form === shiftSpelling(changed, tail, base)) return [id];
    }
  }
  // R3b: -go yo belongs to -er/-ir verbs only (tengo, salgo, caigo, oigo); -guir yo (distingo) is a spelling shift.
  if (person === "yo" && form.endsWith("go") && !base.endsWith("ar") && !base.endsWith("guir")) {
    return ["es.present.go-yo"];
  }
  return [];
}

/** Fully irregular present tenses, checked form by form. Compile-time data, not a family. */
const IRREGULAR: Record<string, readonly string[]> = {
  caber: ["quepo", "cabes", "cabe", "cabemos", "caben"],
  dar: ["doy", "das", "da", "damos", "dan"],
  estar: ["estoy", "estás", "está", "estamos", "están"],
  haber: ["he", "has", "ha", "hemos", "han"],
  ir: ["voy", "vas", "va", "vamos", "van"],
  mecer: ["mezo", "meces", "mece", "mecemos", "mecen"],
  oler: ["huelo", "hueles", "huele", "olemos", "huelen"],
  oír: ["oigo", "oyes", "oye", "oímos", "oyen"],
  reunir: ["reúno", "reúnes", "reúne", "reunimos", "reúnen"],
  saber: ["sé", "sabes", "sabe", "sabemos", "saben"],
  ser: ["soy", "eres", "es", "somos", "son"],
  sonreír: ["sonrío", "sonríes", "sonríe", "sonreímos", "sonríen"],
  ver: ["veo", "ves", "ve", "vemos", "ven"],
};

const PERSON_INDEX: Record<Person, number> = { yo: 0, tú: 1, él_ella_usted: 2, nosotros: 3, ellos_ustedes: 4 };

const ACCENT: Record<string, string> = { i: "í", u: "ú" };

/**
 * R1: the standard rule that explains a form no family covers, or null. Labels: "irregular"
 * (table above), yo only "zc" / "c→z" / "g→j" / "gu→g", and outside nosotros "uy" (construir)
 * and "accent" (enviar envío, continuar continúo). Each rule rebuilds the exact form.
 */
export function explainIrregular(infinitive: string, person: Person, full: string): string | null {
  const inf = norm(infinitive);
  const form = norm(full);
  const table = IRREGULAR[inf];
  if (table) return table[PERSON_INDEX[person]] === form ? "irregular" : null;
  const regular = regularPresent(inf);
  if (!regular) return null;
  const stem = inf.slice(0, -2);
  const tail = regular[person].slice(stem.length);
  if (person === "yo") {
    const root = inf.slice(0, -3);
    if (/[aeiou]c(er|ir)$/.test(inf) && form === `${root}zco`) return "zc";
    if (/[^aeiou]c(er|ir)$/.test(inf) && form === `${root}zo`) return "c→z";
    if (/g(er|ir)$/.test(inf) && !inf.endsWith("guir") && form === `${root}jo`) return "g→j";
    if (inf.endsWith("guir") && form === `${inf.slice(0, -4)}go`) return "gu→g";
  }
  if (person !== "nosotros") {
    if (/[^gq]uir$/.test(inf) && form === `${stem}y${tail}`) return "uy";
    const last = stem.slice(-1);
    if (/[iu]ar$/.test(inf) && ACCENT[last] && form === `${stem.slice(0, -1)}${ACCENT[last]}${tail}`) return "accent";
  }
  return null;
}

/** The class a form belongs to for the consistency check: its stem change, its rule, or "regular". */
function formClass(inf: string, person: Person, form: string): string | null {
  const families = formFamilies(inf, person, form);
  const stemChange = families.find((f) => STEM_FAMILIES.includes(f));
  if (stemChange) return stemChange;
  if (families.length > 0) {
    // R1: a regular tag must be exactly the regular prediction.
    const regular = regularPresent(inf);
    if (families.some((f) => !STEM_FAMILIES.includes(f) && f !== "es.present.go-yo") && regular?.[person] !== norm(form)) {
      return null;
    }
    return families.includes("es.present.go-yo") ? "go-yo" : "regular";
  }
  return explainIrregular(inf, person, form);
}

const YO_ONLY = new Set(["go-yo", "zc", "c→z", "g→j", "gu→g"]);
const SHARED: Person[] = ["tú", "él_ella_usted", "ellos_ustedes"];

/**
 * R1 gate: the persons whose form is wrong for this verb, in PERSONS order. A form is wrong when no
 * family and no standard rule explains it, or when it breaks the verb's own pattern: tú, él and
 * ellos share one class (a stem change, "accent", "uy" or regular), yo follows it unless it has a
 * yo-only rule (-go, -zc, c→z, g→j, gu→g). Fully irregular verbs are checked against their table.
 */
export function formIssues(infinitive: string, forms: Record<Person, string>): Person[] {
  const inf = norm(infinitive);
  const persons = Object.keys(PERSON_INDEX) as Person[];
  const table = IRREGULAR[inf];
  if (table) return persons.filter((p) => norm(forms[p] ?? "") !== table[PERSON_INDEX[p]]);
  const classes = {} as Record<Person, string | null>;
  for (const person of persons) classes[person] = formClass(inf, person, forms[person] ?? "");
  const bad = new Set<Person>(persons.filter((p) => classes[p] === null));

  // tú / él / ellos: the odd one out is flagged (the first, if all differ).
  const shared = SHARED.filter((p) => !bad.has(p));
  const tally = new Map<string, number>();
  for (const p of shared) tally.set(classes[p]!, (tally.get(classes[p]!) ?? 0) + 1);
  let main: string | null = null;
  for (const [cls, n] of tally) if (n >= 2) main = cls;
  if (main === null && shared.length > 0) main = classes[shared[shared.length - 1]!]!;
  for (const p of shared) if (classes[p] !== main) bad.add(p);

  const yo = classes.yo;
  if (yo !== null && main !== null && yo !== main && !YO_ONLY.has(yo)) bad.add("yo");
  if (classes.nosotros !== null && classes.nosotros !== "regular") bad.add("nosotros");
  return persons.filter((p) => bad.has(p));
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
