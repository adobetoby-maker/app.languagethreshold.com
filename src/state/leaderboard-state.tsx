import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { RANK_ORDER, type RankTier } from "./match-state";
import type { Language } from "./app-state";

export interface LeaderboardPlayer {
  id: string;
  name: string;
  tier: RankTier;
  /** Total points THIS WEEK (used for the weekly tab). */
  weekPoints: number;
  /** Total points ALL TIME. */
  allTimePoints: number;
  language: Language;
  flag: string;
  wins: number;
  losses: number;
}

const STORAGE_KEY = "lt.leaderboard.v1";

const NAMES = [
  "AminaK",
  "TaroY_JP",
  "IsabellaR",
  "HansDK",
  "OluwaseunA",
  "MeilingC",
  "RafaelM_BR",
  "NatashaPV",
  "SofiaM_ES",
  "LucasF_FR",
  "MinhP_VN",
  "JuliaD_DE",
];

const FLAGS: Record<Language, string> = {
  Spanish: "🇪🇸",
  French: "🇫🇷",
  German: "🇩🇪",
  Italian: "🇮🇹",
  Japanese: "🇯🇵",
  Korean: "🇰🇷",
  Portuguese: "🇧🇷",
  Pashto: "🇦🇫",
  English: "🇬🇧",
  Chinese: "🇨🇳",
};

const LANGS: Language[] = [
  "Spanish",
  "French",
  "German",
  "Italian",
  "Japanese",
  "Korean",
  "Portuguese",
  "Pashto",
  "English",
  "Chinese",
];

function rand<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate 8 simulated players. Distribution roughly Bronze→Champion,
 * with exactly 1 Unreal at the very top.
 */
function seedPlayers(): LeaderboardPlayer[] {
  const distribution: RankTier[] = [
    "Unreal",
    "Champion",
    "Diamond",
    "Platinum",
    "Gold",
    "Silver",
    "Bronze",
    "Bronze",
  ];
  const used = new Set<string>();
  const players: LeaderboardPlayer[] = [];
  for (let i = 0; i < distribution.length; i++) {
    let name = rand(NAMES);
    while (used.has(name)) name = rand(NAMES);
    used.add(name);
    const tier = distribution[i];
    // Higher tiers get more weekly points
    const tierIdx = RANK_ORDER.indexOf(tier);
    const baseWeek = 200 + tierIdx * 320 + Math.floor(Math.random() * 250);
    const language = rand(LANGS);
    const wins = 5 + Math.floor(Math.random() * 95);
    const losses = Math.floor(Math.random() * Math.max(1, wins));
    players.push({
      id: `lb-${name}-${i}`,
      name,
      tier,
      weekPoints: Math.min(2400, baseWeek),
      allTimePoints: baseWeek * (3 + Math.floor(Math.random() * 6)),
      language,
      flag: FLAGS[language],
      wins,
      losses,
    });
  }
  return players;
}

interface LeaderboardCtx {
  players: LeaderboardPlayer[];
  /** Bump simulated players ahead of the player by 1–2 positions on a win. */
  nudgeOnWin: () => void;
  reset: () => void;
}

const Ctx = createContext<LeaderboardCtx | null>(null);

export function LeaderboardProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as LeaderboardPlayer[];
        if (Array.isArray(parsed) && parsed.length === 8) {
          setPlayers(parsed);
          setHydrated(true);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    const fresh = seedPlayers();
    setPlayers(fresh);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
    } catch {
      /* ignore */
    }
  }, [players, hydrated]);

  const nudgeOnWin = useCallback(() => {
    setPlayers((ps) =>
      ps.map((p) => {
        // Slight downward pressure on a few players so YOU rise relative to them.
        if (Math.random() < 0.4) {
          return {
            ...p,
            weekPoints: Math.max(0, p.weekPoints - (5 + Math.floor(Math.random() * 12))),
          };
        }
        // Others move up a little (the world keeps playing).
        return {
          ...p,
          weekPoints: Math.min(2400, p.weekPoints + Math.floor(Math.random() * 6)),
        };
      }),
    );
  }, []);

  const reset = useCallback(() => setPlayers(seedPlayers()), []);

  const value = useMemo(() => ({ players, nudgeOnWin, reset }), [players, nudgeOnWin, reset]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLeaderboard() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLeaderboard must be used inside LeaderboardProvider");
  return c;
}
