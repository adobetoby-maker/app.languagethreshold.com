import { useOverlayHistory } from "@/hooks/use-overlay-history";
import { useMemo, useState } from "react";
import { Trophy, X } from "lucide-react";
import {
  RANK_BADGE,
  RANK_COLOR,
  RANK_ORDER,
  POINTS_PER_TIER,
  useMatch,
  type RankTier,
} from "@/state/match-state";
import { useApp } from "@/state/app-state";
import { useLeaderboard } from "@/state/leaderboard-state";
import { RankBadge } from "./RankBadge";

type Tab = "week" | "alltime" | "language";

export function LeaderboardPanel({ onClose }: { onClose: () => void }) {
  useOverlayHistory(true, onClose);
  const { players } = useLeaderboard();
  const m = useMatch();
  const { state } = useApp();
  const [tab, setTab] = useState<Tab>("week");

  // Player "score" we use to rank YOU within the simulated field.
  // Total points across all tiers + current sub-tier points.
  const myTotal = RANK_ORDER.indexOf(m.tier) * POINTS_PER_TIER + m.points;

  const rows = useMemo(() => {
    const filtered =
      tab === "language" ? players.filter((p) => p.language === state.selectedLanguage) : players;

    const me = {
      id: "me",
      name: "You",
      tier: m.tier,
      weekPoints: myTotal,
      allTimePoints: myTotal,
      language: state.selectedLanguage,
      flag: "⭐",
      wins: m.wins,
      losses: m.losses,
      isMe: true as const,
    };

    const all = [...filtered.map((p) => ({ ...p, isMe: false as const })), me];
    const key = tab === "alltime" ? "allTimePoints" : "weekPoints";
    all.sort((a, b) => (b[key] as number) - (a[key] as number));
    return all;
  }, [players, m.tier, m.wins, m.losses, myTotal, state.selectedLanguage, tab]);

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl border border-gold/40 bg-[#0a121f]/95 p-6 shadow-[0_0_60px_-15px_rgba(201,168,76,0.55)] match-result-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close leaderboard"
          className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/30 text-white hover:border-gold/60 hover:text-gold"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-1 flex items-center gap-2 text-gold">
          <Trophy className="h-4 w-4" />
          <span className="font-mono text-[10px] uppercase tracking-[0.3em]">⚔ Leaderboard</span>
        </div>
        <h2 className="font-display text-3xl italic text-white">Practice leaderboard</h2>
        <p className="mt-2 text-sm text-white/70">
          Your row uses your saved match results. Other rows are simulated practice rivals.
        </p>

        {/* Tabs */}
        <div className="mt-5 inline-flex rounded-full border border-white/15 bg-white/5 p-1">
          {(
            [
              { k: "week", label: "Practice" },
              { k: "alltime", label: "All Time" },
              { k: "language", label: "My Language" },
            ] as { k: Tab; label: string }[]
          ).map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] transition-colors ${
                tab === t.k ? "bg-gold text-[#1a1208]" : "text-white/70 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Rows */}
        <div className="mt-5 max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
          {rows.map((p, i) => (
            <Row
              key={p.id}
              rank={i + 1}
              name={p.name}
              tier={p.tier}
              points={(tab === "alltime" ? p.allTimePoints : p.weekPoints) as number}
              language={p.language}
              flag={p.flag}
              wins={p.wins}
              losses={p.losses}
              isMe={p.isMe}
            />
          ))}
          {rows.length === 0 && (
            <div className="py-10 text-center font-mono text-xs uppercase tracking-[0.3em] text-white/50">
              No warriors in this language yet — be the first.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  rank,
  name,
  tier,
  points,
  language,
  flag,
  wins,
  losses,
  isMe,
}: {
  rank: number;
  name: string;
  tier: RankTier;
  points: number;
  language: string;
  flag: string;
  wins: number;
  losses: number;
  isMe: boolean;
}) {
  const total = wins + losses;
  const winPct = total > 0 ? (wins / total) * 100 : 0;
  const color = RANK_COLOR[tier];
  return (
    <div
      className={`flex items-center gap-2 rounded-2xl border px-2 py-2.5 transition-colors sm:gap-3 sm:px-3 ${
        isMe
          ? "border-gold bg-gold/10 shadow-[0_0_24px_-8px_rgba(201,168,76,0.7)]"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="w-5 shrink-0 text-center font-display italic text-lg text-white/80 sm:w-8">
        {rank}
      </div>
      <RankBadge tier={tier} badge={RANK_BADGE[tier]} size="sm" className="shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {isMe && <span className="text-gold">⭐</span>}
          <span
            className={`truncate font-display italic text-base ${
              isMe ? "text-gold" : "text-white"
            }`}
          >
            {name}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/55 sm:tracking-[0.2em]">
          <span style={{ color }}>{tier}</span>
          <span>·</span>
          <span>{flag}</span>
          <span className="min-w-0 break-words">{language}</span>
          <span>·</span>
          <span className="whitespace-nowrap">
            {wins}W / {losses}L
          </span>
        </div>
        {/* Win bar */}
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${winPct}%`,
              background: `linear-gradient(90deg, ${color}aa, ${color})`,
            }}
          />
        </div>
      </div>
      <div className="shrink-0 whitespace-nowrap font-mono text-xs font-medium text-white/85">
        {points}
        <span className="ml-1 text-[9px] uppercase tracking-[0.2em] text-white/45">pts</span>
      </div>
    </div>
  );
}
