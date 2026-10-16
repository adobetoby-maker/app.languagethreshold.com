// Built by TAC — 2026-10-15
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Languages, Pause, Play, Volume2 } from "lucide-react";
import { ClickableText } from "@/components/reader/ClickableText";
import { WordCard, type WordCardRequest } from "@/components/reader/WordCard";
import { useApp, type Language } from "@/state/app-state";
import { useLibrary, type LibraryEntry } from "@/state/library-state";
import { useSpeech } from "@/state/speech-state";
import { getAvailableModuleLessons } from "@/data/module-starters";
import type { LessonWord } from "@/data/curriculum";
import { ROOFING_LESSON_PASSAGES } from "@/data/roofing-lesson-passages";
import { ROOFING_LESSON_WORDS } from "@/data/roofing-lesson-words";
import { languageTag } from "@/lib/lesson-words-core";
import { cn } from "@/lib/utils";

const LANGUAGE_CODES: Record<Language, string> = {
  Spanish: "es",
  French: "fr",
  German: "de",
  Italian: "it",
  Japanese: "ja",
  Chinese: "zh",
  Korean: "ko",
  Portuguese: "pt",
  Pashto: "ps",
  English: "en",
};

/**
 * The library id of the reading this lesson uses: the lesson's own template when it has loaded for
 * the learner's language, otherwise the module's first loaded reading. Null when none has.
 */
function resolveLessonPassageId(
  moduleId: string,
  language: Language,
  readingTemplate: string | undefined,
  entries: LibraryEntry[],
): string | null {
  const templateId = readingTemplate?.replace("{lang}", LANGUAGE_CODES[language]);
  const available = getAvailableModuleLessons(moduleId, language, entries);
  return (templateId && available.includes(templateId) ? templateId : null) ?? available[0] ?? null;
}

/**
 * The roofing lesson whose own reading the learner should see. Prefers the explicit lesson number;
 * otherwise recognises the lesson from its authored word list, which is unique per lesson.
 */
function roofingLessonNumber(lessonNumber: number | undefined, words: LessonWord[]): number | null {
  if (lessonNumber && ROOFING_LESSON_PASSAGES[lessonNumber]) return lessonNumber;
  if (words.length === 0) return null;
  const key = words.map((w) => w.es).join("|");
  for (const [n, authored] of Object.entries(ROOFING_LESSON_WORDS)) {
    if (authored.map((w) => w.es).join("|") === key) return Number(n);
  }
  return null;
}

/** How long to wait for the reading library before treating a missing passage as absent. */
const LIBRARY_WAIT_MS = 6000;

