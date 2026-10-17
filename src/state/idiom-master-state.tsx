import { useLearnerDeviceStore } from "@/hooks/use-learner-device-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  useRef,
  type ReactNode,
} from "react";
import type { Language } from "./app-state";
import type { IdiomMasterLevel, IdiomQuestion } from "@/fns/idiom-master.functions";

// ── Per-language leaderboard entries — kept in localStorage. ─────────────
// Same shape as Conjugation / SentenceBuild so a unified cross-game dashboard
// can pull from all three with one schema.
export interface IdiomMasterStats {
  bestStreak: number;
  currentStreak: number;
  perfectRuns: number;
  totalCorrect: number;
  totalAttempts: number;
}

const EMPTY_STATS: IdiomMasterStats = {
  bestStreak: 0,
  currentStreak: 0,
  perfectRuns: 0,
  totalCorrect: 0,
  totalAttempts: 0,
};

export type IMLeaderboardKey = `${Language}-${IdiomMasterLevel}`;

export interface IdiomRunQuestion {
  question: IdiomQuestion;
  selectedAnswer: string | null;
  correct: boolean | null; // null until answered
}

export interface IdiomRun {
  language: Language;
  level: IdiomMasterLevel;
  questions: IdiomRunQuestion[]; // length grows up to RUN_LENGTH
  index: number; // current question index (0-based)
  startedAt: number;
}

interface State {
  leaderboard: Record<IMLeaderboardKey, IdiomMasterStats>;
  run: IdiomRun | null;
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: "HYDRATE"; payload: Record<IMLeaderboardKey, IdiomMasterStats> }
  | { type: "START_RUN"; payload: { language: Language; level: IdiomMasterLevel } }
  | { type: "QUESTION_LOADING" }
  | { type: "QUESTION_LOADED"; payload: IdiomQuestion }
  | { type: "QUESTION_FAILED"; payload: string }
  | { type: "ANSWER"; payload: { selected: string } }
  | { type: "ADVANCE" }
  | { type: "END_RUN" };

const RUN_LENGTH = 5;

function loadLeaderboard(value: unknown): Record<IMLeaderboardKey, IdiomMasterStats> {
  try {
    const raw = value;
    return raw
      ? (raw as Record<IMLeaderboardKey, IdiomMasterStats>)
      : ({} as Record<IMLeaderboardKey, IdiomMasterStats>);
  } catch {
    return {} as Record<IMLeaderboardKey, IdiomMasterStats>;
  }
}

function statsFor(
  lb: Record<IMLeaderboardKey, IdiomMasterStats>,
  key: IMLeaderboardKey,
): IdiomMasterStats {
  return lb[key] ?? { ...EMPTY_STATS };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, leaderboard: action.payload };

    case "START_RUN":
      return {
        ...state,
        run: {
          language: action.payload.language,
          level: action.payload.level,
          questions: [],
          index: 0,
          startedAt: Date.now(),
        },
        error: null,
      };

    case "QUESTION_LOADING":
      return { ...state, loading: true, error: null };

    case "QUESTION_LOADED": {
      if (!state.run) return state;
      const next: IdiomRunQuestion = {
        question: action.payload,
        selectedAnswer: null,
        correct: null,
      };
      return {
        ...state,
        loading: false,
        run: { ...state.run, questions: [...state.run.questions, next] },
      };
    }

    case "QUESTION_FAILED":
      return { ...state, loading: false, error: action.payload };

    case "ANSWER": {
      if (!state.run) return state;
      const idx = state.run.index;
      const q = state.run.questions[idx];
      if (!q || q.correct !== null) return state; // double-click guard
      const isCorrect = action.payload.selected === q.question.correctAnswer;
      const updated = state.run.questions.slice();
      updated[idx] = { ...q, selectedAnswer: action.payload.selected, correct: isCorrect };

      // Update leaderboard immediately on each answer.
      const key: IMLeaderboardKey = `${state.run.language}-${state.run.level}` as IMLeaderboardKey;
      const prev = statsFor(state.leaderboard, key);
      const newCurrent = isCorrect ? prev.currentStreak + 1 : 0;
      const newBest = Math.max(prev.bestStreak, newCurrent);
      const newStats: IdiomMasterStats = {
        bestStreak: newBest,
        currentStreak: newCurrent,
        perfectRuns: prev.perfectRuns,
        totalCorrect: prev.totalCorrect + (isCorrect ? 1 : 0),
        totalAttempts: prev.totalAttempts + 1,
      };
      const newLb = { ...state.leaderboard, [key]: newStats };

      return { ...state, run: { ...state.run, questions: updated }, leaderboard: newLb };
    }

    case "ADVANCE": {
      if (!state.run) return state;
      if (state.run.index >= RUN_LENGTH - 1) return state;
      return { ...state, run: { ...state.run, index: state.run.index + 1 } };
    }

    case "END_RUN": {
      if (!state.run) return state;
      const allCorrect =
        state.run.questions.length === RUN_LENGTH &&
        state.run.questions.every((q) => q.correct === true);
      let newLb = state.leaderboard;
      if (allCorrect) {
        const key: IMLeaderboardKey =
          `${state.run.language}-${state.run.level}` as IMLeaderboardKey;
        const prev = statsFor(state.leaderboard, key);
        newLb = {
          ...state.leaderboard,
          [key]: { ...prev, perfectRuns: prev.perfectRuns + 1 },
        };
      }
      return { ...state, run: null, leaderboard: newLb };
    }

    default:
      return state;
  }
}

