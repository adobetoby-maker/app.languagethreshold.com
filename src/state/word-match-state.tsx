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
import type { WordMatchBoard, WordMatchLevel, WordMatchPair } from "@/fns/word-match.functions";

// Per-(language,level) leaderboard record. Stored in localStorage.
export interface WordMatchStats {
  bestTimeMs: number; // 0 = not yet completed
  bestFlips: number; // 0 = not yet, otherwise lowest count
  perfectGames: number; // games completed with no extra flips (flips === pairs * 2)
  totalGames: number; // games started
  totalCompleted: number; // games finished
}

const EMPTY_STATS: WordMatchStats = {
  bestTimeMs: 0,
  bestFlips: 0,
  perfectGames: 0,
  totalGames: 0,
  totalCompleted: 0,
};

export type WMLeaderboardKey = `${Language}-${WordMatchLevel}`;

// One face of one card on the board.
export interface WMCard {
  id: number; // unique card index in the current board (0..2N-1)
  pair: WordMatchPair;
  side: "target" | "english";
  flipped: boolean; // currently face-up?
  matched: boolean; // matched and locked face-up?
}

export interface WMGame {
  language: Language;
  level: WordMatchLevel;
  board: WordMatchBoard | null; // null until BOARD_LOADED arrives
  cards: WMCard[]; // empty until BOARD_LOADED arrives
  flippedIndices: number[]; // indices of currently face-up unmatched cards (max 2)
  flipCount: number;
  startedAt: number; // set at BOARD_LOADED so timer starts when cards appear
  completedAt: number | null;
}

export interface WMResult {
  language: Language;
  level: WordMatchLevel;
  timeMs: number;
  flips: number;
  perfect: boolean;
  isNewBestTime: boolean;
  isNewBestFlips: boolean;
}

interface State {
  leaderboard: Record<WMLeaderboardKey, WordMatchStats>;
  game: WMGame | null;
  loading: boolean;
  error: string | null;
  result: WMResult | null;
}

type Action =
  | { type: "HYDRATE"; payload: Record<WMLeaderboardKey, WordMatchStats> }
  | { type: "START_GAME"; payload: { language: Language; level: WordMatchLevel } }
  | { type: "BOARD_LOADING" }
  | { type: "CARD_LOADED"; payload: WordMatchBoard }
  | { type: "BOARD_FAILED"; payload: string }
  | { type: "FLIP"; payload: { cardIndex: number } }
  | { type: "MATCH_RESOLVED" } // called after the 700ms compare delay
  | { type: "END_GAME" }
  | { type: "DISMISS_RESULT" };

const MAX_FLIPPED = 2;

function pairsForLevel(level: WordMatchLevel): number {
  return level === 1 ? 6 : level === 2 ? 8 : 10;
}

function loadLeaderboard(value: unknown): Record<WMLeaderboardKey, WordMatchStats> {
  try {
    const raw = value;
    return raw
      ? (raw as Record<WMLeaderboardKey, WordMatchStats>)
      : ({} as Record<WMLeaderboardKey, WordMatchStats>);
  } catch {
    return {} as Record<WMLeaderboardKey, WordMatchStats>;
  }
}

function statsFor(
  lb: Record<WMLeaderboardKey, WordMatchStats>,
  key: WMLeaderboardKey,
): WordMatchStats {
  return lb[key] ?? { ...EMPTY_STATS };
}

