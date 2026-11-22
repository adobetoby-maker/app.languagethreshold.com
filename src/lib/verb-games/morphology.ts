// Built by TAC — 2026-11-21
// Verb Games morphology plugins (language-pack model section 19: "a morphology plugin is engine
// code, not a field read"). The pattern games (Bubble Pop, Verb Crush, the series) run on a
// language's compiled pattern data, and the compile, classification and distractors are written
// for one morphology. A pack names its morphology in dictionary.morphology (or `<code>-verbs`); the
// games are offered only when that id has a plugin here AND the pack's app file names a compiled
// pattern file (load-patterns.ts). Nothing outside a plugin names a language's persons or endings.

import type { LanguagePack } from "../../data/language-packs/types.ts";
import type { Person } from "./types.ts";
import type { VerbFormSlot } from "../../components/dictionary/types.ts";

export interface VerbGameMorphology {
  /** The plugin id a pack names in dictionary.morphology. */
  id: string;
  /** The pack verb keys the games drill, in learning order (the plugin's own persons). */
  persons: readonly Person[];
  /** The dictionary profile slot each person's present form is read from. */
  profileSlots: Readonly<Record<Person, VerbFormSlot>>;
}

/**
 * The es-verbs plugin: present-tense -ar/-er/-ir endings, yo-irregulars and stem changes
 * (classify.ts, compile.ts, distractors.ts, crush.ts endings). Its persons are the Spanish pack's
 * required verb keys (no vosotros).
 */
const ES_VERBS: VerbGameMorphology = {
  id: "es-verbs",
  persons: ["yo", "tú", "él_ella_usted", "nosotros", "ellos_ustedes"],
  profileSlots: {
    yo: "present.1s",
    tú: "present.2s",
    él_ella_usted: "present.3s",
    nosotros: "present.1p",
    ellos_ustedes: "present.3p",
  },
};

const PLUGINS: readonly VerbGameMorphology[] = [ES_VERBS];

/** The morphology id a pack names (its own `<code>-verbs` when the field is empty). */
export function morphologyIdOf(pack: LanguagePack): string {
  return pack.dictionary.morphology ?? `${pack.code}-verbs`;
}

/** The verb-game plugin for a pack's morphology, or null (fail closed: no games). */
export function verbGameMorphology(pack: LanguagePack): VerbGameMorphology | null {
  const id = morphologyIdOf(pack);
  return PLUGINS.find((plugin) => plugin.id === id) ?? null;
}

/**
 * The persons of the compiled pattern data the shared game engine runs on. Compiled data exists only
 * for es-verbs today, so the engine reads that plugin's persons; a second plugin passes its own.
 */
export const COMPILED_PERSONS: readonly Person[] = ES_VERBS.persons;

/** The profile slots of the compiled data's persons (see COMPILED_PERSONS). */
export const COMPILED_PROFILE_SLOTS: Readonly<Record<Person, VerbFormSlot>> = ES_VERBS.profileSlots;
