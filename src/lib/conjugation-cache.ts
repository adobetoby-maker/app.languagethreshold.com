/** Authored catalog is shared; generated/profile-derived tables require an owned factory.
 * The unowned legacy localStorage key is deliberately never read, claimed or changed.
 */
import { z } from "zod";
import { LANGUAGES, type Language } from "../data/languages.ts";
import {
  FREQUENCY_CONJUGATIONS,
  type ConjugationSet,
  type PersonForms,
} from "../data/frequency-conjugations.ts";
import {
  profileForm,
  type VerbFormSlot,
  type VerbProfile,
} from "../components/dictionary/types.ts";
import { packFor, type LanguagePack } from "../data/language-packs/registry.ts";
import { appData } from "../data/language-packs/app-data.ts";
import { carrierPerson } from "./person-carrier.ts";
import type { createLearnerDeviceStore } from "./learner-device-store.ts";

type TableByLanguage = Partial<Record<Language, ConjugationSet>>;
const CATALOG = new Map<string, TableByLanguage>();
const norm = (value: string) => value.trim().normalize("NFC").toLowerCase();
for (const byLanguage of Object.values(FREQUENCY_CONJUGATIONS))
  for (const [language, set] of Object.entries(byLanguage) as [Language, ConjugationSet][])
    if (set?.infinitive)
      CATALOG.set(norm(set.infinitive), { ...CATALOG.get(norm(set.infinitive)), [language]: set });

/** Only static authored/offline seed modules may call this. Owned writes never do. */
export function registerCatalogEntry(language: Language, set: ConjugationSet) {
  const key = norm(set.infinitive);
  if (!key || !LANGUAGES.includes(language)) return;
  const existing = CATALOG.get(key)?.[language];
  if (existing?.pastTense && existing?.futureTense) return;
  CATALOG.set(key, { ...CATALOG.get(key), [language]: structuredClone(set) });
}
export function isInCatalog(language: Language, infinitive: string) {
  return Boolean(CATALOG.get(norm(infinitive))?.[language]);
}
export function getFrequencyConjugation(frequencyId: string, language: Language) {
  const value = FREQUENCY_CONJUGATIONS[frequencyId]?.[language];
  return value ? structuredClone(value) : undefined;
}

/** The six table persons and the profile slot of each tense (a slot the profile lacks is absent). */
const TABLE_PERSONS = [
  ["firstSingular", 1, "singular", "1s"],
  ["secondSingular", 2, "singular", "2s"],
  ["thirdSingular", 3, "singular", "3s"],
  ["firstPlural", 1, "plural", "1p"],
  ["secondPlural", 2, "plural", "2p"],
  ["thirdPlural", 3, "plural", "3p"],
] as const;

/**
 * The profile form a table person takes in `tense`, read only from what the profile and the pack
 * say: the person's own slot, else the slot of the taught key whose subjects include that person's
 * pronoun (Spanish ustedes takes the ellos / ustedes form). Null when neither exists: a cell is
 * never filled with another person's form.
 */
function personForm(
  profile: VerbProfile,
  pack: LanguagePack,
  tense: "present" | "past",
  person: 1 | 2 | 3,
  number: "singular" | "plural",
  slotSuffix: string,
): string | null {
  const own = profileForm(profile, `${tense}.${slotSuffix}` as VerbFormSlot)?.full;
  if (own) return own;
  const carrier = carrierPerson(pack, person, number);
  if (!carrier) return null;
  const suffix = `${carrier.person}${carrier.number === "singular" ? "s" : "p"}`;
  return profileForm(profile, `${tense}.${suffix}` as VerbFormSlot)?.full ?? null;
}

function tenseTable(profile: VerbProfile, pack: LanguagePack, tense: "present" | "past"): PersonForms | null {
  const out: Partial<PersonForms> = {};
  for (const [field, person, number, suffix] of TABLE_PERSONS) {
    const form = personForm(profile, pack, tense, person, number, suffix);
    if (!form) return null;
    out[field] = form;
  }
  return out as PersonForms;
}

