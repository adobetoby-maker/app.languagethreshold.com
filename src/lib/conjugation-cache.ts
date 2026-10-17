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
import type { VerbProfile } from "../components/dictionary/types";
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

export function conjugationFromVerbProfile(
  infinitive: string,
  profile: VerbProfile,
  language: Language,
): ConjugationSet {
  const p1 = profile.phase1;
  const p2 = profile.phase2;
  const p3 = profile.phase3;
  const presentTense: PersonForms = {
    firstSingular: p1.presentYo.full,
    secondSingular: p1.presentTu.full,
    thirdSingular: p1.presentEl.full,
    firstPlural: p2.presentNosotros.full,
    secondPlural: p2.presentNosotros.full,
    thirdPlural: p2.presentEllos.full,
  };
  const pastTense: PersonForms | undefined =
    p3.preteriteYo?.full && p3.preteriteEl?.full
      ? {
          firstSingular: p3.preteriteYo.full,
          secondSingular: p3.preteriteYo.full,
          thirdSingular: p3.preteriteEl.full,
          firstPlural: p3.preteriteEl.full,
          secondPlural: p3.preteriteEl.full,
          thirdPlural: p3.preteriteEl.full,
        }
      : undefined;
  const pastLabel =
    language === "Spanish" || language === "Portuguese"
      ? "Preterite"
      : language === "German"
        ? "Simple past"
        : "Imperfect";
  return {
    infinitive,
    pronunciation: "",
    presentTense,
    pastTense,
    pastLabel: pastTense ? pastLabel : undefined,
    gerund: p2.gerund.full,
    pastParticiple: p2.pastParticiple.full,
    perfectExample: p2.pastParticiple.full,
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
      try {
        return putUserConjugation(
          language,
          conjugationFromVerbProfile(infinitive, profile, language),
          english,
        );
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
