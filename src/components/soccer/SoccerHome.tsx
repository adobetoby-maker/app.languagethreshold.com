import { useState } from "react";
import { MessageSquare, Sparkles, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { SportsNewsPanel } from "./SportsNewsPanel";
import { useApp } from "@/state/app-state";
import { useTutor } from "@/state/tutor-state";
import {
  getBallSportsContent,
  type ModuleArea,
  type ModuleVocabSet,
} from "@/data/ball-sports-content";
import { ModuleStudyGuide } from "@/components/modules/ModuleStudyGuide";
import { SoccerPositionsGame } from "@/components/games/SoccerPositionsGame";

const MODULE_ID = "soccer";
const SOCCER = getBallSportsContent(MODULE_ID)!;

// ── Tab types ─────────────────────────────────────────────────────────────────

type SoccerTab = "pitch" | "positions" | "news" | "vocab";

const TABS: { id: SoccerTab; label: string; emoji: string }[] = [
  { id: "pitch", label: "Pitch", emoji: "⚽" },
  { id: "positions", label: "Positions", emoji: "🗺️" },
  { id: "news", label: "Matchday", emoji: "📰" },
  { id: "vocab", label: "Study Zones", emoji: "📚" },
];

// ── Main export ───────────────────────────────────────────────────────────────

export function SoccerHome() {
  const { state, dispatch } = useApp();
  const tutor = useTutor();
  const [activeTab, setActiveTab] = useState<SoccerTab>("pitch");

  const assignedAreaId = state.moduleAssignments[MODULE_ID] ?? null;
  const [openAreaId, setOpenAreaId] = useState<string | null>(assignedAreaId);
  const openArea = SOCCER.areas.find((a) => a.id === openAreaId) ?? null;

  function pickArea(area: ModuleArea) {
    setOpenAreaId(area.id);
    dispatch({
      type: "SET_MODULE_ASSIGNMENT",
      payload: { moduleId: MODULE_ID, assignmentId: area.id },
    });
  }

  function startChallenge(area: ModuleArea, prompt: string) {
    dispatch({
      type: "SET_MODULE_ASSIGNMENT",
      payload: { moduleId: MODULE_ID, assignmentId: area.id },
    });
    tutor.prefill(
      `Roleplay scenario — ${area.name}. I am ${area.learnerRole}; you are ${area.counterpart}. ` +
        `In ${state.selectedLanguage}, with a short English gloss in parentheses for each line. ` +
        `Begin the scene now: ${prompt}`,
    );
    tutor.setOpen(true);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <ModuleStudyGuide />

      {/* Hero header */}
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <span className="text-4xl leading-none">⚽</span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
              Soccer / Fútbol
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              The Beautiful Game — in {state.selectedLanguage}
            </h1>
          </div>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          On-pitch commands, dressing room talk, tactical analysis, transfer gossip. Speak football
          like a pro.
        </p>
      </header>

      {/* Tab pills */}
      <nav className="mb-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={
              "inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition-all " +
              (activeTab === tab.id
                ? "border border-gold/70 bg-gold/20 text-gold shadow-[0_0_12px_0_rgba(212,175,55,0.15)]"
                : "border border-border/60 bg-card/40 text-foreground/70 hover:border-gold/40 hover:text-gold")
            }
          >
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Sections */}
      {activeTab === "pitch" && (
        <PitchSection
          openArea={openArea}
          onPickArea={pickArea}
          onBack={() => setOpenAreaId(null)}
          onChallenge={(prompt) => openArea && startChallenge(openArea, prompt)}
          language={state.selectedLanguage}
        />
      )}
      {activeTab === "positions" && <PositionsSection />}
      {activeTab === "news" && <NewsSection />}
      {activeTab === "vocab" && <VocabSection sets={SOCCER.vocabSets} />}
    </div>
  );
}

// ── ⚽ Pitch section ──────────────────────────────────────────────────────────

