import { useState } from "react";
import { Sparkle, ArrowRight, Check, BookOpen, Compass, MousePointer2 } from "lucide-react";
import { useApp, type Level } from "@/state/app-state";
import { cn } from "@/lib/utils";

const FIELD_PREP_IDS = new Set([
  "lds-missionary",
  "orthopedics",
  "nursing",
  "emergency-medicine",
  "family-medicine",
  "fmg",
  "ob-gyn",
  "cardiology",
  "general-surgery",
  "physical-therapy",
  "pain-management",
  "medical-receptionist",
  "or-evs",
  "construction-foreman",
  "plumber",
  "drywall",
  "electrician",
  "landscaper",
  "framer",
  "construction-safety",
  "soccer",
  "baseball",
  "hockey",
  "tennis",
]);

// Profession cards → module id + display label
const PROFESSIONS = [
  {
    id: "lds-missionary",
    emoji: "🕊️",
    label: "Missionary",
    sub: "Lessons, scriptures, teaching investigators",
  },
  {
    id: "nursing",
    emoji: "💉",
    label: "Nurse / PA / NP",
    sub: "Patient care, vitals, shift handoffs",
  },
  {
    id: "orthopedics",
    emoji: "🦴",
    label: "Doctor / Surgeon",
    sub: "Clinical terms, anatomy, patient consults",
  },
  {
    id: "construction-foreman",
    emoji: "🔨",
    label: "Construction / Trades",
    sub: "Site safety, crew commands, materials",
  },
  {
    id: "soccer",
    emoji: "⚽",
    label: "Coach / Athlete",
    sub: "Drills, positions, game-day vocabulary",
  },
  {
    id: "or-evs",
    emoji: "🚨",
    label: "OR / Hospital Staff",
    sub: "Sterile field, instruments, EVS",
  },
  {
    id: "restaurant-hospitality",
    emoji: "🍽️",
    label: "Restaurant / Service",
    sub: "Orders, hospitality, kitchen",
  },
  {
    id: "k12-teacher",
    emoji: "🏫",
    label: "Teacher / Educator",
    sub: "Classroom phrases, student interactions",
  },
  {
    id: "international-travel",
    emoji: "✈️",
    label: "Traveler",
    sub: "Directions, hotels, everyday phrases",
  },
  { id: null, emoji: "✦", label: "Just exploring", sub: "Core vocabulary, grammar, reading" },
] as const;

const LEVELS: { value: Level; label: string; sub: string }[] = [
  { value: "Beginner", label: "Starting fresh", sub: "I know a few words at most" },
  { value: "Beginner", label: "Some basics", sub: "I've had a class or used Duolingo" },
  { value: "Intermediate", label: "Conversational", sub: "I can get by but miss a lot" },
  { value: "Advanced", label: "Advanced", sub: "I speak well but want to refine" },
];