// Fisher-Yates (returns a fresh shuffled copy).
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildCards(board: WordMatchBoard): WMCard[] {
  const cards: WMCard[] = [];
  let id = 0;
  for (const pair of board.pairs) {
    cards.push({ id: id++, pair, side: "target", flipped: false, matched: false });
    cards.push({ id: id++, pair, side: "english", flipped: false, matched: false });
  }
  return shuffle(cards);
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, leaderboard: action.payload };

    case "START_GAME": {
      // Increment totalGames, set up empty game shell. Board comes via CARD_LOADED.
      const key: WMLeaderboardKey =
        `${action.payload.language}-${action.payload.level}` as WMLeaderboardKey;
      const prev = statsFor(state.leaderboard, key);
      const newStats: WordMatchStats = { ...prev, totalGames: prev.totalGames + 1 };
      const newLb: Record<WMLeaderboardKey, WordMatchStats> = {
        ...state.leaderboard,
        [key]: newStats,
      };

      return {
        ...state,
        loading: true,
        error: null,
        result: null,
        leaderboard: newLb,
        game: {
          language: action.payload.language,
          level: action.payload.level,
          board: null,
          cards: [],
          flippedIndices: [],
          flipCount: 0,
          startedAt: 0,
          completedAt: null,
        },
      };
    }

    case "BOARD_LOADING":
      return { ...state, loading: true, error: null };

    case "CARD_LOADED": {
      if (!state.game) return state;
      const cards = buildCards(action.payload);
      return {
        ...state,
        loading: false,
        error: null,
        game: {
          ...state.game,
          board: action.payload,
          cards,
          flippedIndices: [],
          flipCount: 0,
          startedAt: Date.now(),
          completedAt: null,
        },
      };
    }

    case "BOARD_FAILED":
      return { ...state, loading: false, error: action.payload };

    case "FLIP": {
      if (!state.game) return state;
      const g = state.game;
      // Block input if compare is already pending (2 cards face-up unmatched)
      if (g.flippedIndices.length >= MAX_FLIPPED) return state;
      const target = g.cards[action.payload.cardIndex];
      if (!target) return state;
      if (target.flipped || target.matched) return state;

      const newCards = g.cards.slice();
      newCards[action.payload.cardIndex] = { ...target, flipped: true };
      const newFlippedIndices = [...g.flippedIndices, action.payload.cardIndex];
      const newFlipCount = g.flipCount + 1;

      // If this is the second flip and they match, lock them immediately.
      if (newFlippedIndices.length === MAX_FLIPPED) {
        const [iA, iB] = newFlippedIndices;
        const a = newCards[iA];
        const b = newCards[iB];
        if (a && b && a.pair === b.pair && a.side !== b.side) {
          newCards[iA] = { ...a, matched: true };
          newCards[iB] = { ...b, matched: true };
          return {
            ...state,
            game: {
              ...g,
              cards: newCards,
              flippedIndices: [],
              flipCount: newFlipCount,
            },
          };
        }
      }

      return {
        ...state,
        game: {
          ...g,
          cards: newCards,
          flippedIndices: newFlippedIndices,
          flipCount: newFlipCount,
        },
      };
    }

    case "MATCH_RESOLVED": {
      if (!state.game) return state;
      const g = state.game;
      if (g.flippedIndices.length === 0) return state;
      // Flip back any non-matched face-up cards in flippedIndices.
      const newCards = g.cards.slice();
      for (const i of g.flippedIndices) {
        const c = newCards[i];
        if (c && !c.matched) {
          newCards[i] = { ...c, flipped: false };
        }
      }
      return {
        ...state,
        game: {
          ...g,
          cards: newCards,
          flippedIndices: [],
        },
      };
    }

    case "END_GAME": {
      if (!state.game) return state;
      const board = state.game.board;
      if (!board) return state;
      const g = state.game;
      const completedAt = Date.now();
      const timeMs = g.startedAt > 0 ? completedAt - g.startedAt : 0;
      const flips = g.flipCount;
      const perfectFlips = board.pairs.length * 2;
      const perfect = flips === perfectFlips;

      const key: WMLeaderboardKey = `${g.language}-${g.level}` as WMLeaderboardKey;
      const prev = statsFor(state.leaderboard, key);

      const isNewBestTime = prev.bestTimeMs === 0 || timeMs < prev.bestTimeMs;
      const isNewBestFlips = prev.bestFlips === 0 || flips < prev.bestFlips;

      const newStats: WordMatchStats = {
        bestTimeMs: isNewBestTime ? timeMs : prev.bestTimeMs,
        bestFlips: isNewBestFlips ? flips : prev.bestFlips,
        perfectGames: prev.perfectGames + (perfect ? 1 : 0),
        totalGames: prev.totalGames, // already counted at START_GAME
        totalCompleted: prev.totalCompleted + 1,
      };
      const newLb: Record<WMLeaderboardKey, WordMatchStats> = {
        ...state.leaderboard,
        [key]: newStats,
      };

      const result: WMResult = {
        language: g.language,
        level: g.level,
        timeMs,
        flips,
        perfect,
        isNewBestTime,
        isNewBestFlips,
      };

      return {
        ...state,
        leaderboard: newLb,
        game: { ...g, completedAt },
        result,
      };
    }

    case "DISMISS_RESULT":
      return { ...state, game: null, result: null };

    default:
      return state;
  }
}

