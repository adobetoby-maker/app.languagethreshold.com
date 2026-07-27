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

export type TutorRole = "user" | "assistant";

export interface TutorMessage {
  id: string;
  role: TutorRole;
  content: string;
  createdAt: number;
}

export interface TutorReaderContext {
  selectedWord: string;
  sentence: string;
  passageExcerpt?: string;
  textTitle?: string;
  language: string;
  learnerLevel?: string;
  explanation?: string;
}

interface State {
  // threadId → messages
  threads: Record<string, TutorMessage[]>;
  open: boolean;
  pendingPrefill: string | null;
  pendingReaderContext: TutorReaderContext | null;
  activeReaderContext: TutorReaderContext | null;
  hydrated: boolean;
}

type Action =
  | { type: "HYDRATE"; payload: Record<string, TutorMessage[]> }
  | { type: "SET_OPEN"; payload: boolean }
  | {
      type: "SET_PREFILL";
      payload: { text: string; readerContext?: TutorReaderContext } | null;
    }
  | { type: "ADD_MESSAGE"; payload: { threadId: string; message: TutorMessage } }
  | {
      type: "APPEND_DELTA";
      payload: { threadId: string; messageId: string; delta: string };
    }
  | { type: "CLEAR_READER_CONTEXT" }
  | { type: "CLEAR_THREAD"; payload: string };

const STORAGE_KEY = "lt.tutor.v1";

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, threads: action.payload, hydrated: true };
    case "SET_OPEN":
      return { ...state, open: action.payload };
    case "SET_PREFILL":
      return {
        ...state,
        pendingPrefill: action.payload?.text ?? null,
        pendingReaderContext: action.payload?.readerContext ?? null,
        activeReaderContext: action.payload?.readerContext ?? state.activeReaderContext,
      };
    case "ADD_MESSAGE": {
      const cur = state.threads[action.payload.threadId] ?? [];
      return {
        ...state,
        threads: {
          ...state.threads,
          [action.payload.threadId]: [...cur, action.payload.message],
        },
      };
    }
    case "APPEND_DELTA": {
      const cur = state.threads[action.payload.threadId] ?? [];
      return {
        ...state,
        threads: {
          ...state.threads,
          [action.payload.threadId]: cur.map((m) =>
            m.id === action.payload.messageId
              ? { ...m, content: m.content + action.payload.delta }
              : m,
          ),
        },
      };
    }
    case "CLEAR_READER_CONTEXT":
      return { ...state, activeReaderContext: null };
    case "CLEAR_THREAD": {
      const next = { ...state.threads };
      delete next[action.payload];
      return { ...state, threads: next };
    }
    default:
      return state;
  }
}

interface Ctx {
  state: State;
  messagesFor: (threadId: string) => TutorMessage[];
  addMessage: (threadId: string, msg: TutorMessage) => void;
  appendDelta: (threadId: string, messageId: string, delta: string) => void;
  clearThread: (threadId: string) => void;
  setOpen: (v: boolean) => void;
  prefill: (text: string, readerContext?: TutorReaderContext) => void;
  consumePrefill: () => { text: string; readerContext: TutorReaderContext | null } | null;
  takeReaderContext: (textTitle: string) => TutorReaderContext | undefined;
}

const TutorCtx = createContext<Ctx | null>(null);

export function TutorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    threads: {},
    open: false,
    pendingPrefill: null,
    pendingReaderContext: null,
    activeReaderContext: null,
    hydrated: false,
  });
  const consumedRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        dispatch({ type: "HYDRATE", payload: JSON.parse(raw) });
      } else {
        dispatch({ type: "HYDRATE", payload: {} });
      }
    } catch {
      dispatch({ type: "HYDRATE", payload: {} });
    }
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.threads));
    } catch {
      /* ignore */
    }
  }, [state.threads, state.hydrated]);

  const messagesFor = useCallback(
    (threadId: string) => state.threads[threadId] ?? [],
    [state.threads],
  );

  const value = useMemo<Ctx>(
    () => ({
      state,
      messagesFor,
      addMessage: (threadId, message) =>
        dispatch({ type: "ADD_MESSAGE", payload: { threadId, message } }),
      appendDelta: (threadId, messageId, delta) =>
        dispatch({ type: "APPEND_DELTA", payload: { threadId, messageId, delta } }),
      clearThread: (threadId) => dispatch({ type: "CLEAR_THREAD", payload: threadId }),
      setOpen: (v) => dispatch({ type: "SET_OPEN", payload: v }),
      prefill: (text, readerContext) => {
        consumedRef.current = false;
        dispatch({ type: "SET_PREFILL", payload: { text, readerContext } });
        dispatch({ type: "SET_OPEN", payload: true });
      },
      consumePrefill: () => {
        if (consumedRef.current) return null;
        const t = state.pendingPrefill;
        consumedRef.current = true;
        if (!t) return null;
        const value = { text: t, readerContext: state.pendingReaderContext };
        dispatch({ type: "SET_PREFILL", payload: null });
        return value;
      },
      takeReaderContext: (textTitle) => {
        const readerContext = state.activeReaderContext;
        if (readerContext) dispatch({ type: "CLEAR_READER_CONTEXT" });
        return readerContext?.textTitle === textTitle ? readerContext : undefined;
      },
    }),
    [state, messagesFor],
  );

  return <TutorCtx.Provider value={value}>{children}</TutorCtx.Provider>;
}

export function useTutor() {
  const c = useContext(TutorCtx);
  if (!c) throw new Error("useTutor must be used inside TutorProvider");
  return c;
}
