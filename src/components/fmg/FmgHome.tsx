import { useState } from "react";
import { ChevronDown, ChevronUp, MessageSquare, Sparkles, ArrowLeft, Volume2 } from "lucide-react";
import { useApp } from "@/state/app-state";
import { useTutor } from "@/state/tutor-state";
import { FMG_CONTENT, type FmgArea, type FmgPhrase } from "@/data/fmg-content";

const MODULE_ID = "fmg";

type FmgTab = "areas" | "phrases" | "vocab" | "plain-language";

const TABS: { id: FmgTab; label: string; emoji: string }[] = [
  { id: "areas", label: "Clinical Areas", emoji: "🏥" },
  { id: "phrases", label: "Phrase Drill", emoji: "💬" },
  { id: "vocab", label: "Vocab + Gloss", emoji: "📖" },
  { id: "plain-language", label: "Plain Language", emoji: "🤝" },
];

// ── Plain-language coaching rules ─────────────────────────────────────────────
// Pairs of { medical, plain } showing doctors what to say to patients.
const PLAIN_LANGUAGE_SWAPS = [
  { medical: "Myocardial infarction", plain: "Heart attack" },
  { medical: "Hypertension", plain: "High blood pressure" },
  { medical: "Edema", plain: "Swelling" },
  { medical: "Dyspnea", plain: "Trouble breathing / shortness of breath" },
  { medical: "Bilateral", plain: "On both sides" },
  { medical: "Acute", plain: "Sudden / severe" },
  { medical: "Benign", plain: "Not cancer / not harmful" },
  { medical: "Malignant", plain: "Cancer" },
  { medical: "Prognosis", plain: "What to expect going forward" },
  { medical: "Contraindication", plain: "Reason not to use this treatment" },
  { medical: "PRN", plain: "As needed" },
  { medical: "Subcutaneous injection", plain: "Shot under the skin" },
  { medical: "NPO", plain: "Nothing to eat or drink" },
  { medical: "Ambulating", plain: "Walking" },
  { medical: "Febrile", plain: "Has a fever" },
  { medical: "Etiology", plain: "Cause" },
  { medical: "Palpitations", plain: "Feeling your heart racing or skipping" },
  { medical: "Syncope", plain: "Fainting / passing out" },
  { medical: "Nausea and emesis", plain: "Feeling sick and throwing up" },
  { medical: "Hemoptysis", plain: "Coughing up blood" },
  { medical: "Dysuria", plain: "Pain or burning when you urinate" },
  { medical: "Hematuria", plain: "Blood in your urine" },
  { medical: "Diaphoresis", plain: "Heavy sweating" },
  { medical: "Tachycardia", plain: "Fast heart rate" },
];

export function FmgHome() {
  const { state, dispatch } = useApp();
  const tutor = useTutor();
  const [activeTab, setActiveTab] = useState<FmgTab>("areas");

  const assignedAreaId = state.moduleAssignments[MODULE_ID] ?? null;
  const [openAreaId, setOpenAreaId] = useState<string | null>(assignedAreaId);
  const openArea = FMG_CONTENT.areas.find((a) => a.id === openAreaId) ?? null;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Header */}
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">
          🩺 Medical English for FMGs
        </div>
        <h2 className="mt-1 font-display text-2xl font-semibold">
          Clinical English for Foreign Medical Graduates
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Master the English of US hospital rounds, documentation, team communication, and patient
          conversations.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={
              "shrink-0 rounded-full border px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] transition-all " +
              (activeTab === t.id
                ? "border-gold/60 bg-gold/15 text-gold"
                : "border-border/50 bg-background/30 text-muted-foreground hover:text-foreground")
            }
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {activeTab === "areas" && (
        <AreasTab
          openArea={openArea}
          openAreaId={openAreaId}
          setOpenAreaId={setOpenAreaId}
          dispatch={dispatch}
          moduleId={MODULE_ID}
          state={state}
          tutor={tutor}
        />
      )}
      {activeTab === "phrases" && (
        <PhraseDrillTab
          area={openArea}
          allAreas={FMG_CONTENT.areas}
          setOpenAreaId={setOpenAreaId}
          setActiveTab={setActiveTab}
        />
      )}
      {activeTab === "vocab" && <VocabGlossTab />}
      {activeTab === "plain-language" && <PlainLanguageTab />}
    </div>
  );
}

// ── Areas tab ─────────────────────────────────────────────────────────────────

