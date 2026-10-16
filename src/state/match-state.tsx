import { useLearnerDeviceStore } from "@/hooks/use-learner-device-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Language } from "./app-state";

export type RankTier =
  "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Champion" | "Unreal";

export const RANK_ORDER: RankTier[] = [
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
  "Champion",
  "Unreal",
];

export const RANK_BADGE: Record<RankTier, string> = {
  Bronze: "🥉",
  Silver: "🥈",
  Gold: "🥇",
  Platinum: "💎",
  Diamond: "💠",
  Champion: "🏆",
  Unreal: "🌟",
};

/** Signature glow color (CSS color value). Unreal uses a special rainbow class. */
export const RANK_COLOR: Record<RankTier, string> = {
  Bronze: "#CD7F32",
  Silver: "#A8A9AD",
  Gold: "#C9A84C",
  Platinum: "#00CFCF",
  Diamond: "#9B59B6",
  Champion: "#E74C3C",
  Unreal: "#FFFFFF", // visual handled by .rank-glow-rainbow
};

/** Secondary color for gradient ranks (Diamond, Champion). */
export const RANK_COLOR_SECONDARY: Partial<Record<RankTier, string>> = {
  Diamond: "#2980B9",
  Champion: "#F39C12",
};

export const RANK_TITLE: Record<RankTier, string> = {
  Bronze: "The Wandering Student",
  Silver: "Seeker of Tongues",
  Gold: "Voice of the World",
  Platinum: "Eloquent Nomad",
  Diamond: "Master of Meaning",
  Champion: "Champion of Languages",
  Unreal: "Mythic Polyglot of the Ages",
};

export const RANK_FLAVOR: Record<RankTier, string> = {
  Bronze: "Every expert was once a beginner.",
  Silver: "The words are starting to speak back.",
  Gold: "You speak — and the world listens.",
  Platinum: "Borders mean nothing to those who speak many tongues.",
  Diamond: "Language bends to your will.",
  Champion: "You have conquered what most never attempt.",
  Unreal: "A legend. There are no more words — only those you haven't learned yet.",
};

export const POINTS_PER_TIER = 100;

/** Ranked points awarded per match outcome. */
export const POINTS_WIN = 10;
export const POINTS_LOSS = 3;
export const POINTS_TIE = 0;

export type MatchOutcome = "victory" | "defeat" | "tie";

export interface SavedVocabWord {
  id: string;
  word: string;
  definition: string;
  language: Language;
  cefr: string;
  savedAt: number;
}

interface MatchStateData {
  tier: RankTier;
  points: number; // 0..POINTS_PER_TIER (within current tier)

  // Career stats — power 'First Blood', 'Victorious', 'On a Roll', 'Resilient', 'Long Game' etc.
  matchesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  currentWinStreak: number;
  longestWinStreak: number;
  /** True when the previous match was a defeat — supports 'Resilient'. */
  lostLastMatch: boolean;
  /** Came back from a loss to win the next match. */
  resilientUnlocked: boolean;
  /** Highest round number ever reached (across all matches). */
  longestRound: number;
  /** Highest tier ever reached — drives rank-tier achievements. */
  highestTier: RankTier;

  savedVocab: SavedVocabWord[];
}

interface RecordMatchInput {
  outcome: MatchOutcome;
  rounds: number;
}

interface MatchCtx extends MatchStateData {
  glowColor: string;
  badge: string;
  title: string;
  flavor: string;
  isMaxTier: boolean;
  /** A rank-up that just happened and hasn't been acknowledged by the UI yet. */
  pendingRankUp: RankTier | null;
  acknowledgeRankUp: () => void;
  addPoints: (n: number) => void;
  removePoints: (n: number) => void;
  /** A monotonically-increasing counter that bumps every time points change.
   *  Subscribe to it to trigger one-shot animations (e.g. badge pulse). */
  pulseTick: number;
  /** Aggregate a finished match into career stats. */
  recordMatch: (m: RecordMatchInput) => void;
  saveVocabWord: (w: Omit<SavedVocabWord, "id" | "savedAt">) => boolean;
  removeVocabWord: (id: string) => void;
  reset: () => void;
}

const Ctx = createContext<MatchCtx | null>(null);

const initialState: MatchStateData = {
  tier: "Bronze",
  points: 0,
  matchesPlayed: 0,
  wins: 0,
  losses: 0,
  ties: 0,
  currentWinStreak: 0,
  longestWinStreak: 0,
  lostLastMatch: false,
  resilientUnlocked: false,
  longestRound: 0,
  highestTier: "Bronze",
  savedVocab: [],
};

