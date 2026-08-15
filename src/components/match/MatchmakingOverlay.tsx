import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { useApp, type Language } from "@/state/app-state";
import {
  POINTS_LOSS,
  POINTS_PER_TIER,
  POINTS_TIE,
  POINTS_WIN,
  RANK_BADGE,
  RANK_COLOR,
  RANK_ORDER,
  RANK_TITLE,
  useMatch,
  type RankTier,
} from "@/state/match-state";
import { RankBadge } from "./RankBadge";
import { BattleArena, type BattleResult, type ReviewedWord } from "./BattleArena";
import { EndMatchScreen } from "./EndMatchScreen";
import { RankUpCeremony } from "./RankUpCeremony";
import { BattleReviewPanel } from "./BattleReviewPanel";
import { LeaderboardPanel } from "./LeaderboardPanel";
import { useLeaderboard } from "@/state/leaderboard-state";

const LANG_FLAGS: Record<Language, string> = {
  Spanish: "🇪🇸",
  French: "🇫🇷",
  German: "🇩🇪",
  Italian: "🇮🇹",
  Japanese: "🇯🇵",
  Chinese: "🇨🇳",
  Korean: "🇰🇷",
  Portuguese: "🇧🇷",
  Pashto: "🇦🇫",
  English: "🇬🇧",
};

const OPPONENT_NAMES: Record<Language, string[]> = {
  Spanish: ["Sofia_MX", "CarlosR_ES", "LunaV_AR", "Mateo_CO", "IsaT_PE"],
  French: ["ChloeP_FR", "MarcB_QC", "EliseD_BE", "TheoR_FR", "CamilleM_CH"],
  German: ["KlausW_DE", "AnnaS_AT", "LukasH_DE", "MiaB_CH", "FelixK_DE"],
  Italian: ["GiuliaR_IT", "LucaB_IT", "MartinaC_IT", "MatteoP_IT", "SofiaT_IT"],
  Japanese: ["Haruki_JP", "YukiM_JP", "SoraT_JP", "AoiK_JP", "RenS_JP"],
  Chinese: ["Wei_CN", "MeiL_CN", "Jun_CN", "XiaoY_CN", "Hao_CN"],
  Korean: ["Jihoon_KR", "MinaP_KR", "Seojun_KR", "DaeunL_KR", "Hyejin_KR"],
  Portuguese: ["LucasS_BR", "AnaP_PT", "PedroR_BR", "BeaM_PT", "ThiagoF_BR"],
  Pashto: ["Ahmad_AF", "ZarghunaK_AF", "Rahim_PK", "LailaN_AF", "Farid_KBL"],
  English: ["EmmaJ_US", "OliverT_GB", "NoahP_AU", "AvaW_CA", "LiamH_US"],
};

type MatchPhase = "idle" | "searching" | "found" | "countdown" | "battling" | "result";

interface Opponent {
  username: string;
  tier: RankTier;
  points: number;
  language: Language;
}

function nearbyTier(tier: RankTier): RankTier {
  const idx = RANK_ORDER.indexOf(tier);
  const candidates = [idx - 1, idx, idx + 1].filter((i) => i >= 0 && i < RANK_ORDER.length);
  return RANK_ORDER[candidates[Math.floor(Math.random() * candidates.length)]];
}

function generateOpponent(language: Language, tier: RankTier): Opponent {
  const pool = OPPONENT_NAMES[language];
  return {
    username: pool[Math.floor(Math.random() * pool.length)],
    tier: nearbyTier(tier),
    points: Math.floor(Math.random() * POINTS_PER_TIER),
    language,
  };
}

