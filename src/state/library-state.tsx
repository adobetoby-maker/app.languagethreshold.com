import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { LibraryText, SentencePair } from "@/data/library";
import type { Language } from "./app-state";
import { useApp } from "./app-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth-state";
import { toast } from "sonner";
import { createLibraryRemote } from "@/lib/library-remote";
import { LANGUAGES } from "@/data/languages";
import {
  createLibraryDevice,
  readLibraryPreferences,
  saveLibraryPreferences,
} from "@/lib/library-device";

function browserLibraryStorage() {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

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
  Chinese: "🇨🇳",
  Korean: "🇰🇷",
  Portuguese: "🇧🇷",
  Pashto: "🇦🇫",
  English: "🇬🇧",
};

function makeInitial(actor: string | null): LibraryState {
  const saved = readLibraryPreferences(browserLibraryStorage(), actor);
  const statuses = saved?.readStatus;
  const readStatus: Record<string, ReadStatus> =
    statuses && typeof statuses === "object" && !Array.isArray(statuses)
      ? (Object.fromEntries(
          Object.entries(statuses).filter(([, status]) =>
            ["never", "partial", "complete"].includes(String(status)),
          ),
        ) as Record<string, ReadStatus>)
      : {};
  return {
    entries: [],
    selectedId:
      typeof saved?.selectedId === "string" ? saved.selectedId : "seed-es-travel-train-ticket",
    generating: false,
    readStatus,
    languageFilter: Array.isArray(saved?.languageFilter)
      ? saved.languageFilter.filter((language: Language) => LANGUAGES.includes(language))
      : [],
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

interface LibraryContextValue {
  state: LibraryState;
  dispatch: React.Dispatch<Action>;
  selected: LibraryEntry;
  flagFor: (l: Language) => string;
  addCustomEntry: (entry: LibraryEntry) => Promise<void>;
  removeCustomEntry: (id: string) => Promise<void>;
  syncing: boolean;
  pendingChanges: number;
  syncError: string | null;
  legacySaved: boolean;
  syncLibrary: () => void;
  setReadStatus: (id: string, status: ReadStatus) => void;
  setLanguageFilter: (langs: Language[]) => void;
}

const Ctx = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { user, isCurrentUser } = useAuth();
  const actor = user?.id ?? null;
  const [localState, dispatch] = useReducer(reducer, actor, makeInitial);
  const mounted = useRef(false);
  // AppProvider remounts this subtree on identity changes; never reuse an old account's queue.
  const [device] = useState(() =>
    createLibraryDevice({
      actor,
      storage: browserLibraryStorage(),
      isCurrent: () => mounted.current && (!actor || isCurrentUser(actor)),
      remote: actor ? createLibraryRemote(supabase, actor, isCurrentUser) : null,
    }),
  );
  const deviceState = useSyncExternalStore(
    device.subscribe,
    device.getSnapshot,
    device.getSnapshot,
  );
  useEffect(() => {
    mounted.current = true;
    void device.sync();
    const online = () => {
      void device.sync();
    };
    const offline = () => device.cancel();
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      mounted.current = false;
      device.cancel();
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, [device]);
  const state = useMemo(
    () => ({
      ...localState,
      entries: [
        ...deviceState.books,
        ...localState.entries.filter((entry) => entry.section !== "custom"),
      ],
    }),
    [localState, deviceState.books],
  );
  const {
    state: { selectedLanguage },
  } = useApp();
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

  useEffect(() => {
    saveLibraryPreferences(browserLibraryStorage(), actor, {
      selectedId: state.selectedId,
      readStatus: state.readStatus,
      languageFilter: state.languageFilter,
    });
  }, [actor, state.selectedId, state.readStatus, state.languageFilter]);

  const addCustomEntry = useCallback(
    async (entry: LibraryEntry) => {
      const saved = { ...entry, id: crypto.randomUUID(), section: "custom" as const };
      device.add(saved); // Must persist before the modal closes or a cloud request starts.
      dispatch({ type: "SELECT", payload: saved.id });
      void device.sync();
    },
    [device],
  );

  const removeCustomEntry = useCallback(
    async (id: string) => {
      try {
        device.remove(id); // A durable tombstone also covers an uncertain earlier upload.
        void device.sync();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not save this change on your device.",
        );
      }
    },
    [device],
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
        syncing: deviceState.syncing,
        pendingChanges: deviceState.pending.length + deviceState.deleted.length,
        syncError: deviceState.error,
        legacySaved: deviceState.legacySaved,
        syncLibrary: () => {
          void device.sync();
        },
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
