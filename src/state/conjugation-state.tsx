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
import type { ConjugationLevel, ConjugationQuestion } from "@/fns/conjugation.functions";

// ── Per-language leaderboard entries — kept in localStorage. ─────────────
// Tracks four headline numbers per (language, level):
//   bestStreak       — longest correct-in-a-row, all-time
//   currentStreak    — current correct-in-a-row, persists across runs
//   perfectRuns      — count of completed 5/5 runs
//   totalCorrect     — total correct answers (any run)
//   totalAttempts    — total answered questions
// Two derived achievements: "hot" at 5, "fire" at 10, "unstoppable" at 25.
export interface ConjugationStats {
  bestStreak: number;
  currentStreak: number;
  perfectRuns: number;
  totalCorrect: number;
  totalAttempts: number;
}

const EMPTY_STATS: ConjugationStats = {
  bestStreak: 0,
  currentStreak: 0,
  perfectRuns: 0,
  totalCorrect: 0,
  totalAttempts: 0,
};

export type LeaderboardKey = `${Language}-${ConjugationLevel}`;

export interface ConjugationRunQuestion {
  question: ConjugationQuestion;
  selectedAnswer: string | null;
  correct: boolean | null; // null until answered
}

export interface ConjugationRun {
  language: Language;
  level: ConjugationLevel;
  questions: ConjugationRunQuestion[]; // length grows up to 5
  index: number; // current question index (0-based)
  startedAt: number;
}

interface State {
  leaderboard: Record<LeaderboardKey, ConjugationStats>;
  run: ConjugationRun | null;
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: "HYDRATE"; payload: Record<LeaderboardKey, ConjugationStats> }
  | { type: "START_RUN"; payload: { language: Language; level: ConjugationLevel } }
  | { type: "QUESTION_LOADING" }
  | { type: "QUESTION_LOADED"; payload: ConjugationQuestion }
  | { type: "QUESTION_FAILED"; payload: string }
  | { type: "ANSWER"; payload: { selected: string; correct: boolean } }
  | { type: "ADVANCE" }
  | { type: "END_RUN" }
  | { type: "RESET_LEADERBOARD"; payload: LeaderboardKey | "all" };

const RUN_LENGTH = 5;

function loadLeaderboard(value: unknown): Record<LeaderboardKey, ConjugationStats> {
  try {
    const raw = value;
    return raw
      ? (raw as Record<LeaderboardKey, ConjugationStats>)
      : ({} as Record<LeaderboardKey, ConjugationStats>);
  } catch {
    return {} as Record<LeaderboardKey, ConjugationStats>;
  }
}

function statsFor(
  lb: Record<LeaderboardKey, ConjugationStats>,
  key: LeaderboardKey,
): ConjugationStats {
  return lb[key] ?? { ...EMPTY_STATS };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, leaderboard: action.payload };
    case "START_RUN": {
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
    }
    case "QUESTION_LOADING":
      return { ...state, loading: true, error: null };
    case "QUESTION_LOADED": {
      if (!state.run) return state;
      const next: ConjugationRunQuestion = {
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
      const updated = state.run.questions.slice();
      updated[idx] = {
        ...q,
        selectedAnswer: action.payload.selected,
        correct: action.payload.correct,
      };

      // Update leaderboard immediately on each answer.
      const key: LeaderboardKey = `${state.run.language}-${state.run.level}` as LeaderboardKey;
      const prev = statsFor(state.leaderboard, key);
      const isCorrect = action.payload.correct;
      const newCurrent = isCorrect ? prev.currentStreak + 1 : 0;
      const newBest = Math.max(prev.bestStreak, newCurrent);
      const newStats: ConjugationStats = {
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
      // If we're at the last question and it's been answered, treat as run-over;
      // the UI calls END_RUN explicitly, but we keep ADVANCE idempotent.
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
        const key: LeaderboardKey = `${state.run.language}-${state.run.level}` as LeaderboardKey;
        const prev = statsFor(state.leaderboard, key);
        newLb = {
          ...state.leaderboard,
          [key]: { ...prev, perfectRuns: prev.perfectRuns + 1 },
        };
      }
      return { ...state, run: null, leaderboard: newLb };
    }
    case "RESET_LEADERBOARD": {
      if (action.payload === "all") {
        return { ...state, leaderboard: {} as Record<LeaderboardKey, ConjugationStats> };
      }
      const newLb = { ...state.leaderboard };
      delete newLb[action.payload];

      return { ...state, leaderboard: newLb };
    }
    default:
      return state;
  }
}

