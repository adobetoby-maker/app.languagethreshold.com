import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { Language } from "./app-state";
import { FREQUENCY_WORDS } from "@/data/frequency-words";
import { DECK_PRONOUNS } from "@/data/deck-pronouns";
import { DECK_NOUNS } from "@/data/deck-nouns";
import { DECK_PHRASES } from "@/data/deck-phrases";
import { DECK_GRAMMAR } from "@/data/deck-grammar";
import { MODULE_DECKS } from "@/data/deck-modules";
import { buildConjugatedDeck } from "@/data/deck-conjugated";
import type { DeckWord } from "@/data/deck-pronouns";
import { newSrsFields, schedule, isDue, type SrsFields, type SrsGrade } from "@/lib/srs";

export const FLASHCARD_CATEGORIES = [
  "vocab",
  "verbs",
  "nouns",
  "pronouns",
  "grammar",
  "conjugated",
  "phrases",
  "module",
] as const;
// The fixed sections above plus "block" — dynamic per-profession topic decks
// (Faith/Medical/Trades/...) sourced from lib/flashcard-blocks and translated
// on demand, one persistent card per word (unlike the old FlashcardDecks,
// which re-translated every session and threw the results away).
export type FlashcardCategory = (typeof FLASHCARD_CATEGORIES)[number] | "block";

export const CATEGORY_LABEL: Record<(typeof FLASHCARD_CATEGORIES)[number], string> = {
  vocab: "Vocab (your words)",
  verbs: "Verbs",
  nouns: "Nouns",
  pronouns: "Pronouns",
  grammar: "High-Frequency Grammar",
  conjugated: "Pre-Conjugated Verbs",
  phrases: "Short Phrases",
  module: "Module Topic",
};

export interface FlashcardEntry {
  id: string;
  language: Language;
  word: string;
  romanization?: string;
  translation: string;
  partOfSpeech?: string;
  example: string;
  exampleTranslation: string;
  category: FlashcardCategory;
  source: "starter" | "user";
  frequencyId?: string; // matches FrequencyWordEntry.id (starter/conjugated cards only) — looks up the full conjugation table
  moduleId?: string; // matches AppModule.id (module cards only)
  blockId?: string; // matches FlashBlock.id (block cards only)
  addedAt: number;
  srs: SrsFields;
}

interface State {
  cards: Record<string, FlashcardEntry>; // by id
  seededLanguages: Language[]; // languages whose starter deck has been added
  seededDecks: string[]; // `${language}:${category}` or `${language}:module:${moduleId}` pairs already synced
  hydrated: boolean;
}

type Action =
  | {
      type: "HYDRATE";
      payload: {
        cards: Record<string, FlashcardEntry>;
        seededLanguages: Language[];
        seededDecks?: string[];
      };
    }
  | { type: "SEED_STARTER"; payload: { language: Language; now?: number } }
  | {
      type: "SEED_DECK";
      payload: { language: Language; category: FlashcardCategory; moduleId?: string; now?: number };
    }
  | {
      type: "ADD_CARD";
      payload: Omit<FlashcardEntry, "id" | "srs" | "addedAt" | "source" | "category"> & {
        now?: number;
      };
    }
  | {
      type: "SYNC_VOCAB";
      payload: { language: Language; items: { word: string; translation: string }[]; now?: number };
    }
  | {
      type: "ADD_BLOCK_CARDS";
      payload: {
        language: Language;
        blockId: string;
        pairs: { english: string; translation: string }[];
        now?: number;
      };
    }
  | { type: "REVIEW_CARD"; payload: { id: string; grade: SrsGrade; now?: number } }
  | { type: "REMOVE_CARD"; payload: { id: string } };

const STORAGE_KEY = "lingualens.flashcards.v2";

function starterId(language: Language, wordId: string) {
  return `starter:${language}:${wordId}`;
}
function userId(language: Language, word: string) {
  return `user:${language}:${word.toLowerCase().trim()}`;
}
function deckCardId(category: FlashcardCategory, language: Language, wordId: string) {
  return `deck:${category}:${language}:${wordId}`;
}

function deckWordsForCategory(category: FlashcardCategory): DeckWord[] | null {
  switch (category) {
    case "nouns":
      return DECK_NOUNS;
    case "pronouns":
      return DECK_PRONOUNS;
    case "grammar":
      return DECK_GRAMMAR;
    case "phrases":
      return DECK_PHRASES;
    case "conjugated":
      return buildConjugatedDeck();
    default:
      return null;
  }
}

