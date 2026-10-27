import { X } from "lucide-react";
import { useOverlayHistory } from "@/hooks/use-overlay-history";
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import {
  RANK_BADGE,
  RANK_COLOR,
  RANK_COLOR_SECONDARY,
  RANK_FLAVOR,
  RANK_TITLE,
  type RankTier,
} from "@/state/match-state";
import { RankBadge } from "./RankBadge";

interface Props {
  oldTier: RankTier;
  newTier: RankTier;
  onContinue: () => void;
}

type Stage = "flash" | "shatter" | "rush" | "assemble" | "name" | "title" | "flavor" | "ready";

const STAGE_TIMINGS: Record<Stage, number> = {
  flash: 200,
  shatter: 700,
  rush: 600,
  assemble: 800,
  name: 700,
  title: 600,
  flavor: 700,
  ready: 0,
};

const STAGE_ORDER: Stage[] = [
  "flash",
  "shatter",
  "rush",
  "assemble",
  "name",
  "title",
  "flavor",
  "ready",
];

export function RankUpCeremony({ oldTier, newTier, onContinue }: Props) {
  useOverlayHistory(true, onContinue);
  const [stage, setStage] = useState<Stage>("flash");

  useEffect(() => {
    const timers: number[] = [];
    let acc = 0;
    for (let i = 0; i < STAGE_ORDER.length - 1; i++) {
      acc += STAGE_TIMINGS[STAGE_ORDER[i]];
      const next = STAGE_ORDER[i + 1];
      const t = window.setTimeout(() => setStage(next), acc);
      timers.push(t);
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  // Confetti when we hit the assemble stage
  useEffect(() => {
    if (stage !== "assemble") return;
    const color = RANK_COLOR[newTier];
    const sec = RANK_COLOR_SECONDARY[newTier] ?? "#FFFFFF";
    const colors =
      newTier === "Unreal"
        ? ["#ff4d4d", "#ffe34d", "#4dff7a", "#4dc3ff", "#a64dff", "#ff4dd2"]
        : [color, sec, "#FFFFFF"];
    const fire = (originX: number) =>
      confetti({
        particleCount: 70,
        spread: 90,
        startVelocity: 50,
        ticks: 220,
        origin: { x: originX, y: 0.4 },
        colors,
        zIndex: 9999,
      });
    fire(0.2);
    fire(0.5);
    fire(0.8);
    const t = window.setTimeout(() => fire(0.5), 800);
    const t2 = window.setTimeout(() => fire(0.5), 1800);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, [stage, newTier]);

  const color = RANK_COLOR[newTier];
  const sec = RANK_COLOR_SECONDARY[newTier] ?? color;
  const isUnreal = newTier === "Unreal";

  return (
    <div className="absolute inset-0 z-50 overflow-hidden">
      <button
        type="button"
        aria-label="Close rank celebration"
        onClick={onContinue}
        className="absolute right-4 top-4 z-[60] flex h-11 w-11 items-center justify-center rounded-lg border border-white/30 bg-[#06101e] text-white"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
      {/* Color wash background */}
      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{
          background: isUnreal
            ? "radial-gradient(ellipse at center, #1a1030 0%, #060209 70%)"
            : `radial-gradient(ellipse at center, ${color}33 0%, #060a14 70%)`,
        }}
      />
      {isUnreal && <div className="rank-aurora absolute inset-0 opacity-60" />}

      {/* White flash */}
      {stage === "flash" && (
        <div className="absolute inset-0 bg-white animate-[flashFade_0.2s_ease-out_forwards]" />
      )}

      {/* Inrushing particles */}
      {stage === "rush" && <RushParticles color={color} />}

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        {/* Badge area */}
        <div className="relative h-40 w-40">
          {stage === "shatter" && (
            <ShatterFragments emoji={RANK_BADGE[oldTier]} color={RANK_COLOR[oldTier]} />
          )}
          {(stage === "assemble" ||
            stage === "name" ||
            stage === "title" ||
            stage === "flavor" ||
            stage === "ready") && (
            <div className="absolute inset-0 flex items-center justify-center rank-assemble">
              <RankBadge tier={newTier} badge={RANK_BADGE[newTier]} size="xl" intense />
            </div>
          )}
        </div>

        {/* Rank name */}
        {(stage === "name" || stage === "title" || stage === "flavor" || stage === "ready") && (
          <div
            className="mt-8 font-display italic uppercase tracking-wider rank-boom"
            style={{
              fontSize: "clamp(3.5rem, 9vw, 6.5rem)",
              color: isUnreal ? "#FFFFFF" : color,
              textShadow: isUnreal
                ? "0 0 40px rgba(255,255,255,0.85), 0 0 80px rgba(180,120,255,0.7)"
                : `0 0 40px ${color}, 0 0 80px ${sec}aa`,
            }}
          >
            {newTier}
          </div>
        )}

        {/* Title */}
        {(stage === "title" || stage === "flavor" || stage === "ready") && (
          <div className="mt-3 font-display italic text-2xl text-white/90 fade-in">
            "{RANK_TITLE[newTier]}"
          </div>
        )}

        {/* Flavor */}
        {(stage === "flavor" || stage === "ready") && (
          <div className="mt-4 max-w-xl font-mono text-[11px] uppercase tracking-[0.28em] text-white/65 fade-in">
            {RANK_FLAVOR[newTier]}
          </div>
        )}

        {/* Continue button */}
        {stage === "ready" && (
          <button
            onClick={onContinue}
            className="mt-10 rounded-full border-2 px-8 py-3 font-display italic text-lg text-white fade-in transition-all hover:scale-105"
            style={{
              borderColor: isUnreal ? "#FFFFFF" : color,
              boxShadow: `0 0 30px -5px ${color}`,
            }}
          >
            Continue →
          </button>
        )}
      </div>
    </div>
  );
}

function ShatterFragments({ emoji, color }: { emoji: string; color: string }) {
  const frags = Array.from({ length: 8 });
  return (
    <div className="absolute inset-0">
      {frags.map((_, i) => {
        const angle = (i / frags.length) * 360;
        return (
          <span
            key={i}
            className="shatter-frag absolute left-1/2 top-1/2 select-none"
            style={
              {
                "--angle": `${angle}deg`,
                color,
                fontSize: "2rem",
                textShadow: `0 0 12px ${color}`,
              } as React.CSSProperties
            }
          >
            {emoji}
          </span>
        );
      })}
    </div>
  );
}

function RushParticles({ color }: { color: string }) {
  const parts = Array.from({ length: 30 });
  return (
    <div className="pointer-events-none absolute inset-0">
      {parts.map((_, i) => {
        const angle = (i / parts.length) * 360;
        return (
          <span
            key={i}
            className="rush-particle absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full"
            style={
              {
                "--angle": `${angle}deg`,
                background: color,
                boxShadow: `0 0 8px ${color}`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