interface ConjugationContextValue {
  state: State;
  startRun: (language: Language, level: ConjugationLevel) => void;
  loadQuestion: () => Promise<void>;
  answer: (selected: string) => void;
  advance: () => void;
  endRun: () => void;
  resetLeaderboard: (key: LeaderboardKey | "all") => void;
  // Helpers
  isRunComplete: () => boolean;
  currentQuestion: () => ConjugationRunQuestion | null;
  runScore: () => { correct: number; answered: number; total: number };
  RUN_LENGTH: number;
  // For the question fetcher — set by the component that owns useServerFn.
  setFetcher: (
    fn:
      | ((args: {
          language: Language;
          level: ConjugationLevel;
          avoid?: string[];
        }) => Promise<ConjugationQuestion>)
      | null,
  ) => void;
}

const Ctx = createContext<ConjugationContextValue | null>(null);

export function ConjugationProvider({ children }: { children: ReactNode }) {
  const device = useLearnerDeviceStore("gameConjugation");
  const [hydrated, setHydrated] = useState(false);
  const [state, dispatch] = useReducer(reducer, {
    leaderboard: {} as Record<LeaderboardKey, ConjugationStats>,
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

  // The fetcher is provided by the component that owns useServerFn (component
  // tree, not state file — server-fn hooks must be called from components).
  const fetcherRef = useRef<
    | ((args: {
        language: Language;
        level: ConjugationLevel;
        avoid?: string[];
      }) => Promise<ConjugationQuestion>)
    | null
  >(null);

  const setFetcher = useCallback((fn: typeof fetcherRef.current) => {
    fetcherRef.current = fn;
  }, []);

  const startRun = useCallback((language: Language, level: ConjugationLevel) => {
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
      const avoid = state.run.questions.map((q) => q.question.infinitive);
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
      const correct = selected === cur.question.correctConjugation;
      dispatch({ type: "ANSWER", payload: { selected, correct } });
    },
    [state.run],
  );

  const advance = useCallback(() => dispatch({ type: "ADVANCE" }), []);
  const endRun = useCallback(() => dispatch({ type: "END_RUN" }), []);
  const resetLeaderboard = useCallback(
    (key: LeaderboardKey | "all") => dispatch({ type: "RESET_LEADERBOARD", payload: key }),
    [],
  );

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

  const value = useMemo<ConjugationContextValue>(
    () => ({
      state,
      startRun,
      loadQuestion,
      answer,
      advance,
      endRun,
      resetLeaderboard,
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
      resetLeaderboard,
      isRunComplete,
      currentQuestion,
      runScore,
      setFetcher,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConjugation() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useConjugation must be used inside ConjugationProvider");
  return v;
}

// ── Achievement helpers — pure functions for the UI. ────────────────────
export type StreakBadge = "hot" | "fire" | "streaking" | "unstoppable" | null;

export function streakBadge(streak: number): StreakBadge {
  if (streak >= 25) return "unstoppable";
  if (streak >= 10) return "streaking";
  if (streak >= 5) return "fire";
  if (streak >= 3) return "hot";
  return null;
}

export function streakBadgeLabel(b: StreakBadge): string {
  switch (b) {
    case "hot":
      return "Hot streak";
    case "fire":
      return "On fire";
    case "streaking":
      return "Streaking";
    case "unstoppable":
      return "Unstoppable";
    default:
      return "";
  }
}
