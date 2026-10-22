// Built by TAC — 2026-10-20
// Verb Games: verb pool by source and frame slots by family and person.

import { familyById } from "./families.ts";
import type { FamilyId, PatternData, Person, SourceFilter, VerbEntry } from "./types.ts";

/** Re-exported so callers can import it from here; it is declared in types.ts (no cycle). */
export type { SourceFilter } from "./types.ts";

export interface FrameSlot {
  infinitive: string;
  person: Person;
  familyId: FamilyId;
}

function inSource(verb: VerbEntry, source: SourceFilter): boolean {
  return verb.sources.some((s) => {
    if (s.kind === "core") return source.kind === "core" || source.kind === "both";
    return (source.kind === "module" || source.kind === "both") && s.moduleId === source.moduleId;
  });
}

/** Verbs available to a round, in dataset order. `both` is core plus the module. */
export function poolVerbs(data: PatternData, source: SourceFilter): VerbEntry[] {
  return data.verbs.filter((v) => inSource(v, source));
}

/**
 * Every (verb, person) whose form belongs to one of `families`. `persons` "family" means each
 * family's own `appliesTo`. Order: families as given, then pool order, then PERSONS order.
 */
export function frameSlots(
  data: PatternData,
  families: FamilyId[],
  persons: Person[] | "family",
  source: SourceFilter,
): FrameSlot[] {
  const pool = poolVerbs(data, source);
  const slots: FrameSlot[] = [];
  for (const familyId of families) {
    const allowed = persons === "family" ? familyById(familyId).appliesTo : persons;
    for (const verb of pool) {
      for (const form of verb.forms) {
        if (allowed.includes(form.person) && form.families.includes(familyId)) {
          slots.push({ infinitive: verb.infinitive, person: form.person, familyId });
        }
      }
    }
  }
  return slots;
}
