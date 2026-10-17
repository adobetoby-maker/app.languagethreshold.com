import { useState } from "react";
import { BookOpen, CheckCircle2, Lightbulb, Sparkles, Volume2, XCircle } from "lucide-react";
import { useApp, type Language } from "@/state/app-state";
import { ClickableText } from "@/components/reader/ClickableText";
import { WordCard, type WordCardRequest } from "@/components/reader/WordCard";
import { useMissionarySpeech } from "@/components/missionary/useMissionarySpeech";
import { SpeedButton } from "@/components/missionary/SpeedButton";
import {
  PMG_LESSONS,
  paragraphTarget,
  type PmgLesson,
  type LessonSection,
  type QuizQuestion,
} from "@/data/missionary-lessons";

type SpeakFn = (id: string, text: string, lang: Language) => void;
type Speaking = { id: string; index: number; fading: boolean } | null;

/**
 * Deep, clickable lesson reader for the LDS Missionary tab. Mirrors the
 * Reader's parallel-text + WordCard flow: every English and target-language
 * word is clickable and opens the AI-powered word card with translation,
 * conjugation breakdown, pronunciation, and "ask tutor" hand-off.
 *
 * Each lesson contains multiple sections; each section contains paragraphs
 * with optional inline reflection prompts and an end-of-section quiz.
 */