// Syncs a non-verb deck category into cards for a language, in place —
// same pattern as SEED_STARTER: creates missing cards, refreshes content on
// existing ones without resetting SRS progress, never seeds twice.
function syncDeckCategory(
  cards: Record<string, FlashcardEntry>,
  category: FlashcardCategory,
  language: Language,
  now: number,
): { cards: Record<string, FlashcardEntry>; changed: boolean } {
  const words = deckWordsForCategory(category);
  if (!words) return { cards, changed: false };
  const next = { ...cards };
  let changed = false;
  for (const entry of words) {
    const t = entry.translations[language];
    if (!t) continue;
    const id = deckCardId(category, language, entry.id);
    const example = t.note ? `${t.example}` : t.example;
    const existing = next[id];
    if (existing) {
      if (
        existing.word !== t.word ||
        existing.romanization !== t.romanization ||
        existing.translation !== entry.english ||
        existing.example !== example ||
        existing.exampleTranslation !== t.exampleTranslation
      ) {
        next[id] = {
          ...existing,
          word: t.word,
          romanization: t.romanization,
          translation: t.note ? `${entry.english} — ${t.note}` : entry.english,
          partOfSpeech: entry.partOfSpeech,
          example,
          exampleTranslation: t.exampleTranslation,
        };
        changed = true;
      }
      continue;
    }
    next[id] = {
      id,
      language,
      word: t.word,
      romanization: t.romanization,
      translation: t.note ? `${entry.english} — ${t.note}` : entry.english,
      partOfSpeech: entry.partOfSpeech,
      example,
      exampleTranslation: t.exampleTranslation,
      category,
      source: "starter",
      addedAt: now,
      srs: newSrsFields(now),
    };
    changed = true;
  }
  return { cards: next, changed };
}

function syncModuleDeck(
  cards: Record<string, FlashcardEntry>,
  moduleId: string,
  language: Language,
  now: number,
): { cards: Record<string, FlashcardEntry>; changed: boolean } {
  const words = MODULE_DECKS[moduleId];
  if (!words) return { cards, changed: false };
  const next = { ...cards };
  let changed = false;
  for (const entry of words) {
    const t = entry.translations[language];
    if (!t) continue;
    const id = deckCardId("module", language, `${moduleId}:${entry.id}`);
    const existing = next[id];
    if (existing) {
      if (
        existing.word !== t.word ||
        existing.translation !== entry.english ||
        existing.example !== t.example
      ) {
        next[id] = {
          ...existing,
          word: t.word,
          romanization: t.romanization,
          translation: entry.english,
          example: t.example,
          exampleTranslation: t.exampleTranslation,
        };
        changed = true;
      }
      continue;
    }
    next[id] = {
      id,
      language,
      word: t.word,
      romanization: t.romanization,
      translation: entry.english,
      partOfSpeech: entry.partOfSpeech,
      example: t.example,
      exampleTranslation: t.exampleTranslation,
      category: "module",
      moduleId,
      source: "starter",
      addedAt: now,
      srs: newSrsFields(now),
    };
    changed = true;
  }
  return { cards: next, changed };
}

