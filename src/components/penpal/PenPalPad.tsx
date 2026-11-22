import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Mail,
  ChevronRight,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trophy,
  PenLine,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/state/app-state";
import { getUltraPatterns } from "@/data/grammar-patterns";
import { checkPenPalWriting } from "@/fns/penpal-check.functions";
import { PENPAL_CURRICULA, type PenPalTopic } from "./penpal-curriculum";
import { PenPalCanvas } from "./PenPalCanvas";
import { VocabBuilder } from "./VocabBuilder";

type Step = "vocab" | "copyWord" | "copySentence" | "circle" | "write" | "done";

function VocabCard({
  text,
  translation,
  pronunciation,
}: {
  text: string;
  translation: string;
  pronunciation?: string;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/50 px-4 py-3 text-left">
      <p className="font-display text-lg leading-none mb-1">{text}</p>
      {pronunciation && <p className="font-mono text-[10px] text-gold mb-1">{pronunciation}</p>}
      <p className="text-xs text-muted-foreground">{translation}</p>
    </div>
  );
}

function CircleQuiz({
  question,
  choices,
  correct,
  onResult,
}: {
  question: string;
  choices: string[];
  correct: number;
  onResult: (wasCorrect: boolean) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  const pick = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    setTimeout(() => onResult(i === correct), 600);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-semibold">{question}</p>
      <div className="grid grid-cols-2 gap-2">
        {choices.map((c, i) => {
          const isSelected = selected === i;
          const isCorrect = i === correct;
          let style = "border-border/60 bg-card/40 text-foreground";
          if (isSelected && isCorrect) style = "border-green-500 bg-green-500/10 text-green-400";
          if (isSelected && !isCorrect) style = "border-red-400 bg-red-400/10 text-red-400";
          if (selected !== null && !isSelected && isCorrect)
            style = "border-green-500/40 bg-green-500/5 text-green-400/60";
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              className={`relative rounded-2xl border px-4 py-3 text-sm font-medium text-left transition-all ${style}`}
            >
              {/* Circle indicator */}
              <span
                className={`absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 text-[9px] transition-all ${
                  isSelected
                    ? isCorrect
                      ? "border-green-500 bg-green-500 text-white scale-110"
                      : "border-red-400 bg-red-400 text-white scale-110"
                    : "border-border/40 bg-background"
                }`}
              >
                {isSelected ? (isCorrect ? "✓" : "✗") : String.fromCharCode(65 + i)}
              </span>
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CheckResult({
  correct,
  recognized,
  feedback,
  onNext,
}: {
  correct: boolean;
  recognized: string;
  feedback: string;
  onNext: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${correct ? "border-green-500/30 bg-green-500/5" : "border-amber-500/30 bg-amber-500/5"}`}
    >
      <div className="flex items-center gap-2 mb-2">
        {correct ? (
          <CheckCircle2 className="h-5 w-5 text-green-400" />
        ) : (
          <XCircle className="h-5 w-5 text-amber-400" />
        )}
        <span className="font-semibold text-sm">{correct ? "Correct!" : "Keep practicing"}</span>
      </div>
      {recognized && (
        <p className="text-xs text-muted-foreground mb-1">
          AI read: <em>"{recognized}"</em>
        </p>
      )}
      <p className="text-sm text-foreground">{feedback}</p>
      <button
        onClick={onNext}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2 text-sm font-semibold text-black hover:opacity-90 transition-opacity"
      >
        Next <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function PenPalPad() {
  const { state, dispatch } = useApp();
  const checkWriting = useServerFn(checkPenPalWriting);

  const curriculum = PENPAL_CURRICULA[state.selectedLanguage];
  const [screen, setScreen] = useState<"topics" | "vocab-builder">("topics");
  const [topicIndex, setTopicIndex] = useState<number | null>(null);
  const [step, setStep] = useState<Step>("vocab");
  const [checkResult, setCheckResult] = useState<{
    correct: boolean;
    recognized: string;
    feedback: string;
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [completedTopics, setCompletedTopics] = useState<Set<string>>(new Set());
  const [circleCorrect, setCircleCorrect] = useState<boolean | null>(null);

  const topic: PenPalTopic | null =
    topicIndex !== null && curriculum ? curriculum.topics[topicIndex] : null;

  const allDone = curriculum ? completedTopics.size >= curriculum.topics.length : false;

  const handleCheck = async (
    imageBase64: string,
    targetText: string,
    mode: "word" | "sentence" | "free",
  ) => {
    setChecking(true);
    try {
      const res = await checkWriting({
        data: { imageBase64, targetText, language: state.selectedLanguage, mode },
      });
      if (res.error) {
        toast.error(res.error);
      } else if (res.result) {
        setCheckResult(res.result);
        if (res.result.xp) dispatch({ type: "ADD_XP", payload: res.result.xp });
      }
    } catch {
      toast.error("Could not check your writing");
    } finally {
      setChecking(false);
    }
  };

  const advance = () => {
    setCheckResult(null);
    setCircleCorrect(null);
    if (step === "vocab") setStep("copyWord");
    else if (step === "copyWord") setStep("copySentence");
    else if (step === "copySentence") setStep("circle");
    else if (step === "circle") setStep("write");
    else if (step === "write") {
      // First Sentence Moment: learner used a vocab word + wrote a full sentence
      if (
        checkResult?.recognized &&
        state.userVocab.length > 0 &&
        state.vocabLang === state.selectedLanguage
      ) {
        const recognized = checkResult.recognized.toLowerCase();
        const usedVocabWord = state.userVocab.some((v) =>
          recognized.includes(v.word.toLowerCase()),
        );
        const looksLikeSentence = checkResult.recognized.trim().split(/\s+/).length >= 4;
        if (usedVocabWord && looksLikeSentence) {
          dispatch({ type: "FIRST_SENTENCE_MOMENT" });
        }
      }
      // topic complete
      if (topic) {
        setCompletedTopics((prev) => new Set([...prev, topic.id]));
        dispatch({ type: "ADD_XP", payload: 20 });
        dispatch({ type: "INC_COUNTER", payload: "lessonsCompleted" });
      }
      setStep("done");
    }
  };

  const startTopic = (i: number) => {
    setTopicIndex(i);
    setStep("vocab");
    setCheckResult(null);
    setCircleCorrect(null);
  };

  const backToTopics = () => {
    setTopicIndex(null);
    setStep("vocab");
    setCheckResult(null);
  };

  // ── Vocab builder screen ─────────────────────────────────────────
  if (screen === "vocab-builder") {
    return (
      <div className="fade-in mx-auto max-w-2xl py-4">
        <VocabBuilder onBack={() => setScreen("topics")} />
      </div>
    );
  }

  // ── No curriculum ────────────────────────────────────────────────
  if (!curriculum) {
    return (
      <div className="fade-in mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 py-24 text-center">
        <PenLine className="h-10 w-10 text-gold/40" strokeWidth={1.2} />
        <h2 className="font-display text-2xl font-semibold">Pen Pal Practice</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Pen Pal Practice is not yet available for <strong>{state.selectedLanguage}</strong>. Switch to
          Spanish, French, Japanese, Korean, German, Portuguese, or Italian to get started.
        </p>
      </div>
    );
  }

  // ── All topics complete ──────────────────────────────────────────
  if (allDone) {
    return (
      <div className="fade-in mx-auto flex max-w-2xl flex-col items-center justify-center gap-6 py-20 text-center">
        <div className="text-6xl">✉️</div>
        <div>
          <h2 className="font-display text-3xl font-semibold mb-2">Letter Complete!</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            You've written a full self-introduction letter to {curriculum.penpalName} in{" "}
            {curriculum.penpalCity}. Your brain just fired a lot of neurons it won't forget.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-gold/30 bg-gold/[0.05] px-6 py-4">
          <Trophy className="h-5 w-5 text-gold" />
          <span className="text-sm font-semibold text-gold">+50 XP · Letter written!</span>
        </div>
        <button
          onClick={() => {
            setCompletedTopics(new Set());
            setTopicIndex(null);
            dispatch({ type: "ADD_XP", payload: 30 });
          }}
          className="rounded-full border border-border/60 px-6 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Start a new letter
        </button>
      </div>
    );
  }

  // ── Topic list ───────────────────────────────────────────────────
  if (topicIndex === null) {
    return (
      <div className="fade-in mx-auto max-w-2xl space-y-6 py-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Pen Pal Practice</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Write a letter to {curriculum.penpalName} in {curriculum.penpalCity}. One topic at a
              time.
            </p>
          </div>
          <Mail className="mt-1 h-6 w-6 text-gold" strokeWidth={1.4} />
        </div>

        <div className="rounded-2xl border border-gold/20 bg-gold/[0.03] px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold mb-2">
            Your letter starts with
          </p>
          <p className="font-display text-lg text-foreground">
            {curriculum.greeting} <span className="text-muted-foreground">___…</span>
          </p>
        </div>

        {/* My Vocab entry point */}
        <button
          onClick={() => setScreen("vocab-builder")}
          className="flex w-full items-center gap-4 rounded-2xl border border-border/40 bg-card/20 px-5 py-4 text-left transition-all hover:border-gold/40 hover:bg-gold/[0.03]"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/10 shrink-0">
            {state.userVocab.length > 0 && state.vocabLang === state.selectedLanguage ? (
              <BookOpen className="h-4 w-4 text-gold" strokeWidth={1.6} />
            ) : (
              <Sparkles className="h-4 w-4 text-gold/70" strokeWidth={1.6} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">
              {state.userVocab.length > 0 && state.vocabLang === state.selectedLanguage
                ? `My Vocab — ${state.userVocab.length} words`
                : "Build My Personal Vocab"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {state.userVocab.length > 0 && state.vocabLang === state.selectedLanguage
                ? "Your words are active in all games · tap to review or rebuild"
                : "Answer 5 questions — get words that match your life, used in all games"}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
        </button>

        {([1, 2] as const).map((phase) => {
          const phaseTopics = curriculum.topics
            .map((t, i) => ({ t, i }))
            .filter(({ t }) => t.phase === phase);
          if (phaseTopics.length === 0) return null;
          const phaseLabel = phase === 1 ? "Phase 1 — Your Story" : "Phase 2 — Your World";
          const phaseDesc =
            phase === 1
              ? "Introduce yourself: name, origin, age, job, family, hobbies."
              : "Go deeper: your workday, procedures, experiences, recommendations.";
          const phaseCompleted = phaseTopics.filter(({ t }) => completedTopics.has(t.id)).length;
          return (
            <div key={phase} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                    {phaseLabel}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">{phaseDesc}</p>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground/50">
                  {phaseCompleted}/{phaseTopics.length}
                </span>
              </div>
              <div className="grid gap-2">
                {phaseTopics.map(({ t, i }) => {
                  const done = completedTopics.has(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => startTopic(i)}
                      className="flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all hover:border-gold/50 hover:bg-gold/[0.03]"
                      style={{
                        borderColor: done ? "rgba(74,222,128,0.3)" : undefined,
                        backgroundColor: done ? "rgba(74,222,128,0.04)" : undefined,
                      }}
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shrink-0 ${done ? "bg-green-500/20 text-green-400" : "bg-border/30 text-muted-foreground"}`}
                      >
                        {done ? "✓" : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{t.topic}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {t.question} — {t.questionEnglish}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <p className="text-xs text-center text-muted-foreground/50">
          {completedTopics.size} of {curriculum.topics.length} topics completed
        </p>
      </div>
    );
  }

  // ── Practice flow ────────────────────────────────────────────────
  if (!topic) return null;

  const stepLabels: Record<Step, string> = {
    vocab: "Learn the words",
    copyWord: "Copy this word",
    copySentence: "Copy this sentence",
    circle: "Circle the answer",
    write: "Write your answer",
    done: "Complete",
  };

  const steps: Step[] = ["vocab", "copyWord", "copySentence", "circle", "write"];
  const stepIndex = steps.indexOf(step);

  return (
    <div className="fade-in mx-auto max-w-2xl space-y-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={backToTopics}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            ← Back to topics
          </button>
          <h2 className="font-display text-xl font-semibold">{topic.topic}</h2>
          <p className="text-sm text-muted-foreground">
            {topic.question} — <em>{topic.questionEnglish}</em>
          </p>
        </div>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-1.5">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-all ${
              i < stepIndex ? "bg-green-500/60" : i === stepIndex ? "bg-gold" : "bg-border/40"
            }`}
          />
        ))}
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
        {stepLabels[step]}
      </p>

      {/* ── Step: Vocab ── */}
      {step === "vocab" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Learn these words. You'll write them next.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topic.vocab.map((v, i) => (
              <VocabCard key={i} {...v} />
            ))}
          </div>
          <button
            onClick={advance}
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-black hover:opacity-90 transition-opacity"
          >
            I'm ready to write <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Step: Copy Word ── */}
      {step === "copyWord" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gold/20 bg-gold/[0.03] px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold mb-1">
              Copy this word or phrase
            </p>
            <p className="text-2xl font-display font-semibold">{topic.copyWord}</p>
          </div>
          <p className="text-sm text-muted-foreground">Write it out below.</p>
          {checking ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <RefreshCw className="h-4 w-4 animate-spin" /> Checking your writing…
            </div>
          ) : checkResult ? (
            <CheckResult {...checkResult} onNext={advance} />
          ) : (
            <PenPalCanvas
              mode="word"
              guideText={topic.copyWord}
              onReady={(img) => handleCheck(img, topic.copyWord, "word")}
            />
          )}
        </div>
      )}

      {/* ── Step: Copy Sentence ── */}
      {step === "copySentence" && (
        <div className="space-y-4">
          {/* Show the sentence prominently so it's obvious what to copy */}
          <div className="rounded-xl border border-gold/20 bg-gold/[0.03] px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold mb-1">
              Copy this sentence
            </p>
            <p className="text-base font-semibold">{topic.copySentence}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Write it out below. Handwriting cements memory.
          </p>
          {checking ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <RefreshCw className="h-4 w-4 animate-spin" /> Checking your writing…
            </div>
          ) : checkResult ? (
            <CheckResult {...checkResult} onNext={advance} />
          ) : (
            <PenPalCanvas
              mode="sentence"
              guideText={topic.copySentence}
              onReady={(img) => handleCheck(img, topic.copySentence, "sentence")}
            />
          )}
        </div>
      )}

      {/* ── Step: Circle ── */}
      {step === "circle" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Circle (tap) the correct answer.</p>
          <CircleQuiz
            {...topic.circleQuestion}
            onResult={(correct) => {
              setCircleCorrect(correct);
              if (correct) dispatch({ type: "ADD_XP", payload: 5 });
            }}
          />
          {circleCorrect !== null && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${circleCorrect ? "border-green-500/30 bg-green-500/5 text-green-400" : "border-amber-500/30 bg-amber-500/5 text-amber-400"}`}
            >
              {circleCorrect
                ? "✓ Correct! Your brain just made a connection."
                : "Not quite — but you've seen it now. You won't forget it."}
              <button
                onClick={advance}
                className="ml-3 underline underline-offset-2 opacity-70 hover:opacity-100"
              >
                Continue →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Step: Write Answer ── */}
      {step === "write" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gold/20 bg-gold/[0.03] px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold mb-1">
              Write your answer
            </p>
            <p className="text-base font-semibold">{topic.writePrompt}</p>
            <p className="text-xs text-muted-foreground mt-1">{topic.questionEnglish}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Hint: <em>{topic.exampleAnswer}</em>
            </p>
          </div>
          {(() => {
            const ultraPatterns = getUltraPatterns(state.selectedLanguage).slice(0, 3);
            if (!ultraPatterns.length) return null;
            return (
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.04] px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet-400 mb-2">
                  Pattern hints
                </p>
                <div className="flex flex-col gap-1.5">
                  {ultraPatterns.map((p) => (
                    <div key={p.id} className="flex items-baseline gap-2">
                      <span className="font-mono text-[10px] text-violet-300/70 w-24 shrink-0">
                        {p.name}
                      </span>
                      <span className="text-xs text-muted-foreground">{p.pattern}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          {checking ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <RefreshCw className="h-4 w-4 animate-spin" /> Reading your answer…
            </div>
          ) : checkResult ? (
            <CheckResult {...checkResult} onNext={advance} />
          ) : (
            <PenPalCanvas
              mode="free"
              guideText={undefined}
              onReady={(img) => handleCheck(img, topic.writePrompt, "free")}
            />
          )}
        </div>
      )}

      {/* ── Step: Done ── */}
      {step === "done" && (
        <div className="flex flex-col items-center gap-5 py-8 text-center">
          <div className="text-5xl">✉️</div>
          <div>
            <h3 className="font-display text-2xl font-semibold mb-1">Topic complete!</h3>
            <p className="text-sm text-muted-foreground">
              +20 XP — "{topic.topic}" added to your letter.
            </p>
          </div>
          <button
            onClick={backToTopics}
            className="rounded-full bg-gold px-8 py-2.5 text-sm font-semibold text-black hover:opacity-90 transition-opacity"
          >
            Next topic →
          </button>
        </div>
      )}
    </div>
  );
}
