import { z } from "zod";
import {
  LEGACY_GAMES,
  isLegacyGameKind,
  normalizeLegacyGame,
  countLegacyGame,
  mergeLegacyGame,
} from "./legacy-game-recovery.ts";
import {
  createLearnerDeviceStore,
  learnerDeviceKey,
  type LearnerStorage,
} from "./learner-device-store.ts";

export const LEGACY_PRACTICE = {
  notes: { key: "lt.annotations.v1", label: "Reader notes and highlights" },
  flashcards: { key: "lingualens.flashcards.v2", label: "Flashcards and review schedules" },
  tutor: { key: "lt.tutor.v1", label: "Tutor conversations" },
  speak: { key: "lt.speak.v1", label: "Speaking practice history" },
  grammar: { key: "lt.grammar.v2", label: "Grammar lessons and progress" },
  speech: { key: "lt.speech.v1", label: "Listening history and voice settings" },
  heardWords: { key: "lt.speech.recentWords.v1", label: "Recently heard words" },
  ...LEGACY_GAMES,
} as const;
export type LegacyPracticeKind = keyof typeof LEGACY_PRACTICE;
const str = z.string();
const num = z.number().finite();
const notes = z.array(
  z.object({
    id: str,
    textId: str,
    pane: z.enum(["left", "right"]),
    sentenceIndex: num,
    selectedText: str,
    noteText: str.optional(),
    createdAt: num,
  }),
);
const card = z.object({
  id: str,
  language: str,
  word: str,
  translation: str,
  example: str,
  exampleTranslation: str,
  category: z.enum([
    "vocab",
    "verbs",
    "nouns",
    "pronouns",
    "grammar",
    "conjugated",
    "phrases",
    "module",
    "block",
  ]),
  source: z.enum(["starter", "user"]),
  addedAt: num,
  srs: z.object({
    easeFactor: num,
    interval: num,
    repetitions: num,
    dueDate: num,
    lastReviewedAt: num.nullable(),
  }),
  romanization: str.optional(),
  partOfSpeech: str.optional(),
  frequencyId: str.optional(),
  moduleId: str.optional(),
  blockId: str.optional(),
});
const cards = z.object({
  cards: z.record(z.string(), card),
  seededLanguages: z.array(str).default([]),
  seededDecks: z.array(str).default([]),
});
const message = z.object({
  id: str,
  role: z.enum(["user", "assistant"]),
  content: str,
  createdAt: num,
});
const context = z.object({
  threadId: str,
  textTitle: str.optional(),
  selectedWord: str,
  selectedSentence: str,
  passage: str,
  wordExplanation: str,
  sentenceIndex: num.optional(),
  chapterIndex: num.optional(),
});
const tutor = z.object({
  threads: z.record(z.string(), z.array(message)),
  sourceContexts: z.record(z.string(), context).default({}),
});
const turn = z.object({
  id: str,
  role: z.enum(["user", "ai"]),
  text: str,
  createdAt: num,
  tip: str.nullable().optional(),
});
const speak = z.record(
  z.string(),
  z.union([z.array(turn), z.object({ turns: z.array(turn), exchanges: num, totalSeconds: num })]),
);
const grammarContent = z.object({
  explanation: str,
  examples: z.array(z.object({ target: str, english: str })),
  keyRule: str,
  morphology: z
    .object({
      summary: str,
      base: z.object({
        word: str,
        romanization: str.optional(),
        root: str,
        ending: str,
        gloss: str,
      }),
      table: z.array(
        z.object({
          form: str,
          root: str,
          ending: str,
          full: str,
          romanization: str.optional(),
          english: str,
        }),
      ),
    })
    .optional(),
});
const grammar = z.object({
  store: z.record(
    z.string(),
    z.partialRecord(
      z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
      z.object({
        lessons: z.array(z.object({ id: str, title: str, concept: str })),
        contents: z.record(z.string(), grammarContent),
        completed: z.record(z.string(), z.boolean()),
      }),
    ),
  ),
  badges: z.array(str).default([]),
});
const speech = z.object({
  rate: num.optional(),
  listenedCount: num.nonnegative().default(0),
  voiceByLang: z.record(z.string(), str).default({}),
  accentByLang: z.record(z.string(), str).default({}),
});
const heardWords = z.array(str);
const safeEntries = <T>(record: Record<string, T>) =>
  Object.entries(record).filter(
    ([key]) => !["__proto__", "constructor", "prototype"].includes(key),
  );
