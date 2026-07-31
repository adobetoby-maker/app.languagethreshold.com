import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { Loader2, BookOpen, Sparkles } from "lucide-react";
import { useApp } from "@/state/app-state";
import { useGrammar, type CefrLevel } from "@/state/grammar-state";
import {
  generateLessonContent,
  type LessonStub,
  type LessonContent,
} from "@/fns/grammar.functions";
import { ClickableText } from "@/components/reader/ClickableText";
import { FuriganaText } from "@/components/reader/FuriganaText";
import { WordCard, type WordCardRequest } from "@/components/reader/WordCard";
import { QuizCard } from "./QuizCard";
import { MorphologyCard } from "./MorphologyCard";

const LEVEL_LABEL: Record<CefrLevel, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper-Intermediate",
  C1: "Advanced",
  C2: "Mastery",
};

export function LessonView({ level, lesson }: { level: CefrLevel; lesson: LessonStub }) {
  const { state, dispatch } = useApp();
  const { getLevel, setContent } = useGrammar();
  const genContent = useServerFn(generateLessonContent);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [wordReq, setWordReq] = useState<WordCardRequest | null>(null);

  const lvl = getLevel(state.selectedLanguage, level);
  const content: LessonContent | undefined = lvl?.contents[lesson.id];
  const isComplete = !!lvl?.completed[lesson.id];

  useEffect(() => {
    if (content) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await genContent({
          data: {
            language: state.selectedLanguage,
            level,
            concept: lesson.concept,
            nativeLanguage: state.nativeLanguage,
          },
        });
        if (cancelled) return;
        if (res.data) setContent(state.selectedLanguage, level, lesson.id, res.data);
        else if (res.error) setError(res.error);
      } catch {
        if (!cancelled) setError("Failed to load lesson.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id, state.selectedLanguage, level]);

  const handleWord = (word: string, sentence: string, x: number, y: number) => {
    setWordReq({ word, sentence, language: state.selectedLanguage, x, y });
  };

  return (
    <div className="fade-in min-w-0 flex-1">
      <div className="rounded-2xl border border-border/60 bg-card/40 p-7 shadow-luxe backdrop-blur">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
              <BookOpen className="h-3 w-3" />
              {level} · {LEVEL_LABEL[level]}
            </div>
            <h2 className="font-display text-3xl text-foreground">{lesson.title}</h2>
            <p className="mt-1 font-display text-sm italic text-muted-foreground">
              {lesson.concept}
            </p>
          </div>
          {isComplete && (
            <span className="rounded-full bg-gold px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-midnight">
              ✓ Completed
            </span>
          )}
        </div>

        {loading && (
          <div className="space-y-3">
            <div className="h-4 w-2/3 animate-pulse rounded bg-gold/10" />
            <div className="h-4 w-full animate-pulse rounded bg-gold/10" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-gold/10" />
            <div className="h-4 w-4/6 animate-pulse rounded bg-gold/10" />
            <div className="mt-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin text-gold" />
              Composing your lesson…
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 font-mono text-xs text-destructive">
            {error}
          </div>
        )}

        {content && !loading && (
          <>
            <div className="mb-7 whitespace-pre-wrap font-display text-[16px] leading-[1.85] text-foreground/90 [&_p]:m-0 [&_p+p]:mt-4 [&_strong]:font-semibold [&_strong]:text-foreground">
              <ReactMarkdown rehypePlugins={[rehypeRaw]}>{content.explanation}</ReactMarkdown>
            </div>

            <div className="mb-7 rounded-xl border border-gold/40 bg-gold/10 px-5 py-4">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
                ✦ Key Rule
              </div>
              <div className="font-display text-[15px] font-semibold italic text-foreground [&_p]:m-0 [&_strong]:text-gold">
                <ReactMarkdown rehypePlugins={[rehypeRaw]}>{content.keyRule}</ReactMarkdown>
              </div>
            </div>

            {content.morphology && <MorphologyCard morph={content.morphology} />}

            <div className="mb-7">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-gold" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Examples · click any word
                </span>
              </div>
              <div className="overflow-hidden rounded-xl border border-border/60">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="border-b border-border/50 bg-card/60 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-gold md:border-b md:border-r">
                    Target
                  </div>
                  <div className="hidden border-b border-border/50 bg-card/60 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground md:block">
                    {state.nativeLanguage}
                  </div>
                  {content.examples.map((ex, i) => (
                    <div key={i} className="contents">
                      <div
                        className={`border-b border-border/40 px-5 py-4 font-display text-[16px] leading-relaxed text-foreground md:border-r ${state.selectedLanguage === "Japanese" ? "furigana-line" : ""}`}
                      >
                        {state.selectedLanguage === "Japanese" ? (
                          <FuriganaText text={ex.target} onWordClick={handleWord} />
                        ) : (
                          <ClickableText text={ex.target} onWordClick={handleWord} />
                        )}
                      </div>
                      <div className="border-b border-border/40 px-5 py-4 font-display text-[15px] italic leading-relaxed text-muted-foreground">
                        {ex.english}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-5">
              <p className="font-display text-sm italic text-muted-foreground">
                Ready to test what you’ve learned?
              </p>
              <button
                onClick={() => setShowQuiz(true)}
                className="rounded-full bg-gold px-5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-midnight transition-opacity hover:opacity-90"
              >
                Begin Quiz →
              </button>
            </div>
          </>
        )}
      </div>

      {showQuiz && content && (
        <QuizCard
          level={level}
          lesson={lesson}
          onClose={() => setShowQuiz(false)}
          onComplete={() => {
            setShowQuiz(false);
          }}
        />
      )}

      {wordReq && (
        <WordCard
          request={wordReq}
          onClose={() => setWordReq(null)}
          onXp={(n) => dispatch({ type: "ADD_XP", payload: n })}
        />
      )}
    </div>
  );
}