function PitchSection({
  openArea,
  onPickArea,
  onBack,
  onChallenge,
  language,
}: {
  openArea: ModuleArea | null;
  onPickArea: (area: ModuleArea) => void;
  onBack: () => void;
  onChallenge: (prompt: string) => void;
  language: string;
}) {
  return (
    <div>
      {!openArea ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Choose a situation to drill. Each area gives you authentic phrases, vocab, and AI
            roleplay challenges for that context.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SOCCER.areas.map((area) => (
              <button
                key={area.id}
                onClick={() => onPickArea(area)}
                className="group flex flex-col items-start gap-2 rounded-2xl border border-border/60 bg-card/40 p-5 text-left transition-all hover:border-gold/60 hover:bg-card/70 hover:shadow-[0_0_20px_0_rgba(212,175,55,0.08)]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{area.emoji}</span>
                  <span className="font-display text-base font-semibold leading-tight">
                    {area.name}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
                  {area.blurb}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {area.vocab.slice(0, 3).map((v) => (
                    <span
                      key={v}
                      className="rounded-full border border-border/50 bg-background/40 px-2 py-0.5 font-mono text-[9px] text-muted-foreground"
                    >
                      {v}
                    </span>
                  ))}
                </div>
                <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold/70 group-hover:text-gold">
                  Open →
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <AreaDetail area={openArea} onBack={onBack} onChallenge={onChallenge} language={language} />
      )}
    </div>
  );
}

function AreaDetail({
  area,
  onBack,
  onChallenge,
  language,
}: {
  area: ModuleArea;
  onBack: () => void;
  onChallenge: (prompt: string) => void;
  language: string;
}) {
  const [flashIdx, setFlashIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const currentVocab = area.vocab[flashIdx % area.vocab.length];
  const totalCards = area.vocab.length;

  function nextCard() {
    setFlipped(false);
    setTimeout(() => setFlashIdx((i) => (i + 1) % totalCards), 80);
  }
  function prevCard() {
    setFlipped(false);
    setTimeout(() => setFlashIdx((i) => (i - 1 + totalCards) % totalCards), 80);
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All areas
      </button>

      {/* Area hero card */}
      <div className="mb-6 rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 via-card/90 to-card/90 p-5">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{area.emoji}</span>
          <div>
            <h2 className="font-display text-2xl font-semibold">{area.name}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{area.blurb}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <RoleRow label="Your role" value={area.learnerRole} />
          <RoleRow label="Talking to" value={area.counterpart} />
          <RoleRow label="Tone" value={area.toneNote} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Flash cards */}
        <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
          <h3 className="mb-4 font-mono text-[11px] uppercase tracking-[0.22em] text-gold">
            Quick vocab flash cards
          </h3>
          <div
            onClick={() => setFlipped((f) => !f)}
            className="relative flex h-32 cursor-pointer select-none items-center justify-center rounded-xl border border-border/50 bg-background/50 transition-all hover:border-gold/40"
          >
            <div className="text-center px-4">
              {!flipped ? (
                <>
                  <p className="font-display text-xl font-semibold text-foreground">
                    {currentVocab}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.16em]">
                    tap to see context
                  </p>
                </>
              ) : (
                <>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold mb-1">
                    {language} context
                  </p>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    "{currentVocab}" — used in {area.name.toLowerCase()} situations. Drill it in a
                    roleplay below.
                  </p>
                </>
              )}
            </div>
            <span className="absolute bottom-2 right-3 font-mono text-[9px] text-muted-foreground">
              {flashIdx + 1}/{totalCards}
            </span>
          </div>
          <div className="mt-3 flex justify-between">
            <button
              onClick={prevCard}
              className="rounded-full border border-border/50 bg-background/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
            >
              ← Prev
            </button>
            <button
              onClick={nextCard}
              className="rounded-full border border-border/50 bg-background/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
            >
              Next →
            </button>
          </div>
        </section>

        {/* Key phrases */}
        <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
          <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-gold">
            Key phrases
          </h3>
          <ul className="space-y-2">
            {area.phrases.slice(0, 4).map((p, i) => (
              <li key={i} className="rounded-lg border border-border/40 bg-background/40 p-3">
                <p className="text-sm text-foreground">{p.en}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {p.intent}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* AI challenge launcher */}
        <section className="rounded-2xl border border-gold/30 bg-card/40 p-5 lg:col-span-2">
          <h3 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-gold">
            <Sparkles className="h-3.5 w-3.5" /> Challenge launcher
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Start an AI roleplay in {language}. The AI plays{" "}
            <span className="text-foreground">{area.counterpart}</span>; you play{" "}
            <span className="text-foreground">{area.learnerRole}</span>.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {area.challenges.map((c) => (
              <li key={c}>
                <button
                  onClick={() => onChallenge(c)}
                  className="group flex w-full items-start gap-2 rounded-xl border border-border/40 bg-background/40 p-3.5 text-left transition-all hover:border-gold/60 hover:bg-background/70"
                >
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <span className="text-xs leading-relaxed text-foreground group-hover:text-foreground">
                    {c}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function RoleRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-foreground">{value}</p>
    </div>
  );
}

// ── 🗺️ Positions section ─────────────────────────────────────────────────────

function PositionsSection() {
  const { state } = useApp();
  return (
    <div>
      <div className="mb-5 rounded-2xl border border-border/60 bg-card/40 px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🗺️</span>
          <div>
            <h2 className="font-display text-lg font-semibold">Positions Game</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Tap the correct position on the field. Switch formations to drill different tactical
              setups. Earn XP for streaks.
            </p>
          </div>
        </div>
      </div>
      <SoccerPositionsGame language={state.selectedLanguage} />
    </div>
  );
}

// ── 📰 Matchday News section ──────────────────────────────────────────────────

function NewsSection() {
  const { state, dispatch } = useApp();

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
      <SportsNewsPanel
        sport="soccer"
        favoriteTeam={state.favoriteTeam}
        language={state.selectedLanguage}
        onSetFavoriteTeam={(team) => dispatch({ type: "SET_FAVORITE_TEAM", payload: team })}
      />
    </div>
  );
}

// ── 📚 Study Zones section ────────────────────────────────────────────────────

function VocabSection({ sets }: { sets: ModuleVocabSet[] }) {
  return (
    <div>
      <p className="mb-5 text-sm text-muted-foreground">
        Vocabulary sets from the soccer module. Click any card to expand and see the full word list.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {sets.map((set) => (
          <VocabCard key={set.category} set={set} />
        ))}
      </div>
    </div>
  );
}

function VocabCard({ set }: { set: ModuleVocabSet }) {
  const [expanded, setExpanded] = useState(false);
  const preview = set.words.slice(0, 6);
  const rest = set.words.slice(6);

  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-5 transition-all hover:border-border/80">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 text-left"
      >
        <span className="text-2xl">{set.emoji}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base font-semibold text-foreground">{set.category}</h3>
          <p className="font-mono text-[10px] text-muted-foreground">{set.words.length} terms</p>
        </div>
        <span className="text-muted-foreground">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {/* Preview words (always visible) */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {preview.map((w) => (
          <span
            key={w}
            className="rounded-full border border-border/50 bg-background/40 px-2.5 py-1 font-mono text-[10px] text-foreground/80"
          >
            {w}
          </span>
        ))}
        {!expanded && rest.length > 0 && (
          <span className="rounded-full border border-border/40 bg-background/20 px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
            +{rest.length} more
          </span>
        )}
      </div>

      {/* Expanded rest */}
      {expanded && rest.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border/30 pt-3">
          {rest.map((w) => (
            <span
              key={w}
              className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 font-mono text-[10px] text-gold/80"
            >
              {w}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