const unique = <T extends { id: string }>(older: T[], current: T[]) => [
  ...new Map([...older, ...current].map((item) => [item.id, item])).values(),
];
function parseJson(raw: string) {
  if (raw.length > 8 * 1024 * 1024) throw Error("This save is too large for automatic recovery.");
  return JSON.parse(raw) as unknown;
}
function normalize(kind: LegacyPracticeKind, value: unknown): unknown {
  if (isLegacyGameKind(kind)) return normalizeLegacyGame(kind, value);
  if (kind === "notes") return notes.parse(value);
  if (kind === "flashcards") return cards.parse(value);
  if (kind === "grammar") return grammar.parse(value);
  if (kind === "speech") return speech.parse(value);
  if (kind === "heardWords") return [...new Set(heardWords.parse(value))].slice(0, 20);
  if (kind === "tutor") {
    const object = value && typeof value === "object" ? value : {};
    return tutor.parse("threads" in object ? value : { threads: value, sourceContexts: {} });
  }
  return Object.fromEntries(
    safeEntries(speak.parse(value)).map(([language, data]) => [
      language,
      Array.isArray(data) ? { turns: data, exchanges: 0, totalSeconds: 0 } : data,
    ]),
  );
}
function count(kind: LegacyPracticeKind, value: unknown): number {
  if (isLegacyGameKind(kind)) return countLegacyGame(kind, value);
  if (kind === "notes") return notes.parse(value).length;
  if (kind === "flashcards") return Object.keys(cards.parse(value).cards).length;
  if (kind === "grammar") {
    const data = grammar.parse(value);
    return (
      data.badges.length +
      Object.values(data.store).reduce(
        (total, levels) =>
          total +
          Object.values(levels).reduce(
            (n, level) =>
              n +
              Math.max(
                level.lessons.length,
                Object.keys(level.contents).length,
                Object.keys(level.completed).length,
              ),
            0,
          ),
        0,
      )
    );
  }
  if (kind === "speech") {
    speech.parse(value);
    return 1;
  }
  if (kind === "heardWords") return heardWords.parse(value).length;
  if (kind === "tutor")
    return Object.values(tutor.parse(value).threads).reduce((n, thread) => n + thread.length, 0);
  return Object.values(speak.parse(value)).reduce(
    (n, data) => n + (Array.isArray(data) ? data.length : data.turns.length),
    0,
  );
}
function merge(kind: LegacyPracticeKind, old: unknown, current: unknown): unknown {
  if (current === null) return old;
  if (isLegacyGameKind(kind)) return mergeLegacyGame(kind, old, current);
  if (kind === "notes") return unique(notes.parse(old), notes.parse(current));
  if (kind === "heardWords")
    return [...new Set([...heardWords.parse(current), ...heardWords.parse(old)])].slice(0, 20);
  if (kind === "speech") {
    const a = speech.parse(old),
      b = speech.parse(current);
    return {
      ...a,
      ...b,
      listenedCount: Math.max(a.listenedCount, b.listenedCount),
      voiceByLang: Object.fromEntries([
        ...safeEntries(a.voiceByLang),
        ...safeEntries(b.voiceByLang),
      ]),
      accentByLang: Object.fromEntries([
        ...safeEntries(a.accentByLang),
        ...safeEntries(b.accentByLang),
      ]),
    };
  }
  if (kind === "grammar") {
    const a = grammar.parse(old),
      b = grammar.parse(current);
    const store = Object.fromEntries(safeEntries(a.store));
    for (const [language, levels] of safeEntries(b.store)) {
      const next = { ...store[language] };
      for (const [level, data] of Object.entries(levels)) {
        const key = level as keyof typeof levels;
        const prev = next[key];
        next[key] = prev
          ? {
              lessons: unique(prev.lessons, data.lessons),
              contents: Object.fromEntries([
                ...safeEntries(prev.contents),
                ...safeEntries(data.contents),
              ]),
              completed: Object.fromEntries([
                ...safeEntries(prev.completed),
                ...safeEntries(data.completed),
              ]),
            }
          : data;
      }
      store[language] = next;
    }
    return { store, badges: [...new Set([...a.badges, ...b.badges])] };
  }
  if (kind === "flashcards") {
    const a = cards.parse(old),
      b = cards.parse(current);
    return {
      cards: Object.fromEntries([...safeEntries(a.cards), ...safeEntries(b.cards)]),
      seededLanguages: [...new Set([...a.seededLanguages, ...b.seededLanguages])],
      seededDecks: [...new Set([...a.seededDecks, ...b.seededDecks])],
    };
  }
  if (kind === "tutor") {
    const a = tutor.parse(old),
      b = tutor.parse(current);
    const threads = Object.fromEntries(safeEntries(a.threads));
    for (const [id, messages] of safeEntries(b.threads))
      threads[id] = unique(threads[id] ?? [], messages).sort((x, y) => x.createdAt - y.createdAt);
    return {
      threads,
      sourceContexts: Object.fromEntries([
        ...safeEntries(a.sourceContexts),
        ...safeEntries(b.sourceContexts),
      ]),
    };
  }
  const a = normalize("speak", old) as Record<
    string,
    { turns: z.infer<typeof turn>[]; exchanges: number; totalSeconds: number }
  >;
  const b = normalize("speak", current) as typeof a;
  const result = Object.fromEntries(safeEntries(a));
  for (const [language, data] of safeEntries(b)) {
    const prev = result[language];
    result[language] = prev
      ? {
          turns: unique(prev.turns, data.turns).sort((x, y) => x.createdAt - y.createdAt),
          exchanges: Math.max(prev.exchanges, data.exchanges),
          totalSeconds: Math.max(prev.totalSeconds, data.totalSeconds),
        }
      : data;
  }
  return result;
}
function receiptKey(kind: LegacyPracticeKind) {
  return `lt.legacy-practice-claim.v1.${kind}`;
}
function claimedBy(storage: LearnerStorage, kind: LegacyPracticeKind): string | null {
  const raw = storage.getItem(receiptKey(kind));
  if (raw === null) return null;
  const value = parseJson(raw);
  if (
    !value ||
    typeof value !== "object" ||
    !("schema" in value) ||
    value.schema !== 1 ||
    !("actor" in value) ||
    typeof value.actor !== "string"
  )
    throw Error("Recovery ownership could not be checked.");
  return value.actor;
}
export function inspectLegacyPractice(storage: LearnerStorage | null, actor: string) {
  return (Object.keys(LEGACY_PRACTICE) as LegacyPracticeKind[]).map((kind) => {
    try {
      if (!storage) throw Error("Storage unavailable");
      const raw = storage.getItem(LEGACY_PRACTICE[kind].key);
      if (!raw) return { kind, status: "absent" as const, count: 0 };
      const owner = claimedBy(storage, kind);
      if (owner && owner !== actor) return { kind, status: "other-account" as const, count: 0 };
      const total = count(kind, normalize(kind, parseJson(raw)));
      return { kind, status: total ? ("available" as const) : ("absent" as const), count: total };
    } catch {
      return { kind, status: "unreadable" as const, count: 0 };
    }
  });
}
/** Explicit, one-category recovery. The caller reloads immediately after success. */
export function recoverLegacyPractice({
  storage,
  actor,
  kind,
  confirmed,
  isCurrent,
}: {
  storage: LearnerStorage | null;
  actor: string;
  kind: LegacyPracticeKind;
  confirmed: boolean;
  isCurrent: () => boolean;
}) {
  if (!confirmed || !actor || !isCurrent() || !storage)
    throw Error("Sign in and confirm these saves belong to you first.");
  const owner = claimedBy(storage, kind);
  if (owner && owner !== actor)
    throw Error("These saves are already associated with another account on this device.");
  const raw = storage.getItem(LEGACY_PRACTICE[kind].key);
  if (!raw) throw Error("No older saves were found for this category.");
  const old = normalize(kind, parseJson(raw));
  const device = createLearnerDeviceStore({ kind, actor, storage, isCurrent });
  const current = device.read();
  if (storage.getItem(learnerDeviceKey(kind, actor)) !== null && current === null)
    throw Error("Current saves could not be checked. They have not been replaced.");
  const combined = merge(kind, old, current === null ? null : normalize(kind, current));
  if (!isCurrent()) throw Error("Your account changed. Sign in again before recovering saves.");
  // Reserve ownership first. If the subsequent save fails, only this same account may retry.
  storage.setItem(receiptKey(kind), JSON.stringify({ schema: 1, actor }));
  if (!device.write(combined))
    throw Error(
      "Recovery could not be saved. Free browser storage and try again. Your original saves remain intact.",
    );
  return { count: count(kind, combined) };
}