// `sections` accepts fixed category names plus "block:<blockId>" tokens for
// the dynamic topic decks.
function matchesSection(c: FlashcardEntry, sections: string[]): boolean {
  return c.category === "block"
    ? sections.includes(`block:${c.blockId}`)
    : sections.includes(c.category);
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, ...action.payload, hydrated: true };

    case "SEED_STARTER": {
      // Always syncs (not just first-visit): creates any missing starter card,
      // and refreshes content fields (translation/example/etc.) on existing
      // starter cards without touching their SRS progress — so content fixes
      // like "use" -> "to use" reach decks that were already seeded, instead
      // of getting stuck the way the pre-schema-validation grammar cache did.
      const { language } = action.payload;
      const now = action.payload.now ?? Date.now();
      const cards = { ...state.cards };
      let changed = false;
      for (const entry of FREQUENCY_WORDS) {
        const t = entry.translations[language];
        if (!t) continue;
        const id = starterId(language, entry.id);
        const existing = cards[id];
        if (existing) {
          if (
            existing.word !== t.word ||
            existing.romanization !== t.romanization ||
            existing.translation !== entry.english ||
            existing.example !== t.example ||
            existing.exampleTranslation !== t.exampleTranslation ||
            existing.frequencyId !== entry.id
          ) {
            cards[id] = {
              ...existing,
              word: t.word,
              romanization: t.romanization,
              translation: entry.english,
              partOfSpeech: entry.partOfSpeech,
              example: t.example,
              exampleTranslation: t.exampleTranslation,
              frequencyId: entry.id,
            };
            changed = true;
          }
          continue;
        }
        cards[id] = {
          id,
          language,
          word: t.word,
          romanization: t.romanization,
          translation: entry.english,
          partOfSpeech: entry.partOfSpeech,
          example: t.example,
          exampleTranslation: t.exampleTranslation,
          category: "verbs",
          source: "starter",
          frequencyId: entry.id,
          addedAt: now,
          srs: newSrsFields(now),
        };
        changed = true;
      }
      const seededLanguages = state.seededLanguages.includes(language)
        ? state.seededLanguages
        : [...state.seededLanguages, language];
      if (!changed && seededLanguages === state.seededLanguages) return state;
      return { ...state, cards, seededLanguages };
    }

    case "SEED_DECK": {
      const { language, category, moduleId, now: nowArg } = action.payload;
      const now = nowArg ?? Date.now();
      const deckKey =
        category === "module" ? `${language}:module:${moduleId}` : `${language}:${category}`;
      const { cards, changed } =
        category === "module" && moduleId
          ? syncModuleDeck(state.cards, moduleId, language, now)
          : syncDeckCategory(state.cards, category, language, now);
      const seededDecks = state.seededDecks.includes(deckKey)
        ? state.seededDecks
        : [...state.seededDecks, deckKey];
      if (!changed && seededDecks === state.seededDecks) return state;
      return { ...state, cards, seededDecks };
    }

    case "SYNC_VOCAB": {
      // Mirrors the user's "My Vocab" list (app-state userVocab, fed by the
      // Reader's save-word button and guided Q&A) into the vocab category —
      // in place, preserving SRS progress on already-synced words. This is
      // what makes WordCard's "Study your saved words" flow land on a page
      // that actually contains those words.
      const { language, items } = action.payload;
      const now = action.payload.now ?? Date.now();
      const cards = { ...state.cards };
      let changed = false;
      for (const item of items) {
        if (!item.word?.trim()) continue;
        const id = userId(language, item.word);
        const existing = cards[id];
        if (existing) {
          if (existing.translation !== item.translation) {
            cards[id] = { ...existing, translation: item.translation };
            changed = true;
          }
          continue;
        }
        cards[id] = {
          id,
          language,
          word: item.word,
          translation: item.translation,
          example: "",
          exampleTranslation: "",
          category: "vocab",
          source: "user",
          addedAt: now,
          srs: newSrsFields(now),
        };
        changed = true;
      }
      if (!changed) return state;
      return { ...state, cards };
    }

    case "ADD_CARD": {
      const { now, ...entry } = action.payload;
      const ts = now ?? Date.now();
      const id = userId(entry.language, entry.word);
      if (state.cards[id]) return state; // already saved
      return {
        ...state,
        cards: {
          ...state.cards,
          [id]: {
            ...entry,
            id,
            category: "vocab",
            source: "user",
            addedAt: ts,
            srs: newSrsFields(ts),
          },
        },
      };
    }

    case "ADD_BLOCK_CARDS": {
      // Introduces a translated batch from a topic block. Keyed by the
      // English headword so re-introducing never duplicates or resets SRS.
      const { language, blockId, pairs } = action.payload;
      const now = action.payload.now ?? Date.now();
      const cards = { ...state.cards };
      let changed = false;
      for (const pair of pairs) {
        if (!pair.english?.trim() || !pair.translation?.trim()) continue;
        const id = `block:${language}:${blockId}:${pair.english.toLowerCase().trim()}`;
        if (cards[id]) continue;
        cards[id] = {
          id,
          language,
          word: pair.translation,
          translation: pair.english,
          example: "",
          exampleTranslation: "",
          category: "block",
          blockId,
          source: "starter",
          addedAt: now,
          srs: newSrsFields(now),
        };
        changed = true;
      }
      if (!changed) return state;
      return { ...state, cards };
    }

    case "REVIEW_CARD": {
      const card = state.cards[action.payload.id];
      if (!card) return state;
      const now = action.payload.now ?? Date.now();
      return {
        ...state,
        cards: {
          ...state.cards,
          [card.id]: { ...card, srs: schedule(card.srs, action.payload.grade, now) },
        },
      };
    }

    case "REMOVE_CARD": {
      const next = { ...state.cards };
      delete next[action.payload.id];
      return { ...state, cards: next };
    }

    default:
      return state;
  }
}

const Ctx = createContext<{
  state: State;
  seedStarter: (language: Language) => void;
  seedDeck: (language: Language, category: FlashcardCategory, moduleId?: string) => void;
  syncVocab: (language: Language, items: { word: string; translation: string }[]) => void;
  addBlockCards: (
    language: Language,
    blockId: string,
    pairs: { english: string; translation: string }[],
  ) => void;
  addCard: (entry: Omit<FlashcardEntry, "id" | "srs" | "addedAt" | "source" | "category">) => void;
  reviewCard: (id: string, grade: SrsGrade) => void;
  removeCard: (id: string) => void;
  hasCard: (language: Language, word: string) => boolean;
  cardsForLanguage: (language: Language) => FlashcardEntry[];
  dueCardsForLanguage: (language: Language) => FlashcardEntry[];
  cardsForCategories: (language: Language, sections: string[]) => FlashcardEntry[];
  dueCardsForCategories: (language: Language, sections: string[]) => FlashcardEntry[];
  hasModuleDeck: (moduleId: string) => boolean;
} | null>(null);

