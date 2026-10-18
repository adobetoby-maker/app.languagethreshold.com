import { useLearnerDeviceStore } from "@/hooks/use-learner-device-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import type { TabKey } from "./app-state";

/**
 * Daily Challenge — a lightweight gamification layer that picks ONE game per
 * calendar day for the user to complete. Doesn't replace the games; just
 * adds a "today's challenge" hook on the Games Hub that nudges return visits.
 *
 * The game-of-the-day is DETERMINISTIC by date — same day = same game for
 * everyone using the same algorithm — so users can compare notes ("did you
 * do today's listening drill?"). Cycles through 7 games (one per weekday).
 *
 * Completion is recorded by ANY game's run_complete event in the same UTC
 * day. We don't enforce that the completed game matches the day's challenge
 * — completion is completion. (Future: enforce-mode toggle.)
 *
 * Streak math:
 *   - currentStreak = consecutive days with at least one completion ending today
 *   - longestStreak = all-time max
 *   - missing one day resets currentStreak to 0
 *
 * Reward thresholds:
 *   - 3 days  → "Returning"
 *   - 7 days  → "Devotee"
 *   - 30 days → "Disciplined"
 *   - 100 days → "Habit"
 */

export type DailyChallengeGameId =
  | "conjugation"
  | "sentenceBuild"
  | "listeningDrill"
  | "wordMatch"
  | "idiomMaster"
  | "falseFriends"
  | "match";

interface DailyChallengeData {
  // Last UTC day-of-year (e.g. "2026-05-10") on which the user completed a run.
  lastCompletedDay: string | null;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number; // grand total of completed runs across all games
}

interface State {
  data: DailyChallengeData;
}

type Action =
  | { type: "HYDRATE"; payload: DailyChallengeData }
  | { type: "RECORD_COMPLETION" }
  | { type: "RESET" };

const EMPTY: DailyChallengeData = {
  lastCompletedDay: null,
  currentStreak: 0,
  longestStreak: 0,
  totalCompletions: 0,
};

function todayUTC(): string {
  // YYYY-MM-DD in UTC. Avoids timezone-edge drift across travelers.
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function dayDiff(a: string, b: string): number {
  // Returns whole-day difference between b and a (b - a). Negative if b is
  // earlier than a. Both are YYYY-MM-DD UTC strings.
  const da = Date.parse(`${a}T00:00:00Z`);
  const db = Date.parse(`${b}T00:00:00Z`);
  return Math.round((db - da) / 86_400_000);
}

function load(value: unknown): DailyChallengeData {
  try {
    const raw = value;
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...(raw as Partial<DailyChallengeData>) };
  } catch {
    return { ...EMPTY };
  }
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, data: action.payload };

    case "RECORD_COMPLETION": {
      const today = todayUTC();
      const prev = state.data;

      // Already completed today — only bump totalCompletions, don't double-streak.
      if (prev.lastCompletedDay === today) {
        const next = { ...prev, totalCompletions: prev.totalCompletions + 1 };

        return { data: next };
      }

      // New day. Decide if streak continues or resets.
      let newStreak = 1;
      if (prev.lastCompletedDay !== null) {
        const gap = dayDiff(prev.lastCompletedDay, today);
        if (gap === 1) {
          newStreak = prev.currentStreak + 1;
        } else if (gap === 0) {
          // Shouldn't happen (would be caught above), but defensively keep streak.
          newStreak = prev.currentStreak;
        }
        // gap > 1 (or negative which means clock-screwy) → newStreak stays at 1.
      }

      const next: DailyChallengeData = {
        lastCompletedDay: today,
        currentStreak: newStreak,
        longestStreak: Math.max(prev.longestStreak, newStreak),
        totalCompletions: prev.totalCompletions + 1,
      };

      return { data: next };
    }

    case "RESET": {
      return { data: { ...EMPTY } };
    }

    default:
      return state;
  }
}

interface DailyChallengeContextValue {
  data: DailyChallengeData;
  recordCompletion: () => void;
  reset: () => void;
  // Derived
  isCompletedToday: () => boolean;
  todaysGame: () => { id: DailyChallengeGameId; tabKey: TabKey; title: string };
  badge: () => null | "returning" | "devotee" | "disciplined" | "habit";
}

const Ctx = createContext<DailyChallengeContextValue | null>(null);

// Cycle through games — one per weekday slot. Deterministic for any given UTC day.
const GAME_CYCLE: { id: DailyChallengeGameId; tabKey: TabKey; title: string }[] = [
  { id: "conjugation", tabKey: "conjugation", title: "Conjugation Drills" },
  { id: "sentenceBuild", tabKey: "sentenceBuild", title: "Sentence Builder" },
  { id: "listeningDrill", tabKey: "listeningDrill", title: "Listening Drill" },
  { id: "wordMatch", tabKey: "wordMatch", title: "Word Match" },
  { id: "idiomMaster", tabKey: "idiomMaster", title: "Idiom Master" },
  { id: "falseFriends", tabKey: "falseFriends", title: "False Friends" },
  { id: "match", tabKey: "speak", title: "Language Match" },
];

function pickGameForDay(dayString: string): {
  id: DailyChallengeGameId;
  tabKey: TabKey;
  title: string;
} {
  // Hash the day string into a stable slot.
  let h = 0;
  for (let i = 0; i < dayString.length; i++) {
    h = (h * 31 + dayString.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(h) % GAME_CYCLE.length;
  return GAME_CYCLE[idx];
}

export function DailyChallengeProvider({ children }: { children: ReactNode }) {
  const device = useLearnerDeviceStore("dailyChallenge");
  const [hydrated, setHydrated] = useState(false);
  const [state, dispatch] = useReducer(reducer, { data: { ...EMPTY } });

  useEffect(() => {
    dispatch({ type: "HYDRATE", payload: load(device.read()) });
    setHydrated(true);
  }, [device]);

  useEffect(() => {
    if (hydrated) device.write(state.data);
  }, [device, hydrated, state.data]);

  const recordCompletion = useCallback(() => dispatch({ type: "RECORD_COMPLETION" }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const isCompletedToday = useCallback(
    () => state.data.lastCompletedDay === todayUTC(),
    [state.data.lastCompletedDay],
  );
  const todaysGame = useCallback(() => pickGameForDay(todayUTC()), []);
  const badge = useCallback(() => {
    const s = state.data.currentStreak;
    if (s >= 100) return "habit" as const;
    if (s >= 30) return "disciplined" as const;
    if (s >= 7) return "devotee" as const;
    if (s >= 3) return "returning" as const;
    return null;
  }, [state.data.currentStreak]);

  const value = useMemo<DailyChallengeContextValue>(
    () => ({
      data: state.data,
      recordCompletion,
      reset,
      isCompletedToday,
      todaysGame,
      badge,
    }),
    [state.data, recordCompletion, reset, isCompletedToday, todaysGame, badge],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDailyChallenge() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDailyChallenge must be used inside DailyChallengeProvider");
  return v;
}

export function badgeLabel(b: ReturnType<DailyChallengeContextValue["badge"]>): string {
  switch (b) {
    case "habit":
      return "Habit (100d)";
    case "disciplined":
      return "Disciplined (30d)";
    case "devotee":
      return "Devotee (7d)";
    case "returning":
      return "Returning (3d)";
    default:
      return "";
  }
}