export function MatchmakingOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch } = useApp();
  const language = state.selectedLanguage;
  const {
    tier,
    points,
    badge,
    glowColor,
    title,
    addPoints,
    removePoints,
    pendingRankUp,
    acknowledgeRankUp,
    recordMatch,
  } = useMatch();
  const { nudgeOnWin } = useLeaderboard();

  const [phase, setPhase] = useState<MatchPhase>("idle");
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [countdown, setCountdown] = useState<3 | 2 | 1 | "BATTLE">(3);
  const [matchResult, setMatchResult] = useState<{
    outcome: BattleResult["outcome"];
    rounds: number;
    pointsDelta: number;
    finalWord: string;
    finalCorrectDefinition: string;
    wordHistory: ReviewedWord[];
  } | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const timersRef = useRef<number[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  };

  // Reset everything when overlay closes
  useEffect(() => {
    if (!open) {
      clearTimers();
      setPhase("idle");
      setOpponent(null);
      setCountdown(3);
      setMatchResult(null);
      setShowReview(false);
      setShowLeaderboard(false);
    }
  }, [open]);

  const oldTierRef = useRef<RankTier>(tier);

  const handleBattleComplete = (result: BattleResult) => {
    let delta = 0;
    oldTierRef.current = tier;
    if (result.outcome === "victory") {
      delta = POINTS_WIN;
      addPoints(POINTS_WIN);
      dispatch({ type: "ADD_XP", payload: 25 });
      nudgeOnWin();
    } else if (result.outcome === "defeat") {
      delta = -POINTS_LOSS;
      removePoints(POINTS_LOSS);
      dispatch({ type: "ADD_XP", payload: 10 });
    } else {
      delta = POINTS_TIE;
      dispatch({ type: "ADD_XP", payload: 5 });
    }
    recordMatch({ outcome: result.outcome, rounds: result.rounds });
    setMatchResult({
      outcome: result.outcome,
      rounds: result.rounds,
      pointsDelta: delta,
      finalWord: result.finalWord,
      finalCorrectDefinition: result.finalCorrectDefinition,
      wordHistory: result.wordHistory,
    });
    setPhase("result" as MatchPhase);
  };

  const returnToMatchmaking = () => {
    setMatchResult(null);
    setOpponent(null);
    setPhase("idle");
  };

  // Esc to close (only when not mid-countdown so we don't strand the player)
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase !== "countdown" && phase !== "battling") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, phase, onClose]);

  useEffect(() => () => clearTimers(), []);

  const startSearch = () => {
    setPhase("searching");
    setOpponent(null);
    const delay = 2000 + Math.random() * 2000; // 2–4s
    const t = window.setTimeout(() => {
      const opp = generateOpponent(language, tier);
      setOpponent(opp);
      setPhase("found");
      // After 1.5s of admiring the cards, start countdown
      const t2 = window.setTimeout(() => runCountdown(), 1500);
      timersRef.current.push(t2);
    }, delay);
    timersRef.current.push(t);
  };

  const cancelSearch = () => {
    clearTimers();
    setPhase("idle");
    setOpponent(null);
  };

  const runCountdown = () => {
    setPhase("countdown");
    setCountdown(3);
    const seq: { v: 3 | 2 | 1 | "BATTLE"; at: number }[] = [
      { v: 2, at: 900 },
      { v: 1, at: 1800 },
      { v: "BATTLE", at: 2700 },
    ];
    seq.forEach(({ v, at }) => {
      const t = window.setTimeout(() => setCountdown(v), at);
      timersRef.current.push(t);
    });
    const tEnd = window.setTimeout(() => setPhase("battling"), 3700);
    timersRef.current.push(tEnd);
  };

  const flag = LANG_FLAGS[language];

  const playerCard = (
    <PlayerCard
      side="player"
      username="You"
      tier={tier}
      points={points}
      title={title}
      badge={badge}
      glowColor={glowColor}
      language={language}
      flag={flag}
      animateTo={phase === "found" || phase === "countdown" ? "left" : "center"}
    />
  );

  const opponentCard = opponent && (phase === "found" || phase === "countdown") && (
    <PlayerCard
      side="opponent"
      username={opponent.username}
      tier={opponent.tier}
      points={opponent.points}
      title={RANK_TITLE[opponent.tier]}
      badge={RANK_BADGE[opponent.tier]}
      glowColor={RANK_COLOR[opponent.tier]}
      language={opponent.language}
      flag={LANG_FLAGS[opponent.language]}
      animateTo="right"
    />
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const particles = useMemo(() => (mounted ? makeParticles(40) : []), [mounted]);

  return (
    <div
      className={`fixed inset-0 z-[100] ${open ? "match-overlay-open" : "match-overlay-closed"} pointer-events-none`}
      aria-hidden={!open}
    >
      <div className={`absolute inset-0 ${open ? "pointer-events-auto" : ""} match-overlay-bg`}>
        {/* Particle field */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {particles.map((p, i) => (
            <span
              key={i}
              className="match-particle"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                opacity: p.opacity,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}
        </div>

        {/* Close + corner Leaderboard chip */}
        {phase !== "countdown" && phase !== "battling" && (
          <div className="absolute right-6 top-6 z-20 flex items-center gap-2">
            <button
              onClick={() => setShowLeaderboard(true)}
              aria-label="Open Leaderboard"
              className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-gold backdrop-blur transition-colors hover:bg-gold/20"
            >
              🏅 Leaderboard
            </button>
            <button
              onClick={onClose}
              aria-label="Close Language Match"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white/70 backdrop-blur transition-colors hover:border-gold/60 hover:text-gold"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Header */}
        {phase !== "battling" && phase !== "result" && (
          <div className="absolute inset-x-0 top-10 z-10 text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-gold/70">
              ⚔ Language Match ⚔
            </div>
            <h1 className="mt-2 font-display text-4xl italic text-white">The Arena</h1>
          </div>
        )}

        {/* Cards arena */}
        {phase !== "battling" && phase !== "result" && (
          <div className="relative z-10 flex h-full flex-col items-center justify-center px-6">
            <div className="relative flex w-full max-w-5xl items-center justify-center gap-10">
              {playerCard}

              {/* VS Badge */}
              {(phase === "found" || phase === "countdown") && (
                <div
                  key="vs"
                  className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 vs-drop"
                >
                  <div className="font-display text-7xl italic text-gold drop-shadow-[0_0_30px_rgba(201,168,76,0.7)]">
                    VS
                  </div>
                </div>
              )}

              {opponentCard}
            </div>

            {/* Below-cards CTA / status */}
            <div className="mt-12 flex min-h-[120px] flex-col items-center justify-center text-center">
              {phase === "idle" && (
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={startSearch}
                    className="find-match-btn inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#E5C158] via-gold to-[#E5C158] px-10 py-5 font-display text-2xl italic text-[#1a1208] shadow-[0_0_60px_-5px_rgba(201,168,76,0.6)] transition-transform hover:scale-105 active:scale-100"
                  >
                    <span>⚔️</span>
                    <span>Find Match</span>
                  </button>
                  <button
                    onClick={() => setShowLeaderboard(true)}
                    className="rounded-full border border-white/20 bg-white/5 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.28em] text-white/75 transition-colors hover:border-gold/60 hover:text-gold"
                  >
                    🏅 Leaderboard
                  </button>
                </div>
              )}

              {phase === "searching" && <SearchingState onCancel={cancelSearch} />}

              {phase === "found" && (
                <div className="font-mono text-xs uppercase tracking-[0.3em] text-gold/80">
                  Opponent located · Preparing the arena
                </div>
              )}
            </div>
          </div>
        )}

        {/* Countdown layer */}
        {phase === "countdown" && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
            <div
              key={String(countdown)}
              className="countdown-pop font-display italic text-gold drop-shadow-[0_0_40px_rgba(201,168,76,0.8)]"
              style={{
                fontSize: countdown === "BATTLE" ? "min(18vw, 220px)" : "min(28vw, 340px)",
              }}
            >
              {countdown === "BATTLE" ? "⚔️ BATTLE!" : countdown}
            </div>
          </div>
        )}

        {/* Battle arena */}
        {phase === "battling" && opponent && (
          <BattleArena
            playerName="You"
            playerTier={tier}
            opponentName={opponent.username}
            opponentTier={opponent.tier}
            language={language}
            onComplete={handleBattleComplete}
          />
        )}

        {/* Result screen */}
        {phase === "result" && matchResult && opponent && (
          <EndMatchScreen
            outcome={matchResult.outcome}
            rounds={matchResult.rounds}
            pointsDelta={matchResult.pointsDelta}
            playerTier={tier}
            opponentName={opponent.username}
            opponentTier={opponent.tier}
            finalWord={matchResult.finalWord}
            finalCorrectDefinition={matchResult.finalCorrectDefinition}
            onRematch={returnToMatchmaking}
            onReturn={onClose}
            onReview={() => setShowReview(true)}
          />
        )}

        {/* Rank-up ceremony — sits ABOVE the result screen */}
        {pendingRankUp && phase === "result" && (
          <RankUpCeremony
            oldTier={oldTierRef.current}
            newTier={pendingRankUp}
            onContinue={acknowledgeRankUp}
          />
        )}

        {/* Battle Review panel */}
        {showReview && matchResult && (
          <BattleReviewPanel
            words={matchResult.wordHistory}
            onClose={() => setShowReview(false)}
            onPlayAgain={() => {
              setShowReview(false);
              returnToMatchmaking();
            }}
            onHome={() => {
              setShowReview(false);
              onClose();
            }}
          />
        )}

        {/* Leaderboard panel */}
        {showLeaderboard && <LeaderboardPanel onClose={() => setShowLeaderboard(false)} />}
      </div>
    </div>
  );
}

// (Old inline ResultScreen replaced by EndMatchScreen component.)

function PlayerCard({
  side,
  username,
  tier,
  points,
  title,
  badge,
  glowColor,
  language,
  flag,
  animateTo,
}: {
  side: "player" | "opponent";
  username: string;
  tier: RankTier;
  points: number;
  title: string;
  badge: string;
  glowColor: string;
  language: Language;
  flag: string;
  animateTo: "center" | "left" | "right";
}) {
  const pct = Math.round((points / POINTS_PER_TIER) * 100);

  const animClass =
    animateTo === "left"
      ? "card-slide-left"
      : animateTo === "right"
        ? "card-slide-in-right"
        : "card-rise";

  return (
    <div
      className={`relative w-[300px] shrink-0 rounded-3xl border border-gold/40 bg-gradient-to-b from-[#0e1726] to-[#070b14] p-6 shadow-[0_0_40px_-10px_rgba(201,168,76,0.4)] backdrop-blur ${animClass}`}
      style={
        {
          ["--rank-color" as any]: glowColor,
          boxShadow: `inset 0 0 40px -15px ${glowColor}55, 0 0 50px -15px ${glowColor}55`,
        } as React.CSSProperties
      }
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />

      <div className="flex flex-col items-center text-center">
        <RankBadge tier={tier} badge={badge} size="xl" intense />

        <div className="mt-4 font-display text-2xl italic text-white">{username}</div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-gold/80">
          {title}
        </div>

        <div className="mt-4 w-full">
          <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-white/70">
            <span style={{ color: glowColor }}>{tier}</span>
            <span>
              {points} / {POINTS_PER_TIER} pts
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${glowColor}aa, ${glowColor})`,
                boxShadow: `0 0 12px ${glowColor}aa`,
              }}
            />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5">
          <span className="text-base">{flag}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/80">
            {language}
          </span>
        </div>

        <div className="mt-3 font-mono text-[9px] uppercase tracking-[0.3em] text-white/40">
          {side === "player" ? "Challenger" : "Opponent"}
        </div>
      </div>
    </div>
  );
}

function SearchingState({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative h-32 w-32">
        <div className="radar-ring" />
        <div className="radar-ring" style={{ animationDelay: "0.6s" }} />
        <div className="radar-ring" style={{ animationDelay: "1.2s" }} />
        <div className="absolute inset-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold shadow-[0_0_18px_rgba(201,168,76,0.9)]" />
      </div>
      <div className="font-mono text-xs uppercase tracking-[0.28em] text-white/80">
        Searching for an opponent at your level
        <span className="searching-dots ml-1" />
      </div>
      <button
        onClick={onCancel}
        className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/50 underline-offset-4 transition-colors hover:text-gold hover:underline"
      >
        Cancel search
      </button>
    </div>
  );
}

function makeParticles(n: number) {
  const arr: {
    x: number;
    y: number;
    size: number;
    opacity: number;
    duration: number;
    delay: number;
  }[] = [];
  for (let i = 0; i < n; i++) {
    arr.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 3,
      opacity: 0.25 + Math.random() * 0.65,
      duration: 8 + Math.random() * 14,
      delay: -Math.random() * 14,
    });
  }
  return arr;
}
