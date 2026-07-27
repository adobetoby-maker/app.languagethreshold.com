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

export interface TutorSourceContext {
  threadId: string;
  selectedWord: string;
  selectedSentence: string;
  passage: string;
  wordExplanation: string;
  sentenceIndex?: number;
  chapterIndex?: number;
}

interface State {
  // threadId → messages
  threads: Record<string, TutorMessage[]>;
  // Reading context stays attached to its Tutor thread across follow-up turns.
  sourceContexts: Record<string, TutorSourceContext>;
  open: boolean;
  pendingPrefill: string | null;
  hydrated: boolean;
}

interface PersistedTutorState {
  threads: Record<string, TutorMessage[]>;
  sourceContexts: Record<string, TutorSourceContext>;
}

type Action =
  | { type: "HYDRATE"; payload: PersistedTutorState }
  | { type: "SET_OPEN"; payload: boolean }
  | { type: "SET_PREFILL"; payload: string | null }
  | { type: "SET_SOURCE_CONTEXT"; payload: TutorSourceContext }
  | { type: "CLEAR_SOURCE_CONTEXT"; payload: string }
  | { type: "ADD_MESSAGE"; payload: { threadId: string; message: TutorMessage } }
  | {
      type: "APPEND_DELTA";
      payload: { threadId: string; messageId: string; delta: string };
    }
  | { type: "CLEAR_THREAD"; payload: string };

const STORAGE_KEY = "lt.tutor.v1";

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE":
      return {
        ...state,
        threads: action.payload.threads,
        sourceContexts: action.payload.sourceContexts,
        hydrated: true,
      };
    case "SET_OPEN":
      return { ...state, open: action.payload };
    case "SET_PREFILL":
      return { ...state, pendingPrefill: action.payload };
    case "SET_SOURCE_CONTEXT":
      return {
        ...state,
        sourceContexts: {
          ...state.sourceContexts,
          [action.payload.threadId]: action.payload,
        },
      };
    case "CLEAR_SOURCE_CONTEXT": {
      const next = { ...state.sourceContexts };
      delete next[action.payload];
      return { ...state, sourceContexts: next };
    }
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
    case "CLEAR_THREAD": {
      const nextThreads = { ...state.threads };
      const nextSourceContexts = { ...state.sourceContexts };
      delete nextThreads[action.payload];
      delete nextSourceContexts[action.payload];
      return {
        ...state,
        threads: nextThreads,
        sourceContexts: nextSourceContexts,
      };
    }
    default:
      return state;
  }
}

interface Ctx {
  state: State;
  messagesFor: (threadId: string) => TutorMessage[];
  contextFor: (threadId: string) => TutorSourceContext | undefined;
  addMessage: (threadId: string, msg: TutorMessage) => void;
  appendDelta: (threadId: string, messageId: string, delta: string) => void;
  clearThread: (threadId: string) => void;
  clearSourceContext: (threadId: string) => void;
  setOpen: (v: boolean) => void;
  prefill: (text: string, sourceContext?: TutorSourceContext) => void;
  consumePrefill: () => string | null;
}

const TutorCtx = createContext<Ctx | null>(null);

export function TutorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    threads: {},
    sourceContexts: {},
    open: false,
    pendingPrefill: null,
    hydrated: false,
  });
  const consumedRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        let payload: PersistedTutorState;
        if (
          parsed !== null &&
          typeof parsed === "object" &&
          "threads" in parsed &&
          "sourceContexts" in parsed
        ) {
          const persisted = parsed as Partial<PersistedTutorState>;
          payload = {
            threads: persisted.threads ?? {},
            sourceContexts: persisted.sourceContexts ?? {},
          };
        } else {
          payload = {
            threads: (parsed ?? {}) as Record<string, TutorMessage[]>,
            sourceContexts: {},
          };
        }
        dispatch({ type: "HYDRATE", payload });
      } else {
        dispatch({
          type: "HYDRATE",
          payload: { threads: {}, sourceContexts: {} },
        });
      }
    } catch {
      dispatch({
        type: "HYDRATE",
        payload: { threads: {}, sourceContexts: {} },
      });
    }
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          threads: state.threads,
          sourceContexts: state.sourceContexts,
        } satisfies PersistedTutorState),
      );
    } catch {
      /* ignore */
    }
  }, [state.threads, state.sourceContexts, state.hydrated]);

  const messagesFor = useCallback(
    (threadId: string) => state.threads[threadId] ?? [],
    [state.threads],
  );
  const contextFor = useCallback(
    (threadId: string) => state.sourceContexts[threadId],
    [state.sourceContexts],
  );

  const value = useMemo<Ctx>(
    () => ({
      state,
      messagesFor,
      contextFor,
      addMessage: (threadId, message) =>
        dispatch({ type: "ADD_MESSAGE", payload: { threadId, message } }),
      appendDelta: (threadId, messageId, delta) =>
        dispatch({ type: "APPEND_DELTA", payload: { threadId, messageId, delta } }),
      clearThread: (threadId) => dispatch({ type: "CLEAR_THREAD", payload: threadId }),
      clearSourceContext: (threadId) =>
        dispatch({ type: "CLEAR_SOURCE_CONTEXT", payload: threadId }),
      setOpen: (v) => dispatch({ type: "SET_OPEN", payload: v }),
      prefill: (text, sourceContext) => {
        consumedRef.current = false;
        if (sourceContext) {
          dispatch({ type: "SET_SOURCE_CONTEXT", payload: sourceContext });
        }
        dispatch({ type: "SET_PREFILL", payload: text });
        dispatch({ type: "SET_OPEN", payload: true });
      },
      consumePrefill: () => {
        if (consumedRef.current) return null;
        const t = state.pendingPrefill;
        consumedRef.current = true;
        if (t) dispatch({ type: "SET_PREFILL", payload: null });
        return t;
      },
    }),
    [state, messagesFor, contextFor],
  );

  return <TutorCtx.Provider value={value}>{children}</TutorCtx.Provider>;
}

export function useTutor() {
  const c = useContext(TutorCtx);
  if (!c) throw new Error("useTutor must be used inside TutorProvider");
  return c;
}