export function FlashcardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    cards: {},
    seededLanguages: [],
    seededDecks: [],
    hydrated: false,
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        dispatch({
          type: "HYDRATE",
          payload: {
            cards: parsed.cards ?? {},
            seededLanguages: parsed.seededLanguages ?? [],
            seededDecks: parsed.seededDecks ?? [],
          },
        });
      } else {
        dispatch({ type: "HYDRATE", payload: { cards: {}, seededLanguages: [], seededDecks: [] } });
      }
    } catch {
      dispatch({ type: "HYDRATE", payload: { cards: {}, seededLanguages: [], seededDecks: [] } });
    }
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          cards: state.cards,
          seededLanguages: state.seededLanguages,
          seededDecks: state.seededDecks,
        }),
      );
    } catch {
      /* ignore quota */
    }
  }, [state.cards, state.seededLanguages, state.seededDecks, state.hydrated]);

  const seedStarter = useCallback(
    (language: Language) => dispatch({ type: "SEED_STARTER", payload: { language } }),
    [],
  );
  const seedDeck = useCallback(
    (language: Language, category: FlashcardCategory, moduleId?: string) =>
      dispatch({ type: "SEED_DECK", payload: { language, category, moduleId } }),
    [],
  );
  const syncVocab = useCallback(
    (language: Language, items: { word: string; translation: string }[]) =>
      dispatch({ type: "SYNC_VOCAB", payload: { language, items } }),
    [],
  );
  const addBlockCards = useCallback(
    (language: Language, blockId: string, pairs: { english: string; translation: string }[]) =>
      dispatch({ type: "ADD_BLOCK_CARDS", payload: { language, blockId, pairs } }),
    [],
  );
  const addCard = useCallback(
    (entry: Omit<FlashcardEntry, "id" | "srs" | "addedAt" | "source" | "category">) =>
      dispatch({ type: "ADD_CARD", payload: entry }),
    [],
  );
  const reviewCard = useCallback(
    (id: string, grade: SrsGrade) => dispatch({ type: "REVIEW_CARD", payload: { id, grade } }),
    [],
  );
  const removeCard = useCallback(
    (id: string) => dispatch({ type: "REMOVE_CARD", payload: { id } }),
    [],
  );
  const hasCard = useCallback(
    (language: Language, word: string) => userId(language, word) in state.cards,
    [state.cards],
  );
  const cardsForLanguage = useCallback(
    (language: Language) => Object.values(state.cards).filter((c) => c.language === language),
    [state.cards],
  );
  const dueCardsForLanguage = useCallback(
    (language: Language) =>
      Object.values(state.cards)
        .filter((c) => c.language === language && isDue(c.srs))
        .sort((a, b) => a.srs.dueDate - b.srs.dueDate),
    [state.cards],
  );
  const cardsForCategories = useCallback(
    (language: Language, sections: string[]) =>
      Object.values(state.cards).filter(
        (c) => c.language === language && matchesSection(c, sections),
      ),
    [state.cards],
  );
  const dueCardsForCategories = useCallback(
    (language: Language, sections: string[]) =>
      Object.values(state.cards)
        .filter((c) => c.language === language && matchesSection(c, sections) && isDue(c.srs))
        .sort((a, b) => a.srs.dueDate - b.srs.dueDate),
    [state.cards],
  );
  const hasModuleDeck = useCallback((moduleId: string) => moduleId in MODULE_DECKS, []);

  const value = useMemo(
    () => ({
      state,
      seedStarter,
      seedDeck,
      syncVocab,
      addBlockCards,
      addCard,
      reviewCard,
      removeCard,
      hasCard,
      cardsForLanguage,
      dueCardsForLanguage,
      cardsForCategories,
      dueCardsForCategories,
      hasModuleDeck,
    }),
    [
      state,
      seedStarter,
      seedDeck,
      syncVocab,
      addBlockCards,
      addCard,
      reviewCard,
      removeCard,
      hasCard,
      cardsForLanguage,
      dueCardsForLanguage,
      cardsForCategories,
      dueCardsForCategories,
      hasModuleDeck,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFlashcards() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFlashcards must be used inside FlashcardProvider");
  return c;
}
