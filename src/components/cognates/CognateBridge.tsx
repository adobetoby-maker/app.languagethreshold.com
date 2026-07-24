import { useMemo, useState } from "react";
import { ArrowRightLeft, ChevronLeft, ChevronRight, Sparkle, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/state/app-state";
import {
  ALL_COGNATE_RULES,
  COGNATE_SOURCE_LANGUAGES,
  FREQUENCY_META,
  getCognateRulesForSource,
  type CognateFrequency,
  type CognateRule,
  type CognateSourceLanguage,
} from "@/data/cognate-patterns";

// ─── Types ────────────────────────────────────────────────────────────────────

type FreqFilter = "all" | CognateFrequency;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FrequencyBadge({ frequency }: { frequency: CognateFrequency }) {
  const meta = FREQUENCY_META[frequency];
  const color =
    frequency === "ultra"
      ? "text-gold bg-gold/15 border-gold/30"
      : frequency === "high"
        ? "text-blue-400 bg-blue-500/10 border-blue-500/25"
        : "text-muted-foreground bg-border/20 border-border/40";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider",
        color,
      )}
    >
      {frequency === "ultra" && <Sparkle className="h-2.5 w-2.5" />}
      {meta.label}
    </span>
  );
}

function ReliabilityMeter({ reliability }: { reliability: number }) {
  return (
    <div className="flex items-center gap-1.5" title={`~${reliability}% of common words transfer cleanly`}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border/30">
        <div
          className={cn(
            "h-full rounded-full",
            reliability >= 85 ? "bg-emerald-400" : reliability >= 70 ? "bg-amber-400" : "bg-orange-400",
          )}
          style={{ width: `${reliability}%` }}
        />
      </div>
      <span className="font-mono text-[10px] text-muted-foreground">{reliability}%</span>
    </div>
  );
}

// ─── Rule Card (summary) ───────────────────────────────────────────────────────

function RuleCard({ rule, onSelect }: { rule: CognateRule; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="group w-full text-left rounded-xl border border-border/50 bg-card/30 p-4 transition-all hover:border-gold/30 hover:bg-card/50"
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <FrequencyBadge frequency={rule.frequency} />
          {rule.watchOut && <TriangleAlert className="h-3.5 w-3.5 text-amber-400" />}
        </div>
        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-gold" />
      </div>

      <p className="mb-0.5 font-semibold text-foreground">{rule.name}</p>
      <p className="mb-2 flex items-center gap-2 font-mono text-xs text-gold/80">
        {rule.sourcePattern}
        <ArrowRightLeft className="h-3 w-3 text-muted-foreground/50" />
        {rule.targetPattern}
      </p>
      <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{rule.hook}</p>

      <div className="flex items-center justify-between border-t border-border/30 pt-3">
        <ReliabilityMeter reliability={rule.reliability} />
        <p className="text-xs italic text-muted-foreground/70">
          e.g. {rule.examples[0].source} → {rule.examples[0].target}
        </p>
      </div>
    </button>
  );
}

// ─── Rule Detail ────────────────────────────────────────────────────────────────

