import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import type { LibraryText, SentencePair } from "@/data/library";
import type { Language } from "./app-state";
import { useApp } from "./app-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth-state";
import { toast } from "sonner";

export type LibrarySection = "missionary" | "classic" | "culture" | "custom";
export type ReadStatus = "never" | "partial" | "complete";

export interface BookChapter {
  title: string;
  sentences: SentencePair[];
}

export interface LibraryEntry extends LibraryText {
  section: LibrarySection;
  flag: string;
  available: boolean;
  chapters?: BookChapter[];
  createdAt?: number;
  category?: string;
}

interface LibraryState {
  entries: LibraryEntry[];
  selectedId: string;
  generating: boolean;
  readStatus: Record<string, ReadStatus>;
  languageFilter: Language[];
}

type Action =
  | { type: "ADD_ENTRY"; payload: LibraryEntry }
  | { type: "SELECT"; payload: string }
  | { type: "SET_GENERATING"; payload: boolean }
  | { type: "REPLACE_BY_ID"; payload: LibraryEntry }
  | { type: "REMOVE_ENTRY"; payload: string }
  | { type: "SET_CUSTOM_ENTRIES"; payload: LibraryEntry[] }
  | { type: "LOAD_SEEDS"; payload: LibraryEntry[] }
  | { type: "APPEND_SEEDS"; payload: LibraryEntry[] }
  | { type: "SET_READ_STATUS"; payload: { id: string; status: ReadStatus } }
  | { type: "SET_LANGUAGE_FILTER"; payload: Language[] };

const FLAG_BY_LANGUAGE: Record<Language, string> = {
  Spanish: "🇪🇸",
  French: "🇫🇷",
  German: "🇩🇪",
  Italian: "🇮🇹",
  Japanese: "🇯🇵",
  Korean: "🇰🇷",
  Portuguese: "🇧🇷",
  Pashto: "🇦🇫",
  English: "🇬🇧",
};

function makeInitial(): LibraryState {
  return {
    entries: [],
    selectedId: "classic-quixote",
    generating: false,
    readStatus: loadReadStatus(),
    languageFilter: loadLanguageFilter(),
  };
}

function reducer(state: LibraryState, action: Action): LibraryState {
  switch (action.type) {
    case "ADD_ENTRY":
      return { ...state, entries: [action.payload, ...state.entries] };
    case "REPLACE_BY_ID": {
      const exists = state.entries.some((e) => e.id === action.payload.id);
      const entries = exists
        ? state.entries.map((e) => (e.id === action.payload.id ? action.payload : e))
        : [action.payload, ...state.entries];
      return { ...state, entries };
    }
    case "REMOVE_ENTRY": {
      const entries = state.entries.filter((e) => e.id !== action.payload);
      const selectedId =
        state.selectedId === action.payload
          ? (entries.find((e) => e.available)?.id ?? entries[0]?.id ?? "")
          : state.selectedId;
      return { ...state, entries, selectedId };
    }
    case "SET_CUSTOM_ENTRIES": {
      // Replace all custom entries; keep seeds untouched.
      const nonCustom = state.entries.filter((e) => e.section !== "custom");
      return { ...state, entries: [...action.payload, ...nonCustom] };
    }
    case "LOAD_SEEDS": {
      // Merge seeds in, preserving custom entries and any LDS packs already
      // loaded by APPEND_SEEDS (race-condition guard: LDS chunks are smaller
      // and may resolve before the main all-seeds chunk).
      const customs = state.entries.filter((e) => e.section === "custom");
      const preloadedMissionary = state.entries.filter((e) => e.section === "missionary");
      const preloadedIds = new Set(preloadedMissionary.map((e) => e.id));
      const dedupedPayload = action.payload.filter((e) => !preloadedIds.has(e.id));
      return { ...state, entries: [...customs, ...preloadedMissionary, ...dedupedPayload] };
    }
    case "APPEND_SEEDS": {
      // Add new entries without overwriting existing ones (idempotent).
      const existingIds = new Set(state.entries.map((e) => e.id));
      const novel = action.payload.filter((e) => !existingIds.has(e.id));
      if (novel.length === 0) return state;
      return { ...state, entries: [...state.entries, ...novel] };
    }
    case "SELECT": {
      const cur = state.readStatus[action.payload];
      const readStatus =
        !cur || cur === "never"
          ? { ...state.readStatus, [action.payload]: "partial" as ReadStatus }
          : state.readStatus;
      return { ...state, selectedId: action.payload, readStatus };
    }
    case "SET_GENERATING":
      return { ...state, generating: action.payload };
    case "SET_READ_STATUS":
      return {
        ...state,
        readStatus: { ...state.readStatus, [action.payload.id]: action.payload.status },
      };
    case "SET_LANGUAGE_FILTER":
      return { ...state, languageFilter: action.payload };
    default:
      return state;
  }
}

