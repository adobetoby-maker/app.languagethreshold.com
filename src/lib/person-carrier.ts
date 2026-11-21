// Built by TAC — 2026-11-21
// Which taught form a person the course does not teach takes, read from the pack's verb keys
// (language-pack model section 10). Spanish teaches no vosotros: its second-person plural is
// ustedes, which the ellos / ustedes key carries. A person with a taught key of its own has no
// carrier; a person no key mentions has none either (its table cell stays empty, never another
// person's form).
import type { LanguagePack } from "../data/language-packs/types.ts";

export type Grammatical = { person: 1 | 2 | 3; number: "singular" | "plural" };

export function carrierPerson(
  pack: LanguagePack,
  person: 1 | 2 | 3,
  number: "singular" | "plural",
): Grammatical | null {
  const keys = pack.grammar.verbForms.keys;
  if (keys.some((k) => k.person === person && k.number === number && k.required)) return null;
  const untaught = keys.find((k) => k.person === person && k.number === number && !k.required);
  if (!untaught) return null;
  for (const subject of untaught.subjects ?? [untaught.key]) {
    const carrier = keys.find(
      (k) => k.required && k !== untaught && (k.subjects ?? k.key.split("_")).includes(subject),
    );
    if (carrier?.person && carrier.number) return { person: carrier.person, number: carrier.number };
  }
  return null;
}
