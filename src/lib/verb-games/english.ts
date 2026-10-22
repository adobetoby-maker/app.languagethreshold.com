// Built by TAC — 2026-10-20
// Verb Games: deterministic English per Spanish person. Pure, no runtime AI.

import type { Person } from "./types.ts";

const PRONOUN: Record<Person, string> = {
  yo: "I",
  "tú": "you",
  "él_ella_usted": "he/she",
  nosotros: "we",
  ellos_ustedes: "they",
};

/** "to be" is the only verb with a different form per person. Order follows PERSONS. */
const BE: Record<Person, string> = {
  yo: "am",
  "tú": "are",
  "él_ella_usted": "is",
  nosotros: "are",
  ellos_ustedes: "are",
};

/** Third-person-singular irregulars beyond "be". */
const THIRD_IRREGULAR = new Map<string, string>([
  ["have", "has"],
  ["do", "does"],
  ["go", "goes"],
]);

/** First sense of a gloss: parentheticals removed, cut at the first `,` `/` `;`, trimmed. */
export function primaryGloss(gloss: string): string {
  const withoutParens = gloss.replace(/\([^)]*\)/g, " ");
  const first = withoutParens.split(/[,/;]/)[0] ?? "";
  return first.replace(/\s+/g, " ").trim();
}

function thirdPerson(verb: string): string {
  if (/(s|sh|ch|x|z|o)$/.test(verb)) return `${verb}es`;
  if (/[^aeiou]y$/.test(verb)) return `${verb.slice(0, -1)}ies`;
  return `${verb}s`;
}

function conjugate(head: string, person: Person): string {
  if (head === "be") return BE[person];
  if (person !== "él_ella_usted") return head;
  return THIRD_IRREGULAR.get(head) ?? thirdPerson(head);
}

/**
 * English for one person: pronoun + conjugated head verb + the rest of the phrase.
 * "to be worth" + yo -> "I am worth". A gloss without a leading "to " is used whole;
 * its first word is still conjugated.
 */
export function englishForm(gloss: string, person: Person): string {
  const phrase = primaryGloss(gloss);
  const bare = phrase.startsWith("to ") ? phrase.slice(3) : phrase;
  const [head = "", ...rest] = bare.split(" ");
  const verb = conjugate(head, person);
  return [PRONOUN[person], verb, rest.join(" ")].filter((part) => part !== "").join(" ");
}
