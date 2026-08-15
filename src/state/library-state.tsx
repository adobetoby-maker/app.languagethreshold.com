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

export type LibraryEntry = LibraryText & {
  available: boolean;
  targetLabel: string;
};

interface State {
  entries: LibraryEntry[];
  selectedId: string;
  generating: boolean;
  hydrated: boolean;
}

type Action =
  | { type: "HYDRATE"; payload: { entries: LibraryEntry[]; selectedId: string } }
  | { type: "SELECT"; payload: string }
  | { type: "SET_ENTRIES"; payload: LibraryEntry[] }
  | { type: "SET_GENERATING"; payload: boolean }
  | { type: "ADD_ENTRY"; payload: LibraryEntry };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, ...action.payload, hydrated: true };
    case "SELECT":
      return { ...state, selectedId: action.payload };
    case "SET_ENTRIES":
      return { ...state, entries: action.payload };
    case "SET_GENERATING":
      return { ...state, generating: action.payload };
    case "ADD_ENTRY":
      return { ...state, entries: [...state.entries, action.payload] };
    default:
      return state;
  }
}

const LibraryContext = createContext<{
  state: State;
  selected: LibraryEntry;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { state: appState } = useApp();
  const [state, dispatch] = useReducer(reducer, {
    entries: [],
    selectedId: "",
    generating: false,
    hydrated: false,
  });

  const selected = useMemo(() => {
    return state.entries.find((e) => e.id === state.selectedId) ?? state.entries[0] ?? {
      id: "",
      title: "Loading…",
      language: appState.selectedLanguage,
      section: "classic" as LibrarySection,
      available: false,
      targetLabel: appState.selectedLanguage,
      sentences: [] as SentencePair[],
    };
  }, [state.entries, state.selectedId, appState.selectedLanguage]);

  return (
    <LibraryContext.Provider value={{ state, selected, dispatch }}>
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}
