import { useState } from "react";
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import { useApp } from "@/state/app-state";
import { getBallSportsContent, type ModuleArea } from "@/data/ball-sports-content";
import { BaseballPositionsGame } from "../games/BaseballPositionsGame";
import { BASEBALL_DUGOUT_VOCAB, type BaseballDugoutVocab } from "@/data/baseball-positions";

const MODULE_ID = "baseball";

type Tab = "diamond" | "positions" | "dugout";

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "diamond", label: "Diamond", emoji: "⚾" },
  { id: "positions", label: "Positions", emoji: "🏟️" },
  { id: "dugout", label: "Dugout Vocab", emoji: "📋" },
];

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  "pitch-type": { label: "Pitch Types", emoji: "⚾" },
  call: { label: "Calls & Rulings", emoji: "⚫" },
  play: { label: "Plays & Situations", emoji: "🏃" },
  equipment: { label: "Equipment", emoji: "🧤" },
};

const DUGOUT_CATEGORIES = ["pitch-type", "call", "play", "equipment"] as const;

export function BaseballHome() {
  const [activeTab, setActiveTab] = useState<Tab>("diamond");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Header */}
      <header className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">⚾ Baseball</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Baseball Language Trainer
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Learn authentic baseball vocabulary — dugout strategy, field positions, and the language
          players and fans actually use.
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
      {activeTab === "diamond" && <DiamondPanel />}
      {activeTab === "positions" && <PositionsPanel />}
      {activeTab === "dugout" && <DugoutVocabPanel />}
    </div>
  );
}

// ── Diamond Panel ─────────────────────────────────────────────────────────────

