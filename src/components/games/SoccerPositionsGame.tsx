/**
 * SoccerPositionsGame — interactive soccer positions identification game.
 *
 * Three modes:
 *  1. "Name It"     — a position glows on the SVG field; pick the English name from 4 options.
 *  2. "Find It"     — an English name is shown; tap the correct marker on the field.
 *  3. "Translate It"— the target-language name is shown; pick the English name from 4 options.
 *
 * Formation selector: 4-4-2 | 4-3-3 | 4-2-3-1 | 3-5-2
 * XP: +5 per correct answer, +10 when streak ≥ 3.
 *
 * No external game libs. Inline SVG pitch. Lucide-react icons only.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  Flame,
  RotateCcw,
  ChevronRight,
  Crosshair,
  Search,
  Languages,
} from "lucide-react";
import {
  getPositionsForFormation,
  type FieldPosition,
  type SoccerFormation,
} from "@/data/soccer-positions";

// ── Props ──────────────────────────────────────────────────────────────────────

export interface SoccerPositionsGameProps {
  language: string;
  onXp?: (amount: number) => void;
}

// ── Types ──────────────────────────────────────────────────────────────────────

type GameMode = "name-it" | "find-it" | "translate-it";
type AnswerState = "idle" | "correct" | "wrong";

interface Question {
  target: FieldPosition;
  /** Choices are English names for name-it/translate-it; position IDs for find-it (handled on field). */
  options: FieldPosition[];
  /** For translate-it: the target-language label to display. */
  translatedLabel?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestion(
  pool: FieldPosition[],
  language: string,
  mode: GameMode,
  exclude?: string,
): Question {
  const eligible = exclude ? pool.filter((p) => p.id !== exclude) : pool;
  const source = eligible.length > 0 ? eligible : pool;
  const target = source[Math.floor(Math.random() * source.length)];

  // 3 wrong distractors from the same pool
  const wrong = shuffle(pool.filter((p) => p.id !== target.id)).slice(0, 3);
  const options = shuffle([target, ...wrong]);

  if (mode === "translate-it") {
    const translatedLabel = target.labels[language] ?? target.en;
    return { target, options, translatedLabel };
  }

  return { target, options };
}

// ── Zone accent colours ────────────────────────────────────────────────────────

const ZONE_FILL: Record<FieldPosition["zone"], string> = {
  goalkeeper: "#f59e0b",
  defender: "#3b82f6",
  midfielder: "#10b981",
  forward: "#ef4444",
};

const ZONE_LABEL_CLS: Record<FieldPosition["zone"], string> = {
  goalkeeper: "border-amber-400/60 bg-amber-400/10 text-amber-300",
  defender: "border-blue-400/60 bg-blue-400/10 text-blue-300",
  midfielder: "border-emerald-400/60 bg-emerald-400/10 text-emerald-300",
  forward: "border-red-400/60 bg-red-400/10 text-red-700 dark:text-red-300",
};

// ── SVG Field ──────────────────────────────────────────────────────────────────

interface FieldProps {
  positions: FieldPosition[];
  /** Glowing gold marker (Name It / Translate It) */
  activeId: string | null;
  /** Flash after answer */
  flashId: string | null;
  flashState: AnswerState;
  /** Find It — clicking a position submits it as answer */
  onPositionClick?: (pos: FieldPosition) => void;
  /** Find It — which id is the one being searched */
  findTargetId?: string | null;
}

// SVG coordinate helpers: field is 600 × 900 (portrait, top = defensive end)
const FW = 600;
const FH = 900;

function fieldX(pct: number) {
  // 5% margin each side
  return 30 + (pct / 100) * (FW - 60);
}
function fieldY(pct: number) {
  // y=0 defensive end (top), y=100 attacking end (bottom); 5% margin top/bottom
  return 30 + (pct / 100) * (FH - 60);
}