/**
 * A conjugation table from a dictionary verb profile, for the profile's own language. Every cell is
 * a form the profile carries for that person (or the form the pack says that person takes); a
 * tense the profile cannot fill in full is left out, and a profile whose present tense is not
 * complete gives null (fail closed: no fabricated persons). The past table's name is the
 * language's own (app/<code>.json pastTenseLabel).
 */
export function conjugationFromVerbProfile(
  infinitive: string,
  profile: VerbProfile,
  language: Language,
): ConjugationSet | null {
  const pack = packFor(language);
  if (!pack) return null;
  const presentTense = tenseTable(profile, pack, "present");
  const gerund = profileForm(profile, "gerund")?.full;
  const pastParticiple = profileForm(profile, "past-participle")?.full;
  if (!presentTense || !gerund || !pastParticiple) return null;
  const pastTense = tenseTable(profile, pack, "past") ?? undefined;
  const pastLabel = pastTense ? (appData(pack).pastTenseLabel ?? undefined) : undefined;
  return {
    infinitive,
    pronunciation: "",
    presentTense,
    pastTense: pastLabel ? pastTense : undefined,
    pastLabel,
    gerund,
    pastParticiple,
    perfectExample: pastParticiple,
    commonUses: [],
  };
}

const Person = z.object({
  firstSingular: z.string().trim().min(1).max(80),
  secondSingular: z.string().trim().min(1).max(80),
  thirdSingular: z.string().trim().min(1).max(80),
  firstPlural: z.string().trim().min(1).max(80),
  secondPlural: z.string().trim().min(1).max(80),
  thirdPlural: z.string().trim().min(1).max(80),
});
const Table = z.object({
  infinitive: z.string().trim().min(1).max(80),
  pronunciation: z.string().max(240),
  presentTense: Person,
  pastTense: Person.optional(),
  pastLabel: z.string().max(80).optional(),
  futureTense: Person.optional(),
  conditionalTense: Person.optional(),
  gerund: z.string().trim().min(1).max(240),
  pastParticiple: z.string().trim().min(1).max(240),
  perfectExample: z.string().trim().min(1).max(600),
  commonUses: z
    .array(
      z.object({
        phrase: z.string().trim().min(1).max(600),
        translation: z.string().trim().min(1).max(600),
      }),
    )
    .max(2),
});
const Context = z.object({
  language: z.enum(LANGUAGES as [Language, ...Language[]]),
  infinitive: z.string().trim().min(1).max(80),
  english: z.string().max(120).optional(),
});
const Saved = z.object({ entries: z.array(Context.extend({ value: Table })).max(100) });
type Entry = z.infer<typeof Saved>["entries"][number];
export interface ConjugationCacheResult {
  data: ConjugationSet | null;
  persisted: boolean;
}
type FetchFn = (args: {
  data: { language: string; infinitive: string; english?: string };
}) => Promise<{ data: ConjugationSet | null; error: string | null }>;

/** One instance per account/guest subtree, with an explicitly owned device store.
 * Dispose on unmount. No implicit owner, raw storage fallback, shared pending work,
 * generated catalog promotion or automatic legacy recovery is permitted here.
 */