export function LessonReader({
  moduleId,
  lessonNumber,
  readingTemplate,
  words,
  onInteract,
  onOpenFullReader,
  initialTranslationVisible = false,
}: {
  moduleId: string;
  /** The lesson's number; roofing uses it to pick the lesson's own reading passage. */
  lessonNumber?: number;
  readingTemplate?: string;
  /** The lesson's word list, shown when no passage exists for this language. */
  words: LessonWord[];
  /** Called on the learner's first real use of the passage (tap a word, play audio). */
  onInteract: () => void;
  onOpenFullReader: (passageId: string) => void;
  initialTranslationVisible?: boolean;
}) {
  const { state, dispatch } = useApp();
  const { state: lib } = useLibrary();
  const { speakSentence, speakSentences, stop, playing, activeSentenceIndex } = useSpeech();
  const language = state.selectedLanguage;
  const [showEnglish, setShowEnglish] = useState(initialTranslationVisible);
  const [wordReq, setWordReq] = useState<WordCardRequest | null>(null);
  const [waited, setWaited] = useState(false);

  const passageId = resolveLessonPassageId(moduleId, language, readingTemplate, lib.entries);
  const entry = passageId ? (lib.entries.find((e) => e.id === passageId) ?? null) : null;
  // The seeds arrive after first paint; the first non-custom, non-missionary entry means they have.
  const libraryLoaded = lib.entries.some(
    (e) => e.section !== "custom" && e.section !== "missionary",
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setWaited(true), LIBRARY_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, []);

  // Stop any passage audio when the learner leaves the lesson.
  useEffect(() => () => stop(), [stop]);

  // Roofing in Spanish reads a passage written for this lesson; everything else reads the library.
  const lessonPassage = useMemo(() => {
    if (moduleId !== "roofing" || language !== "Spanish") return null;
    const n = roofingLessonNumber(lessonNumber, words);
    const authored = n ? ROOFING_LESSON_PASSAGES[n] : undefined;
    if (!n || !authored) return null;
    return {
      id: `roofing-lesson-${n}`,
      title: authored.title,
      sentences: authored.es.map((target, i) => ({ target, en: authored.en[i] ?? "" })),
    };
  }, [moduleId, language, lessonNumber, words]);
  const shown = lessonPassage ?? entry;
  const sentences = useMemo(() => shown?.sentences ?? [], [shown]);
  // Chinese has no spaces to tap on; the full Reader adds pinyin and word lookup there.
  const tappable = language !== "Chinese";
  const lang = languageTag(language);
  // The full Reader always opens a library passage; a lesson passage has none of its own.
  const fullReaderId = entry?.id ?? null;

  if (!shown && !libraryLoaded && !waited) {
    return (
      <div data-testid="lesson-reader-loading" aria-busy="true" className="space-y-2 py-1">
        <div className="h-5 w-1/2 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-16 animate-pulse rounded-xl bg-white/[0.06]" />
        <p className="text-xs text-muted-foreground">Loading this lesson's reading…</p>
      </div>
    );
  }

  if (!shown) {
    return (
      <div data-testid="lesson-reader-fallback">
        <p className="rounded-xl border border-amber-300/25 bg-amber-300/[0.05] px-3 py-2 text-xs leading-relaxed text-foreground/80">
          There is no reading passage for this lesson in {language} yet. Here are the lesson's words
          to study instead.
        </p>
        {words.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {words.map((w) => (
              <li
                key={`${w.kind}:${w.es}`}
                className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border/50 bg-card/30 px-3 py-2"
              >
                <span lang={lang} className="text-sm font-semibold text-foreground">
                  {w.es}
                </span>
                <span className="text-right text-xs text-muted-foreground">{w.en}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  function onWordClick(word: string, sentence: string, index: number, x: number, y: number) {
    onInteract();
    setWordReq({
      word,
      sentence,
      language,
      textId: shown?.id,
      textTitle: shown?.title,
      passage: sentences.map((s) => s.target).join(" "),
      sentenceIndex: index,
      x,
      y,
    });
  }

  function playPassage() {
    onInteract();
    if (playing) {
      stop();
      return;
    }
    speakSentences(sentences.map((s, index) => ({ text: s.target, index })));
  }

  return (
    <div data-testid="lesson-reader">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold text-foreground">{shown.title}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={playPassage}
            aria-label={playing ? "Stop passage audio" : "Play whole passage"}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border/50 bg-card/30 px-3 text-xs font-semibold text-foreground hover:border-gold/40"
          >
            {playing ? (
              <Pause className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Play className="h-4 w-4" aria-hidden="true" />
            )}
            {playing ? "Stop" : "Play passage"}
          </button>
          <button
            type="button"
            onClick={() => setShowEnglish((v) => !v)}
            aria-pressed={showEnglish}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-xs font-semibold",
              showEnglish
                ? "border-gold/50 bg-gold/10 text-gold"
                : "border-border/50 bg-card/30 text-foreground hover:border-gold/40",
            )}
          >
            <Languages className="h-4 w-4" aria-hidden="true" />
            {state.nativeLanguage}
          </button>
        </div>
      </div>

      <div lang={lang} className="mt-3 space-y-2">
        {sentences.map((s, index) => (
          <div
            key={index}
            data-sentence-index={index}
            className={cn(
              "flex items-start gap-1 rounded-xl border px-3 py-2 transition-colors",
              activeSentenceIndex === index
                ? "border-gold/50 bg-gold/[0.07]"
                : "border-border/40 bg-card/20",
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="font-display text-[17px] leading-[1.8] text-foreground">
                {tappable ? (
                  <ClickableText
                    text={s.target}
                    onWordClick={(w, sentence, x, y) => onWordClick(w, sentence, index, x, y)}
                  />
                ) : (
                  s.target
                )}
              </p>
              {showEnglish && (
                <p lang="en" className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {s.en}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                onInteract();
                speakSentence(s.target, index);
              }}
              aria-label={`Play sentence ${index + 1}`}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gold hover:bg-gold/10"
            >
              <Volume2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {tappable
          ? "Tap any word to see what it means here, hear it, and save it."
          : "Open the full Reader for pinyin and word lookup."}
      </p>

      {fullReaderId && (
        <button
          type="button"
          data-testid="lesson-open-full-reader"
          onClick={() => onOpenFullReader(fullReaderId)}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-xs font-semibold text-foreground underline decoration-gold/50 underline-offset-4 hover:text-gold"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {lessonPassage ? "Open the longer roofing reading" : "Open in full Reader"}
        </button>
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
