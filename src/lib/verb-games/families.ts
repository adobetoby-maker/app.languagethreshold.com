// Built by TAC — 2026-10-20
// Verb Games: the seven Spanish present-tense pattern families.

import { PERSONS } from "./types.ts";
import type { FamilyId, PatternFamily, Person } from "./types.ts";

export const PERSON_LABEL: Record<Person, string> = {
  yo: "yo",
  tú: "tú",
  él_ella_usted: "él/ella/usted",
  nosotros: "nosotros",
  ellos_ustedes: "ellos/ustedes",
};

const ALL: Person[] = [...PERSONS];
const NOT_NOSOTROS: Person[] = PERSONS.filter((p) => p !== "nosotros");

function regular(ending: "ar" | "er" | "ir", template: string, rule: string): PatternFamily {
  return {
    id: `es.present.${ending}`,
    language: "es",
    tense: "present",
    kind: "regular-ending",
    label: `Regular -${ending}`,
    pill: `regular -${ending}`,
    rule,
    appliesTo: [...ALL],
    frame: { person: "yo", template },
    pieceKind: "ending",
    tier: 1,
  };
}

function stemChange(id: FamilyId, label: string, rule: string): PatternFamily {
  return {
    id,
    language: "es",
    tense: "present",
    kind: "stem-change",
    label,
    pill: label,
    rule,
    appliesTo: [...NOT_NOSOTROS],
    frame: { person: "yo", template: `${label} (not nosotros)` },
    pieceKind: "letters",
    tier: 2,
  };
}

export const FAMILIES: readonly PatternFamily[] = [
  regular("ar", "-o · -as · -a · -amos · -an", "Drop -ar, add -o, -as, -a, -amos, -an."),
  regular("er", "-o · -es · -e · -emos · -en", "Drop -er, add -o, -es, -e, -emos, -en."),
  regular("ir", "-o · -es · -e · -imos · -en", "Drop -ir, add -o, -es, -e, -imos, -en."),
  {
    id: "es.present.go-yo",
    language: "es",
    tense: "present",
    kind: "yo-irregular",
    label: 'The "-go" family',
    pill: "-go yo form",
    rule: "The yo form ends in -go. Everything else stays regular.",
    appliesTo: ["yo"],
    frame: { person: "yo", template: "yo ___go" },
    pieceKind: "ending",
    tier: 1,
  },
  stemChange("es.present.e-ie", "e → ie", "The stem e becomes ie in every form except nosotros."),
  stemChange("es.present.o-ue", "o → ue", "The stem o becomes ue in every form except nosotros. (jugar: u → ue)"),
  stemChange("es.present.e-i", "e → i", "The stem e becomes i in every form except nosotros."),
];

export function familyById(id: FamilyId): PatternFamily {
  const family = FAMILIES.find((f) => f.id === id);
  if (!family) throw new Error(`Unknown family id: ${String(id)}`);
  return family;
}

export function isFamilyId(value: unknown): value is FamilyId {
  return typeof value === "string" && FAMILIES.some((f) => f.id === value);
}

const STEM_CHANGE_TEXT: Partial<Record<FamilyId, string>> = {
  "es.present.e-ie": "e → ie",
  "es.present.o-ue": "o → ue",
  "es.present.e-i": "e → i",
};

/** Reason text comes from the family rule only; no per-verb prose. */
export function reasonText(
  familyId: FamilyId,
  form: { infinitive: string; person: Person; ending: string },
): string {
  const family = familyById(familyId);
  const inf = form.infinitive;
  if (family.kind === "yo-irregular") {
    return `${inf} is a -go verb: the yo form ends in -go.`;
  }
  if (family.kind === "regular-ending") {
    const type = family.id.slice("es.present.".length);
    return `${inf} is a regular -${type} verb: ${PERSON_LABEL[form.person]} takes -${form.ending}.`;
  }
  let change = STEM_CHANGE_TEXT[family.id] ?? family.label;
  if (family.id === "es.present.o-ue" && inf.normalize("NFC").toLowerCase() === "jugar") change = "u → ue";
  return `${inf} changes ${change} in every form except nosotros.`;
}
