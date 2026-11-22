export interface MorphForm {
  full: string;
  stem: string;
  ending: string;
  irregular?: boolean;
  irregularNote?: string;
}

/**
 * A neutral verb-form slot of a dictionary verb profile: `<tense>.<person><number>` (1s = first
 * singular … 3p = third plural) or a non-finite form. Which person a slot is and how it is labelled
 * comes from the dataset and the language's pack, never from the slot name.
 */
export type VerbFormSlot =
  | "imperative.formal"
  | "imperative.informal"
  | "present.1s"
  | "present.2s"
  | "present.3s"
  | "present.1p"
  | "present.3p"
  | "gerund"
  | "past-participle"
  | "subjunctive.3s"
  | "subjunctive.2s"
  | "past.1s"
  | "past.3s";

export interface VerbProfilePhase {
  label: string;
  hint: string;
  forms: { slot: VerbFormSlot; form: MorphForm }[];
}

/** A dictionary verb profile, language-neutral: phases of slot forms. */
export interface VerbProfile {
  stem: string;
  infinitiveEnding?: string | null;
  irregularType?: string | null;
  phases: VerbProfilePhase[];
  englishParallel: string;
  clinicalNote: string;
}

/**
 * Storage format of the generated dictionary profile files (verbProfiles.ts,
 * italianVerbProfiles.ts, written by scripts/generate-lle-dictionary*.mjs). Its field names are the
 * generator's historical slot names; read it only through verbProfileFromAuthored, which maps each
 * field to a neutral VerbFormSlot (AUTHORED_PROFILE_SLOTS).
 */
export interface AuthoredVerbProfile {
  stem: string;
  // Generated source data includes language-specific and legacy values, plus
  // a small number of records using the historical `infiniteEnding` spelling.
  infinitiveEnding?: string | null;
  infiniteEnding?: string | null;
  irregularType?: string | null;
  phase1: { label: string; hint: string } & Record<string, unknown>;
  phase2: { label: string; hint: string } & Record<string, unknown>;
  phase3: { label: string; hint: string } & Record<string, unknown>;
  englishParallel: string;
  clinicalNote: string;
}

/** The generated files' field names → neutral slots. */
export const AUTHORED_PROFILE_SLOTS: Readonly<Record<string, VerbFormSlot>> = {
  imperativeFormal: "imperative.formal",
  imperativeInformal: "imperative.informal",
  presentYo: "present.1s",
  presentTu: "present.2s",
  presentEl: "present.3s",
  gerund: "gerund",
  pastParticiple: "past-participle",
  presentNosotros: "present.1p",
  presentEllos: "present.3p",
  subjunctiveEl: "subjunctive.3s",
  subjunctiveTu: "subjunctive.2s",
  preteriteYo: "past.1s",
  preteriteEl: "past.3s",
};

function isMorphForm(value: unknown): value is MorphForm {
  return Boolean(value) && typeof (value as MorphForm).full === "string";
}

/** A generated profile as a neutral VerbProfile (fields it does not know are left out). */
export function verbProfileFromAuthored(profile: AuthoredVerbProfile): VerbProfile {
  const phases = [profile.phase1, profile.phase2, profile.phase3]
    .filter((phase) => phase && typeof phase === "object")
    .map((phase) => ({
      label: phase.label,
      hint: phase.hint,
      forms: Object.entries(phase).flatMap(([field, value]) => {
        const slot = AUTHORED_PROFILE_SLOTS[field];
        return slot && isMorphForm(value) ? [{ slot, form: value }] : [];
      }),
    }));
  return {
    stem: profile.stem,
    infinitiveEnding: profile.infinitiveEnding ?? profile.infiniteEnding ?? null,
    irregularType: profile.irregularType ?? null,
    phases,
    englishParallel: profile.englishParallel,
    clinicalNote: profile.clinicalNote,
  };
}

/** Every profile of a generated file, as neutral profiles. */
export function verbProfilesFromAuthored(
  profiles: Record<string, AuthoredVerbProfile>,
): Record<string, VerbProfile> {
  return Object.fromEntries(
    Object.entries(profiles).map(([key, value]) => [key, verbProfileFromAuthored(value)]),
  );
}

/** One slot's form of a profile, or undefined. */
export function profileForm(profile: VerbProfile, slot: VerbFormSlot): MorphForm | undefined {
  for (const phase of profile.phases)
    for (const entry of phase.forms) if (entry.slot === slot) return entry.form;
  return undefined;
}

export type WordCategory =
  | "core"
  | "medical"
  | "construction"
  | "roofing"
  | "daily"
  | "mission"
  | "hospitality"
  | "sports"
  | "business"
  | "academic";

export interface DictWord {
  id: string;
  word: string;
  english: string;
  pronunciation: string;
  partOfSpeech: "noun" | "verb" | "adjective" | "phrase" | "term";
  gender?: "masculine" | "feminine";
  category: WordCategory;
  context?: string;
  verbProfileId?: string;
  verbProfile?: VerbProfile;
  examples: { target: string; english: string }[];
  lessonHref?: string;
  moduleId?: string;
}