function RuleDetail({ rule, onBack }: { rule: CognateRule; onBack: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      <div className="rounded-xl border border-border/50 bg-card/40 p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <FrequencyBadge frequency={rule.frequency} />
          <span className="text-xs text-muted-foreground">{rule.sourceLanguage} → {rule.targetLanguage}</span>
        </div>

        <h2 className="mb-1 text-xl font-bold text-foreground">{rule.name}</h2>
        <p className="mb-3 inline-flex items-center gap-2 rounded-md border border-gold/20 bg-gold/5 px-3 py-1.5 font-mono text-sm text-gold">
          {rule.sourcePattern}
          <ArrowRightLeft className="h-3.5 w-3.5" />
          {rule.targetPattern}
        </p>

        <ReliabilityMeter reliability={rule.reliability} />
      </div>

      <div className={cn("rounded-lg border p-3 text-sm", FREQUENCY_META[rule.frequency] && "bg-card/30 border-border/50")}>
        <p className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Why This Matters
        </p>
        <p className="text-sm leading-relaxed text-foreground">{rule.hook}</p>
      </div>

      {rule.watchOut && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400">
            <TriangleAlert className="h-3.5 w-3.5" />
            Watch Out
          </p>
          <p className="text-sm leading-relaxed text-foreground/90">{rule.watchOut}</p>
        </div>
      )}

      <div className="space-y-3 rounded-xl border border-border/50 bg-card/30 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Examples</p>
        {rule.examples.map((ex, i) => (
          <div key={i} className="flex items-baseline justify-between gap-3 border-l-2 border-gold/30 pl-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                {ex.source} <span className="text-muted-foreground/60">→</span> {ex.target}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{ex.gloss}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CognateBridge() {
  const { state: app } = useApp();
  const [source, setSource] = useState<CognateSourceLanguage>("English");
  const [freqFilter, setFreqFilter] = useState<FreqFilter>("all");
  const [selected, setSelected] = useState<CognateRule | null>(null);

  const rules = getCognateRulesForSource(source);
  const filtered = rules.filter((r) => freqFilter === "all" || r.frequency === freqFilter);

  const totalExamples = useMemo(
    () => ALL_COGNATE_RULES.reduce((sum, r) => sum + r.examples.length, 0),
    [],
  );

  if (selected) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 pb-24 pt-4">
        <RuleDetail rule={selected} onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-24 pt-4">
      <div className="mb-5">
        <div className="mb-1 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
          <ArrowRightLeft className="h-3.5 w-3.5" />
          Cognate Bridge
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Words you already know, in {app.selectedLanguage === "Italian" ? "Italian" : app.selectedLanguage}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {ALL_COGNATE_RULES.length} sound-shift patterns · {totalExamples} example words · ranked by how often
          each pattern actually pays off
        </p>
      </div>

      {/* Source language selector */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        {COGNATE_SOURCE_LANGUAGES.map((lang) => (
          <button
            key={lang}
            onClick={() => setSource(lang)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              source === lang
                ? "border-gold/30 bg-gold/15 text-gold"
                : "border-border/40 bg-card/30 text-muted-foreground hover:text-foreground",
            )}
          >
            {lang}
          </button>
        ))}
      </div>

      {/* Frequency filter */}
      <div className="mb-5 flex gap-2">
        {(["all", "ultra", "high", "medium"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFreqFilter(f)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              freqFilter === f
                ? "border border-gold/30 bg-gold/15 text-gold"
                : "border border-border/40 bg-card/30 text-muted-foreground hover:text-foreground",
            )}
          >
            {f === "all" ? "All" : FREQUENCY_META[f].label}
          </button>
        ))}
      </div>

      {/* Rule cards */}
      <div className="space-y-3">
        {filtered.map((r) => (
          <RuleCard key={r.id} rule={r} onSelect={() => setSelected(r)} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground/60">No patterns for this filter.</div>
      )}

      {/* Frequency legend */}
      <div className="mt-4 space-y-2 rounded-xl border border-border/30 bg-card/20 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Frequency Guide
        </p>
        {(["ultra", "high", "medium"] as const).map((f) => (
          <div key={f} className="flex items-start gap-2">
            <FrequencyBadge frequency={f} />
            <p className="text-xs leading-relaxed text-muted-foreground">{FREQUENCY_META[f].desc}</p>
          </div>
        ))}
        <p className="pt-1 text-xs leading-relaxed text-muted-foreground/70">
          The percentage bar on each card is reliability — how often the pattern holds — which is a separate
          question from frequency. A pattern can be common but risky (ñ → gn/nn), or rare but bulletproof
          (-graphy → -grafia).
        </p>
      </div>
    </div>
  );
}