function SoccerField({
  positions,
  activeId,
  flashId,
  flashState,
  onPositionClick,
  findTargetId,
}: FieldProps) {
  const markerR = 22;

  return (
    <svg
      viewBox={`0 0 ${FW} ${FH}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-label="Soccer field top-down view"
    >
      <defs>
        <radialGradient id="pitch-grad" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#1f5e1f" />
          <stop offset="100%" stopColor="#143a14" />
        </radialGradient>
        <filter id="glow-gold" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="glow-green" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="glow-red" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* ── Pitch background ── */}
      <rect x="0" y="0" width={FW} height={FH} fill="url(#pitch-grad)" />

      {/* Alternating grass stripes */}
      {Array.from({ length: 9 }).map((_, i) => (
        <rect
          key={i}
          x="0"
          y={i * 100}
          width={FW}
          height="100"
          fill={i % 2 === 0 ? "#1a521a" : "#174f17"}
          opacity="0.55"
        />
      ))}

      {/* ── Touchlines & goal lines ── */}
      <rect
        x="30"
        y="30"
        width={FW - 60}
        height={FH - 60}
        fill="none"
        stroke="white"
        strokeWidth="3.5"
        opacity="0.75"
      />

      {/* ── Halfway line ── */}
      <line
        x1="30"
        y1={FH / 2}
        x2={FW - 30}
        y2={FH / 2}
        stroke="white"
        strokeWidth="2.5"
        opacity="0.6"
      />

      {/* ── Centre circle ── */}
      <circle
        cx={FW / 2}
        cy={FH / 2}
        r="80"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        opacity="0.55"
      />
      <circle cx={FW / 2} cy={FH / 2} r="5" fill="white" opacity="0.6" />

      {/* ── Penalty area — top (defensive) ── */}
      {/* Penalty box */}
      <rect
        x="150"
        y="30"
        width="300"
        height="145"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        opacity="0.55"
      />
      {/* Goal area */}
      <rect
        x="225"
        y="30"
        width="150"
        height="58"
        fill="none"
        stroke="white"
        strokeWidth="2"
        opacity="0.45"
      />
      {/* Penalty arc */}
      <path
        d="M 213 175 A 80 80 0 0 1 387 175"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        opacity="0.45"
      />
      {/* Penalty spot */}
      <circle cx={FW / 2} cy="148" r="5" fill="white" opacity="0.55" />

      {/* ── Goal — top ── */}
      <rect
        x="240"
        y="6"
        width="120"
        height="27"
        fill="rgba(255,255,255,0.08)"
        stroke="white"
        strokeWidth="3"
        opacity="0.75"
      />

      {/* ── Penalty area — bottom (attacking) ── */}
      <rect
        x="150"
        y={FH - 30 - 145}
        width="300"
        height="145"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        opacity="0.55"
      />
      <rect
        x="225"
        y={FH - 30 - 58}
        width="150"
        height="58"
        fill="none"
        stroke="white"
        strokeWidth="2"
        opacity="0.45"
      />
      <path
        d={`M 213 ${FH - 175} A 80 80 0 0 0 387 ${FH - 175}`}
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        opacity="0.45"
      />
      <circle cx={FW / 2} cy={FH - 148} r="5" fill="white" opacity="0.55" />

      {/* ── Goal — bottom ── */}
      <rect
        x="240"
        y={FH - 33}
        width="120"
        height="27"
        fill="rgba(255,255,255,0.08)"
        stroke="white"
        strokeWidth="3"
        opacity="0.75"
      />

      {/* ── Corner arcs ── */}
      <path
        d="M 30 55 A 25 25 0 0 0 55 30"
        fill="none"
        stroke="white"
        strokeWidth="2"
        opacity="0.4"
      />
      <path
        d={`M ${FW - 30} 55 A 25 25 0 0 1 ${FW - 55} 30`}
        fill="none"
        stroke="white"
        strokeWidth="2"
        opacity="0.4"
      />
      <path
        d={`M 30 ${FH - 55} A 25 25 0 0 1 55 ${FH - 30}`}
        fill="none"
        stroke="white"
        strokeWidth="2"
        opacity="0.4"
      />
      <path
        d={`M ${FW - 30} ${FH - 55} A 25 25 0 0 0 ${FW - 55} ${FH - 30}`}
        fill="none"
        stroke="white"
        strokeWidth="2"
        opacity="0.4"
      />

      {/* ── Position markers ── */}
      {positions.map((pos) => {
        const cx = fieldX(pos.x);
        const cy = fieldY(pos.y);

        const isActive = pos.id === activeId;
        const isFlash = pos.id === flashId;
        const isFindTarget = pos.id === findTargetId;
        const isClickable = !!onPositionClick;

        let fill = "rgba(255,255,255,0.22)";
        let stroke = "rgba(255,255,255,0.45)";
        let sw = 2;
        let filterAttr: string | undefined;
        let textFill = "white";

        if (isFlash && flashState === "correct") {
          fill = "#22c55e";
          stroke = "#16a34a";
          sw = 3.5;
          filterAttr = "url(#glow-green)";
          textFill = "#052e16";
        } else if (isFlash && flashState === "wrong") {
          fill = "#ef4444";
          stroke = "#dc2626";
          sw = 3.5;
          filterAttr = "url(#glow-red)";
          textFill = "#450a0a";
        } else if (isActive) {
          fill = "hsl(var(--gold, 43 96% 56%))";
          stroke = "white";
          sw = 3;
          filterAttr = "url(#glow-gold)";
          textFill = "#1a0a00";
        } else {
          fill = ZONE_FILL[pos.zone] + "88";
          stroke = ZONE_FILL[pos.zone] + "cc";
          sw = 2;
        }

        return (
          <g
            key={pos.id}
            style={{ cursor: isClickable ? "pointer" : "default", filter: filterAttr }}
            onClick={() => onPositionClick?.(pos)}
          >
            {/* Pulse ring for active/find-target */}
            {(isActive || isFindTarget) && flashState === "idle" && (
              <circle
                cx={cx}
                cy={cy}
                r={markerR + 10}
                fill="none"
                stroke={isActive ? "hsl(var(--gold, 43 96% 56%))" : "rgba(255,255,255,0.6)"}
                strokeWidth="2"
              >
                <animate
                  attributeName="r"
                  values={`${markerR + 8};${markerR + 18};${markerR + 8}`}
                  dur="1.8s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.7;0.1;0.7"
                  dur="1.8s"
                  repeatCount="indefinite"
                />
              </circle>
            )}
            {/* Clickable hover ring */}
            {isClickable && !isFlash && (
              <circle
                cx={cx}
                cy={cy}
                r={markerR + 6}
                fill="transparent"
                stroke="white"
                strokeWidth="1.5"
                opacity="0"
                className="transition-opacity hover:opacity-30"
              />
            )}
            {/* Main marker */}
            <circle
              cx={cx}
              cy={cy}
              r={markerR}
              fill={fill}
              stroke={stroke}
              strokeWidth={sw}
              style={{ transition: "fill 0.25s, stroke 0.25s" }}
            />
            {/* Abbreviation label */}
            <text
              x={cx}
              y={cy + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={pos.abbreviation.length > 2 ? "13" : "15"}
              fontFamily="monospace"
              fontWeight="bold"
              fill={textFill}
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {pos.abbreviation}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Option button ──────────────────────────────────────────────────────────────

function OptionButton({
  label,
  zone,
  selected,
  correct,
  revealed,
  onClick,
}: {
  label: string;
  zone?: FieldPosition["zone"];
  selected: boolean;
  correct: boolean;
  revealed: boolean;
  onClick: () => void;
}) {
  let cls =
    "group relative flex min-h-[54px] w-full items-center gap-3 rounded-xl border px-4 py-3 text-left font-mono text-[11px] uppercase tracking-[0.14em] transition-all duration-150 ";

  if (!revealed) {
    cls +=
      "border-border/70 bg-background/40 text-foreground/90 hover:border-gold/60 hover:bg-gold/5 active:scale-[0.98] cursor-pointer";
  } else if (correct) {
    cls += "border-emerald-500/80 bg-emerald-500/20 text-emerald-200 cursor-default";
  } else if (selected && !correct) {
    cls += "border-rose-500/80 bg-rose-500/20 text-rose-700 dark:text-rose-300 cursor-default";
  } else {
    cls += "border-border/30 bg-background/15 text-foreground/35 cursor-default";
  }

  return (
    <button onClick={onClick} disabled={revealed} className={cls}>
      {zone && (
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
          style={{
            background: ZONE_FILL[zone] + "55",
            border: `1px solid ${ZONE_FILL[zone]}99`,
            color: ZONE_FILL[zone],
          }}
        >
          {label.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="flex-1 leading-tight">{label}</span>
      {revealed && correct && (
        <CheckCircle2 className="ml-auto h-3.5 w-3.5 shrink-0 text-emerald-400" />
      )}
      {revealed && selected && !correct && (
        <XCircle className="ml-auto h-3.5 w-3.5 shrink-0 text-rose-400" />
      )}
    </button>
  );
}

// ── Score bar ──────────────────────────────────────────────────────────────────

function ScoreBar({
  correct,
  total,
  streak,
  onReset,
}: {
  correct: number;
  total: number;
  streak: number;
  onReset: () => void;
}) {
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : null;

  return (
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/40 px-4 py-2.5">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          <span>
            <span className="text-foreground">{correct}</span> / {total}
          </span>
        </div>
        {accuracy !== null && (
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:inline">
            {accuracy}%
          </span>
        )}
        {streak >= 3 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-gold">
            <Flame className="h-3 w-3" fill="currentColor" />
            {streak}
          </span>
        )}
      </div>
      <button
        onClick={onReset}
        className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:border-gold/50 hover:text-foreground"
      >
        <RotateCcw className="h-3 w-3" /> Reset
      </button>
    </div>
  );
}

// ── Feedback bar ───────────────────────────────────────────────────────────────

function FeedbackBar({
  state,
  correctLabel,
  onNext,
}: {
  state: AnswerState;
  correctLabel: string;
  onNext: () => void;
}) {
  if (state === "idle") return null;

  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
        state === "correct"
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-rose-500/40 bg-rose-500/10"
      }`}
    >
      <div className="flex items-center gap-2">
        {state === "correct" ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        ) : (
          <XCircle className="h-4 w-4 text-rose-400" />
        )}
        <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
          {state === "correct" ? "Correct!" : `Answer: ${correctLabel}`}
        </span>
      </div>
      {state === "wrong" && (
        <button
          onClick={onNext}
          className="inline-flex items-center gap-1.5 rounded-full border border-gold/60 bg-gold/10 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold transition-all hover:bg-gold/20"
        >
          Next <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ── Main exported component ────────────────────────────────────────────────────

const FORMATIONS: SoccerFormation[] = ["4-4-2", "4-3-3", "4-2-3-1", "3-5-2"];

const MODE_CONFIG: {
  key: GameMode;
  label: string;
  icon: React.FC<{ className?: string }>;
  hint: string;
}[] = [
  {
    key: "name-it",
    label: "Name It",
    icon: Crosshair,
    hint: "Position glows — pick the English name",
  },
  { key: "find-it", label: "Find It", icon: Search, hint: "Name shown — tap the correct position" },
  {
    key: "translate-it",
    label: "Translate It",
    icon: Languages,
    hint: "Target-language name — pick English",
  },
];

export function SoccerPositionsGame({ language, onXp }: SoccerPositionsGameProps) {
  const [mode, setMode] = useState<GameMode>("name-it");
  const [formation, setFormation] = useState<SoccerFormation>("4-4-2");
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);

  // Current question state
  const pool = useMemo(() => getPositionsForFormation(formation), [formation]);
  const lastIdRef = useRef<string | undefined>(undefined);
  const [question, setQuestion] = useState<Question>(() => buildQuestion(pool, language, mode));
  const [selected, setSelected] = useState<FieldPosition | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");

  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rebuild question when pool / mode / language changes externally
  useEffect(() => {
    clearFlashTimer();
    lastIdRef.current = undefined;
    setQuestion(buildQuestion(getPositionsForFormation(formation), language, mode));
    setSelected(null);
    setAnswerState("idle");
  }, [formation, mode, language]);

  function clearFlashTimer() {
    if (flashTimer.current) {
      clearTimeout(flashTimer.current);
      flashTimer.current = null;
    }
  }

  const advanceQuestion = useCallback(() => {
    const nextPool = getPositionsForFormation(formation);
    const q = buildQuestion(nextPool, language, mode, lastIdRef.current);
    lastIdRef.current = q.target.id;
    setQuestion(q);
    setSelected(null);
    setAnswerState("idle");
  }, [formation, language, mode]);

  const handleAnswer = useCallback(
    (picked: FieldPosition) => {
      if (selected !== null || answerState !== "idle") return;
      setSelected(picked);

      const isCorrect = picked.id === question.target.id;
      setAnswerState(isCorrect ? "correct" : "wrong");
      setTotal((t) => t + 1);

      if (isCorrect) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        setCorrect((c) => c + 1);
        const xp = newStreak >= 3 ? 10 : 5;
        onXp?.(xp);
        // Auto-advance after brief flash
        flashTimer.current = setTimeout(() => {
          advanceQuestion();
        }, 1200);
      } else {
        setStreak(0);
        onXp?.(0);
      }
    },
    [selected, answerState, question.target.id, streak, onXp, advanceQuestion],
  );

  const handleNext = useCallback(() => {
    clearFlashTimer();
    advanceQuestion();
  }, [advanceQuestion]);

  function handleReset() {
    clearFlashTimer();
    setCorrect(0);
    setTotal(0);
    setStreak(0);
    lastIdRef.current = undefined;
    const nextPool = getPositionsForFormation(formation);
    setQuestion(buildQuestion(nextPool, language, mode));
    setSelected(null);
    setAnswerState("idle");
  }

  function handleModeChange(next: GameMode) {
    clearFlashTimer();
    setMode(next);
    // question will rebuild via useEffect
  }

  function handleFormationChange(f: SoccerFormation) {
    clearFlashTimer();
    setFormation(f);
    // question will rebuild via useEffect
  }

  const revealed = selected !== null;

  // For "Find It" mode the field is interactive; for the others the field is display-only.
  const isFindIt = mode === "find-it";

  // Prompt text
  let promptTop = "";
  let promptMain = "";
  let promptSub = "";

  if (mode === "name-it") {
    promptTop = "Name the highlighted position";
    promptMain = `${question.target.abbreviation}`;
    promptSub = question.target.zone;
  } else if (mode === "find-it") {
    promptTop = "Tap the correct position on the pitch";
    promptMain = question.target.en;
    promptSub = `${question.target.abbreviation} · ${question.target.zone}`;
  } else {
    promptTop = `${language} → English`;
    promptMain = question.translatedLabel ?? question.target.en;
    promptSub = "Pick the English name below";
  }

  // Determine field activeId and flashId
  let fieldActiveId: string | null = null;
  let fieldFlashId: string | null = null;

  if (mode === "name-it") {
    fieldActiveId = revealed ? null : question.target.id;
    fieldFlashId = revealed ? question.target.id : null;
  } else if (mode === "translate-it") {
    // Position not shown on field during question; flash on reveal
    fieldActiveId = null;
    fieldFlashId = revealed ? question.target.id : null;
  } else {
    // Find It — pulse marks revealed correct; flash the selected one
    fieldActiveId = null;
    fieldFlashId = revealed ? (selected?.id ?? null) : null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* ── Header ── */}
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">⚽ Soccer</div>
        <h2 className="mt-1 font-display text-3xl font-semibold">Know the Pitch</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Learn soccer positions and formations in {language}.
        </p>
      </div>

      {/* ── Mode toggle ── */}
      <div className="flex gap-1 rounded-2xl border border-border/60 bg-card/30 p-1">
        {MODE_CONFIG.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleModeChange(key)}
            data-active={mode === key}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-all data-[active=true]:border data-[active=true]:border-gold/60 data-[active=true]:bg-gold/10 data-[active=true]:text-gold data-[active=false]:text-muted-foreground data-[active=false]:hover:text-foreground/80"
          >
            <Icon className="h-3 w-3 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      {/* ── Formation picker ── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Formation
        </span>
        {FORMATIONS.map((f) => (
          <button
            key={f}
            onClick={() => handleFormationChange(f)}
            className={
              "rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors " +
              (formation === f
                ? "border-gold/70 bg-gold/20 text-gold"
                : "border-border/60 bg-background/40 text-foreground/70 hover:border-gold/40 hover:text-gold")
            }
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── Score bar ── */}
      <ScoreBar correct={correct} total={total} streak={streak} onReset={handleReset} />

      {/* ── Prompt card ── */}
      <div
        className={`flex min-h-[72px] flex-col items-center justify-center rounded-2xl border px-5 py-4 text-center transition-all duration-200 ${
          answerState === "correct"
            ? "border-emerald-500/50 bg-emerald-500/8"
            : answerState === "wrong"
              ? "border-rose-500/40 bg-rose-500/5"
              : "border-gold/25 bg-gradient-to-br from-gold/8 to-card/60"
        }`}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold/80">
          {promptTop}
        </p>
        <p className="mt-1 font-display text-2xl font-semibold text-foreground">{promptMain}</p>
        {promptSub && (
          <p className="mt-0.5 font-mono text-[11px] capitalize text-muted-foreground">
            {promptSub}
          </p>
        )}
        {/* Hint for Find It mode */}
        {isFindIt && !revealed && (
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
            Tap the marker on the field
          </p>
        )}
      </div>

      {/* ── SVG pitch ── */}
      <div className="overflow-hidden rounded-2xl border border-border/50 bg-[#0e2a0e] shadow-inner">
        <SoccerField
          positions={pool}
          activeId={fieldActiveId}
          flashId={fieldFlashId}
          flashState={answerState}
          onPositionClick={isFindIt && !revealed ? handleAnswer : undefined}
          findTargetId={isFindIt && !revealed ? question.target.id : null}
        />
      </div>

      {/* ── Multiple-choice options (Name It / Translate It) ── */}
      {!isFindIt && (
        <div className="grid grid-cols-2 gap-2">
          {question.options.map((opt) => (
            <OptionButton
              key={opt.id}
              label={opt.en}
              zone={opt.zone}
              selected={selected?.id === opt.id}
              correct={opt.id === question.target.id}
              revealed={revealed}
              onClick={() => handleAnswer(opt)}
            />
          ))}
        </div>
      )}

      {/* Find It — show options as read-only after answer */}
      {isFindIt && revealed && (
        <div className="grid grid-cols-2 gap-2 opacity-80">
          {question.options.map((opt) => (
            <OptionButton
              key={opt.id}
              label={opt.en}
              zone={opt.zone}
              selected={selected?.id === opt.id}
              correct={opt.id === question.target.id}
              revealed={true}
              onClick={() => {}}
            />
          ))}
        </div>
      )}

      {/* ── Feedback + Next ── */}
      <FeedbackBar state={answerState} correctLabel={question.target.en} onNext={handleNext} />

      {/* ── Zone legend ── */}
      <div className="flex flex-wrap gap-2 pt-1">
        {(["goalkeeper", "defender", "midfielder", "forward"] as const).map((zone) => (
          <span
            key={zone}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${ZONE_LABEL_CLS[zone]}`}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: ZONE_FILL[zone] }}
            />
            {zone}
          </span>
        ))}
      </div>
    </div>
  );
}