function AreasTab({
  openArea,
  openAreaId,
  setOpenAreaId,
  dispatch,
  moduleId,
  state,
  tutor,
}: {
  openArea: FmgArea | null;
  openAreaId: string | null;
  setOpenAreaId: (id: string | null) => void;
  dispatch: ReturnType<typeof useApp>["dispatch"];
  moduleId: string;
  state: ReturnType<typeof useApp>["state"];
  tutor: ReturnType<typeof useTutor>;
}) {
  return (
    <div className="space-y-3">
      {FMG_CONTENT.areas.map((area) => {
        const isOpen = openAreaId === area.id;
        return (
          <div
            key={area.id}
            className={
              "rounded-2xl border transition-all " +
              (isOpen ? "border-gold/50 bg-card/60" : "border-border/60 bg-card/30")
            }
          >
            <button
              onClick={() => setOpenAreaId(isOpen ? null : area.id)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left"
            >
              <span className="text-2xl">{area.emoji}</span>
              <div className="flex-1">
                <div className="font-display text-base font-semibold">{area.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{area.blurb}</div>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {isOpen && (
              <div className="border-t border-border/40 px-5 pb-5 pt-4 space-y-4">
                {/* Role cards */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <RoleCard label="You are playing" value={area.learnerRole} />
                  <RoleCard label="AI plays" value={area.counterpart} />
                </div>
                <div className="rounded-xl border border-border/40 bg-background/30 px-4 py-2.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Register note —{" "}
                  </span>
                  <span className="text-sm text-foreground/80">{area.toneNote}</span>
                </div>

                {/* Key vocab preview */}
                <div>
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Key vocabulary
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {area.vocab.slice(0, 10).map((w) => (
                      <span
                        key={w}
                        className="rounded-full border border-border/50 bg-background/40 px-2.5 py-0.5 text-xs text-foreground/80"
                      >
                        {w}
                        {area.nativeGloss[w] && (
                          <span className="ml-1 text-muted-foreground">
                            · {area.nativeGloss[w]}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      dispatch({
                        type: "SET_MODULE_ASSIGNMENT",
                        payload: { moduleId, assignmentId: area.id },
                      });
                      dispatch({
                        type: "SET_TAB",
                        payload: "tutor" as ReturnType<typeof useApp>["state"]["currentTab"],
                      });
                    }}
                    className="flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-gold transition-all hover:bg-gold/20"
                  >
                    <MessageSquare className="h-3 w-3" />
                    Practice with AI
                  </button>
                  <button
                    onClick={() => {
                      dispatch({
                        type: "SET_MODULE_ASSIGNMENT",
                        payload: { moduleId, assignmentId: area.id },
                      });
                    }}
                    className="flex items-center gap-2 rounded-full border border-border/50 bg-background/30 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground transition-all hover:text-foreground"
                  >
                    <Sparkles className="h-3 w-3" />
                    Set as active area
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RoleCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/30 px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm text-foreground">{value}</div>
    </div>
  );
}

// ── Phrase drill tab ───────────────────────────────────────────────────────────

function PhraseDrillTab({
  area,
  allAreas,
  setOpenAreaId,
  setActiveTab,
}: {
  area: FmgArea | null;
  allAreas: FmgArea[];
  setOpenAreaId: (id: string) => void;
  setActiveTab: (t: FmgTab) => void;
}) {
  const { state: appState } = useApp();
  const nativeName = appState.nativeLanguage;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState(area?.id ?? allAreas[0].id);

  const drillArea = allAreas.find((a) => a.id === selectedAreaId) ?? allAreas[0];
  const phrases = drillArea.phrases;
  const phrase: FmgPhrase = phrases[currentIdx % phrases.length];

  function next() {
    setCurrentIdx((i) => (i + 1) % phrases.length);
    setFlipped(false);
  }
  function prev() {
    setCurrentIdx((i) => (i - 1 + phrases.length) % phrases.length);
    setFlipped(false);
  }

  return (
    <div className="space-y-4">
      {/* Area picker */}
      <div className="flex gap-1.5 flex-wrap">
        {allAreas.map((a) => (
          <button
            key={a.id}
            onClick={() => {
              setSelectedAreaId(a.id);
              setCurrentIdx(0);
              setFlipped(false);
            }}
            className={
              "rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-all " +
              (selectedAreaId === a.id
                ? "border-gold/60 bg-gold/15 text-gold"
                : "border-border/50 bg-background/30 text-muted-foreground hover:text-foreground")
            }
          >
            {a.emoji} {a.name}
          </button>
        ))}
      </div>

      {/* Flashcard */}
      <div
        className="min-h-[200px] cursor-pointer rounded-2xl border border-border/60 bg-card/50 p-6 transition-all hover:border-gold/30"
        onClick={() => setFlipped((f) => !f)}
      >
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {flipped ? `Intent + ${nativeName} gloss` : "English phrase — tap to reveal"}
        </div>

        {!flipped ? (
          <p className="font-display text-xl leading-relaxed text-foreground">{phrase.en}</p>
        ) : (
          <div className="space-y-3">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                Intent:{" "}
              </span>
              <span className="text-sm text-foreground">{phrase.intent}</span>
            </div>
            {phrase.native && (
              <div className="rounded-xl border border-indigo-400/30 bg-indigo-400/5 px-4 py-3">
                <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-indigo-400/70">
                  {nativeName}
                </div>
                <p className="text-sm leading-relaxed text-indigo-200">{phrase.native}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prev}
          className="rounded-full border border-border/50 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground"
        >
          ← Prev
        </button>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {(currentIdx % phrases.length) + 1} / {phrases.length}
        </span>
        <button
          onClick={next}
          className="rounded-full border border-border/50 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ── Vocab gloss tab ────────────────────────────────────────────────────────────

function VocabGlossTab() {
  const [openSet, setOpenSet] = useState<string | null>(FMG_CONTENT.vocabSets[0]?.category ?? null);

  return (
    <div className="space-y-3">
      {FMG_CONTENT.vocabSets.map((vs) => {
        const isOpen = openSet === vs.category;
        return (
          <div
            key={vs.category}
            className={
              "rounded-2xl border transition-all " +
              (isOpen ? "border-gold/40 bg-card/60" : "border-border/60 bg-card/30")
            }
          >
            <button
              onClick={() => setOpenSet(isOpen ? null : vs.category)}
              className="flex w-full items-center gap-3 px-5 py-3 text-left"
            >
              <span className="text-xl">{vs.emoji}</span>
              <span className="flex-1 font-display text-base font-semibold">{vs.category}</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {vs.words.length} terms
              </span>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {isOpen && (
              <div className="border-t border-border/40 px-5 pb-4 pt-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  {vs.words.map((w) => (
                    <div
                      key={w}
                      className="flex items-start gap-3 rounded-xl border border-border/40 bg-background/30 px-3 py-2.5"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">{w}</div>
                        {vs.nativeGloss[w] && (
                          <div className="mt-0.5 text-xs text-indigo-300/80">
                            {vs.nativeGloss[w]}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Plain language tab ────────────────────────────────────────────────────────

function PlainLanguageTab() {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  function toggle(i: number) {
    setFlipped((f) => ({ ...f, [i]: !f[i] }));
  }

  return (
    <div className="space-y-5">
      {/* Principle callout */}
      <div className="rounded-2xl border border-indigo-400/40 bg-indigo-400/8 px-5 py-4">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.22em] text-indigo-300">
          The rule
        </div>
        <p className="text-base font-semibold text-foreground">
          Great doctors leave the clinical vocabulary at the nurses station.
        </p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          When talking <em>to</em> patients and families, replace every medical term with the
          plainest possible English. Clarity builds trust. Jargon creates fear and misunderstanding
          — even from a doctor who means well.
        </p>
      </div>

      {/* Swap cards */}
      <div className="grid gap-2 sm:grid-cols-2">
        {PLAIN_LANGUAGE_SWAPS.map((swap, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            className={
              "flex flex-col items-start rounded-2xl border p-4 text-left transition-all " +
              (flipped[i]
                ? "border-emerald-400/40 bg-emerald-400/8"
                : "border-border/60 bg-card/40 hover:border-gold/30")
            }
          >
            <div className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
              {flipped[i] ? "Say this to patients ✓" : "Medical term (tap to flip)"}
            </div>
            {flipped[i] ? (
              <div className="text-base font-semibold text-emerald-300">{swap.plain}</div>
            ) : (
              <div className="text-base font-semibold text-foreground">{swap.medical}</div>
            )}
          </button>
        ))}
      </div>

      {/* Sample exchange */}
      <div className="rounded-2xl border border-border/60 bg-card/30 px-5 py-4">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Example rewrite
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border border-rose-400/30 bg-rose-400/5 px-4 py-3">
            <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.15em] text-rose-400/70">
              ❌ Too clinical for patients
            </div>
            <p className="text-sm text-foreground/80">
              "You have bilateral lower extremity edema secondary to acute decompensated heart
              failure. We will initiate IV diuresis with furosemide to address your fluid overload
              and dyspnea."
            </p>
          </div>
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 px-4 py-3">
            <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.15em] text-emerald-400/70">
              ✓ Plain English for patients
            </div>
            <p className="text-sm text-foreground/80">
              "Your heart is having trouble pumping, and that's causing fluid to build up in your
              legs and lungs — that's why they're swollen and why you're short of breath. We're
              going to give you a medication through your IV that will help your body get rid of
              that extra fluid."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
