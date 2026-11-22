import { useState } from "react";
import { ChevronDown, ChevronRight, ArrowLeft, RotateCcw, CheckCircle2 } from "lucide-react";
import { useApp } from "@/state/app-state";
import { OR_EVS_CONTENT, type ModuleArea } from "@/data/or-evs-content";

type Tab = "areas" | "flash" | "phrases";

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "areas", label: "Work Areas", emoji: "🫧" },
  { id: "flash", label: "Equipment Flash", emoji: "🔧" },
  { id: "phrases", label: "Key Phrases", emoji: "💬" },
];

export function OrEvsHome() {
  const [activeTab, setActiveTab] = useState<Tab>("areas");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Module notice */}
      <div className="mb-5 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3">
        <p className="text-sm text-foreground/80 leading-relaxed">
          <span className="font-semibold text-gold">Job Skills Trainer.</span> This module teaches
          English vocabulary for OR housekeeping staff. Phrases are designed to be used directly on
          the job.
        </p>
      </div>

      {/* Header */}
      <header className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
          🫧 OR Environmental Services
        </p>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          OR EVS — English on the Job
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          English vocabulary and phrases for OR housekeeping staff. Study by work area, practice
          equipment terms with flashcards, or review all key phrases at a glance.
        </p>
      </header>

      {/* Tab pills */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-all ${
              activeTab === tab.id
                ? "border-gold bg-gold/10 text-gold"
                : "border-border/60 bg-card/40 text-muted-foreground hover:border-gold/40 hover:text-foreground"
            }`}
          >
            <span>{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel */}
      {activeTab === "areas" && <WorkAreasPanel />}
      {activeTab === "flash" && <EquipmentFlashPanel />}
      {activeTab === "phrases" && <KeyPhrasesPanel />}
    </div>
  );
}

// ── Work Areas Panel ──────────────────────────────────────────────────────────

function WorkAreasPanel() {
  const [openId, setOpenId] = useState<string | null>(null);
  const openArea = OR_EVS_CONTENT.areas.find((a) => a.id === openId) ?? null;

  function pickArea(area: ModuleArea) {
    setOpenId(area.id);
  }

  return (
    <div>
      {!openArea ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Select a work area to see the English phrases and vocabulary you need for that part of
            your shift.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {OR_EVS_CONTENT.areas.map((area) => (
              <button
                key={area.id}
                onClick={() => pickArea(area)}
                className="group flex flex-col items-start gap-2 rounded-2xl border border-border/60 bg-card/40 p-5 text-left transition-all hover:border-gold/60 hover:bg-card/70"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{area.emoji}</span>
                  <span className="font-display text-base font-semibold leading-tight">
                    {area.name}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3">{area.blurb}</p>
                <div className="mt-auto pt-1 flex items-center gap-3">
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/70">
                    {area.phrases.length} phrases · {area.vocab.length} terms
                  </span>
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-gold/80 group-hover:text-gold">
                    Open →
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <AreaDetail area={openArea} onBack={() => setOpenId(null)} />
      )}
    </div>
  );
}

function AreaDetail({ area, onBack }: { area: ModuleArea; onBack: () => void }) {
  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All areas
      </button>

      {/* Area header */}
      <div className="mb-6 rounded-2xl border border-gold/30 bg-card/40 p-5">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{area.emoji}</span>
          <div>
            <h2 className="font-display text-2xl font-semibold">{area.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">{area.blurb}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MetaRow label="You are" value={area.learnerRole} />
          <MetaRow label="Talking to" value={area.counterpart} />
          <MetaRow label="Tone" value={area.toneNote} />
        </div>
      </div>

      {/* Phrases — displayed prominently */}
      <section className="mb-6 rounded-2xl border border-gold/20 bg-card/40 p-5">
        <h3 className="mb-1 font-mono text-[11px] uppercase tracking-[0.22em] text-gold">
          English phrases to use on the job
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          These are the exact sentences you can say at work. Read them out loud to practice.
        </p>
        <ul className="space-y-2.5">
          {area.phrases.map((p, i) => (
            <li key={i} className="rounded-xl border border-border/50 bg-background/60 p-4">
              <p className="text-base font-medium text-foreground leading-snug">"{p.en}"</p>
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {p.intent}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Vocabulary */}
        <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-gold">
            English vocabulary
          </h3>
          <div className="flex flex-wrap gap-2">
            {area.vocab.map((v, i) => (
              <span
                key={i}
                className="rounded-full border border-border/60 bg-background/40 px-3 py-1 font-mono text-[11px] text-foreground/80"
              >
                {v}
              </span>
            ))}
          </div>
        </section>

        {/* Challenges */}
        <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-gold">
            Practice scenarios
          </h3>
          <ul className="space-y-2">
            {area.challenges.map((c, i) => (
              <li key={i} className="rounded-lg border border-border/40 bg-background/40 p-3">
                <p className="text-sm text-foreground leading-relaxed">{c}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-foreground leading-snug">{value}</p>
    </div>
  );
}

// ── Equipment Flash Panel ─────────────────────────────────────────────────────

// Collect all unique words from all vocabSets
function getAllVocabWords(): string[] {
  const seen = new Set<string>();
  const words: string[] = [];
  for (const set of OR_EVS_CONTENT.vocabSets) {
    for (const word of set.words) {
      if (!seen.has(word)) {
        seen.add(word);
        words.push(word);
      }
    }
  }
  return words;
}

const ALL_WORDS = getAllVocabWords();

function EquipmentFlashPanel() {
  const { state } = useApp();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [seen, setSeen] = useState(0);

  const word = ALL_WORDS[index];

  function next() {
    setRevealed(false);
    setSeen((s) => Math.max(s, index + 1));
    setIndex((i) => (i + 1) % ALL_WORDS.length);
  }

  function restart() {
    setIndex(0);
    setRevealed(false);
    setSeen(0);
  }

  const progress = Math.min(Math.round(((seen + 1) / ALL_WORDS.length) * 100), 100);

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-4 rounded-2xl border border-border/60 bg-card/40 p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-gold mb-1">
          🔧 Equipment Flashcards
        </p>
        <p className="text-sm text-muted-foreground">
          An English term will appear on the card. Say it out loud and think of what it means in
          {" "}{state.nativeLanguage}. Tap to reveal context, then press Next.
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.14em]">
            Progress
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {index + 1} / {ALL_WORDS.length}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-border/40">
          <div
            className="h-1.5 rounded-full bg-gold transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div
        onClick={() => setRevealed((r) => !r)}
        className="cursor-pointer rounded-2xl border border-gold/30 bg-card/60 p-8 text-center transition-all hover:border-gold/60 hover:bg-card/80 select-none min-h-[180px] flex flex-col items-center justify-center gap-3"
      >
        <p className="font-display text-2xl font-semibold text-foreground leading-tight">{word}</p>
        {revealed ? (
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            Say this English term out loud. Think: when would you use this word on your shift?
          </p>
        ) : (
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/50">
            tap to flip
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={restart}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/40 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-all hover:border-gold/40 hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restart
        </button>
        <button
          onClick={next}
          className="flex-1 rounded-xl border border-gold/50 bg-gold/10 px-4 py-2.5 font-mono text-[12px] uppercase tracking-[0.18em] text-gold transition-all hover:bg-gold/20 hover:border-gold"
        >
          Next →
        </button>
      </div>

      {/* Done state */}
      {index === ALL_WORDS.length - 1 && seen >= ALL_WORDS.length - 1 && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-gold/30 bg-gold/5 p-3">
          <CheckCircle2 className="h-4 w-4 text-gold shrink-0" />
          <p className="text-sm text-muted-foreground">
            You've seen all {ALL_WORDS.length} terms. Restart to review again.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Key Phrases Panel ─────────────────────────────────────────────────────────

function KeyPhrasesPanel() {
  const [openAreas, setOpenAreas] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(OR_EVS_CONTENT.areas.map((a) => [a.id, true])),
  );

  function toggleArea(id: string) {
    setOpenAreas((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function collapseAll() {
    setOpenAreas(Object.fromEntries(OR_EVS_CONTENT.areas.map((a) => [a.id, false])));
  }

  function expandAll() {
    setOpenAreas(Object.fromEntries(OR_EVS_CONTENT.areas.map((a) => [a.id, true])));
  }

  const totalPhrases = OR_EVS_CONTENT.areas.reduce((n, a) => n + a.phrases.length, 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-gold">
            💬 All key phrases
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalPhrases} phrases across {OR_EVS_CONTENT.areas.length} work areas — grouped for
            quick study or on-shift reference.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={collapseAll}
            className="rounded-lg border border-border/60 bg-card/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors"
          >
            Collapse
          </button>
          <button
            onClick={expandAll}
            className="rounded-lg border border-border/60 bg-card/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors"
          >
            Expand
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {OR_EVS_CONTENT.areas.map((area) => {
          const isOpen = openAreas[area.id] ?? true;
          return (
            <div
              key={area.id}
              className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden"
            >
              <button
                onClick={() => toggleArea(area.id)}
                className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-card/60 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{area.emoji}</span>
                  <span className="font-display text-base font-semibold">{area.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {area.phrases.length} phrases
                  </span>
                </div>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="border-t border-border/60 px-5 py-4 space-y-2.5">
                  {area.phrases.map((p, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-border/40 bg-background/60 px-4 py-3"
                    >
                      <p className="text-sm font-medium text-foreground leading-snug">"{p.en}"</p>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.13em] text-muted-foreground">
                        {p.intent}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
