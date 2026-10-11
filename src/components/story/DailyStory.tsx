import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, ChevronDown, ChevronUp, Sparkle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useApp, VOCAB_MASTERY_THRESHOLD } from "@/state/app-state";
import { getUltraPatterns } from "@/data/grammar-patterns";
import { generateDailyStory, type DailyStoryData } from "@/fns/daily-story.functions";
import { getModule, moduleSupportsLanguage } from "@/data/modules";

function highlightVocab(text: string, words: string[]): React.ReactNode {
  if (!words.length) return text;
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-gold/20 text-gold rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export function DailyStory() {
  const { state, dispatch } = useApp();
  const fetchStory = useServerFn(generateDailyStory);

  const [story, setStory] = useState<DailyStoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState<"correct" | "wrong" | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const loadedRef = useRef("");
  const requestRef = useRef(0);

  const lang = state.selectedLanguage;
  const module = getModule(state.activeModuleId);
  const storyModule = module && moduleSupportsLanguage(module, lang) ? module : null;

  const activeVocab = useMemo(
    () =>
      state.vocabLang === lang
        ? state.userVocab
            .filter((v) => v.correctCount < VOCAB_MASTERY_THRESHOLD)
            .map((v) => v.word)
            .slice(0, 8)
        : [],
    [state.vocabLang, state.userVocab, lang],
  );

  const ultraPattern = getUltraPatterns(lang).find(
    (p) => (state.patternProgress[p.id] ?? 0) < VOCAB_MASTERY_THRESHOLD,
  );

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);
    setAnswer("");
    setChecked(null);
    setShowTranslation(false);

    const res = await fetchStory({
      data: {
        language: lang,
        level: state.level,
        vocabWords: activeVocab,
        patternName: ultraPattern?.name ?? "",
        patternFormula: ultraPattern?.pattern ?? "",
        moduleId: storyModule?.id ?? null,
      },
    });

    if (requestId !== requestRef.current) return;
    setLoading(false);
    if (res.error || !res.data) {
      setError(res.error ?? "Could not generate a story.");
      return;
    }
    setStory(res.data);
  }, [fetchStory, lang, state.level, activeVocab, ultraPattern, storyModule?.id]);

  useEffect(() => {
    const key = `${lang}:${state.level}:${storyModule?.id ?? "core"}`;
    if (loadedRef.current === key) return;
    loadedRef.current = key;
    setStory(null);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, state.level, storyModule?.id]);

  function checkAnswer() {
    if (!story || !answer.trim()) return;
    const correct = story.correctAnswer.toLowerCase();
    const given = answer.trim().toLowerCase();
    const isCorrect = given.includes(correct) || correct.includes(given);
    setChecked(isCorrect ? "correct" : "wrong");
    if (isCorrect) {
      dispatch({ type: "ADD_XP", payload: 15 });
      dispatch({ type: "INC_COUNTER", payload: "lessonsCompleted" });
      if (ultraPattern) dispatch({ type: "SCORE_PATTERN", payload: ultraPattern.id });
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 pt-4 pb-24">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkle className="h-5 w-5 text-gold" />
          Daily Story
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          A short {lang} story built from your vocab and selected module
        </p>
      </div>

      {/* Context chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {storyModule && (
          <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-gold">
            {storyModule.emoji} {storyModule.name}
          </span>
        )}
        {ultraPattern && (
          <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-violet-400">
            {ultraPattern.name}
          </span>
        )}
        {activeVocab.slice(0, 4).map((w) => (
          <span
            key={w}
            className="rounded-full border border-gold/25 bg-gold/5 px-2.5 py-1 font-mono text-[10px] text-gold/80"
          >
            {w}
          </span>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <div className="h-8 w-8 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
          <p className="text-sm">Crafting your story…</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="space-y-3">
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
          <button
            onClick={() => {
              void load();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/50 py-3 text-sm hover:bg-card/50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Try Again
          </button>
        </div>
      )}

      {/* Story */}
      {story && !loading && (
        <div className="space-y-4">
          {/* Story card */}
          <div className="rounded-xl border border-border/50 bg-card/40 p-5">
            <p className="text-base leading-relaxed text-foreground whitespace-pre-line">
              {highlightVocab(story.story, story.vocabHighlights)}
            </p>

            {story.vocabHighlights.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground/60">
                <mark className="bg-gold/20 text-gold rounded px-0.5 mr-1">highlighted</mark>= your
                vocab words
              </p>
            )}
          </div>

          {/* Translation toggle */}
          <button
            onClick={() => setShowTranslation((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-border/40 bg-card/20 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            English translation
            {showTranslation ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          {showTranslation && (
            <div className="rounded-lg border border-border/30 bg-background/30 px-4 py-3 text-sm text-muted-foreground leading-relaxed">
              {story.translation}
            </div>
          )}

          {/* Comprehension question */}
          {checked === null ? (
            <div className="rounded-xl border border-gold/20 bg-gold/[0.03] p-4 space-y-3">
              <p className="text-sm font-semibold">{story.comprehensionQ}</p>
              <p className="text-xs text-muted-foreground">Answer in {lang}</p>
              <input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && answer.trim()) checkAnswer();
                }}
                placeholder={`Write in ${lang}…`}
                className="w-full rounded-lg border border-border/50 bg-background/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/40"
                autoFocus
              />
              <button
                onClick={checkAnswer}
                disabled={!answer.trim()}
                className="w-full rounded-lg bg-gold/10 border border-gold/25 py-2.5 text-sm font-semibold text-gold hover:bg-gold/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Check Answer
              </button>
            </div>
          ) : (
            <div
              className={`rounded-xl border p-4 space-y-2 ${
                checked === "correct"
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : "border-amber-500/30 bg-amber-500/10"
              }`}
            >
              <div className="flex items-center gap-2">
                {checked === "correct" ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-400">
                      +15 XP — Great reading!
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-semibold text-amber-400">
                      Not quite — here's the answer:
                    </span>
                  </>
                )}
              </div>
              {checked === "wrong" && (
                <p className="text-sm text-foreground font-medium">{story.correctAnswer}</p>
              )}
            </div>
          )}

          {/* New story */}
          <button
            onClick={() => {
              void load();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-card/30 border border-border/40 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-card/50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> New Story
          </button>
        </div>
      )}
    </div>
  );
}