interface WordMatchContextValue {
  state: State;
  startGame: (language: Language, level: WordMatchLevel) => Promise<void>;
  flip: (cardIndex: number) => void;
  resolveMatch: () => void;
  endGame: () => void;
  dismissResult: () => void;
  isComplete: () => boolean;
  pairsFound: () => number;
  pairsTotal: () => number;
  setFetcher: (
    fn:
      | ((args: {
          language: Language;
          level: WordMatchLevel;
          avoid?: string[];
        }) => Promise<WordMatchBoard>)
      | null,
  ) => void;
}

const Ctx = createContext<WordMatchContextValue | null>(null);

export function WordMatchProvider({ children }: { children: ReactNode }) {
  const device = useLearnerDeviceStore("gameWordMatch");
  const [hydrated, setHydrated] = useState(false);
  const [state, dispatch] = useReducer(reducer, {
    leaderboard: {} as Record<WMLeaderboardKey, WordMatchStats>,
    game: null,
    loading: false,
    error: null,
    result: null,
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
        level: WordMatchLevel;
        avoid?: string[];
      }) => Promise<WordMatchBoard>)
    | null
  >(null);
  // Track recent topics so the AI varies them across runs.
  const recentTopicsRef = useRef<string[]>([]);

  const setFetcher = useCallback((fn: typeof fetcherRef.current) => {
    fetcherRef.current = fn;
  }, []);

  const startGame = useCallback(async (language: Language, level: WordMatchLevel) => {
    if (!fetcherRef.current) {
      dispatch({ type: "BOARD_FAILED", payload: "Fetcher not initialized." });
      return;
    }
    dispatch({ type: "START_GAME", payload: { language, level } });
    try {
      const avoid = recentTopicsRef.current.slice(-6);
      const board = await fetcherRef.current({ language, level, avoid });
      // Track the topic so subsequent runs don't repeat it for a while.
      recentTopicsRef.current = [...recentTopicsRef.current, board.topic].slice(-12);
      dispatch({ type: "CARD_LOADED", payload: board });
    } catch (e) {
      dispatch({
        type: "BOARD_FAILED",
        payload: e instanceof Error ? e.message : "Failed to load board.",
      });
    }
  }, []);

  const flip = useCallback((cardIndex: number) => {
    dispatch({ type: "FLIP", payload: { cardIndex } });
  }, []);

  const resolveMatch = useCallback(() => dispatch({ type: "MATCH_RESOLVED" }), []);
  const endGame = useCallback(() => dispatch({ type: "END_GAME" }), []);
  const dismissResult = useCallback(() => dispatch({ type: "DISMISS_RESULT" }), []);

  const isComplete = useCallback(() => {
    if (!state.game || !state.game.board) return false;
    if (state.game.cards.length === 0) return false;
    return state.game.cards.every((c) => c.matched);
  }, [state.game]);

  const pairsFound = useCallback(() => {
    if (!state.game) return 0;
    let matched = 0;
    for (const c of state.game.cards) if (c.matched) matched++;
    return Math.floor(matched / 2);
  }, [state.game]);

  const pairsTotal = useCallback(() => {
    if (!state.game || !state.game.board) return 0;
    return state.game.board.pairs.length;
  }, [state.game]);

  const value = useMemo<WordMatchContextValue>(
    () => ({
      state,
      startGame,
      flip,
      resolveMatch,
      endGame,
      dismissResult,
      isComplete,
      pairsFound,
      pairsTotal,
      setFetcher,
    }),
    [
      state,
      startGame,
      flip,
      resolveMatch,
      endGame,
      dismissResult,
      isComplete,
      pairsFound,
      pairsTotal,
      setFetcher,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWordMatch() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWordMatch must be used inside WordMatchProvider");
  return v;
}

export const PAIRS_FOR_LEVEL = pairsForLevel;