export function createOwnedConjugationCache({
  store,
  isCurrent,
}: {
  store: ReturnType<typeof createLearnerDeviceStore>;
  isCurrent: () => boolean;
}) {
  if (store.kind !== "conjugationTables")
    throw new Error("An owned conjugationTables device store is required");
  const entries = new Map<string, { entry: Entry; persisted: boolean }>();
  const pending = new Map<string, Promise<ConjugationCacheResult>>();
  let disposed = false,
    hydrated = false;
  const active = () => !disposed && isCurrent();
  const keyFor = (language: Language, infinitive: string, english?: string) =>
    JSON.stringify([language, norm(infinitive), english ?? null]);
  const empty = (): ConjugationCacheResult => ({ data: null, persisted: false });
  function hydrate() {
    if (!active()) return false;
    if (!hydrated) {
      hydrated = true;
      try {
        const parsed = Saved.safeParse(store.read());
        if (parsed.success)
          for (const entry of parsed.data.entries)
            if (norm(entry.infinitive) === norm(entry.value.infinitive))
              entries.set(keyFor(entry.language, entry.infinitive, entry.english), {
                entry,
                persisted: true,
              });
      } catch {
        /* disposable owned cache unavailable */
      }
    }
    return active();
  }
  function lookup(
    language: Language,
    infinitive: string,
    english?: string,
  ): ConjugationCacheResult {
    if (!active() || !Context.safeParse({ language, infinitive, english }).success) return empty();
    const authored = CATALOG.get(norm(infinitive))?.[language];
    if (authored) return { data: structuredClone(authored), persisted: true };
    if (!hydrate()) return empty();
    const key = keyFor(language, infinitive, english),
      value = entries.get(key);
    if (!value) return empty();
    entries.delete(key);
    entries.set(key, value);
    return { data: structuredClone(value.entry.value), persisted: value.persisted };
  }
  function retryPersistence() {
    if (!hydrate()) return false;
    let persisted = false;
    try {
      persisted =
        active() && store.write({ entries: [...entries.values()].map((value) => value.entry) });
    } catch {
      /* quota-backed owned memory only */
    }
    if (persisted) for (const value of entries.values()) value.persisted = true;
    return active() && persisted;
  }
  function putUserConjugation(
    language: Language,
    value: ConjugationSet,
    english?: string,
  ): ConjugationCacheResult {
    if (!hydrate()) return empty();
    const parsed = Context.extend({ value: Table }).safeParse({
      language,
      infinitive: value?.infinitive,
      english,
      value,
    });
    if (!parsed.success) return empty();
    const entry = parsed.data,
      key = keyFor(language, entry.infinitive, english);
    entries.delete(key);
    entries.set(key, { entry, persisted: false });
    if (entries.size > 100) entries.delete(entries.keys().next().value!);
    const persisted = retryPersistence();
    return active() ? { data: structuredClone(entry.value), persisted } : empty();
  }
  async function ensureConjugation(
    language: Language,
    infinitive: string,
    opts?: { english?: string; fetch?: FetchFn },
  ): Promise<ConjugationCacheResult> {
    const english = opts?.english,
      fetcher = opts?.fetch;
    const existing = lookup(language, infinitive, english);
    if (existing.data) return existing;
    if (!active() || !fetcher || !Context.safeParse({ language, infinitive, english }).success)
      return empty();
    const key = keyFor(language, infinitive, english),
      existingTask = pending.get(key);
    if (existingTask) return existingTask;
    if (pending.size >= 10) return empty();
    const task = Promise.resolve()
      .then(async () => {
        if (!active()) return empty();
        try {
          const result = await fetcher({
            data: { language, infinitive: infinitive.trim(), english },
          });
          if (
            !active() ||
            result.error ||
            !result.data ||
            norm(result.data.infinitive) !== norm(infinitive)
          )
            return empty();
          return putUserConjugation(language, result.data, english);
        } catch {
          return empty();
        }
      })
      .finally(() => {
        if (pending.get(key) === task) pending.delete(key);
      });
    pending.set(key, task);
    return task;
  }
  return {
    getCachedConjugation: (language: Language, infinitive: string, english?: string) =>
      lookup(language, infinitive, english).data ?? undefined,
    putUserConjugation,
    putCachedConjugation: putUserConjugation,
    retryPersistence,
    ensureConjugation,
    seedFromVerbProfile(
      language: Language,
      infinitive: string,
      profile: VerbProfile,
      english?: string,
    ) {
      const existing = lookup(language, infinitive, english);
      if (existing.data?.pastTense && existing.data.futureTense) return existing;
      const table = conjugationFromVerbProfile(infinitive, profile, language);
      if (!table) return empty();
      try {
        return putUserConjugation(language, table, english);
      } catch {
        return empty();
      }
    },
    dispose() {
      disposed = true;
      entries.clear();
      pending.clear();
    },
  };
}
