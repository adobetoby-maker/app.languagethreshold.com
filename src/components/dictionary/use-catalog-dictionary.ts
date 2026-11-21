// Built by TAC — 2026-11-21
// The catalog dictionary: for a language whose lessons come from its pack catalog and whose app
// file names no bundled dictionary dataset (French and Italian in a QA build), the dictionary is the
// catalog's own lesson terms, written at import time to
// content/language-packs/<code>/dictionary-index.json (scripts/build-catalog-dictionaries.mjs) and
// served with the catalog. Every entry carries its pack's code and pack version and is refused when
// they do not match: never another language's words.
import { useEffect, useState } from "react";
import { isBundledPack, packIndexEntry, type LanguagePack } from "@/data/language-packs/registry";
import { appData } from "@/data/language-packs/app-data";
import { getModule } from "@/data/modules";
import { nativeLanguageName } from "@/data/languages";
import type { DictWord, VerbFormSlot, VerbProfile, WordCategory } from "./types";

export interface CatalogDictionaryFile {
  version: 1;
  languageCode: string;
  nativeCode: string;
  packVersion: string;
  entries: { id: string; target: string; native: string; note?: string; moduleId: string }[];
}

interface CatalogDictionary {
  words: DictWord[];
  profiles: Record<string, VerbProfile>;
  phraseExample?: string;
  glossOnly?: string;
  slotLabels: Partial<Record<VerbFormSlot, string>>;
}

const CATEGORY_BY_MODULE_CATEGORY: Record<string, WordCategory> = {
  Medical: "medical",
  Trades: "construction",
  Travel: "hospitality",
  Sports: "sports",
  Faith: "mission",
  Education: "academic",
  Service: "business",
  Agriculture: "daily",
};

/** Validates an untrusted dictionary file against the pack that asked for it. */
export function parseCatalogDictionary(raw: unknown, pack: LanguagePack): DictWord[] | null {
  const file = raw as Partial<CatalogDictionaryFile> | null;
  const index = packIndexEntry(pack);
  if (!file || !index || file.version !== 1) return null;
  if (file.languageCode !== pack.code || file.packVersion !== index.packVersion) return null;
  if (typeof file.nativeCode !== "string" || !pack.native.supported.includes(file.nativeCode))
    return null;
  if (!Array.isArray(file.entries)) return null;
  return file.entries
    .filter((e) => e && typeof e.target === "string" && typeof e.native === "string")
    .map((e) => ({
      id: e.id,
      word: e.target,
      english: e.native,
      pronunciation: "",
      partOfSpeech: "term" as const,
      category: CATEGORY_BY_MODULE_CATEGORY[getModule(e.moduleId)?.category ?? ""] ?? "core",
      context: e.note,
      examples: [],
      moduleId: e.moduleId,
    }));
}

const cache = new Map<string, Promise<DictWord[] | null>>();

function loadCatalogDictionary(pack: LanguagePack): Promise<DictWord[] | null> {
  const existing = cache.get(pack.code);
  if (existing) return existing;
  const pending = fetch(
    `/lesson-content/${encodeURIComponent(pack.code)}/catalog/dictionary-index.json`,
  )
    .then((response) => (response.ok ? response.json() : null))
    .then((raw) => parseCatalogDictionary(raw, pack))
    .catch(() => {
      cache.delete(pack.code);
      return null;
    });
  cache.set(pack.code, pending);
  return pending;
}

/** The catalog dictionary of a bundled catalog pack with no dataset of its own, else null. */
export function useCatalogDictionary(pack: LanguagePack | null): CatalogDictionary | null {
  const eligible = Boolean(
    pack && isBundledPack(pack) && !pack.ids.legacyUnscopedStorage && !appData(pack).dictionary,
  );
  const [words, setWords] = useState<{ code: string; words: DictWord[] } | null>(null);
  useEffect(() => {
    if (!pack || !eligible) return;
    let live = true;
    void loadCatalogDictionary(pack).then((loaded) => {
      if (live && loaded) setWords({ code: pack.code, words: loaded });
    });
    return () => {
      live = false;
    };
  }, [pack, eligible]);
  if (!pack || !eligible || words?.code !== pack.code) return null;
  // Glossed in the catalog's native language (the pack's default native) only.
  return {
    words: words.words,
    profiles: {},
    glossOnly: nativeLanguageName(pack.native.default) ?? undefined,
    slotLabels: {},
  };
}
