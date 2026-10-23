import { prepareListeningChoices } from "@/lib/listening-choices";
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
import type { ListeningDrillLevel, ListeningDrillQuestion } from "@/fns/listening-drill.functions";

// Per-(language,level) stats — same shape as Conjugation / Sentence Builder
// so we can build a unified cross-game dashboard later. We add `totalPlays`
// (sum of audio replays across all answered questions) and a derived "avg
// plays per correct" can be computed from totalPlays / totalCorrect.
export interface ListeningDrillStats {
  bestStreak: number;
  currentStreak: number;
  perfectRuns: number;
  totalCorrect: number;
  totalAttempts: number;
  totalPlays: number;
}

const EMPTY: ListeningDrillStats = {
  bestStreak: 0,
  currentStreak: 0,
  perfectRuns: 0,
  totalCorrect: 0,
  totalAttempts: 0,
  totalPlays: 0,
};

export type LDLeaderboardKey = `${Language}-${ListeningDrillLevel}`;

export interface LDRunQuestion {
  question: ListeningDrillQuestion;
  selectedIndex: number | null; // null until the user picks
  correct: boolean | null; // null until answered
  submitted: boolean;
  playCount: number; // number of times the audio was played for this question
}

export interface LDRun {
  language: Language;
  level: ListeningDrillLevel;
  questions: LDRunQuestion[];
  index: number;
  startedAt: number;
}

interface State {
  leaderboard: Record<LDLeaderboardKey, ListeningDrillStats>;
  run: LDRun | null;
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: "HYDRATE"; payload: Record<LDLeaderboardKey, ListeningDrillStats> }
  | { type: "START_RUN"; payload: { language: Language; level: ListeningDrillLevel } }
  | { type: "QUESTION_LOADING" }
  | { type: "QUESTION_LOADED"; payload: ListeningDrillQuestion }
  | { type: "QUESTION_FAILED"; payload: string }
  | { type: "INCREMENT_PLAYS" }
  | { type: "ANSWER"; payload: { selectedIndex: number } }
  | { type: "ADVANCE" }
  | { type: "END_RUN" };

const RUN_LENGTH = 5;

function loadLeaderboard(value: unknown): Record<LDLeaderboardKey, ListeningDrillStats> {
  try {
    const raw = value;
    if (!raw) return {} as Record<LDLeaderboardKey, ListeningDrillStats>;
    const parsed = raw as Record<string, Partial<ListeningDrillStats>>;
    // Migrate older entries that may not have `totalPlays`.
    const out: Record<string, ListeningDrillStats> = {};
    for (const [k, v] of Object.entries(parsed)) {
      out[k] = { ...EMPTY, ...v };
    }
    return out as Record<LDLeaderboardKey, ListeningDrillStats>;
  } catch {
    return {} as Record<LDLeaderboardKey, ListeningDrillStats>;
  }
}

function statsFor(
  lb: Record<LDLeaderboardKey, ListeningDrillStats>,
  key: LDLeaderboardKey,
): ListeningDrillStats {
  return lb[key] ?? { ...EMPTY };
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
      const q: LDRunQuestion = {
        question: action.payload,
        selectedIndex: null,
        correct: null,
        submitted: false,
        playCount: 0,
      };
      return {
        ...state,
        loading: false,
        run: { ...state.run, questions: [...state.run.questions, q] },
      };
    }

    case "QUESTION_FAILED":
      return { ...state, loading: false, error: action.payload };

    case "INCREMENT_PLAYS": {
      if (!state.run) return state;
      const idx = state.run.index;
      const q = state.run.questions[idx];
      if (!q) return state;
      const updated = state.run.questions.slice();
      updated[idx] = { ...q, playCount: q.playCount + 1 };
      return { ...state, run: { ...state.run, questions: updated } };
    }

    case "ANSWER": {
      if (!state.run) return state;
      const idx = state.run.index;
      const q = state.run.questions[idx];
      if (!q || q.submitted) return state;
      const sel = action.payload.selectedIndex;
      if (sel < 0 || sel >= q.question.options.length) return state;

      const isCorrect = sel === q.question.correctIndex;
      const updated = state.run.questions.slice();
      updated[idx] = { ...q, selectedIndex: sel, correct: isCorrect, submitted: true };

      const key: LDLeaderboardKey = `${state.run.language}-${state.run.level}` as LDLeaderboardKey;
      const prev = statsFor(state.leaderboard, key);
      const newCurrent = isCorrect ? prev.currentStreak + 1 : 0;
      const newBest = Math.max(prev.bestStreak, newCurrent);
      const newStats: ListeningDrillStats = {
        bestStreak: newBest,
        currentStreak: newCurrent,
        perfectRuns: prev.perfectRuns,
        totalCorrect: prev.totalCorrect + (isCorrect ? 1 : 0),
        totalAttempts: prev.totalAttempts + 1,
        // Count at minimum 1 play per question even if the user somehow
        // answered without pressing play (defensive — UI disables the answer
        // buttons until first play, but stats should never go negative).
        totalPlays: prev.totalPlays + Math.max(1, q.playCount),
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
        const key: LDLeaderboardKey =
          `${state.run.language}-${state.run.level}` as LDLeaderboardKey;
        const prev = statsFor(state.leaderboard, key);
        newLb = { ...state.leaderboard, [key]: { ...prev, perfectRuns: prev.perfectRuns + 1 } };
      }
      return { ...state, run: null, leaderboard: newLb };
    }

    default:
      return state;
  }
}

