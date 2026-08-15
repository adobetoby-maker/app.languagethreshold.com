/**
 * Conjugation registry — catalog first, AI only for novel verbs.
 *
 * Resolution order (never hits the network for known verbs):
 *   1. Static CATALOG — hand-authored frequency tables + offline atlas seeds
 *   2. USER_CACHE — localStorage results from one-time AI fills for *new* verbs
 *   3. AI (ensureConjugation) — only when the verb is in neither 1 nor 2
 *
 * Opening a flashcard or dictionary entry for a catalogued verb = zero AI calls.
 */

import type { Language } from "@/state/app-state";
import {
  FREQUENCY_CONJUGATIONS,
  type ConjugationSet,
  type PersonForms,
} from "@/data/frequency-conjugations";
import type { VerbProfile } from "@/components/dictionary/types";

const USER_CACHE_KEY = "lingualens.conjugations.v1";

type Store = Record<string, Partial<Record<Language, ConjugationSet>>>;

function norm(infinitive: string): string {
  return infinitive.trim().toLowerCase();
}

const CATALOG: Store = {};

function indexFrequencyIntoCatalog() {
  for (const byLang of Object.values(FREQUENCY_CONJUGATIONS)) {
    for (const [lang, set] of Object.entries(byLang) as [Language, ConjugationSet][]) {
      if (!set?.infinitive) continue;
      const key = norm(set.infinitive);
      if (!CATALOG[key]) CATALOG[key] = {};
      CATALOG[key][lang] = set;
    }
  }
}
indexFrequencyIntoCatalog();

export function registerCatalogEntry(language: Language, set: ConjugationSet) {
  const key = norm(set.infinitive);
  if (!key) return;
  if (!CATALOG[key]) CATALOG[key] = {};
  const existing = CATALOG[key][language];
  if (existing?.pastTense && existing?.futureTense) return;
  CATALOG[key][language] = set;
}

export function isInCatalog(language: Language, infinitive: string): boolean {
  return Boolean(CATALOG[norm(infinitive)]?.[language]);
}

function readUserCache(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeUserCache(store: Store) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(store));
  } catch {
    /* quota / private mode */
  }
}

export function putUserConjugation(language: Language, set: ConjugationSet) {
  const key = norm(set.infinitive);
  if (!key) return;
  const store = readUserCache();
  store[key] = { ...(store[key] ?? {}), [language]: set };
  writeUserCache(store);
  registerCatalogEntry(language, set);
}

export function putCachedConjugation(language: Language, set: ConjugationSet) {
  putUserConjugation(language, set);
}

export function getFrequencyConjugation(
  frequencyId: string,
  language: Language,
): ConjugationSet | undefined {
  return FREQUENCY_CONJUGATIONS[frequencyId]?.[language];
}

export function getCachedConjugation(
  language: Language,
  infinitive: string,
): ConjugationSet | undefined {
  const key = norm(infinitive);
  if (!key) return undefined;
  const fromCatalog = CATALOG[key]?.[language];
  if (fromCatalog) return fromCatalog;
  return readUserCache()[key]?.[language];
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

export function seedFromVerbProfile(
  language: Language,
  infinitive: string,
  profile: VerbProfile,
) {
  const existing = getCachedConjugation(language, infinitive);
  if (existing?.pastTense && existing?.futureTense) return;
  registerCatalogEntry(
    language,
    conjugationFromVerbProfile(infinitive, profile, language),
  );
}

type FetchFn = (args: {
  data: { language: string; infinitive: string; english?: string };
}) => Promise<{ data: ConjugationSet | null; error: string | null }>;

const inflight = new Map<string, Promise<ConjugationSet | null>>();

export async function ensureConjugation(
  language: Language,
  infinitive: string,
  opts?: { english?: string; fetch?: FetchFn },
): Promise<ConjugationSet | null> {
  const existing = getCachedConjugation(language, infinitive);
  if (existing) return existing;
  if (!opts?.fetch) return null;
  const key = `${language}|${norm(infinitive)}`;
  const pending = inflight.get(key);
  if (pending) return pending;
  const task = (async () => {
    try {
      const res = await opts.fetch!({
        data: {
          language,
          infinitive: infinitive.trim(),
          english: opts.english,
        },
      });
      if (res.data) {
        putUserConjugation(language, res.data);
        return res.data;
      }
      return null;
    } catch {
      return null;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, task);
  return task;
}
