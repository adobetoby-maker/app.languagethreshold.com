import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { CefrLevel, LessonContent, LessonStub } from "@/fns/grammar.functions";
import type { Language } from "./app-state";

export type { CefrLevel } from "@/fns/grammar.functions";

interface LessonState {
  stub: LessonStub;
  content?: LessonContent;
  completed: boolean;
}

interface LevelState {
  lessons: LessonStub[]; // ordered, generated once
  contents: Record<string, LessonContent | undefined>; // by lesson id
  completed: Record<string, boolean>; // by lesson id
}

// Per language → per level
export type GrammarStore = Record<string, Record<CefrLevel, LevelState | undefined>>;

interface State {
  store: GrammarStore;
  badges: string[];
  hydrated: boolean;
}

type Action =
  | { type: "HYDRATE"; payload: { store: GrammarStore; badges: string[] } }
  | {
      type: "SET_LESSONS";
      payload: { language: Language; level: CefrLevel; lessons: LessonStub[] };
    }
  | {
      type: "SET_CONTENT";
      payload: {
        language: Language;
        level: CefrLevel;
        lessonId: string;
        content: LessonContent;
      };
    }
  | {
      type: "MARK_COMPLETE";
      payload: { language: Language; level: CefrLevel; lessonId: string };
    }
  | { type: "ADD_BADGE"; payload: string };

// v2: invalidates lesson content cached before the server-side zod
// validation existed — stale malformed morphology objects crashed the UI.
const STORAGE_KEY = "lt.grammar.v2";

function emptyLevel(): LevelState {
  return { lessons: [], contents: {}, completed: {} };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, ...action.payload, hydrated: true };
    case "SET_LESSONS": {
      const { language, level, lessons } = action.payload;
      const langStore = { ...(state.store[language] ?? {}) } as Record<
        CefrLevel,
        LevelState | undefined
      >;
      const cur = langStore[level] ?? emptyLevel();
      langStore[level] = { ...cur, lessons };
      return { ...state, store: { ...state.store, [language]: langStore } };
    }
    case "SET_CONTENT": {
      const { language, level, lessonId, content } = action.payload;
      const langStore = { ...(state.store[language] ?? {}) } as Record<
        CefrLevel,
        LevelState | undefined
      >;
      const cur = langStore[level] ?? emptyLevel();
      langStore[level] = {
        ...cur,
        contents: { ...cur.contents, [lessonId]: content },
      };
      return { ...state, store: { ...state.store, [language]: langStore } };
    }
    case "MARK_COMPLETE": {
      const { language, level, lessonId } = action.payload;
      const langStore = { ...(state.store[language] ?? {}) } as Record<
        CefrLevel,
        LevelState | undefined
      >;
      const cur = langStore[level] ?? emptyLevel();
      langStore[level] = {
        ...cur,
        completed: { ...cur.completed, [lessonId]: true },
      };
      return { ...state, store: { ...state.store, [language]: langStore } };
    }
    case "ADD_BADGE":
      return state.badges.includes(action.payload)
        ? state
        : { ...state, badges: [...state.badges, action.payload] };
    default:
      return state;
  }
}

const Ctx = createContext<{
  state: State;
  setLessons: (language: Language, level: CefrLevel, lessons: LessonStub[]) => void;
  setContent: (
    language: Language,
    level: CefrLevel,
    lessonId: string,
    content: LessonContent,
  ) => void;
  markComplete: (language: Language, level: CefrLevel, lessonId: string) => void;
  addBadge: (b: string) => void;
  getLevel: (language: Language, level: CefrLevel) => LevelState | undefined;
} | null>(null);

export function GrammarProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    store: {},
    badges: [],
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
            store: parsed.store ?? {},
            badges: parsed.badges ?? [],
          },
        });
      } else {
        dispatch({ type: "HYDRATE", payload: { store: {}, badges: [] } });
      }
    } catch {
      dispatch({ type: "HYDRATE", payload: { store: {}, badges: [] } });
    }
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ store: state.store, badges: state.badges }),
      );
    } catch {
      /* ignore */
    }
  }, [state.store, state.badges, state.hydrated]);

  const setLessons = useCallback(
    (language: Language, level: CefrLevel, lessons: LessonStub[]) =>
      dispatch({ type: "SET_LESSONS", payload: { language, level, lessons } }),
    [],
  );
  const setContent = useCallback(
    (language: Language, level: CefrLevel, lessonId: string, content: LessonContent) =>
      dispatch({ type: "SET_CONTENT", payload: { language, level, lessonId, content } }),
    [],
  );
  const markComplete = useCallback(
    (language: Language, level: CefrLevel, lessonId: string) =>
      dispatch({ type: "MARK_COMPLETE", payload: { language, level, lessonId } }),
    [],
  );
  const addBadge = useCallback((b: string) => dispatch({ type: "ADD_BADGE", payload: b }), []);
  const getLevel = useCallback(
    (language: Language, level: CefrLevel) => state.store[language]?.[level],
    [state.store],
  );

  const value = useMemo(
    () => ({ state, setLessons, setContent, markComplete, addBadge, getLevel }),
    [state, setLessons, setContent, markComplete, addBadge, getLevel],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGrammar() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useGrammar must be used inside GrammarProvider");
  return c;
}

export type { LessonState };
