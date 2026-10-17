import { useEffect, useState } from "react";
import { RANK_BADGE, RANK_COLOR, RANK_TITLE, type RankTier } from "@/state/match-state";
import { RankBadge } from "./RankBadge";
import { CountUp } from "@/components/CountUp";

function useDeferredCount(target: number, delay = 250) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => setV(target), delay);
    return () => window.clearTimeout(t);
  }, [target, delay]);
  return v;
}

export type Outcome = "victory" | "defeat" | "tie";

export interface EndMatchProps {
  outcome: Outcome;
  rounds: number;
  pointsDelta: number; // signed
  playerTier: RankTier;
  opponentName: string;
  opponentTier: RankTier;
  finalWord: string;
  finalCorrectDefinition: string;
  onRematch: () => void;
  onReturn: () => void;
  onReview?: () => void;
}

export function EndMatchScreen(props: EndMatchProps) {
  return (
    <>
      <p className="pointer-events-none absolute inset-x-4 top-4 z-50 text-center text-xs text-white/80">
        Practice result · Simulated opponent · Not an exam score
      </p>
      {props.outcome === "victory" ? (
        <VictoryScreen {...props} />
      ) : props.outcome === "defeat" ? (
        <DefeatScreen {...props} />
      ) : (
        <TieScreen {...props} />
      )}
    </>
  );
}

/* ---------------- VICTORY ---------------- */
function VictoryScreen({
  rounds,
  pointsDelta,
  playerTier,
  opponentName,
  opponentTier,
  finalWord,
  finalCorrectDefinition,
  onRematch,
  onReturn,
  onReview,
}: EndMatchProps) {
  const animated = useDeferredCount(pointsDelta);
  return (
    <div className="absolute inset-0 z-40 overflow-hidden bg-[#06101e]">
      <GoldRain count={70} />
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <div
          className="victory-title font-display italic text-gold drop-shadow-[0_0_40px_rgba(201,168,76,0.85)]"
          style={{ fontSize: "clamp(4rem, 10vw, 8rem)" }}
        >
          VICTORY
        </div>

        <div className="mt-6 victory-badge-spin">
          <RankBadge tier={playerTier} badge={RANK_BADGE[playerTier]} size="xl" intense />
        </div>

        <div className="mt-6 font-display italic text-3xl text-emerald-300">
          {pointsDelta > 0 ? "+" : ""}
          <CountUp value={animated} duration={900} /> Practice Points
        </div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-white/60">
          +25 XP
        </div>
        <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.25em] text-white/70">
          Survived {rounds} rounds
        </div>

        <div className="mx-auto my-6 h-px w-40 bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

        <OpponentLine
          opponentName={opponentName}
          opponentTier={opponentTier}
          line={`Better luck next time, ${opponentName}.`}
        />

        <LearningCard
          word={finalWord}
          definition={finalCorrectDefinition}
          note="Their stumble — your lesson."
        />

        <ResultButtons onRematch={onRematch} onReturn={onReturn} onReview={onReview} />
      </div>
    </div>
  );
}

/* ---------------- DEFEAT ---------------- */
function DefeatScreen({
  rounds,
  pointsDelta,
  opponentName,
  opponentTier,
  finalWord,
  finalCorrectDefinition,
  onRematch,
  onReturn,
  onReview,
}: EndMatchProps) {
  const animated = useDeferredCount(Math.abs(pointsDelta));
  return (
    <div className="absolute inset-0 z-40 overflow-hidden bg-[#080F1A]">
      <div className="defeat-wash absolute inset-0" />
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <div
          className="defeat-title font-display text-white/85"
          style={{ fontSize: "clamp(3.5rem, 9vw, 7rem)" }}
        >
          DEFEATED
        </div>
        <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.35em] text-white/40">
          A loss is a lesson in disguise.
        </div>

        <div className="mt-6 font-display italic text-3xl text-red-300">
          {pointsDelta < 0 ? "−" : ""}
          <CountUp value={animated} duration={800} /> Practice Points
        </div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-white/60">
          +10 XP — effort always counts
        </div>
        <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.25em] text-white/70">
          Survived {rounds} rounds against{" "}
          <span style={{ color: RANK_COLOR[opponentTier] }}>{opponentName}</span>
        </div>

        <LearningCard
          word={finalWord}
          definition={finalCorrectDefinition}
          note="You'll know it next time. 📖"
          warm
        />

        <ResultButtons
          onRematch={onRematch}
          onReturn={onReturn}
          onReview={onReview}
          rematchLabel="⚔️ Try Again"
        />
      </div>
    </div>
  );
}

