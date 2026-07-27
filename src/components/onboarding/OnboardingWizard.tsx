import { useState } from "react";
import { Sparkle, ArrowRight, Check } from "lucide-react";
import { useApp, type Level } from "@/state/app-state";
import { cn } from "@/lib/utils";

const FIELD_PREP_IDS = new Set([
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

export function OnboardingWizard({ onClose }: { onClose?: () => void }) {
  const { dispatch } = useApp();
  const [step, setStep] = useState<1 | 2 | 3>(1);
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
    if (professionId === "lds-missionary") {
      dispatch({ type: "SET_TAB", payload: "discussions" });
    } else if (professionId && FIELD_PREP_IDS.has(professionId)) {
      dispatch({ type: "SET_TAB", payload: "fieldPrep" });
    } else {
      dispatch({ type: "SET_TAB", payload: "reader" });
    }
    onClose?.();
  }

  function skip() {
    dispatch({ type: "COMPLETE_ONBOARDING" });
    dispatch({ type: "SET_TAB", payload: "reader" });
    onClose?.();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg">
        {/* Skip */}
        <button
          onClick={skip}
          className="absolute -top-8 right-0 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          Skip setup →
        </button>

        {/* Progress bar */}
        <div className="mb-6 flex gap-1.5">
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

        <div className="rounded-2xl border border-border/60 bg-card/90 p-6 shadow-2xl">
          {/* Logo */}
          <div className="mb-5 flex items-center gap-2">
            <Sparkle className="h-5 w-5 text-gold" strokeWidth={1.5} fill="currentColor" />
            <span className="font-display text-lg font-semibold tracking-tight">
              Language Threshold
            </span>
          </div>

          {/* Step 1 — Profession (most important for routing) */}
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
                    <p className="text-xs leading-snug text-muted-foreground">
                      <span className="font-medium text-foreground">Discussion 1</span> opens next.
                      Your selection also tailors Tutor and relevant practice.
                    </p>
                  </div>
                )}
                {professionId && FIELD_PREP_IDS.has(professionId) && (
                  <div className="flex items-center gap-3 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3">
                    <span className="text-lg">🎙️</span>
                    <p className="text-xs leading-snug text-muted-foreground">
                      <span className="font-medium text-foreground">Field Prep</span> opens next
                      with specialty practice tailored to your selection.
                    </p>
                  </div>
                )}
                {professionId !== "lds-missionary" &&
                  (!professionId || !FIELD_PREP_IDS.has(professionId)) && (
                    <div className="flex items-center gap-3 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3">
                      <span className="text-lg">📖</span>
                      <p className="text-xs leading-snug text-muted-foreground">
                        Reader opens next with a ready passage. Your selection also tailors Tutor
                        and relevant practice.
                      </p>
                    </div>
                  )}
              </div>

              <button
                onClick={finish}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-background transition-all hover:bg-gold/90"
              >
                Continue <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