export function MissionaryLessonReader() {
  const { state, dispatch } = useApp();
  const [activeLessonId, setActiveLessonId] = useState<string>(PMG_LESSONS[0].id);
  const [wordReq, setWordReq] = useState<WordCardRequest | null>(null);
  const { rate, cycleRate, speak, speaking } = useMissionarySpeech(
    JSON.stringify([activeLessonId, state.selectedLanguage]),
  );

  const lesson: PmgLesson = PMG_LESSONS.find((l) => l.id === activeLessonId) ?? PMG_LESSONS[0];

  const handleWord = (word: string, sentence: string, x: number, y: number) => {
    setWordReq({ word, sentence, language: state.selectedLanguage, x, y });
  };

  const onXp = (n: number) => dispatch({ type: "ADD_XP", payload: n });

  return (
    <section className="mb-8 overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-gold/8 via-card/60 to-card/40">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gold/20 px-5 py-4">
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
            <BookOpen className="h-3.5 w-3.5" />
            Lesson Manual · Preach My Gospel
          </div>
          <h2 className="mt-1 font-display text-2xl text-foreground">
            The five missionary lessons — clickable in {state.selectedLanguage}
          </h2>
          <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
            Tap any word in either column to see its translation, part of speech, and conjugation in
            context. Reflect on the inline prompts and finish each section with a short
            comprehension check.
          </p>
        </div>
        <SpeedButton rate={rate} onCycle={cycleRate} size="md" />
      </header>

      {/* Lesson tab bar */}
      <div className="flex gap-2 overflow-x-auto border-b border-gold/15 px-5 py-3 [&::-webkit-scrollbar]:hidden">
        {PMG_LESSONS.map((l) => {
          const active = l.id === activeLessonId;
          return (
            <button
              key={l.id}
              onClick={() => setActiveLessonId(l.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                active
                  ? "border-gold/60 bg-gold/15 text-gold"
                  : "border-border/60 bg-background/40 text-muted-foreground hover:border-gold/40 hover:text-foreground"
              }`}
            >
              <span aria-hidden>{l.emoji}</span>
              Lesson {l.number} · {l.title}
            </button>
          );
        })}
      </div>

      {/* Lesson body */}
      <div className="px-5 py-5">
        <div className="mb-5">
          <h3 className="font-display text-xl italic text-foreground">
            {lesson.emoji} {lesson.title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{lesson.subtitle}</p>
        </div>

        <div className="flex flex-col gap-6">
          {lesson.sections.map((section) => (
            <SectionBlock
              key={section.id}
              section={section}
              onWord={handleWord}
              speak={speak}
              speaking={speaking}
            />
          ))}
        </div>
      </div>

      {wordReq && <WordCard request={wordReq} onClose={() => setWordReq(null)} onXp={onXp} />}
    </section>
  );
}

// ───────────────────────── Section ─────────────────────────

function SectionBlock({
  section,
  onWord,
  speak,
  speaking,
}: {
  section: LessonSection;
  onWord: (word: string, sentence: string, x: number, y: number) => void;
  speak: SpeakFn;
  speaking: Speaking;
}) {
  const { state } = useApp();

  return (
    <article className="rounded-2xl border border-border/60 bg-background/40 p-4">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h4 className="font-display text-lg text-foreground">{section.title}</h4>
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-gold/80">
          {section.paragraphs.length} ¶ · {section.quiz.length} Q
        </span>
      </header>
      <p className="mb-4 text-[12px] italic text-muted-foreground">{section.blurb}</p>

      <div className="flex flex-col gap-4">
        {section.paragraphs.map((p) => {
          const target = paragraphTarget(p, state.selectedLanguage);
          const speakId = `para-${p.id}`;
          const isSpeaking = speaking?.id === speakId;
          return (
            <div
              key={p.id}
              className="grid gap-3 rounded-xl border border-border/40 bg-card/40 p-3 md:grid-cols-2"
            >
              <p
                data-pane="left"
                data-sentence-index={0}
                className="text-[14px] leading-relaxed text-foreground/90"
              >
                <ClickableText text={p.en} onWordClick={(w, s, x, y) => onWord(w, s, x, y)} />
              </p>
              <p
                data-pane="right"
                data-sentence-index={0}
                className="font-display text-[15px] italic leading-relaxed text-foreground"
              >
                {isSpeaking ? (
                  <SpokenText
                    text={target}
                    activeIndex={speaking!.index}
                    fading={speaking!.fading}
                  />
                ) : (
                  <ClickableText text={target} onWordClick={(w, s, x, y) => onWord(w, s, x, y)} />
                )}
                <button
                  type="button"
                  aria-label={`Read aloud in ${state.selectedLanguage}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(speakId, target, state.selectedLanguage);
                  }}
                  className="ml-1.5 inline-flex h-6 w-6 -translate-y-0.5 items-center justify-center rounded-full border border-gold/40 bg-gold/10 text-gold align-middle transition-colors hover:bg-gold/20"
                >
                  <Volume2 className="h-3 w-3" />
                </button>
              </p>

              {p.reflection && (
                <div className="md:col-span-2">
                  <ReflectionInline prompt={p.reflection.prompt} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {section.quiz.length > 0 && <SectionQuiz quiz={section.quiz} sectionId={section.id} />}
    </article>
  );
}

// ───────────────────────── Reflection ─────────────────────────

function ReflectionInline({ prompt }: { prompt: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-gold/30 bg-gold/[0.06] px-3 py-2">
      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
      <div>
        <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-gold/80">Reflect</div>
        <p className="mt-0.5 text-[12px] italic text-foreground/85">{prompt}</p>
      </div>
    </div>
  );
}

// ───────────────────────── Quiz ─────────────────────────

function SectionQuiz({ quiz, sectionId }: { quiz: QuizQuestion[]; sectionId: string }) {
  return (
    <div className="mt-5 rounded-xl border border-gold/30 bg-gold/[0.05] p-3">
      <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
        <Sparkles className="h-3 w-3" />
        Comprehension check
      </div>
      <div className="flex flex-col gap-3">
        {quiz.map((q) => (
          <QuizItem key={`${sectionId}-${q.id}`} q={q} />
        ))}
      </div>
    </div>
  );
}

function QuizItem({ q }: { q: QuizQuestion }) {
  const { dispatch } = useApp();
  const [picked, setPicked] = useState<number | null>(null);
  const correct = picked === q.answerIndex;

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.answerIndex) {
      dispatch({ type: "ADD_XP", payload: 5 });
    }
  };

  return (
    <div className="rounded-lg border border-border/60 bg-background/50 p-3">
      <p className="mb-2 text-[13px] text-foreground/90">{q.q}</p>
      <div className="flex flex-col gap-1.5">
        {q.choices.map((c, i) => {
          const isPicked = picked === i;
          const isAnswer = q.answerIndex === i;
          const showState = picked !== null && (isPicked || isAnswer);
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={picked !== null}
              className={`flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-left text-[12px] transition-colors ${
                showState && isAnswer
                  ? "border-emerald-500/60 bg-emerald-500/10 text-foreground"
                  : showState && isPicked && !isAnswer
                    ? "border-destructive/60 bg-destructive/10 text-foreground"
                    : "border-border/60 bg-background/60 text-foreground/85 hover:border-gold/40"
              } ${picked !== null ? "cursor-default" : "cursor-pointer"}`}
            >
              <span>{c}</span>
              {showState && isAnswer && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
              {showState && isPicked && !isAnswer && (
                <XCircle className="h-3.5 w-3.5 text-destructive" />
              )}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <p className={`mt-2 text-[11px] ${correct ? "text-emerald-600" : "text-muted-foreground"}`}>
          {correct ? "✦ +5 XP — " : ""}
          {q.explanation}
        </p>
      )}
    </div>
  );
}

/**
 * Renders a phrase split into word tokens, highlighting the currently spoken
 * word with a subtle gold underline. Fades out smoothly as speech ends.
 */
function SpokenText({
  text,
  activeIndex,
  fading,
}: {
  text: string;
  activeIndex: number;
  fading: boolean;
}) {
  const tokens = text.split(/(\s+)/);
  let wordIdx = -1;
  return (
    <span>
      {tokens.map((tok, i) => {
        if (/^\s+$/.test(tok)) return <span key={i}>{tok}</span>;
        wordIdx += 1;
        const isActive = wordIdx === activeIndex;
        return (
          <span
            key={i}
            className={`transition-all duration-300 ${
              isActive && !fading
                ? "text-gold [text-shadow:0_0_12px_color-mix(in_oklab,var(--gold)_55%,transparent)]"
                : ""
            }`}
            style={
              isActive
                ? {
                    borderBottom: "1px solid color-mix(in oklab, var(--gold) 70%, transparent)",
                    opacity: fading ? 0 : 1,
                    transition:
                      "opacity 400ms ease, border-color 400ms ease, text-shadow 400ms ease",
                  }
                : undefined
            }
          >
            {tok}
          </span>
        );
      })}
    </span>
  );
}