export function MatchProvider({ children }: { children: ReactNode }) {
  const device = useLearnerDeviceStore("languageMatch");
  const [state, setState] = useState<MatchStateData>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [pendingRankUp, setPendingRankUp] = useState<RankTier | null>(null);
  const [pulseTick, setPulseTick] = useState(0);
  const prevTierRef = useRef<RankTier>(initialState.tier);

  // Hydrate
  useEffect(() => {
    try {
      const raw = device.read();
      if (raw) {
        const parsed = raw as Partial<MatchStateData>;
        const tier =
          parsed.tier && RANK_ORDER.includes(parsed.tier as RankTier)
            ? (parsed.tier as RankTier)
            : "Bronze";
        const merged: MatchStateData = {
          ...initialState,
          ...parsed,
          tier,
          points: clampPoints(parsed.points ?? 0),
          highestTier:
            parsed.highestTier && RANK_ORDER.includes(parsed.highestTier as RankTier)
              ? (parsed.highestTier as RankTier)
              : tier,
          savedVocab: Array.isArray(parsed.savedVocab) ? parsed.savedVocab : [],
        };
        setState(merged);
        prevTierRef.current = merged.tier;
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [device]);

  // Persist
  useEffect(() => {
    if (!hydrated) return;
    try {
      device.write(state);
    } catch {
      /* ignore */
    }
  }, [device, state, hydrated]);

  // Detect rank-up (tier increase) and queue ceremony.
  useEffect(() => {
    if (!hydrated) return;
    const prev = prevTierRef.current;
    const prevIdx = RANK_ORDER.indexOf(prev);
    const curIdx = RANK_ORDER.indexOf(state.tier);
    if (curIdx > prevIdx) {
      setPendingRankUp(state.tier);
      // Update highest tier as well
      setState((s) =>
        RANK_ORDER.indexOf(state.tier) > RANK_ORDER.indexOf(s.highestTier)
          ? { ...s, highestTier: state.tier }
          : s,
      );
    }
    prevTierRef.current = state.tier;
  }, [state.tier, hydrated]);

  const bumpPulse = useCallback(() => setPulseTick((n) => n + 1), []);

  const addPoints = useCallback(
    (n: number) => {
      if (n <= 0) return;
      setState((s) => {
        let points = s.points + n;
        let tierIdx = RANK_ORDER.indexOf(s.tier);
        while (points >= POINTS_PER_TIER && tierIdx < RANK_ORDER.length - 1) {
          points = 0;
          tierIdx += 1;
        }
        if (tierIdx === RANK_ORDER.length - 1) {
          points = Math.min(points, POINTS_PER_TIER);
        }
        return { ...s, tier: RANK_ORDER[tierIdx], points };
      });
      bumpPulse();
    },
    [bumpPulse],
  );

  const removePoints = useCallback(
    (n: number) => {
      if (n <= 0) return;
      setState((s) => ({ ...s, points: Math.max(0, s.points - n) }));
      bumpPulse();
    },
    [bumpPulse],
  );

  const recordMatch = useCallback(({ outcome, rounds }: RecordMatchInput) => {
    setState((s) => {
      const wins = s.wins + (outcome === "victory" ? 1 : 0);
      const losses = s.losses + (outcome === "defeat" ? 1 : 0);
      const ties = s.ties + (outcome === "tie" ? 1 : 0);

      const currentWinStreak = outcome === "victory" ? s.currentWinStreak + 1 : 0;
      const longestWinStreak = Math.max(s.longestWinStreak, currentWinStreak);

      const resilientUnlocked = s.resilientUnlocked || (s.lostLastMatch && outcome === "victory");
      const lostLastMatch = outcome === "defeat";

      return {
        ...s,
        matchesPlayed: s.matchesPlayed + 1,
        wins,
        losses,
        ties,
        currentWinStreak,
        longestWinStreak,
        resilientUnlocked,
        lostLastMatch,
        longestRound: Math.max(s.longestRound, rounds),
      };
    });
  }, []);

  const saveVocabWord = useCallback((w: Omit<SavedVocabWord, "id" | "savedAt">) => {
    let added = false;
    setState((s) => {
      const exists = s.savedVocab.some(
        (v) => v.word.toLowerCase() === w.word.toLowerCase() && v.language === w.language,
      );
      if (exists) return s;
      added = true;
      const entry: SavedVocabWord = {
        ...w,
        id: `${w.language}-${w.word}-${Date.now()}`,
        savedAt: Date.now(),
      };
      return { ...s, savedVocab: [entry, ...s.savedVocab] };
    });
    return added;
  }, []);

  const removeVocabWord = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      savedVocab: s.savedVocab.filter((v) => v.id !== id),
    }));
  }, []);

  const acknowledgeRankUp = useCallback(() => setPendingRankUp(null), []);

  const reset = useCallback(() => {
    setState(initialState);
    setPendingRankUp(null);
  }, []);

  const value = useMemo<MatchCtx>(
    () => ({
      ...state,
      glowColor: RANK_COLOR[state.tier],
      badge: RANK_BADGE[state.tier],
      title: RANK_TITLE[state.tier],
      flavor: RANK_FLAVOR[state.tier],
      isMaxTier: state.tier === "Unreal",
      pendingRankUp,
      acknowledgeRankUp,
      addPoints,
      removePoints,
      pulseTick,
      recordMatch,
      saveVocabWord,
      removeVocabWord,
      reset,
    }),
    [
      state,
      addPoints,
      removePoints,
      reset,
      pendingRankUp,
      acknowledgeRankUp,
      pulseTick,
      recordMatch,
      saveVocabWord,
      removeVocabWord,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function clampPoints(p: number) {
  return Math.max(0, Math.min(POINTS_PER_TIER, typeof p === "number" ? p : 0));
}

export function useMatch() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useMatch must be used inside MatchProvider");
  return c;
}
