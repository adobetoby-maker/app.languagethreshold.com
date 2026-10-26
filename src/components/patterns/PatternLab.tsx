import { playFlashcardSuccess } from "@/lib/sound-effects";
import { useState, useCallback, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronLeft,
  ChevronRight,
  Sparkle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  BookOpen,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/state/app-state";
import {
  ALL_PATTERNS,
  FREQUENCY_META,
  getPatternsForLanguage,
  type GrammarPattern,
  type PatternPhase,
} from "@/data/grammar-patterns";
import { generatePatternDrill, type PatternDrillItem } from "@/fns/pattern-drill.functions";

// ─── Types ────────────────────────────────────────────────────────────────────

type View = "browse" | "card" | "drill";
type PhaseFilter = "all" | 1 | 2;

interface DrillState {
  items: PatternDrillItem[];
  index: number;
  revealed: boolean;
  correct: number;
  missed: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FrequencyBadge({ frequency }: { frequency: GrammarPattern["frequency"] }) {
  const meta = FREQUENCY_META[frequency];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider",
        meta.bg,
        meta.color,
      )}
    >
      {frequency === "ultra" && <Sparkle className="h-2.5 w-2.5" />}
      {meta.label}
    </span>
  );
}

function PhaseTag({ phase }: { phase: PatternPhase }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-medium",
        phase === 1 ? "bg-violet-500/15 text-violet-400" : "bg-cyan-500/15 text-cyan-400",
      )}
    >
      Phase {phase}
    </span>
  );
}

// ─── Pattern Card (summary) ───────────────────────────────────────────────────

function MasteryPips({ count, threshold = 5 }: { count: number; threshold?: number }) {
  return (
    <div
      className="flex items-center gap-0.5"
      title={`${Math.min(count, threshold)}/${threshold} correct`}
    >
      {Array.from({ length: threshold }).map((_, i) => (
        <span
          key={i}
          className={`inline-block h-1.5 w-1.5 rounded-full ${
            i < count ? "bg-emerald-400" : "bg-border/40"
          }`}
        />
      ))}
    </div>
  );
}