interface IdiomMasterContextValue {
  state: State;
  startRun: (language: Language, level: IdiomMasterLevel) => void;
  loadQuestion: () => Promise<void>;
  answer: (selected: string) => void;
  advance: () => void;
  endRun: () => void;
  isRunComplete: () => boolean;
  currentQuestion: () => IdiomRunQuestion | null;
  runScore: () => { correct: number; answered: number; total: number };
  RUN_LENGTH: number;
  setFetcher: (
    fn:
      | ((args: {
          language: Language;
          level: IdiomMasterLevel;
          avoid?: string[];
        }) => Promise<IdiomQuestion>)
      | null,
  ) => void;
}

const Ctx = createContext<IdiomMasterContextValue | null>(null);

export function IdiomMasterProvider({ children }: { children: ReactNode }) {
  const device = useLearnerDeviceStore("gameIdioms");
  const [hydrated, setHydrated] = useState(false);
  const [state, dispatch] = useReducer(reducer, {
    leaderboard: {} as Record<IMLeaderboardKey, IdiomMasterStats>,
    run: null,
    loading: false,
    error: null,
  });

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    dispatch({ type: "HYDRATE", payload: loadLeaderboard(device.read()) });
    setHydrated(true);
  }, [device]);

  useEffect(() => {
    if (hydrated) device.write(state.leaderboard);
  }, [device, hydrated, state.leaderboard]);

  // The fetcher is provided by the component that owns useServerFn (server-fn
  // hooks must be called from React components, not from a state file).
  const fetcherRef = useRef<
    | ((args: {
        language: Language;
        level: IdiomMasterLevel;
        avoid?: string[];
      }) => Promise<IdiomQuestion>)
    | null
  >(null);

  const setFetcher = useCallback((fn: typeof fetcherRef.current) => {
    fetcherRef.current = fn;
  }, []);

  const startRun = useCallback((language: Language, level: IdiomMasterLevel) => {
    dispatch({ type: "START_RUN", payload: { language, level } });
  }, []);

  const loadQuestion = useCallback(async () => {
    if (!fetcherRef.current) {
      dispatch({ type: "QUESTION_FAILED", payload: "Question fetcher not initialized." });
      return;
    }
    if (!state.run) return;
    if (state.run.questions.length >= RUN_LENGTH) return;
    dispatch({ type: "QUESTION_LOADING" });
    try {
      // Avoid repeating idioms within a run — pass the fullIdiom strings so
      // the model can reliably skip them.
      const avoid = state.run.questions.map((q) => q.question.fullIdiom);
      const q = await fetcherRef.current({
        language: state.run.language,
        level: state.run.level,
        avoid,
      });
      dispatch({ type: "QUESTION_LOADED", payload: q });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load question.";
      dispatch({ type: "QUESTION_FAILED", payload: msg });
    }
  }, [state.run]);

  const answer = useCallback(
    (selected: string) => {
      if (!state.run) return;
      const cur = state.run.questions[state.run.index];
      if (!cur || cur.correct !== null) return;
      dispatch({ type: "ANSWER", payload: { selected } });
    },
    [state.run],
  );

  const advance = useCallback(() => dispatch({ type: "ADVANCE" }), []);
  const endRun = useCallback(() => dispatch({ type: "END_RUN" }), []);

  const isRunComplete = useCallback(() => {
    if (!state.run) return false;
    if (state.run.questions.length < RUN_LENGTH) return false;
    return state.run.questions.every((q) => q.correct !== null);
  }, [state.run]);

  const currentQuestion = useCallback(() => {
    if (!state.run) return null;
    return state.run.questions[state.run.index] ?? null;
  }, [state.run]);

  const runScore = useCallback(() => {
    if (!state.run) return { correct: 0, answered: 0, total: RUN_LENGTH };
    const answered = state.run.questions.filter((q) => q.correct !== null).length;
    const correct = state.run.questions.filter((q) => q.correct === true).length;
    return { correct, answered, total: RUN_LENGTH };
  }, [state.run]);

  const value = useMemo<IdiomMasterContextValue>(
    () => ({
      state,
      startRun,
      loadQuestion,
      answer,
      advance,
      endRun,
      isRunComplete,
      currentQuestion,
      runScore,
      RUN_LENGTH,
      setFetcher,
    }),
    [
      state,
      startRun,
      loadQuestion,
      answer,
      advance,
      endRun,
      isRunComplete,
      currentQuestion,
      runScore,
      setFetcher,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useIdiomMaster() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useIdiomMaster must be used inside IdiomMasterProvider");
  return v;
}