/* ---------------- TIE ---------------- */
function TieScreen({
  rounds,
  playerTier,
  opponentName,
  opponentTier,
  finalWord,
  finalCorrectDefinition,
  onRematch,
  onReturn,
  onReview,
}: EndMatchProps) {
  return (
    <div className="absolute inset-0 z-40 overflow-hidden">
      <div className="tie-bg absolute inset-0" />
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <div
          className="font-display italic text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.4)] match-result-pop"
          style={{ fontSize: "clamp(4rem, 10vw, 7rem)" }}
        >
          DRAW
        </div>
        <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.3em] text-white/70">
          No points exchanged — a true standoff ⚔️
        </div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-white/55">
          +5 XP
        </div>

        <div className="mt-6 flex items-center gap-6">
          <SmallFighter name="You" tier={playerTier} />
          <span className="font-display italic text-2xl text-white/60">·</span>
          <SmallFighter name={opponentName} tier={opponentTier} />
        </div>
        <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/60">
          Survived {rounds} rounds
        </div>

        <LearningCard
          word={finalWord}
          definition={finalCorrectDefinition}
          note="A word for both warriors to remember."
        />

        <ResultButtons
          onRematch={onRematch}
          onReturn={onReturn}
          onReview={onReview}
          rematchLabel="⚔️ Play Again"
        />
      </div>
    </div>
  );
}

/* ---------------- shared bits ---------------- */
function ResultButtons({
  onRematch,
  onReturn,
  onReview,
  rematchLabel = "⚔️ Rematch",
}: {
  onRematch: () => void;
  onReturn: () => void;
  onReview?: () => void;
  rematchLabel?: string;
}) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
      <button
        onClick={onRematch}
        className="rounded-full bg-gradient-to-r from-[#E5C158] via-gold to-[#E5C158] px-7 py-3 font-display text-base italic text-[#1a1208] shadow-[0_0_30px_-5px_rgba(201,168,76,0.6)] transition-transform hover:scale-105"
      >
        {rematchLabel}
      </button>
      {onReview && (
        <button
          onClick={onReview}
          className="rounded-full border border-gold/50 bg-gold/10 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.25em] text-gold transition-colors hover:bg-gold/20"
        >
          📖 Review Battle
        </button>
      )}
      <button
        onClick={onReturn}
        className="rounded-full border border-white/30 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.25em] text-white/80 transition-colors hover:border-gold/60 hover:text-gold"
      >
        🏠 Return Home
      </button>
    </div>
  );
}

function LearningCard({
  word,
  definition,
  note,
  warm = false,
}: {
  word: string;
  definition: string;
  note: string;
  warm?: boolean;
}) {
  return (
    <div
      className={`mt-6 max-w-md rounded-2xl border px-5 py-4 text-left ${
        warm
          ? "border-gold/50 bg-[#1a1308]/85 shadow-[0_0_30px_-10px_rgba(201,168,76,0.55)]"
          : "border-white/15 bg-white/5 backdrop-blur"
      }`}
    >
      <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-gold/80">
        The word was
      </div>
      <div className="mt-1 font-display italic text-2xl text-gold drop-shadow">{word}</div>
      <div className="mt-2 text-sm leading-snug text-white/85">{definition}</div>
      <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-white/55">
        {note}
      </div>
    </div>
  );
}

function OpponentLine({
  opponentName,
  opponentTier,
  line,
}: {
  opponentName: string;
  opponentTier: RankTier;
  line: string;
}) {
  return (
    <div className="flex items-center gap-3 opacity-70">
      <RankBadge tier={opponentTier} badge={RANK_BADGE[opponentTier]} size="sm" />
      <div className="text-left">
        <div className="font-display italic text-base text-white/85">{opponentName}</div>
        <div
          className="font-mono text-[9px] uppercase tracking-[0.25em]"
          style={{ color: RANK_COLOR[opponentTier] }}
        >
          {RANK_TITLE[opponentTier]}
        </div>
      </div>
      <div className="ml-3 font-mono text-[10px] uppercase tracking-[0.22em] text-white/55">
        {line}
      </div>
    </div>
  );
}

function SmallFighter({ name, tier }: { name: string; tier: RankTier }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <RankBadge tier={tier} badge={RANK_BADGE[tier]} size="md" />
      <div className="font-display italic text-base text-white">{name}</div>
      <div
        className="font-mono text-[9px] uppercase tracking-[0.22em]"
        style={{ color: RANK_COLOR[tier] }}
      >
        {tier}
      </div>
    </div>
  );
}

/** A field of falling gold particles (CSS keyframe). */
function GoldRain({ count }: { count: number }) {
  const [drops, setDrops] = useState<
    { left: number; size: number; delay: number; duration: number; opacity: number }[]
  >([]);
  useEffect(() => {
    const arr = Array.from({ length: count }).map(() => ({
      left: Math.random() * 100,
      size: 2 + Math.random() * 5,
      delay: -Math.random() * 4,
      duration: 3 + Math.random() * 4,
      opacity: 0.4 + Math.random() * 0.6,
    }));
    setDrops(arr);
  }, [count]);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {drops.map((d, i) => (
        <span
          key={i}
          className="gold-drop"
          style={{
            left: `${d.left}%`,
            width: d.size,
            height: d.size,
            opacity: d.opacity,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