interface ListeningDrillContextValue {
  state: State;
  startRun: (language: Language, level: ListeningDrillLevel) => void;
  loadQuestion: () => Promise<void>;
  incrementPlays: () => void;
  answer: (selectedIndex: number) => void;
  advance: () => void;
  endRun: () => void;
  isRunComplete: () => boolean;
  currentQuestion: () => LDRunQuestion | null;
  runScore: () => { correct: number; answered: number; total: number };
  RUN_LENGTH: number;
  setFetcher: (
    fn:
      | ((args: {
          language: Language;
          level: ListeningDrillLevel;
          avoid?: string[];
        }) => Promise<ListeningDrillQuestion>)
      | null,
  ) => void;
}

const Ctx = createContext<ListeningDrillContextValue | null>(null);

export function ListeningDrillProvider({ children }: { children: ReactNode }) {
  const device = useLearnerDeviceStore("gameListening");
  const [hydrated, setHydrated] = useState(false);
  const [state, dispatch] = useReducer(reducer, {
    leaderboard: {} as Record<LDLeaderboardKey, ListeningDrillStats>,
    run: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    dispatch({ type: "HYDRATE", payload: loadLeaderboard(device.read()) });
    setHydrated(true);
  }, [device]);

  useEffect(() => {
    if (hydrated) device.write(state.leaderboard);
  }, [device, hydrated, state.leaderboard]);

  const fetcherRef = useRef<
    | ((args: {
        language: Language;
        level: ListeningDrillLevel;
        avoid?: string[];
      }) => Promise<ListeningDrillQuestion>)
    | null
  >(null);

  const setFetcher = useCallback((fn: typeof fetcherRef.current) => {
    fetcherRef.current = fn;
  }, []);

  const startRun = useCallback((language: Language, level: ListeningDrillLevel) => {
    dispatch({ type: "START_RUN", payload: { language, level } });
  }, []);

  const loadQuestion = useCallback(async () => {
    if (!fetcherRef.current) {
      dispatch({ type: "QUESTION_FAILED", payload: "Fetcher not initialized." });
      return;
    }
    if (!state.run) return;
    if (state.run.questions.length >= RUN_LENGTH) return;
    dispatch({ type: "QUESTION_LOADING" });
    try {
      const avoid = state.run.questions.map((q) => q.question.phrase.slice(0, 30));
      const q = await fetcherRef.current({
        language: state.run.language,
        level: state.run.level,
        avoid,
      });
      dispatch({
        type: "QUESTION_LOADED",
        payload: prepareListeningChoices(q, state.run.questions.map((entry) => entry.question.correctIndex)),
      });
    } catch (e) {
      dispatch({ type: "QUESTION_FAILED", payload: e instanceof Error ? e.message : "Failed." });
    }
  }, [state.run]);

  const incrementPlays = useCallback(() => dispatch({ type: "INCREMENT_PLAYS" }), []);
  const answer = useCallback(
    (selectedIndex: number) => dispatch({ type: "ANSWER", payload: { selectedIndex } }),
    [],
  );
  const advance = useCallback(() => dispatch({ type: "ADVANCE" }), []);
  const endRun = useCallback(() => dispatch({ type: "END_RUN" }), []);

  const isRunComplete = useCallback(() => {
    if (!state.run) return false;
    if (state.run.questions.length < RUN_LENGTH) return false;
    return state.run.questions.every((q) => q.submitted);
  }, [state.run]);

  const currentQuestion = useCallback(() => {
    if (!state.run) return null;
    return state.run.questions[state.run.index] ?? null;
  }, [state.run]);

  const runScore = useCallback(() => {
    if (!state.run) return { correct: 0, answered: 0, total: RUN_LENGTH };
    const answered = state.run.questions.filter((q) => q.submitted).length;
    const correct = state.run.questions.filter((q) => q.correct === true).length;
    return { correct, answered, total: RUN_LENGTH };
  }, [state.run]);

  const value = useMemo<ListeningDrillContextValue>(
    () => ({
      state,
      startRun,
      loadQuestion,
      incrementPlays,
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
      incrementPlays,
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

export function useListeningDrill() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useListeningDrill must be used inside ListeningDrillProvider");
  return v;
}