function DiamondPanel() {
  const { state, dispatch } = useApp();
  const content = getBallSportsContent(MODULE_ID);
  const areas = content?.areas ?? [];

  const assignedId = state.moduleAssignments[MODULE_ID] ?? null;
  const [openId, setOpenId] = useState<string | null>(assignedId);
  const openArea = areas.find((a) => a.id === openId) ?? null;

  function pickArea(area: ModuleArea) {
    setOpenId(area.id);
    dispatch({
      type: "SET_MODULE_ASSIGNMENT",
      payload: { moduleId: MODULE_ID, assignmentId: area.id },
    });
  }

  return (
    <div>
      {!openArea ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Pick an area of baseball conversation to explore — dugout chatter, pitcher-catcher
            signs, at-bat approach, and more.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map((area) => (
              <button
                key={area.id}
                onClick={() => pickArea(area)}
                className="group flex flex-col items-start gap-2 rounded-2xl border border-border/60 bg-card/40 p-5 text-left transition-all hover:border-gold/60 hover:bg-card/70"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{area.emoji}</span>
                  <span className="font-display text-lg font-semibold">{area.name}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{area.blurb}</p>
                <span className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gold/80 group-hover:text-gold">
                  Open →
                </span>
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
  const [flashIndex, setFlashIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const vocab = area.vocab;

  function nextCard() {
    setFlipped(false);
    setFlashIndex((i) => (i + 1) % vocab.length);
  }

  function prevCard() {
    setFlipped(false);
    setFlashIndex((i) => (i - 1 + vocab.length) % vocab.length);
  }

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
            <p className="text-xs text-muted-foreground">{area.blurb}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Tone
            </p>
            <p className="text-sm text-foreground">{area.toneNote}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Scenario
            </p>
            <p className="text-sm text-foreground">{area.learnerRole}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Key phrases */}
        <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-gold">
            Key phrases
          </h3>
          <ul className="space-y-2">
            {area.phrases.map((p, i) => (
              <li key={i} className="rounded-lg border border-border/40 bg-background/40 p-3">
                <p className="text-sm text-foreground">{p.en}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {p.intent}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Flashcards */}
        <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-gold">
            Quick vocab flashcards
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Tap the card to reveal context, then move to the next term.
          </p>
          <div
            onClick={() => setFlipped((f) => !f)}
            className="cursor-pointer rounded-xl border border-gold/30 bg-background/60 p-6 text-center transition-all hover:border-gold/60 hover:bg-background/80 select-none min-h-[120px] flex flex-col items-center justify-center gap-2"
          >
            <span className="font-display text-xl font-semibold text-foreground">
              {vocab[flashIndex]}
            </span>
            {flipped ? (
              <span className="text-xs text-gold">Area: {area.name}</span>
            ) : (
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
                tap to flip
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={prevCard}
              className="rounded-lg border border-border/60 bg-card/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:border-gold/40 hover:text-foreground transition-all"
            >
              ← Prev
            </button>
            <span className="font-mono text-[10px] text-muted-foreground">
              {flashIndex + 1} / {vocab.length}
            </span>
            <button
              onClick={nextCard}
              className="rounded-lg border border-border/60 bg-card/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:border-gold/40 hover:text-foreground transition-all"
            >
              Next →
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

// ── Positions Panel ───────────────────────────────────────────────────────────

function PositionsPanel() {
  const { state, dispatch } = useApp();

  function handleXp(amount: number) {
    dispatch({ type: "ADD_XP", payload: amount });
  }

  return (
    <div>
      <div className="mb-5 rounded-2xl border border-border/60 bg-card/40 p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-gold mb-1">
          🏟️ Positions Quiz
        </p>
        <p className="text-sm text-muted-foreground">
          Identify all nine fielding positions on the diamond. Tap a position marker and select the
          correct name. Score is tracked as you go — try to get a perfect round.
        </p>
      </div>
      <BaseballPositionsGame language={state.selectedLanguage} onXp={handleXp} />
    </div>
  );
}

// ── Dugout Vocab Panel ────────────────────────────────────────────────────────

function DugoutVocabPanel() {
  const { state } = useApp();
  const lang = state.selectedLanguage;

  // Determine which translation column to use
  const showLang = lang === "Portuguese" ? "pt" : "es";
  const langLabel = lang === "Portuguese" ? "Portuguese" : lang === "Spanish" ? "Spanish" : lang; // fallback to Spanish for others

  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    "pitch-type": true,
  });

  function toggleCategory(cat: string) {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  // Group vocab by category
  const grouped = DUGOUT_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = BASEBALL_DUGOUT_VOCAB.filter((v) => v.category === cat);
      return acc;
    },
    {} as Record<string, BaseballDugoutVocab[]>,
  );

  return (
    <div>
      <div className="mb-5 rounded-2xl border border-border/60 bg-card/40 p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-gold mb-1">
          📋 Dugout Vocabulary Reference
        </p>
        <p className="text-sm text-muted-foreground">
          Essential baseball terms grouped by category. Each card shows English alongside{" "}
          <span className="text-foreground">{langLabel}</span>. Expand a category to study the word
          pairs.
        </p>
      </div>

      <div className="space-y-3">
        {DUGOUT_CATEGORIES.map((cat) => {
          const meta = CATEGORY_LABELS[cat];
          const words = grouped[cat] ?? [];
          const isOpen = openCategories[cat] ?? false;

          return (
            <div
              key={cat}
              className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden"
            >
              <button
                onClick={() => toggleCategory(cat)}
                className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-card/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{meta.emoji}</span>
                  <span className="font-display text-base font-semibold">{meta.label}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {words.length} terms
                  </span>
                </div>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="border-t border-border/60 px-5 py-4">
                  <div className="mb-3 grid grid-cols-2 gap-x-4">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                      English
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                      {langLabel}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {words.map((word, i) => (
                      <li
                        key={i}
                        className="grid grid-cols-2 gap-x-4 rounded-lg border border-border/40 bg-background/40 px-4 py-2.5"
                      >
                        <span className="text-sm text-foreground font-medium">{word.en}</span>
                        <span className="text-sm text-muted-foreground">
                          {showLang === "pt" ? word.pt : word.es}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
