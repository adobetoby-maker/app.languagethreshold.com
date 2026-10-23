/**
 * BaseballPositionsGame — interactive baseball positions identification game.
 *
 * Two modes:
 *  1. Field Positions — highlight a position on the SVG diamond, pick the
 *     English name (or scorecard number) from 4 options. Optional "Translate"
 *     variant shows the Spanish/Portuguese name and asks for the English one.
 *  2. Dugout Vocab — flash an English term from BASEBALL_DUGOUT_VOCAB,
 *     pick the Spanish translation from 3 distractors + 1 correct.
 *
 * No external libs. Inline SVG diamond. Lucide-react icons only.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import {
  CheckCircle2,
  XCircle,
  Flame,
  Trophy,
  RotateCcw,
  ChevronRight,
  MapPin,
  BookOpen,
} from "lucide-react";
import {
  BASEBALL_POSITIONS,
  BASEBALL_DUGOUT_VOCAB,
  type BaseballPosition,
  type BaseballDugoutVocab,
} from "@/data/baseball-positions";

// ── Props ──────────────────────────────────────────────────────────────────────

export interface BaseballPositionsGameProps {
  language: string;
  onXp?: (amount: number) => void;
}

// ── Types ──────────────────────────────────────────────────────────────────────

type GameMode = "field" | "dugout";
type FieldVariant = "name" | "number" | "translate";
type AnswerState = "idle" | "correct" | "wrong";

interface FieldQuestion {
  position: BaseballPosition;
  /** The label shown to the player (determines what kind of answer is expected). */
  variant: FieldVariant;
  options: string[];
  correct: string;
}

