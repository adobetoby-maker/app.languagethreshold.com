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

/**
 * The approved Reader→Tutor wire contract (Track B). Mirrors
 * `BodySchema.context.readerContext` in src/routes/api.tutor.ts exactly.
 *
 * Distinct from `TutorSourceContext` above: that one is thread-scoped and
 * persisted so a reopened thread keeps its reading context. This one is a
 * single-shot handoff — it steers only the first contextual turn and is taken
 * (and cleared) by `takeReaderContext`, so a later free-form question in the
 * same thread is not steered by a stale word card.
 */
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
  // Reading context stays attached to its Tutor thread across follow-up turns.
  sourceContexts: Record<string, TutorSourceContext>;
  open: boolean;
  pendingPrefill: string | null;
  pendingReaderContext: TutorReaderContext | null;
  activeReaderContext: TutorReaderContext | null;
  hydrated: boolean;
}

interface PersistedTutorState {
  threads: Record<string, TutorMessage[]>;
  sourceContexts: Record<string, TutorSourceContext>;
}

type Action =
  | { type: "HYDRATE"; payload: PersistedTutorState }
  | { type: "SET_OPEN"; payload: boolean }
  | {
      type: "SET_PREFILL";
      payload: { text: string; readerContext?: TutorReaderContext } | null;
    }
  | { type: "SET_SOURCE_CONTEXT"; payload: TutorSourceContext }
  | { type: "CLEAR_SOURCE_CONTEXT"; payload: string }
  | { type: "CLEAR_READER_CONTEXT" }
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
      return {
        ...state,
        pendingPrefill: action.payload?.text ?? null,
        pendingReaderContext: action.payload?.readerContext ?? null,
        activeReaderContext: action.payload?.readerContext ?? state.activeReaderContext,
      };
    case "SET_SOURCE_CONTEXT":
      return {
        ...state,
        sourceContexts: {
          ...state.sourceContexts,
          [action.payload.threadId]: action.payload,
        },
      };
    case "CLEAR_READER_CONTEXT":
      return { ...state, activeReaderContext: null };
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
  prefill: (
    text: string,
    sourceContext?: TutorSourceContext,
    readerContext?: TutorReaderContext,
  ) => void;
  consumePrefill: () => { text: string; readerContext: TutorReaderContext | null } | null;
  takeReaderContext: (textTitle: string) => TutorReaderContext | undefined;
}

const TutorCtx = createContext<Ctx | null>(null);

export function TutorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    threads: {},
    sourceContexts: {},
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
      prefill: (text, sourceContext, readerContext) => {
        consumedRef.current = false;
        if (sourceContext) {
          dispatch({ type: "SET_SOURCE_CONTEXT", payload: sourceContext });
        }
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
      // Reader context belongs to the first contextual turn only. Taking it
      // clears it, so later free-form questions in the same thread are not
      // steered by a stale word card.
      takeReaderContext: (textTitle) => {
        const readerContext = state.activeReaderContext;
        if (readerContext) dispatch({ type: "CLEAR_READER_CONTEXT" });
        return readerContext?.textTitle === textTitle ? readerContext : undefined;
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