const STORAGE_KEY = "lt.library.custom.v1";
const READ_STATUS_KEY = "lingualens.library.readStatus.v1";
const LANG_FILTER_KEY = "lingualens.library.languageFilter.v1";

function loadReadStatus(): Record<string, ReadStatus> {
  try {
    const raw = localStorage.getItem(READ_STATUS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ReadStatus>) : {};
  } catch {
    return {};
  }
}

function loadLanguageFilter(): Language[] {
  try {
    const raw = localStorage.getItem(LANG_FILTER_KEY);
    return raw ? (JSON.parse(raw) as Language[]) : [];
  } catch {
    return [];
  }
}

interface LibraryContextValue {
  state: LibraryState;
  dispatch: React.Dispatch<Action>;
  selected: LibraryEntry;
  flagFor: (l: Language) => string;
  addCustomEntry: (entry: LibraryEntry) => Promise<void>;
  removeCustomEntry: (id: string) => Promise<void>;
  syncing: boolean;
  setReadStatus: (id: string, status: ReadStatus) => void;
  setLanguageFilter: (langs: Language[]) => void;
}

const Ctx = createContext<LibraryContextValue | null>(null);

interface DbRow {
  id: string;
  title: string;
  subtitle: string;
  language: string;
  target_label: string;
  flag: string;
  section: string;
  available: boolean;
  chapters: BookChapter[];
  created_at: string;
}