interface DugoutQuestion {
  vocab: BaseballDugoutVocab;
  options: string[];
  correct: string;
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

function pickDistractors<T>(pool: T[], exclude: T, count: number): T[] {
  const candidates = pool.filter((x) => x !== exclude);
  return shuffle(candidates).slice(0, count);
}

function buildFieldQuestion(language: string): FieldQuestion {
  const pos = BASEBALL_POSITIONS[Math.floor(Math.random() * BASEBALL_POSITIONS.length)];
  const hasTranslation = !!pos.labels[language];

  // Weighted: name 50%, number 25%, translate 25% (fallback to name if no label)
  const roll = Math.random();
  let variant: FieldVariant = "name";
  if (roll < 0.5) variant = "name";
  else if (roll < 0.75) variant = "number";
  else variant = hasTranslation ? "translate" : "name";

  if (variant === "translate") {
    const correct = pos.labels[language]!;
    const distractors = pickDistractors(
      BASEBALL_POSITIONS.map((p) => p.labels[language]).filter(Boolean) as string[],
      correct,
      3,
    );
    return { position: pos, variant, correct, options: shuffle([correct, ...distractors]) };
  }

  if (variant === "number") {
    const correct = String(pos.number);
    const distractors = pickDistractors(
      BASEBALL_POSITIONS.map((p) => String(p.number)),
      correct,
      3,
    );
    return { position: pos, variant, correct, options: shuffle([correct, ...distractors]) };
  }

  // name
  const correct = pos.en;
  const distractors = pickDistractors(
    BASEBALL_POSITIONS.map((p) => p.en),
    correct,
    3,
  );
  return { position: pos, variant, correct, options: shuffle([correct, ...distractors]) };
}

function buildDugoutQuestion(language: string): DugoutQuestion {
  const vocab = BASEBALL_DUGOUT_VOCAB[Math.floor(Math.random() * BASEBALL_DUGOUT_VOCAB.length)];
  const usePt = language === "Portuguese";
  const correct = usePt ? vocab.pt : vocab.es;
  const pool = BASEBALL_DUGOUT_VOCAB.map((v) => (usePt ? v.pt : v.es));
  const distractors = pickDistractors(pool, correct, 3);
  return { vocab, correct, options: shuffle([correct, ...distractors]) };
}

// ── SVG Diamond ────────────────────────────────────────────────────────────────

interface DiamondProps {
  activeId: string | null;
  flashId: string | null;
  flashState: AnswerState;
}

const VIEWBOX = 300;

/** Converts a position's percentage coordinates to SVG units. */
function pct(v: number) {
  return (v / 100) * VIEWBOX;
}

function Diamond({ activeId, flashId, flashState }: DiamondProps) {
  // Base path coordinates (% → SVG px, VIEWBOX=300)
  // Home plate ≈ (50%, 90%) → (150, 270)
  // First base ≈ (75%, 68%) → (225, 204) — right corner of diamond
  // Second base ≈ (50%, 48%) → (150, 144) — top of diamond
  // Third base ≈ (25%, 68%) → (75, 204) — left corner of diamond

  const homeX = 150,
    homeY = 270;
  const firstX = 225,
    firstY = 204;
  const secondX = 150,
    secondY = 144;
  const thirdX = 75,
    thirdY = 204;

  const diamondPath = `M ${homeX} ${homeY} L ${firstX} ${firstY} L ${secondX} ${secondY} L ${thirdX} ${thirdY} Z`;

  // Foul lines extend from home to the corners of the SVG
  const leftFoulX = 0,
    leftFoulY = 300;
  const rightFoulX = 300,
    rightFoulY = 300;

  function positionStyle(pos: BaseballPosition) {
    const isActive = pos.id === activeId;
    const isFlash = pos.id === flashId;

    let fill = "hsl(var(--muted-foreground) / 0.5)";
    let stroke = "hsl(var(--border))";
    let strokeWidth = 1.5;
    let filter = "none";

    if (isFlash && flashState === "correct") {
      fill = "#22c55e";
      stroke = "#16a34a";
      strokeWidth = 2.5;
      filter = "drop-shadow(0 0 6px #22c55e)";
    } else if (isFlash && flashState === "wrong") {
      fill = "#ef4444";
      stroke = "#dc2626";
      strokeWidth = 2.5;
      filter = "drop-shadow(0 0 6px #ef4444)";
    } else if (isActive) {
      fill = "hsl(var(--gold))";
      stroke = "hsl(var(--gold))";
      strokeWidth = 2.5;
      filter = "drop-shadow(0 0 8px hsl(var(--gold) / 0.8))";
    }

    return { fill, stroke, strokeWidth, filter };
  }

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      className="w-full max-w-[340px]"
      aria-label="Baseball diamond top-down view"
    >
      {/* Outfield grass — full background */}
      <rect x="0" y="0" width={VIEWBOX} height={VIEWBOX} fill="#1a4a1a" />

      {/* Foul lines */}
      <line
        x1={homeX}
        y1={homeY}
        x2={leftFoulX}
        y2={leftFoulY}
        stroke="white"
        strokeWidth="1.5"
        opacity="0.5"
      />
      <line
        x1={homeX}
        y1={homeY}
        x2={rightFoulX}
        y2={rightFoulY}
        stroke="white"
        strokeWidth="1.5"
        opacity="0.5"
      />

      {/* Infield dirt — rough circle around the diamond */}
      <ellipse cx="150" cy="210" rx="110" ry="85" fill="#8B6914" opacity="0.75" />

      {/* Diamond base paths */}
      <path d={diamondPath} fill="#a07820" stroke="#c8a040" strokeWidth="1.5" opacity="0.8" />

      {/* Warning track / outfield arc line */}
      <path
        d="M 20 295 Q 150 20 280 295"
        fill="none"
        stroke="#8B6914"
        strokeWidth="10"
        opacity="0.4"
        strokeLinecap="round"
      />

      {/* Bases — white squares/diamonds */}
      {/* Home plate (pentagon-ish, rendered as a small polygon) */}
      <polygon
        points={`${homeX},${homeY - 7} ${homeX + 7},${homeY} ${homeX + 7},${homeY + 5} ${homeX - 7},${homeY + 5} ${homeX - 7},${homeY}`}
        fill="white"
        stroke="#ccc"
        strokeWidth="1"
      />
      {/* First base */}
      <rect
        x={firstX - 6}
        y={firstY - 6}
        width="12"
        height="12"
        fill="white"
        stroke="#ccc"
        strokeWidth="1"
        transform={`rotate(45 ${firstX} ${firstY})`}
      />
      {/* Second base */}
      <rect
        x={secondX - 6}
        y={secondY - 6}
        width="12"
        height="12"
        fill="white"
        stroke="#ccc"
        strokeWidth="1"
        transform={`rotate(45 ${secondX} ${secondY})`}
      />
      {/* Third base */}
      <rect
        x={thirdX - 6}
        y={thirdY - 6}
        width="12"
        height="12"
        fill="white"
        stroke="#ccc"
        strokeWidth="1"
        transform={`rotate(45 ${thirdX} ${thirdY})`}
      />

      {/* Pitcher's mound */}
      <ellipse cx="150" cy="207" rx="10" ry="8" fill="#9a7020" stroke="#c0902a" strokeWidth="1" />
      <ellipse cx="150" cy="206" rx="5" ry="4" fill="#b08030" />

      {/* Baseline chalk lines */}
      <line
        x1={homeX}
        y1={homeY}
        x2={firstX}
        y2={firstY}
        stroke="white"
        strokeWidth="1"
        opacity="0.3"
      />
      <line
        x1={firstX}
        y1={firstY}
        x2={secondX}
        y2={secondY}
        stroke="white"
        strokeWidth="1"
        opacity="0.3"
      />
      <line
        x1={secondX}
        y1={secondY}
        x2={thirdX}
        y2={thirdY}
        stroke="white"
        strokeWidth="1"
        opacity="0.3"
      />
      <line
        x1={thirdX}
        y1={thirdY}
        x2={homeX}
        y2={homeY}
        stroke="white"
        strokeWidth="1"
        opacity="0.3"
      />

      {/* Position markers */}
      {BASEBALL_POSITIONS.map((pos) => {
        const cx = pct(pos.x);
        const cy = pct(pos.y);
        const style = positionStyle(pos);
        const isActive = pos.id === activeId;
        const isFlash = pos.id === flashId;

        return (
          <g key={pos.id} style={{ filter: style.filter }}>
            {/* Pulse ring for active */}
            {isActive && (
              <circle
                cx={cx}
                cy={cy}
                r="18"
                fill="hsl(var(--gold) / 0.15)"
                stroke="hsl(var(--gold) / 0.5)"
                strokeWidth="1.5"
              >
                <animate attributeName="r" values="16;22;16" dur="1.6s" repeatCount="indefinite" />
                <animate
                  attributeName="opacity"
                  values="0.6;0.1;0.6"
                  dur="1.6s"
                  repeatCount="indefinite"
                />
              </circle>
            )}
            {/* Flash ring */}
            {isFlash && flashState !== "idle" && (
              <circle
                cx={cx}
                cy={cy}
                r="20"
                fill="none"
                stroke={flashState === "correct" ? "#22c55e" : "#ef4444"}
                strokeWidth="2"
                opacity="0.5"
              />
            )}
            {/* Marker circle */}
            <circle
              cx={cx}
              cy={cy}
              r="13"
              fill={style.fill}
              stroke={style.stroke}
              strokeWidth={style.strokeWidth}
              style={{ transition: "fill 0.2s, stroke 0.2s" }}
            />
            {/* Abbreviation text */}
            <text
              x={cx}
              y={cy + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={pos.abbreviation.length > 2 ? "6.5" : "7.5"}
              fontFamily="monospace"
              fontWeight="bold"
              fill={isActive || (isFlash && flashState !== "idle") ? "black" : "white"}
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

// ── Score bar ──────────────────────────────────────────────────────────────────

function ScoreBar({ correct, total, streak }: { correct: number; total: number; streak: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/40 px-4 py-2.5">
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
        <span>
          <span className="text-foreground">{correct}</span> / {total}
        </span>
      </div>
      <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em]">
        {streak >= 3 ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-gold">
            <Flame className="h-3 w-3" fill="currentColor" />
            Streak&nbsp;<span className="font-bold">{streak}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">
            Streak&nbsp;<span className="text-foreground">{streak}</span>
          </span>
        )}
      </div>
    </div>
  );
}

// ── Option button ──────────────────────────────────────────────────────────────

function OptionButton({
  label,
  selected,
  correct,
  revealed,
  onClick,
}: {
  label: string;
  selected: boolean;
  correct: boolean;
  revealed: boolean;
  onClick: () => void;
}) {
  let cls =
    "group relative flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 font-mono text-[12px] uppercase tracking-[0.14em] transition-all ";

  if (!revealed) {
    cls +=
      "border-border/70 bg-background/40 text-foreground/90 hover:border-gold/60 hover:bg-card/70 active:scale-[0.98]";
  } else if (correct) {
    cls += "border-emerald-500/80 bg-emerald-500/20 text-emerald-200";
  } else if (selected && !correct) {
    cls += "border-rose-500/80 bg-rose-500/20 text-rose-700 dark:text-rose-300";
  } else {
    cls += "border-border/40 bg-background/20 text-foreground/40";
  }

  return (
    <button onClick={onClick} disabled={revealed} className={cls}>
      {revealed && correct && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
      {revealed && selected && !correct && (
        <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
      )}
      <span className="text-center leading-tight">{label}</span>
    </button>
  );
}

// ── Field Positions mode ───────────────────────────────────────────────────────

interface FieldGameProps {
  language: string;
  onXp?: (amount: number) => void;
}

function FieldPositionsGame({ language, onXp }: FieldGameProps) {
  const [question, setQuestion] = useState<FieldQuestion>(() => buildFieldQuestion(language));
  const [selected, setSelected] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rebuild question when language changes
  useEffect(() => {
    setQuestion(buildFieldQuestion(language));
    setSelected(null);
    setAnswerState("idle");
  }, [language]);

  const handleAnswer = useCallback(
    (option: string) => {
      if (selected !== null) return;
      setSelected(option);
      const isCorrect = option === question.correct;
      setAnswerState(isCorrect ? "correct" : "wrong");
      setTotal((t) => t + 1);
      if (isCorrect) {
        setCorrect((c) => c + 1);
        setStreak((s) => s + 1);
        onXp?.(streak >= 4 ? 4 : 2);
      } else {
        setStreak(0);
        onXp?.(1);
      }
    },
    [selected, question.correct, streak, onXp],
  );

  const handleNext = useCallback(() => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setQuestion(buildFieldQuestion(language));
    setSelected(null);
    setAnswerState("idle");
  }, [language]);

  // Auto-advance after 1.4s on correct answer
  useEffect(() => {
    if (answerState === "correct") {
      flashTimer.current = setTimeout(() => {
        handleNext();
      }, 1400);
    }
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, [answerState, handleNext]);

  const pos = question.position;
  const revealed = selected !== null;

  // Prompt label shown above the diamond
  let promptLabel: string;
  if (question.variant === "translate") {
    const label = pos.labels[language] ?? pos.en;
    promptLabel = `Who plays "${label}"?`;
  } else if (question.variant === "number") {
    promptLabel = `Which position wears scorecard #${pos.number}?`;
  } else {
    promptLabel = `Which position is highlighted?`;
  }

  return (
    <div className="space-y-4">
      {/* Score bar */}
      <ScoreBar correct={correct} total={total} streak={streak} />

      {/* Prompt */}
      <div className="rounded-xl border border-border/60 bg-card/30 px-4 py-3 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {question.variant === "translate" ? `${language} → English` : "Field Positions"}
        </p>
        <p className="mt-1 text-base font-semibold text-foreground">{promptLabel}</p>
      </div>

      {/* Diamond */}
      <div className="flex justify-center">
        <div className="relative w-full max-w-[340px] rounded-2xl border border-border/50 bg-card/20 p-2 shadow-inner">
          <Diamond
            activeId={question.variant === "translate" ? null : pos.id}
            flashId={revealed ? pos.id : null}
            flashState={answerState}
          />
        </div>
      </div>

      {/* Options — 2×2 grid */}
      <div className="grid grid-cols-2 gap-2">
        {question.options.map((opt) => (
          <OptionButton
            key={opt}
            label={opt}
            selected={selected === opt}
            correct={opt === question.correct}
            revealed={revealed}
            onClick={() => handleAnswer(opt)}
          />
        ))}
      </div>

      {/* Feedback + next button */}
      {revealed && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
            answerState === "correct"
              ? "border-emerald-500/40 bg-emerald-500/10"
              : "border-rose-500/40 bg-rose-500/10"
          }`}
        >
          <div className="flex items-center gap-2">
            {answerState === "correct" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-400" />
            )}
            <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
              {answerState === "correct" ? "Correct!" : `Answer: ${question.correct}`}
            </span>
          </div>
          <button
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/60 bg-gold/10 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold transition-all hover:bg-gold/20"
          >
            Next <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Dugout Vocab mode ──────────────────────────────────────────────────────────

interface DugoutGameProps {
  language: string;
  onXp?: (amount: number) => void;
}

function DugoutVocabGame({ language, onXp }: DugoutGameProps) {
  const [question, setQuestion] = useState<DugoutQuestion>(() => buildDugoutQuestion(language));
  const [selected, setSelected] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  // Track which vocab items have been shown to avoid quick repeats
  const seenRef = useRef<Set<string>>(new Set());
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rebuild question when language changes
  useEffect(() => {
    seenRef.current.clear();
    setQuestion(buildDugoutQuestion(language));
    setSelected(null);
    setAnswerState("idle");
  }, [language]);

  const nextQuestion = useCallback(() => {
    // Build next question avoiding recently seen; reset seen after full cycle
    let q = buildDugoutQuestion(language);
    let tries = 0;
    while (seenRef.current.has(q.vocab.en) && tries < 12) {
      q = buildDugoutQuestion(language);
      tries++;
    }
    if (seenRef.current.size >= BASEBALL_DUGOUT_VOCAB.length - 1) {
      seenRef.current.clear();
    }
    seenRef.current.add(q.vocab.en);
    setQuestion(q);
    setSelected(null);
    setAnswerState("idle");
  }, [language]);

  const handleAnswer = useCallback(
    (option: string) => {
      if (selected !== null) return;
      setSelected(option);
      const isCorrect = option === question.correct;
      setAnswerState(isCorrect ? "correct" : "wrong");
      setTotal((t) => t + 1);
      if (isCorrect) {
        setCorrect((c) => c + 1);
        setStreak((s) => s + 1);
        onXp?.(streak >= 4 ? 4 : 2);
      } else {
        setStreak(0);
        onXp?.(1);
      }
    },
    [selected, question.correct, streak, onXp],
  );

  // Auto-advance after 1.4s on correct answer
  useEffect(() => {
    if (answerState === "correct") {
      flashTimer.current = setTimeout(() => {
        nextQuestion();
      }, 1400);
    }
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, [answerState, nextQuestion]);

  const targetLang = language === "Portuguese" ? "pt" : "es";
  const targetLangLabel = language === "Portuguese" ? "Português" : "Español";
  const revealed = selected !== null;

  // Category badge color
  const categoryColors: Record<string, string> = {
    "pitch-type": "border-violet-500/40 bg-violet-500/10 text-violet-300",
    call: "border-sky-500/40 bg-sky-500/10 text-sky-300",
    play: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    equipment: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  };
  const catCls =
    categoryColors[question.vocab.category] ?? "border-border/60 bg-card/40 text-muted-foreground";

  return (
    <div className="space-y-4">
      {/* Score bar */}
      <ScoreBar correct={correct} total={total} streak={streak} />

      {/* Question card */}
      <div className="rounded-2xl border border-border/60 bg-card/40 p-6 text-center">
        <div className="mb-3 flex items-center justify-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] ${catCls}`}
          >
            {question.vocab.category.replace("-", " ")}
          </span>
          <span className="rounded-full border border-border/50 bg-background/30 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            EN → {targetLangLabel}
          </span>
        </div>
        <div className="font-display text-5xl font-bold tracking-tight text-foreground">
          {question.vocab.en}
        </div>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          How do you say this in {targetLangLabel}?
        </p>
      </div>

      {/* Options — 2×2 grid */}
      <div className="grid grid-cols-2 gap-2">
        {question.options.map((opt) => (
          <OptionButton
            key={opt}
            label={opt}
            selected={selected === opt}
            correct={opt === question.correct}
            revealed={revealed}
            onClick={() => handleAnswer(opt)}
          />
        ))}
      </div>

      {/* Feedback + next */}
      {revealed && (
        <div
          className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
            answerState === "correct"
              ? "border-emerald-500/40 bg-emerald-500/10"
              : "border-rose-500/40 bg-rose-500/10"
          }`}
        >
          <div className="flex items-center gap-2">
            {answerState === "correct" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-400" />
            )}
            <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
              {answerState === "correct" ? "Correct!" : `Answer: ${question.vocab[targetLang]}`}
            </span>
          </div>
          <button
            onClick={nextQuestion}
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/60 bg-gold/10 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold transition-all hover:bg-gold/20"
          >
            Next <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Mini field reference — position abbreviations legend */}
      <details className="rounded-2xl border border-border/40 bg-card/20">
        <summary className="cursor-pointer select-none px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground/80">
          Field reference ▸
        </summary>
        <div className="border-t border-border/30 px-4 pb-4 pt-3">
          <div className="flex justify-center">
            <Diamond activeId={null} flashId={null} flashState="idle" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1">
            {BASEBALL_POSITIONS.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-1.5 rounded-md border border-border/40 bg-background/20 px-2 py-1"
              >
                <span className="font-mono text-[9px] font-bold text-gold">{p.abbreviation}</span>
                <span className="truncate font-mono text-[9px] text-muted-foreground">{p.en}</span>
              </div>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}

// ── Main exported component ────────────────────────────────────────────────────

export function BaseballPositionsGame({ language, onXp }: BaseballPositionsGameProps) {
  const [mode, setMode] = useState<GameMode>("field");
  // Reset child games when mode changes by incrementing a key
  const [fieldKey, setFieldKey] = useState(0);
  const [dugoutKey, setDugoutKey] = useState(0);

  function switchMode(next: GameMode) {
    setMode(next);
    if (next === "field") setFieldKey((k) => k + 1);
    else setDugoutKey((k) => k + 1);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Header */}
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">
          ⚾ Baseball
        </div>
        <h2 className="mt-1 font-display text-3xl font-semibold">Know Your Diamond</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Learn field positions and dugout vocabulary for Spanish-speaking players.
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 rounded-2xl border border-border/60 bg-card/30 p-1">
        <button
          onClick={() => switchMode("field")}
          data-active={mode === "field"}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-all data-[active=true]:border data-[active=true]:border-gold/60 data-[active=true]:bg-gold/10 data-[active=true]:text-gold data-[active=false]:text-muted-foreground data-[active=false]:hover:text-foreground/80"
        >
          <MapPin className="h-3.5 w-3.5" />
          Field Positions
        </button>
        <button
          onClick={() => switchMode("dugout")}
          data-active={mode === "dugout"}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-all data-[active=true]:border data-[active=true]:border-gold/60 data-[active=true]:bg-gold/10 data-[active=true]:text-gold data-[active=false]:text-muted-foreground data-[active=false]:hover:text-foreground/80"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Dugout Vocab
        </button>
      </div>

      {/* Game panes */}
      {mode === "field" && <FieldPositionsGame key={fieldKey} language={language} onXp={onXp} />}
      {mode === "dugout" && <DugoutVocabGame key={dugoutKey} language={language} onXp={onXp} />}
    </div>
  );
}
