import { useState, useCallback, useMemo } from "react";
import { Dna, RotateCcw, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { useApp } from "@/state/app-state";
import { packFor } from "@/data/language-packs/registry";
import { followsPackRules } from "@/data/language-packs/pack-rules";
import {
  BODY_REGIONS,
  FACE_REGIONS,
  MUSCLE_REGIONS,
  ORGAN_REGIONS,
  SPORT_MUSCLE_FOCUS,
  type AnatomyRegion,
  type AnatomyCategory,
} from "@/data/anatomy-labels";
import { BodyDiagram, FaceDiagram, MuscleDiagram, OrganDiagram } from "./diagrams";

type QuizMode = "choose" | "type";
type AnswerState = "idle" | "correct" | "wrong";

interface QuizState {
  region: AnatomyRegion;
  choices: string[]; // label strings in target language
  correctLabel: string;
}

const CATEGORIES: { key: AnatomyCategory; label: string; emoji: string }[] = [
  { key: "body", label: "Body Parts", emoji: "🧍" },
  { key: "face", label: "Face", emoji: "😶" },
  { key: "muscle", label: "Muscles", emoji: "💪" },
  { key: "organ", label: "Internal Organs", emoji: "❤️" },
];

const REGIONS_BY_CAT: Record<AnatomyCategory, AnatomyRegion[]> = {
  body: BODY_REGIONS,
  face: FACE_REGIONS,
  muscle: MUSCLE_REGIONS,
  organ: ORGAN_REGIONS,
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuiz(
  allRegions: AnatomyRegion[],
  exclude: string | null,
  language: string,
): QuizState {
  // French and Italian are asked only regions labelled in their language (the English name is
  // never their answer). Every other learner keeps the base quiz, which falls back to English.
  if (!followsPackRules(packFor(language))) {
    const regions = allRegions;
    const pool = regions.length > 1 ? regions.filter((r) => r.id !== exclude) : regions;
    const region = pool[Math.floor(Math.random() * pool.length)];
    const correctLabel = region.labels[language] ?? region.en;
    const wrong = shuffle(
      regions.filter((r) => r.id !== region.id).map((r) => r.labels[language] ?? r.en),
    ).slice(0, 2);
    const choices = shuffle([correctLabel, ...wrong]);
    return { region, choices, correctLabel };
  }
  const labelled = allRegions.filter((r) => r.labels[language]);
  const regions = labelled.length > 0 ? labelled : allRegions;
  const pool = regions.length > 1 ? regions.filter((r) => r.id !== exclude) : regions;
  const region = pool[Math.floor(Math.random() * pool.length)];
  const correctLabel = region.labels[language] ?? "";

  // Pick 2 wrong choices from same category
  const wrong = shuffle(
    regions.filter((r) => r.id !== region.id && r.labels[language]).map((r) => r.labels[language]!),
  ).slice(0, 2);

  const choices = shuffle([correctLabel, ...wrong]);
  return { region, choices, correctLabel };
}

export function AnatomyQuizPanel() {
  const { state: appState, dispatch } = useApp();
  const language = appState.selectedLanguage;
  const activeModuleId = appState.activeModuleId ?? "";

  // Sport-specific muscle focus
  const sportFocusIds = SPORT_MUSCLE_FOCUS[activeModuleId] ?? null;

  const [category, setCategory] = useState<AnatomyCategory>("body");
  const [mode, setMode] = useState<QuizMode>("choose");
  const [typeInput, setTypeInput] = useState("");
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [streak, setStreak] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [lastId, setLastId] = useState<string | null>(null);

  // Filtered regions for current category (with sport focus filter for muscles)
  const activeRegions = useMemo(() => {
    const base = REGIONS_BY_CAT[category];
    if (category === "muscle" && sportFocusIds) {
      const focused = base.filter((r) => sportFocusIds.includes(r.id));
      return focused.length >= 3 ? focused : base;
    }
    return base;
  }, [category, sportFocusIds]);

  const [quiz, setQuiz] = useState<QuizState>(() => buildQuiz(activeRegions, null, language));

  const nextQuiz = useCallback(
    (excludeId?: string) => {
      setAnswerState("idle");
      setTypeInput("");
      setQuiz(buildQuiz(activeRegions, excludeId ?? null, language));
    },
    [activeRegions, language],
  );

  const handleCategoryChange = (cat: AnatomyCategory) => {
    setCategory(cat);
    setAnswerState("idle");
    setTypeInput("");
    const regions = REGIONS_BY_CAT[cat];
    setQuiz(buildQuiz(regions, null, language));
    setLastId(null);
  };

  const handleAnswer = (answer: string) => {
    if (answerState !== "idle") return;
    const correct = answer.trim().toLowerCase() === quiz.correctLabel.toLowerCase();
    if (correct) {
      setAnswerState("correct");
      setStreak((s) => s + 1);
      setTotalCorrect((t) => t + 1);
      dispatch({ type: "ADD_XP", payload: 15 });
      setLastId(quiz.region.id);
      setTimeout(() => nextQuiz(quiz.region.id), 900);
    } else {
      setAnswerState("wrong");
      setStreak(0);
    }
  };

  if (!quiz.correctLabel)
    return (
      <p className="rounded-2xl border border-border/60 bg-card/40 p-6 text-sm text-muted-foreground">
        Anatomy labels are not available in {language} yet.
      </p>
    );

  const Diagram =
    category === "body"
      ? BodyDiagram
      : category === "face"
        ? FaceDiagram
        : category === "muscle"
          ? MuscleDiagram
          : OrganDiagram;

  const isSportMuscleMode = category === "muscle" && !!sportFocusIds;

  return (
    <div className="flex h-full flex-col overflow-auto">
      {/* Header */}
      <div className="border-b border-border/60 px-5 py-4">
        <div className="flex items-center gap-2">
          <Dna className="h-4 w-4 text-gold" />
          <span className="font-display text-sm italic">
            <span className="text-gold">✦</span> Anatomy Quiz
          </span>
          {isSportMuscleMode && (
            <span className="ml-2 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-gold">
              Sport focus
            </span>
          )}
          {streak >= 3 && (
            <span className="ml-auto font-mono text-[11px] text-gold">🔥 {streak} streak</span>
          )}
        </div>

        {/* Category tabs */}
        <div className="mt-3 flex gap-1.5 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => handleCategoryChange(c.key)}
              className={
                "rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors " +
                (category === c.key
                  ? "border-gold/60 bg-gold/15 text-gold"
                  : "border-border/60 bg-background/30 text-muted-foreground hover:text-foreground")
              }
            >
              {c.emoji} {c.label}
            </button>
          ))}
          <button
            onClick={() => setMode((m) => (m === "choose" ? "type" : "choose"))}
            className="ml-auto rounded-full border border-border/60 bg-background/30 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground"
          >
            {mode === "choose" ? "✏ Type mode" : "☰ Choose mode"}
          </button>
        </div>
      </div>

      {/* Main quiz area */}
      <div className="flex flex-1 flex-col gap-4 overflow-auto p-4 md:flex-row">
        {/* Diagram */}
        <div className="flex shrink-0 items-center justify-center rounded-2xl border border-gold/20 bg-card/40 p-3 md:w-52">
          <Diagram highlighted={quiz.region.id} className="h-auto max-h-[320px] w-full" />
        </div>

        {/* Quiz prompt + choices */}
        <div className="flex flex-1 flex-col gap-4">
          {/* Prompt */}
          <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Name the highlighted region in
            </p>
            <p className="mt-1 font-display text-lg text-gold">{language}</p>
            <p className="mt-2 text-sm text-foreground/70">
              English: <span className="font-medium text-foreground">{quiz.region.en}</span>
            </p>
          </div>

          {/* Feedback */}
          {answerState === "correct" && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Correct! +15 XP
            </div>
          )}
          {answerState === "wrong" && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
              <XCircle className="h-4 w-4 shrink-0" />
              Not quite — the answer is: <span className="font-semibold">{quiz.correctLabel}</span>
            </div>
          )}

          {mode === "choose" ? (
            <div className="grid gap-2">
              {quiz.choices.map((choice) => {
                let variant =
                  "border-border/60 bg-background/40 hover:border-gold/40 hover:bg-gold/5";
                if (answerState !== "idle") {
                  if (choice === quiz.correctLabel) {
                    variant = "border-emerald-500/60 bg-emerald-500/10 text-emerald-400";
                  } else if (answerState === "wrong") {
                    variant = "border-border/40 bg-background/20 opacity-50";
                  }
                }
                return (
                  <button
                    key={choice}
                    onClick={() => handleAnswer(choice)}
                    disabled={answerState !== "idle"}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors disabled:cursor-default ${variant}`}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAnswer(typeInput);
              }}
              className="flex gap-2"
            >
              <input
                value={typeInput}
                onChange={(e) => setTypeInput(e.target.value)}
                placeholder={`Type in ${language}…`}
                disabled={answerState === "correct"}
                className="flex-1 rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold/60 focus:outline-none disabled:opacity-50"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                type="submit"
                disabled={!typeInput.trim() || answerState === "correct"}
                className="rounded-lg bg-gold px-4 py-2 text-xs font-bold uppercase tracking-widest text-midnight disabled:cursor-not-allowed disabled:opacity-40"
              >
                Check
              </button>
            </form>
          )}

          {/* Next button when wrong */}
          {answerState === "wrong" && (
            <button
              onClick={() => nextQuiz(undefined)}
              className="flex items-center gap-1.5 self-end rounded-full border border-border/60 px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:border-gold/40 hover:text-gold"
            >
              Next <ChevronRight className="h-3 w-3" />
            </button>
          )}

          {/* Progress */}
          <div className="mt-auto flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            <span>{totalCorrect} correct this session</span>
            <button
              onClick={() => {
                setStreak(0);
                setTotalCorrect(0);
                nextQuiz(undefined);
              }}
              className="flex items-center gap-1 hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