function rowToEntry(row: DbRow): LibraryEntry {
  const chapters = Array.isArray(row.chapters) ? row.chapters : [];
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? "",
    language: row.language as Language,
    targetLabel: row.target_label,
    flag: row.flag || "📖",
    section: (row.section as LibrarySection) ?? "custom",
    available: row.available,
    chapters: chapters.length > 0 ? chapters : undefined,
    sentences: chapters[0]?.sentences ?? [],
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

function entryToInsert(entry: LibraryEntry, userId: string) {
  const chapters: BookChapter[] =
    entry.chapters && entry.chapters.length > 0
      ? entry.chapters
      : [{ title: entry.title, sentences: entry.sentences }];
  return {
    user_id: userId,
    title: entry.title,
    subtitle: entry.subtitle ?? "",
    language: entry.language,
    target_label: entry.targetLabel,
    flag: entry.flag,
    section: entry.section,
    available: entry.available,
    // Supabase typegen treats jsonb as `Json`. Our shape is JSON-serializable.
    chapters: chapters as unknown as never,
  };
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitial);
  const { user, loading: authLoading } = useAuth();
  const {
    state: { selectedLanguage },
  } = useApp();
  const syncingRef = useRef(false);
  const migratedRef = useRef<string | null>(null);
  const loadedLangPacksRef = useRef(new Set<string>());
  const selectedLangRef = useRef(selectedLanguage);

  useEffect(() => {
    selectedLangRef.current = selectedLanguage;
  }, [selectedLanguage]);

  // Load all-seeds lazily, then immediately load the active language's LDS pack.
  useEffect(() => {
    import("@/data/all-seeds").then(({ ALL_SEEDS, LDS_PACK_LOADERS }) => {
      dispatch({ type: "LOAD_SEEDS", payload: ALL_SEEDS });
      triggerLdsPack(selectedLangRef.current, LDS_PACK_LOADERS);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the user switches language, load that language's LDS pack on demand.
  useEffect(() => {
    import("@/data/all-seeds").then(({ LDS_PACK_LOADERS }) => {
      triggerLdsPack(selectedLanguage, LDS_PACK_LOADERS);
    });
  }, [selectedLanguage]);

  function triggerLdsPack(lang: string, loaders: Record<string, () => Promise<LibraryEntry[]>>) {
    if (loadedLangPacksRef.current.has(lang)) return;
    const loader = loaders[lang];
    if (!loader) return;
    loadedLangPacksRef.current.add(lang);
    loader().then((entries) => dispatch({ type: "APPEND_SEEDS", payload: entries }));
  }

  // Hydrate from localStorage when signed out (or while auth resolving)
  useEffect(() => {
    if (authLoading) return;
    if (user) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as LibraryEntry[]) : [];
      dispatch({
        type: "SET_CUSTOM_ENTRIES",
        payload: Array.isArray(parsed) ? parsed : [],
      });
    } catch {
      dispatch({ type: "SET_CUSTOM_ENTRIES", payload: [] });
    }
  }, [user, authLoading]);

  // When the user signs in: migrate any localStorage books to Cloud, then load Cloud books.
  useEffect(() => {
    if (!user) return;
    if (migratedRef.current === user.id) return;
    migratedRef.current = user.id;

    let cancelled = false;
    (async () => {
      syncingRef.current = true;
      try {
        // 1. Migrate any local books up to cloud
        let localBooks: LibraryEntry[] = [];
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          localBooks = raw ? (JSON.parse(raw) as LibraryEntry[]) : [];
        } catch {
          /* ignore */
        }

        if (Array.isArray(localBooks) && localBooks.length > 0) {
          const inserts = localBooks.map((e) => entryToInsert(e, user.id));
          const { error } = await supabase.from("library_books").insert(inserts);
          if (!error) {
            localStorage.removeItem(STORAGE_KEY);
            toast.success(
              `Synced ${localBooks.length} book${localBooks.length === 1 ? "" : "s"} to your account`,
            );
          } else {
            console.error("Migration failed:", error);
          }
        }

        // 2. Load all cloud books
        const { data, error } = await supabase
          .from("library_books")
          .select("*")
          .order("created_at", { ascending: false });

        if (cancelled) return;
        if (error) {
          console.error("Failed to load cloud library:", error);
          toast.error("Couldn't load your library from the cloud.");
          return;
        }
        const entries = (data ?? []).map((r) => rowToEntry(r as unknown as DbRow));
        dispatch({ type: "SET_CUSTOM_ENTRIES", payload: entries });
      } finally {
        syncingRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Reset migration tracker on sign-out so a future sign-in re-runs migration
  useEffect(() => {
    if (!user) migratedRef.current = null;
  }, [user]);

  // Persist to localStorage only when signed OUT
  useEffect(() => {
    if (user) return;
    try {
      const customs = state.entries.filter((e) => e.section === "custom");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customs));
    } catch {
      /* quota exceeded — ignore */
    }
  }, [state.entries, user]);

  useEffect(() => {
    try {
      localStorage.setItem(READ_STATUS_KEY, JSON.stringify(state.readStatus));
    } catch {
      /* ignore */
    }
  }, [state.readStatus]);

  useEffect(() => {
    try {
      localStorage.setItem(LANG_FILTER_KEY, JSON.stringify(state.languageFilter));
    } catch {
      /* ignore */
    }
  }, [state.languageFilter]);

  const addCustomEntry = useCallback(
    async (entry: LibraryEntry) => {
      if (!user) {
        // Local-only path
        dispatch({ type: "ADD_ENTRY", payload: entry });
        dispatch({ type: "SELECT", payload: entry.id });
        return;
      }
      // Cloud path: insert and use the DB-generated id
      const insert = entryToInsert(entry, user.id);
      const { data, error } = await supabase
        .from("library_books")
        .insert(insert)
        .select("*")
        .single();
      if (error || !data) {
        console.error("Cloud insert failed:", error);
        toast.error("Couldn't save book to cloud. Saved locally for now.");
        dispatch({ type: "ADD_ENTRY", payload: entry });
        dispatch({ type: "SELECT", payload: entry.id });
        return;
      }
      const saved = rowToEntry(data as unknown as DbRow);
      dispatch({ type: "ADD_ENTRY", payload: saved });
      dispatch({ type: "SELECT", payload: saved.id });
    },
    [user],
  );

  const removeCustomEntry = useCallback(
    async (id: string) => {
      // Optimistic
      dispatch({ type: "REMOVE_ENTRY", payload: id });
      if (!user) return;
      const { error } = await supabase.from("library_books").delete().eq("id", id);
      if (error) {
        console.error("Delete failed:", error);
        toast.error("Couldn't delete from cloud. Try again.");
      }
    },
    [user],
  );

  const selected = useMemo(
    () =>
      state.entries.find((e) => e.id === state.selectedId && e.available) ??
      state.entries.find((e) => e.available) ??
      state.entries[0] ??
      // Fallback until seeds load (entries is empty on initial SSR render)
      ({
        id: "__loading__",
        title: "",
        subtitle: "",
        language: "Spanish",
        targetLabel: "",
        sentences: [],
        section: "classic",
        flag: "",
        available: false,
      } as LibraryEntry),
    [state.entries, state.selectedId],
  );

  // Keep the open text consistent with the learner's chosen language and level.
  //
  // Previously this only re-selected when the current entry was *unavailable*,
  // so picking French left you on the Spanish default — and that default is
  // `classic-quixote`, a C2 text, shown to absolute beginners. DUO-002 P0-4.
  useEffect(() => {
    const cur = state.entries.find((e) => e.id === state.selectedId);
    const needsReselect = !cur || !cur.available || cur.language !== selectedLanguage;
    if (!needsReselect) return;

    const forLanguage = state.entries.filter((e) => e.available && e.language === selectedLanguage);
    // Nothing seeded for this language yet — keep whatever is open rather than
    // dumping the learner into an empty Reader.
    if (forLanguage.length === 0) return;

    // Easiest first, so a beginner doesn't open on 17th-century Cervantes.
    const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"];
    const rank = (e: (typeof forLanguage)[number]) => {
      const i = CEFR.indexOf(String(e.level ?? "").toUpperCase());
      return i === -1 ? CEFR.length : i;
    };
    const easiest = [...forLanguage].sort((a, b) => rank(a) - rank(b))[0];
    if (easiest && easiest.id !== state.selectedId) {
      dispatch({ type: "SELECT", payload: easiest.id });
    }
  }, [state.entries, state.selectedId, selectedLanguage]);

  return (
    <Ctx.Provider
      value={{
        state,
        dispatch,
        selected,
        flagFor: (l) => FLAG_BY_LANGUAGE[l],
        addCustomEntry,
        removeCustomEntry,
        syncing: syncingRef.current,
        setReadStatus: (id, status) =>
          dispatch({ type: "SET_READ_STATUS", payload: { id, status } }),
        setLanguageFilter: (langs) => dispatch({ type: "SET_LANGUAGE_FILTER", payload: langs }),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useLibrary() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLibrary must be used inside LibraryProvider");
  return c;
}

export function flagFor(l: Language): string {
  return FLAG_BY_LANGUAGE[l];
}

export function wordCount(sentences: { en?: string; target?: string }[] | string[]): number {
  if (sentences.length === 0) return 0;
  if (typeof sentences[0] === "string") {
    return (sentences as string[]).reduce((n, s) => n + s.split(/\s+/).filter(Boolean).length, 0);
  }
  return (sentences as { target: string }[]).reduce(
    (n, s) => n + (s.target ?? "").split(/\s+/).filter(Boolean).length,
    0,
  );
}
