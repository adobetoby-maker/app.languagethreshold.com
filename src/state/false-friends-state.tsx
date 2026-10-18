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
import type { FalseFriendQuestion } from "@/fns/false-friends.functions";

export type FalseFriendsLevel = 1 | 2 | 3;

export interface FalseFriendsStats {
  bestStreak: number;
  currentStreak: number;
  perfectRuns: number;
  totalCorrect: number;
  totalAttempts: number;
  // How well the player handles ACTUAL traps (false friends specifically) —
  // this is the harder cohort and worth surfacing separately.
  trapsCaught: number; // false-friends correctly identified as wrong
  trapsMissed: number; // false-friends the player thought were true
}

const EMPTY: FalseFriendsStats = {
  bestStreak: 0,
  currentStreak: 0,
  perfectRuns: 0,
  totalCorrect: 0,
  totalAttempts: 0,
  trapsCaught: 0,
  trapsMissed: 0,
};

export type FFLeaderboardKey = `${Language}-${FalseFriendsLevel}`;

export interface FFRunQuestion {
  question: FalseFriendQuestion;
  answer: boolean | null; // user's true/false guess; null = unanswered
  correct: boolean | null;
}

export interface FFRun {
  language: Language;
  level: FalseFriendsLevel;
  questions: FFRunQuestion[];
  index: number;
  startedAt: number;
}

interface State {
  leaderboard: Record<FFLeaderboardKey, FalseFriendsStats>;
  run: FFRun | null;
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: "HYDRATE"; payload: Record<FFLeaderboardKey, FalseFriendsStats> }
  | { type: "START_RUN"; payload: { language: Language; level: FalseFriendsLevel } }
  | { type: "QUESTION_LOADING" }
  | { type: "QUESTION_LOADED"; payload: FalseFriendQuestion }
  | { type: "QUESTION_FAILED"; payload: string }
  | { type: "ANSWER"; payload: { guess: boolean; correct: boolean; isTrap: boolean } }
  | { type: "ADVANCE" }
  | { type: "END_RUN" };

const RUN_LENGTH = 5;

function loadLB(value: unknown): Record<FFLeaderboardKey, FalseFriendsStats> {
  try {
    const raw = value;
    if (!raw) return {} as Record<FFLeaderboardKey, FalseFriendsStats>;
    // Migrate: spread EMPTY over each entry so any added field gets a default.
    const parsed = raw as Record<string, Partial<FalseFriendsStats>>;
    const out: Record<FFLeaderboardKey, FalseFriendsStats> = {} as Record<
      FFLeaderboardKey,
      FalseFriendsStats
    >;
    for (const [k, v] of Object.entries(parsed)) {
      out[k as FFLeaderboardKey] = { ...EMPTY, ...v };
    }
    return out;
  } catch {
    return {} as Record<FFLeaderboardKey, FalseFriendsStats>;
  }
}

function statsFor(
  lb: Record<FFLeaderboardKey, FalseFriendsStats>,
  key: FFLeaderboardKey,
): FalseFriendsStats {
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
      return {
        ...state,
        loading: false,
        run: {
          ...state.run,
          questions: [
            ...state.run.questions,
            { question: action.payload, answer: null, correct: null },
          ],
        },
      };
    }

    case "QUESTION_FAILED":
      return { ...state, loading: false, error: action.payload };

    case "ANSWER": {
      if (!state.run) return state;
      const idx = state.run.index;
      const q = state.run.questions[idx];
      if (!q || q.correct !== null) return state;
      const updated = state.run.questions.slice();
      updated[idx] = { ...q, answer: action.payload.guess, correct: action.payload.correct };

      const key: FFLeaderboardKey = `${state.run.language}-${state.run.level}` as FFLeaderboardKey;
      const prev = statsFor(state.leaderboard, key);
      const isCorrect = action.payload.correct;
      const isTrap = action.payload.isTrap;
      const newCurrent = isCorrect ? prev.currentStreak + 1 : 0;
      const newBest = Math.max(prev.bestStreak, newCurrent);
      const newStats: FalseFriendsStats = {
        bestStreak: newBest,
        currentStreak: newCurrent,
        perfectRuns: prev.perfectRuns,
        totalCorrect: prev.totalCorrect + (isCorrect ? 1 : 0),
        totalAttempts: prev.totalAttempts + 1,
        trapsCaught: prev.trapsCaught + (isTrap && isCorrect ? 1 : 0),
        trapsMissed: prev.trapsMissed + (isTrap && !isCorrect ? 1 : 0),
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
        const key: FFLeaderboardKey =
          `${state.run.language}-${state.run.level}` as FFLeaderboardKey;
        const prev = statsFor(state.leaderboard, key);
        newLb = { ...state.leaderboard, [key]: { ...prev, perfectRuns: prev.perfectRuns + 1 } };
      }
      return { ...state, run: null, leaderboard: newLb };
    }

    default:
      return state;
  }
}

interface FFContextValue {
  state: State;
  startRun: (language: Language, level: FalseFriendsLevel) => void;
  loadQuestion: () => Promise<void>;
  answer: (guess: boolean) => void;
  advance: () => void;
  endRun: () => void;
  isRunComplete: () => boolean;
  currentQuestion: () => FFRunQuestion | null;
  runScore: () => { correct: number; answered: number; total: number };
  RUN_LENGTH: number;
  setFetcher: (
    fn:
      | ((args: {
          language: Language;
          level: FalseFriendsLevel;
          avoid?: string[];
        }) => Promise<FalseFriendQuestion>)
      | null,
  ) => void;
}

const Ctx = createContext<FFContextValue | null>(null);

export function FalseFriendsProvider({ children }: { children: ReactNode }) {
  const device = useLearnerDeviceStore("gameFalseFriends");
  const [hydrated, setHydrated] = useState(false);
  const [state, dispatch] = useReducer(reducer, {
    leaderboard: {} as Record<FFLeaderboardKey, FalseFriendsStats>,
    run: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    dispatch({ type: "HYDRATE", payload: loadLB(device.read()) });
    setHydrated(true);
  }, [device]);

  useEffect(() => {
    if (hydrated) device.write(state.leaderboard);
  }, [device, hydrated, state.leaderboard]);

  const fetcherRef = useRef<
    | ((args: {
        language: Language;
        level: FalseFriendsLevel;
        avoid?: string[];
      }) => Promise<FalseFriendQuestion>)
    | null
  >(null);
  const setFetcher = useCallback((fn: typeof fetcherRef.current) => {
    fetcherRef.current = fn;
  }, []);

  const startRun = useCallback((language: Language, level: FalseFriendsLevel) => {
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
      const avoid = state.run.questions.map((q) => q.question.word);
      const q = await fetcherRef.current({
        language: state.run.language,
        level: state.run.level,
        avoid,
      });
      dispatch({ type: "QUESTION_LOADED", payload: q });
    } catch (e) {
      dispatch({ type: "QUESTION_FAILED", payload: e instanceof Error ? e.message : "Failed." });
    }
  }, [state.run]);

  const answer = useCallback(
    (guess: boolean) => {
      if (!state.run) return;
      const cur = state.run.questions[state.run.index];
      if (!cur || cur.correct !== null) return;
      const isTrueFriend = cur.question.isTrueFriend;
      const correct = guess === isTrueFriend;
      dispatch({ type: "ANSWER", payload: { guess, correct, isTrap: !isTrueFriend } });
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

  const value = useMemo<FFContextValue>(
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

export function useFalseFriends() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFalseFriends must be used inside FalseFriendsProvider");
  return v;
}