export function OnboardingWizard() {
  const { dispatch } = useApp();
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [level, setLevel] = useState<Level | null>(null);
  const [levelLabel, setLevelLabel] = useState<string>("");
  const [professionId, setProfessionId] = useState<string | null>(undefined as unknown as null);
  const [professionLabel, setProfessionLabel] = useState<string>("");

  function pickProfession(id: string | null, label: string) {
    setProfessionId(id);
    setProfessionLabel(label);
    setStep(2);
  }

  function pickLevel(l: Level, label: string) {
    setLevel(l);
    setLevelLabel(label);
    setStep(3);
  }

  function finish() {
    if (level) dispatch({ type: "SET_LEVEL", payload: level });
    if (professionId) {
      dispatch({ type: "PURCHASE_MODULE", payload: professionId });
      dispatch({ type: "SET_ACTIVE_MODULE", payload: professionId });
    }
    dispatch({ type: "COMPLETE_ONBOARDING" });
    // Missionary → open Discussion 1 directly (the structured lessons are there)
    if (professionId === "lds-missionary") {
      dispatch({ type: "SET_TAB", payload: "discussions" });
    } else if (professionId && FIELD_PREP_IDS.has(professionId)) {
      dispatch({ type: "SET_TAB", payload: "fieldPrep" });
    } else dispatch({ type: "SET_TAB", payload: "reader" });
  }

  function startReading() {
    dispatch({ type: "COMPLETE_ONBOARDING" });
    dispatch({ type: "SET_TAB", payload: "reader" });
  }

  function exploreTools() {
    dispatch({ type: "COMPLETE_ONBOARDING" });
    dispatch({ type: "SET_TAB", payload: "guide" });
  }

  return (
    <div className="entry-learning-shell fixed inset-0 z-[100] flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg">
        {step > 0 && (
          <button
            onClick={startReading}
            className="absolute -top-8 right-0 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip personalization →
          </button>
        )}

        {/* Progress bar */}
        {step > 0 && (
          <div className="mb-6 flex gap-1.5" aria-label={`Personalization step ${step} of 3`}>
            {([1, 2, 3] as const).map((n) => (
              <div
                key={n}
                className={cn(
                  "h-0.5 flex-1 rounded-full transition-all duration-500",
                  n <= step ? "bg-gold" : "bg-border/40",
                )}
              />
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-border/60 bg-card/90 p-6 shadow-2xl">
          {/* Logo */}
          <div className="mb-5 flex items-center gap-2">
            <Sparkle className="h-5 w-5 text-gold" strokeWidth={1.5} fill="currentColor" />
            <span className="font-display text-lg font-semibold tracking-tight">
              Language Threshold
            </span>
          </div>

          {/* Reader-first welcome — value is available before setup. */}
          {step === 0 && (
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-gold/40 bg-gradient-to-br from-amber-300/25 via-emerald-300/10 to-sky-300/20 shadow-gold">
                <BookOpen className="h-7 w-7 text-gold" strokeWidth={1.7} />
              </div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-gold">
                Understand it in context
              </p>
              <h1 className="text-3xl font-semibold leading-tight">
                Reading another language should lead somewhere.
              </h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                Open a real passage, tap any word, and get an explanation for that exact sentence.
                Ask Tutor, save the word, then practice it.
              </p>

              <div className="mt-6 grid grid-cols-3 gap-2 text-left">
                {[
                  ["1", "Tap a word"],
                  ["2", "Ask in context"],
                  ["3", "Save & practice"],
                ].map(([n, label]) => (
                  <div key={n} className="rounded-xl border border-border/50 bg-background/60 p-3">
                    <span className="font-mono text-[10px] text-gold">{n}</span>
                    <p className="mt-1 text-xs font-medium leading-snug">{label}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={startReading}
                className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-midnight shadow-gold transition-all hover:-translate-y-0.5 hover:bg-gold/90"
              >
                Start Reading <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </button>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex min-h-11 items-center gap-2 text-xs font-medium text-foreground/80 hover:text-gold"
                >
                  <MousePointer2 className="h-3.5 w-3.5" /> Personalize my path
                </button>
                <button
                  onClick={exploreTools}
                  className="inline-flex min-h-11 items-center gap-2 text-xs font-medium text-foreground/80 hover:text-gold"
                >
                  <Compass className="h-3.5 w-3.5" /> Explore all tools
                </button>
              </div>
              <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                No account or upload required
              </p>
            </div>
          )}

          {/* Step 1 — optional profession personalization */}
          {step === 1 && (
            <>
              <h2 className="text-xl font-semibold mb-1">What brings you here?</h2>
              <p className="text-sm text-muted-foreground mb-4">
                We'll activate a vocabulary module built for your field.
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                {PROFESSIONS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => pickProfession(p.id, p.label)}
                    className="flex flex-col items-start gap-1 rounded-xl border border-border/50 bg-background/60 px-3 py-3 text-left transition-all hover:border-gold/60 hover:bg-card/80"
                  >
                    <span className="text-xl">{p.emoji}</span>
                    <p className="text-sm font-medium leading-snug">{p.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-snug">{p.sub}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 2 — Level */}
          {step === 2 && (
            <>
              <button
                onClick={() => setStep(1)}
                className="mb-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>
              <h2 className="text-xl font-semibold mb-1">What's your current level?</h2>
              <p className="text-sm text-muted-foreground mb-5">
                We'll tailor your daily content and exercises accordingly.
              </p>
              <div className="grid gap-2">
                {LEVELS.map((l) => (
                  <button
                    key={l.label}
                    onClick={() => pickLevel(l.value, l.label)}
                    className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 px-4 py-3 text-left transition-all hover:border-gold/60 hover:bg-card/80 group"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/60 group-hover:border-gold/60 transition-colors">
                      <span className="h-2 w-2 rounded-full bg-transparent group-hover:bg-gold transition-colors" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{l.label}</p>
                      <p className="text-xs text-muted-foreground">{l.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 3 — Summary */}
          {step === 3 && (
            <>
              <button
                onClick={() => setStep(2)}
                className="mb-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>
              <h2 className="text-xl font-semibold mb-1">You're all set ✦</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Here's what we've configured for you.
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/50 px-4 py-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/20">
                    <Check className="h-3.5 w-3.5 text-gold" strokeWidth={2.5} />
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground">Field</p>
                    <p className="text-sm font-medium">{professionLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/50 px-4 py-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/20">
                    <Check className="h-3.5 w-3.5 text-gold" strokeWidth={2.5} />
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground">Level</p>
                    <p className="text-sm font-medium">{levelLabel}</p>
                  </div>
                </div>
                {professionId === "lds-missionary" && (
                  <div className="flex items-center gap-3 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3">
                    <span className="text-lg">📋</span>
                    <p className="text-xs text-muted-foreground leading-snug">
                      <span className="text-foreground font-medium">Discussion 1</span> opens next —
                      La Restauración. Teach it word for word in your target language.
                    </p>
                  </div>
                )}
                {professionId &&
                  professionId !== "lds-missionary" &&
                  FIELD_PREP_IDS.has(professionId) && (
                    <div className="flex items-center gap-3 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3">
                      <span className="text-lg">🎙️</span>
                      <p className="text-xs text-muted-foreground leading-snug">
                        <span className="text-foreground font-medium">Field Prep</span> opens next —
                        start a real conversation with an AI partner in your specialty.
                      </p>
                    </div>
                  )}
                {(!professionId ||
                  (professionId !== "lds-missionary" && !FIELD_PREP_IDS.has(professionId))) && (
                  <div className="flex items-center gap-3 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3">
                    <span className="text-lg">📖</span>
                    <p className="text-xs text-muted-foreground leading-snug">
                      <span className="text-foreground font-medium">Reader</span> opens next with a
                      sample passage. Tap any word to understand it in context.
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={finish}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-midnight transition-all hover:bg-gold/90"
              >
                Start Learning <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