function PatternCard({
  pattern,
  progress = 0,
  onSelect,
}: {
  pattern: GrammarPattern;
  progress?: number;
  onSelect: () => void;
}) {
  const mastered = progress >= 5;
  return (
    <button
      onClick={onSelect}
      className="group w-full text-left rounded-xl border border-border/50 bg-card/30 p-4 transition-all hover:border-gold/30 hover:bg-card/50"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <FrequencyBadge frequency={pattern.frequency} />
          <PhaseTag phase={pattern.phase} />
          {mastered && (
            <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-400">
              Mastered
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          {progress > 0 && <MasteryPips count={progress} />}
          <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-gold transition-colors" />
        </div>
      </div>

      <p className="font-semibold text-foreground mb-0.5">{pattern.name}</p>
      <p className="font-mono text-xs text-gold/80 mb-2">{pattern.pattern}</p>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{pattern.hook}</p>

      <div className="mt-3 border-t border-border/30 pt-3">
        <p className="text-xs text-muted-foreground/70 italic">e.g. {pattern.examples[0].target}</p>
      </div>
    </button>
  );
}

// ─── Pattern Detail View ──────────────────────────────────────────────────────

function PatternDetail({
  pattern,
  onBack,
  onDrill,
}: {
  pattern: GrammarPattern;
  onBack: () => void;
  onDrill: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      {/* Header */}
      <div className="rounded-xl border border-border/50 bg-card/40 p-5">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <FrequencyBadge frequency={pattern.frequency} />
          <PhaseTag phase={pattern.phase} />
          <span className="text-xs text-muted-foreground capitalize">{pattern.category}</span>
        </div>

        <h2 className="text-xl font-bold text-foreground mb-1">{pattern.name}</h2>
        <p className="font-mono text-sm text-gold mb-3 bg-gold/5 rounded-md px-3 py-1.5 inline-block border border-gold/20">
          {pattern.pattern}
        </p>
        <p className="text-sm text-muted-foreground">
          Means: <span className="text-foreground">{pattern.meaning}</span>
        </p>
      </div>

      {/* Frequency context */}
      <div className={cn("rounded-lg border p-3 text-sm", FREQUENCY_META[pattern.frequency].bg)}>
        <p className={cn("font-semibold mb-0.5", FREQUENCY_META[pattern.frequency].color)}>
          {FREQUENCY_META[pattern.frequency].label} FREQUENCY
        </p>
        <p className="text-muted-foreground text-xs">{FREQUENCY_META[pattern.frequency].desc}</p>
      </div>

      {/* Hook */}
      <div className="rounded-xl border border-border/50 bg-card/30 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Why This Matters
        </p>
        <p className="text-sm text-foreground leading-relaxed">{pattern.hook}</p>
      </div>

      {/* Examples */}
      <div className="rounded-xl border border-border/50 bg-card/30 p-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Examples
        </p>
        {pattern.examples.map((ex, i) => (
          <div key={i} className="border-l-2 border-gold/30 pl-3">
            <p className="text-sm font-medium text-foreground">{ex.target}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{ex.english}</p>
            {ex.breakdown && <p className="text-xs text-gold/70 mt-1 font-mono">{ex.breakdown}</p>}
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onDrill}
        className="flex items-center justify-center gap-2 w-full rounded-xl bg-gold/10 border border-gold/25 py-3 text-sm font-semibold text-gold hover:bg-gold/20 transition-colors"
      >
        <Zap className="h-4 w-4" />
        Practice This Pattern
      </button>
    </div>
  );
}

// ─── Drill View ───────────────────────────────────────────────────────────────

function DrillView({
  pattern,
  userVocabWords,
  onBack,
}: {
  pattern: GrammarPattern;
  userVocabWords?: string[];
  onBack: () => void;
}) {
  const fetchDrill = useServerFn(generatePatternDrill);
  const { dispatch } = useApp();
  const [drill, setDrill] = useState<DrillState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");

  const loadDrill = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchDrill({
      data: {
        language: pattern.language,
        patternId: pattern.id,
        patternFormula: pattern.pattern,
        patternName: pattern.name,
        userVocabWords,
        count: 3,
      },
    });
    setLoading(false);
    if (res.error || !res.data) {
      setError(res.error ?? "Couldn't load drill.");
      return;
    }
    setDrill({ items: res.data.items, index: 0, revealed: false, correct: 0, missed: 0 });
    setAnswer("");
  }, [fetchDrill, pattern, userVocabWords]);

  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    void loadDrill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cur = drill ? drill.items[drill.index] : null;
  const isLast = drill ? drill.index >= drill.items.length - 1 : false;
  const isDone = drill ? drill.index >= drill.items.length : false;

  function reveal() {
    setDrill((d) => (d ? { ...d, revealed: true } : d));
  }

  function score(got: boolean) {
    if (got) void playFlashcardSuccess();
    if (got) dispatch({ type: "SCORE_PATTERN", payload: pattern.id });
    setDrill((d) => {
      if (!d) return d;
      return {
        ...d,
        correct: got ? d.correct + 1 : d.correct,
        missed: got ? d.missed : d.missed + 1,
        index: d.index + 1,
        revealed: false,
      };
    });
    setAnswer("");
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
            <p className="text-sm">Generating drill…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
        <button
          onClick={loadDrill}
          className="flex items-center justify-center gap-2 w-full rounded-xl border border-border/50 py-3 text-sm hover:bg-card/50 transition-colors"
        >
          <RotateCcw className="h-4 w-4" /> Try Again
        </button>
      </div>
    );
  }

  // Results screen
  if (isDone && drill) {
    return (
      <div className="flex flex-col gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <div className="rounded-xl border border-gold/25 bg-gold/5 p-6 text-center">
          <Sparkle className="h-8 w-8 text-gold mx-auto mb-3" />
          <h3 className="text-lg font-bold text-foreground mb-1">Drill Complete</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {pattern.name} · {pattern.pattern}
          </p>
          <div className="flex justify-center gap-8">
            <div>
              <p className="text-2xl font-bold text-emerald-400">{drill.correct}</p>
              <p className="text-xs text-muted-foreground">Got it</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive/80">{drill.missed}</p>
              <p className="text-xs text-muted-foreground">Missed</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            void loadDrill();
          }}
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-gold/10 border border-gold/25 py-3 text-sm font-semibold text-gold hover:bg-gold/20 transition-colors"
        >
          <RotateCcw className="h-4 w-4" /> Drill Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        {drill && (
          <p className="text-xs text-muted-foreground">
            {drill.index + 1} / {drill.items.length}
          </p>
        )}
      </div>

      {/* Pattern reminder */}
      <div className="rounded-lg border border-gold/20 bg-gold/5 px-3 py-2 flex items-center gap-2">
        <FrequencyBadge frequency={pattern.frequency} />
        <p className="font-mono text-xs text-gold">{pattern.pattern}</p>
      </div>

      {cur && (
        <div className="rounded-xl border border-border/50 bg-card/40 p-5 space-y-4">
          {/* Prompt */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Translate to {pattern.language}
            </p>
            <p className="text-lg text-foreground font-medium leading-snug">{cur.prompt}</p>
          </div>

          {/* Answer input */}
          {!drill?.revealed && (
            <div className="space-y-3">
              <input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && answer.trim()) reveal();
                }}
                placeholder={`Type in ${pattern.language}…`}
                className="w-full rounded-lg border border-border/50 bg-background/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/40"
                autoFocus
              />
              <button
                onClick={reveal}
                disabled={!answer.trim()}
                className="w-full rounded-lg bg-gold/10 border border-gold/25 py-2.5 text-sm font-semibold text-gold hover:bg-gold/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Show Answer
              </button>
            </div>
          )}

          {/* Revealed answer */}
          {drill?.revealed && (
            <div className="space-y-3">
              {/* User's attempt */}
              <div className="rounded-lg bg-background/40 border border-border/30 px-3 py-2">
                <p className="text-xs text-muted-foreground mb-0.5">Your answer</p>
                <p className="text-sm text-foreground">
                  {answer || <em className="opacity-40">skipped</em>}
                </p>
              </div>

              {/* Correct answer */}
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-3 py-2">
                <p className="text-xs text-emerald-400 mb-0.5">Correct</p>
                <p className="text-sm font-medium text-foreground">{cur.answer}</p>
              </div>

              {/* Hint */}
              <p className="text-xs text-gold/70 font-mono bg-gold/5 rounded px-2 py-1.5 border border-gold/15">
                {cur.hint}
              </p>

              {/* Self-assess */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => score(true)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Got it
                </button>
                <button
                  onClick={() => score(false)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/50 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-card/50 transition-colors"
                >
                  <XCircle className="h-4 w-4" />
                  Missed
                </button>
              </div>

              {isLast && (
                <p className="text-center text-xs text-muted-foreground/60">
                  Last question — score after marking
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PatternLab() {
  const { state: app } = useApp();
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>("all");
  const [view, setView] = useState<View>("browse");
  const [selected, setSelected] = useState<GrammarPattern | null>(null);

  const lang = app.selectedLanguage;
  const patterns = getPatternsForLanguage(lang);

  const filtered = patterns.filter((p) => phaseFilter === "all" || p.phase === phaseFilter);

  const userVocabWords =
    app.userVocab.length > 0 && app.vocabLang === lang
      ? app.userVocab
          .filter((v) => v.correctCount < 5)
          .map((v) => v.word)
          .slice(0, 10)
      : undefined;

  const hasPatterns = patterns.length > 0;

  function openPattern(p: GrammarPattern) {
    setSelected(p);
    setView("card");
  }

  function openDrill() {
    setView("drill");
  }

  function goBack() {
    if (view === "drill") {
      setView("card");
    } else {
      setView("browse");
      setSelected(null);
    }
  }

  // ── No patterns for this language ─────────────────────────────────────────
  if (!hasPatterns) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center px-6">
        <BookOpen className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-muted-foreground text-sm">
          Grammar patterns for {lang} are not yet available. Switch to Spanish for the full pattern
          library.
        </p>
      </div>
    );
  }

  // ── Drill view ─────────────────────────────────────────────────────────────
  if (view === "drill" && selected) {
    return (
      <div className="max-w-xl mx-auto px-4 pt-4 pb-24">
        <DrillView pattern={selected} userVocabWords={userVocabWords} onBack={goBack} />
      </div>
    );
  }

  // ── Pattern detail view ────────────────────────────────────────────────────
  if (view === "card" && selected) {
    return (
      <div className="max-w-xl mx-auto px-4 pt-4 pb-24">
        <PatternDetail pattern={selected} onBack={goBack} onDrill={openDrill} />
      </div>
    );
  }

  // ── Browse view ────────────────────────────────────────────────────────────
  const phase1 = filtered.filter((p) => p.phase === 1);
  const phase2 = filtered.filter((p) => p.phase === 2);

  return (
    <div className="max-w-xl mx-auto px-4 pt-4 pb-24">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkle className="h-5 w-5 text-gold" />
          Grammar Patterns
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          High-frequency structures that unlock {lang}
        </p>
      </div>

      {/* Personal vocab notice */}
      {userVocabWords && userVocabWords.length > 0 && (
        <div className="mb-4 rounded-lg border border-violet-500/25 bg-violet-500/10 px-3 py-2.5 flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-violet-400 shrink-0" />
          <p className="text-xs text-violet-300">
            Drills will use your {userVocabWords.length} personal vocab words
          </p>
        </div>
      )}

      {/* Phase filter */}
      <div className="flex gap-2 mb-5">
        {(["all", 1, 2] as const).map((f) => (
          <button
            key={f}
            onClick={() => setPhaseFilter(f)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              phaseFilter === f
                ? "bg-gold/15 text-gold border border-gold/30"
                : "bg-card/30 text-muted-foreground border border-border/40 hover:text-foreground",
            )}
          >
            {f === "all" ? "All" : f === 1 ? "Phase 1 — Your Story" : "Phase 2 — Your World"}
          </button>
        ))}
      </div>

      {/* Pattern groups */}
      {(phaseFilter === "all" || phaseFilter === 1) && phase1.length > 0 && (
        <section className="mb-6">
          {phaseFilter === "all" && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-violet-400">
                Phase 1 — Your Story
              </span>
              <div className="flex-1 h-px bg-violet-500/20" />
            </div>
          )}
          <div className="space-y-3">
            {phase1.map((p) => (
              <PatternCard
                key={p.id}
                pattern={p}
                progress={app.patternProgress[p.id] ?? 0}
                onSelect={() => openPattern(p)}
              />
            ))}
          </div>
        </section>
      )}

      {(phaseFilter === "all" || phaseFilter === 2) && phase2.length > 0 && (
        <section className="mb-6">
          {phaseFilter === "all" && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                Phase 2 — Your World
              </span>
              <div className="flex-1 h-px bg-cyan-500/20" />
            </div>
          )}
          <div className="space-y-3">
            {phase2.map((p) => (
              <PatternCard
                key={p.id}
                pattern={p}
                progress={app.patternProgress[p.id] ?? 0}
                onSelect={() => openPattern(p)}
              />
            ))}
          </div>
        </section>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground/60 text-sm">
          No patterns for this filter.
        </div>
      )}

      {/* Frequency legend */}
      <div className="mt-4 rounded-xl border border-border/30 bg-card/20 p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Frequency Guide
        </p>
        {(["ultra", "high", "medium"] as const).map((f) => (
          <div key={f} className="flex items-start gap-2">
            <FrequencyBadge frequency={f} />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {FREQUENCY_META[f].desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
