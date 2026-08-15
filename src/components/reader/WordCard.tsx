import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X, Volume2, MessageCircle, Sparkle, BookmarkPlus, BookmarkCheck } from "lucide-react";
import { lookupWord, type WordCardData } from "@/fns/word-lookup.functions";
import { useSpeech } from "@/state/speech-state";
import { useTutor } from "@/state/tutor-state";
import { useApp, type Language } from "@/state/app-state";
import { configureUtterance } from "@/lib/voices";
import { needsRemoteTTS, speakRemote } from "@/lib/tts";
import { FuriganaText } from "./FuriganaText";
import { ActionHint } from "@/components/onboarding/AppTour";
import { dismissLearningHint } from "@/lib/learning-guidance";

const LOCALE: Record<Language, string> = {
  Spanish: "es-CR",
  French: "fr-FR",
  German: "de-DE",
  Italian: "it-IT",
  Japanese: "ja-JP",
  Chinese: "zh-CN",
  Korean: "ko-KR",
  Portuguese: "pt-BR",
  Pashto: "ps-AF",
  English: "en-US",
};

const CARD_W_DEFAULT = 380;
const CARD_W_CJK = 340;
// Rich card with collocations / related words / etymology — render-time we cap
// the visible height with overflow-y scroll so the card still fits a phone
// viewport. Used only for the smart-positioning math, not as a hard limit.
const CARD_H = 560;

function cardWidth(language: Language): number {
  return language === "Japanese" || language === "Korean" ? CARD_W_CJK : CARD_W_DEFAULT;
}

/** Read live safe-area insets (requires viewport-fit=cover, which we already set). */
function getSafeAreaInsets(): { top: number; bottom: number } {
  if (typeof document === "undefined") return { top: 0, bottom: 0 };
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;" +
    "padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);";
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const top = parseFloat(style.paddingTop) || 0;
  const bottom = parseFloat(style.paddingBottom) || 0;
  document.body.removeChild(probe);
  return { top, bottom };
}

/**
 * Marks every occurrence of the tapped word inside its source sentence.
 *
 * Without this the card names a word and then prints a sentence the learner has
 * to re-scan to find it in — and when the word occurs more than once (e.g. "per"
 * twice in "Per un giorno, per favore.") the grammar note has to spend its
 * opening clause explaining a position the UI could simply show.
 */
function HighlightedSentence({ sentence, word }: { sentence: string; word: string }) {
  const target = word.trim();
  if (!target) return <>{sentence}</>;
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = sentence.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === target.toLowerCase() ? (
          <span key={i} className="font-semibold text-gold">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export interface WordCardRequest {
  word: string;
  sentence: string;
  language: Language;
  textId?: string;
  textTitle?: string;
  sentenceIndex?: number;
  chapterIndex?: number;
  passage?: string;
  x: number;
  y: number;
}

export function WordCard({
  request,
  onClose,
  onXp,
}: {
  request: WordCardRequest;
  onClose: () => void;
  onXp: (n: number) => void;
}) {
  const lookup = useServerFn(lookupWord);
  const { setLastWord, accent, voiceURI } = useSpeech();
  const tutor = useTutor();
  const { state, dispatch } = useApp();
  const [card, setCard] = useState<WordCardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [vocabAdded, setVocabAdded] = useState(false);
  const [showEtymology, setShowEtymology] = useState(false);
  const toggleEtymology = useCallback(() => setShowEtymology((v) => !v), []);
  const ref = useRef<HTMLDivElement>(null);

  const CARD_W =
    typeof window === "undefined"
      ? cardWidth(request.language)
      : Math.min(cardWidth(request.language), window.innerWidth - 24);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("lt:word-card-state", { detail: true }));
    return () => {
      window.dispatchEvent(new CustomEvent("lt:word-card-state", { detail: false }));
    };
  }, []);

  // Initial position estimate — runs synchronously before first paint.
  // Safe-area insets keep the card (and its close button) clear of the Dynamic
  // Island / notch and the home indicator.
  const initialPos = (() => {
    const { top: safeTop, bottom: safeBottom } = getSafeAreaInsets();
    const padTop = Math.max(12, safeTop + 8);
    const padBottom = Math.max(12, safeBottom + 8);
    const padX = 12;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
    const vh = typeof window !== "undefined" ? window.innerHeight : 768;
    let left = request.x + 16;
    let top = request.y + 16;
    if (left + CARD_W + padX > vw) left = Math.max(padX, request.x - CARD_W - 16);
    if (top + CARD_H + padBottom > vh) top = Math.max(padTop, request.y - CARD_H - 16);
    left = Math.max(padX, Math.min(left, vw - CARD_W - padX));
    top = Math.max(padTop, Math.min(top, vh - CARD_H - padBottom));
    return { left, top };
  })();

  const [pos, setPos] = useState(initialPos);

  // After content loads/changes, clamp so the actual rendered bottom stays on-screen
  // (and still clears the home indicator).
  useLayoutEffect(() => {
    if (!ref.current) return;
    const { top: safeTop, bottom: safeBottom } = getSafeAreaInsets();
    const padTop = Math.max(12, safeTop + 8);
    const padBottom = Math.max(12, safeBottom + 8);
    const vh = typeof window !== "undefined" ? window.innerHeight : 768;
    const rect = ref.current.getBoundingClientRect();
    if (rect.bottom > vh - padBottom) {
      setPos((p) => ({
        ...p,
        top: Math.max(padTop, p.top - (rect.bottom - vh + padBottom)),
      }));
    }
    // Also pull the card down if it somehow started under the Dynamic Island.
    if (rect.top < padTop) {
      setPos((p) => ({ ...p, top: padTop }));
    }
  }, [loading, card, error, showEtymology]);

  // XP flash on open + record last clicked word + count toward "First Word!" achievement
  useEffect(() => {
    onXp(2);
    setLastWord(request.word);
    dispatch({ type: "INC_COUNTER", payload: "wordsLookedUp" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.word, request.x, request.y]);

  // Click-away + Esc
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    // delay so the originating click doesn't immediately close it
    const t = setTimeout(() => document.addEventListener("mousedown", onDoc), 0);
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Fetch card
  useEffect(() => {
    let active = true;
    setLoading(true);
    setCard(null);
    setError(null);
    lookup({
      data: {
        word: request.word,
        sentence: request.sentence,
        language: request.language,
        nativeLanguage: state.nativeLanguage,
      },
    })
      .then((res) => {
        if (!active) return;
        if (res.error) setError(res.error);
        else if (res.card) setCard(res.card);
        else setError("No data returned — tap to retry");
      })
      .catch((e) => {
        if (!active) return;
        setError(e?.message || "Lookup failed — tap to retry");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [request.word, request.sentence, request.language, state.nativeLanguage, lookup]);

  const speak = () => {
    if (typeof window === "undefined") return;
    const text = card?.headword ?? request.word;
    const remoteLocale = accent || LOCALE[request.language];
    if (needsRemoteTTS(remoteLocale)) {
      void speakRemote(text, remoteLocale, { rate: 0.9 });
      return;
    }
    if (!("speechSynthesis" in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    const locale = remoteLocale;
    configureUtterance(utter, locale, voiceURI);
    utter.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`Word details for ${request.word}`}
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        width: CARD_W,
      }}
      className="word-card-pop z-50 overflow-hidden rounded-2xl border border-gold/50 bg-card/85 shadow-luxe backdrop-blur-2xl"
    >
      {/* Ensure ruby / furigana and okurigana share a common baseline so
          kanji + following kana sit level (and with the romaji line below). */}
      <style>{`
        .word-card-pop ruby {
          ruby-position: over;
          ruby-align: center;
          display: inline-flex;
          flex-direction: column-reverse;
          align-items: center;
          vertical-align: baseline;
          line-height: 1.05;
        }
        .word-card-pop rt,
        .word-card-pop .furigana-rt {
          display: block;
          font-size: 0.42em;
          font-weight: 500;
          line-height: 1.1;
          letter-spacing: 0.02em;
          color: var(--gold, #c9a84c);
          transform: translateY(0.05em);
        }
        .word-card-pop rb,
        .word-card-pop .furigana-base {
          display: inline-block;
          vertical-align: baseline;
          line-height: 1;
        }
        /* Keep any plain okurigana that follows a ruby on the same baseline */
        .word-card-pop .furigana-text,
        .word-card-pop h3 {
          line-height: 1.15;
        }
      `}</style>
      {/* Gold sheen header */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />

      {/* XP flash */}
      <div className="xp-flash pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
        <Sparkle className="h-3 w-3" fill="currentColor" /> +2 XP
      </div>

      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute left-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-background/40 text-muted-foreground transition-colors hover:border-gold/60 hover:text-gold"
      >
        <X className="h-3 w-3" />
      </button>

      {/*
        Scroll region:
        - max height uses 100dvh minus both safe-area insets so the card never
          collides with Dynamic Island or the home indicator.
        - -webkit-overflow-scrolling: touch restores momentum scrolling on iOS.
        - overscroll-contain keeps the parent reader from rubber-banding while
          the user is dragging inside the card.
      */}
      <div
        className="overflow-y-auto overscroll-contain px-5 pb-5 pt-12 [-webkit-overflow-scrolling:touch]"
        style={{
          maxHeight:
            "min(80vh, calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 48px))",
        }}
      >
        {loading && <CardSkeleton />}

        {/* When the lookup fails there is still something worth showing: the word
            the learner tapped and the sentence it came from. Both are local
            Reader state and need no network. Previously the whole card body sat
            behind `card`, so a failed lookup erased the sentence too and left
            only a red error string. */}
        {!loading && !card && (
          <>
            <h3 className="font-display text-3xl font-bold leading-tight tracking-tight">
              {request.word}
            </h3>
            <div className="mt-3 rounded-xl border border-gold/30 bg-gold/[0.07] p-3">
              <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
                ✦ In this sentence
              </div>
              <p
                data-testid="wordcard-source-sentence"
                className="font-display text-base italic leading-relaxed text-foreground"
              >
                {request.language === "Japanese" ? (
                  <FuriganaText text={request.sentence} mode="above" script="hiragana" />
                ) : (
                  <>
                    &ldquo;
                    <HighlightedSentence sentence={request.sentence} word={request.word} />
                    &rdquo;
                  </>
                )}
              </p>
            </div>
          </>
        )}

        {/* Learner-facing copy. The raw server string ("AI is not configured")
            is operator language and was being rendered verbatim, in red, to a
            learner. It is kept on `title` so it stays diagnosable. */}
        {!loading && error && (
          <div
            title={error}
            className="mt-3 rounded-xl border border-border/60 bg-card/40 p-3 text-center"
          >
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Word details aren&rsquo;t available right now. Your sentence is above — try again in
              a moment.
            </p>
          </div>
        )}

        {!loading && card && (
          <>
            <h3 className="font-display text-3xl font-bold leading-[1.15] tracking-tight">
              {request.language === "Japanese" ? (
                <FuriganaText text={card.headword} mode="above" script="hiragana" />
              ) : (
                card.headword
              )}
            </h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-gold">{card.phonetic}</span>
              <span className="inline-flex items-center rounded-full border border-border/70 bg-background/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {card.partOfSpeech}
              </span>
              {card.pitchAccent && (
                <span
                  title="Tokyo-dialect pitch accent"
                  className="inline-flex items-center rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-sky-300"
                >
                  ♪ {card.pitchAccent}
                </span>
              )}
            </div>

            <p className="mt-3 text-sm leading-relaxed text-foreground/90">{card.baseDefinition}</p>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-border/70" />
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                ✦
              </span>
              <div className="h-px flex-1 bg-border/70" />
            </div>

            <div className="rounded-xl border border-gold/30 bg-gold/[0.07] p-3">
              <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
                ✦ In this sentence
              </div>
              {/* The exact sentence the learner tapped. This block previously
                  rendered only the grammar note, and the generated example
                  further down was the sole sentence on the card — so a heading
                  promising "this sentence" never actually showed it. This value
                  is client-side Reader state, so it renders even when the AI
                  lookup is unavailable. */}
              {/* Dominant italic on the card. Outside review found the earlier
                  version defeated at a glance: the GENERATED example rendered
                  larger and brighter than the sentence the learner actually
                  tapped, so the eye landed on the invented one first. The labels
                  said primary/secondary; the type said the opposite. */}
              <p
                data-testid="wordcard-source-sentence"
                className="mb-2 font-display text-base italic leading-relaxed text-foreground"
              >
                {request.language === "Japanese" ? (
                  <FuriganaText text={request.sentence} mode="above" script="hiragana" />
                ) : (
                  <>
                    &ldquo;
                    <HighlightedSentence sentence={request.sentence} word={request.word} />
                    &rdquo;
                  </>
                )}
              </p>
              <p className="text-[13px] leading-relaxed text-foreground/90">
                {card.conjugationNote}
                {card.contextNuance ? ` ${card.contextNuance}` : ""}
              </p>
            </div>

            <ActionHint storageKey="lt.guide.reader.tutor" className="mt-3">
              <strong>Ask Tutor keeps this word and the full sentence attached.</strong> Your next
              question starts from what you are reading now.
            </ActionHint>

            <div className="mt-4">
              {/* Labelled explicitly: this is a generated example, not the
                  sentence the learner tapped. Unlabelled — and with the source
                  sentence absent — it was being read as the source sentence. */}
              <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                ⊕ Another example
              </div>
              {/* Deliberately one size below the source sentence above: this is
                  generated illustration, not what the learner tapped. The gloss
                  drops out of mono — it is English prose, not UI chrome. */}
              <p className="font-display text-[13px] italic leading-relaxed text-foreground/75">
                {request.language === "Japanese" ? (
                  <FuriganaText text={card.exampleSentence} mode="above" script="hiragana" />
                ) : (
                  `"${card.exampleSentence}"`
                )}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                {card.exampleTranslation}
              </p>
            </div>

            {card.commonCollocations && card.commonCollocations.length > 0 && (
              <div className="mt-4">
                <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  ⊕ Common phrases
                </div>
                <ul className="space-y-1 text-[12px] leading-snug text-foreground/85">
                  {card.commonCollocations.map((c, i) => (
                    <li key={i} className="border-l-2 border-gold/40 pl-2">
                      {request.language === "Japanese" ? (
                        <FuriganaText text={c} mode="above" script="hiragana" />
                      ) : (
                        c
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {card.relatedWords && card.relatedWords.length > 0 && (
              <div className="mt-4">
                <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  ↔ Related words
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {card.relatedWords.map((rw, i) => (
                    <span
                      key={i}
                      title={rw.gloss}
                      className="inline-flex items-baseline gap-1 rounded-full border border-border/60 bg-background/40 px-2 py-0.5"
                    >
                      <span className="font-display text-[13px] text-foreground">{rw.word}</span>
                      {rw.reading && (
                        <span className="font-mono text-[9px] text-gold/80">{rw.reading}</span>
                      )}
                      <span className="font-mono text-[10px] text-muted-foreground">
                        — {rw.gloss}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {card.alternativeReadings && card.alternativeReadings.length > 0 && (
              <div className="mt-4">
                <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  ⇄ Other kanji readings
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {card.alternativeReadings.map((r, i) => (
                    <span
                      key={i}
                      className="rounded-md border border-border/60 bg-background/50 px-1.5 py-0.5 font-mono text-[10px] text-foreground"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {card.etymologyNote && (
              <div className="mt-4">
                <button
                  onClick={toggleEtymology}
                  className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground/70 transition-colors"
                >
                  ⌗ Origin {showEtymology ? "↑" : "↓"}
                </button>
                {showEtymology && (
                  <p className="mt-2 rounded-xl border border-border/60 bg-background/30 p-3 text-[12px] leading-relaxed text-foreground/80">
                    {card.etymologyNote}
                  </p>
                )}
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
              <button
                onClick={speak}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-border/70 bg-background/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-foreground/90 transition-colors hover:border-gold/60 hover:text-gold"
              >
                <Volume2 className="h-3 w-3" /> Pronounce
              </button>
              <button
                onClick={() => {
                  dismissLearningHint("lt.guide.reader.tutor");
                  const explanation = [
                    card.baseDefinition,
                    card.conjugationNote,
                    card.contextNuance,
                  ]
                    .filter(Boolean)
                    .join(" ");
                  tutor.prefill(
                    `Can you explain more about the word "${card.headword}" and how it's used in this sentence?\n\n"${request.sentence}"`,
                    request.textId
                      ? {
                          threadId: request.textId,
                          selectedWord: card.headword,
                          selectedSentence: request.sentence,
                          passage: request.passage ?? request.sentence,
                          wordExplanation: explanation,
                          sentenceIndex: request.sentenceIndex,
                          chapterIndex: request.chapterIndex,
                        }
                      : undefined,
                    {
                      selectedWord: card.headword,
                      sentence: request.sentence,
                      passageExcerpt: request.passage,
                      textTitle: request.textTitle,
                      language: request.language,
                      learnerLevel: state.level,
                      explanation,
                    },
                  );
                  onClose();
                }}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border border-border/70 bg-background/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-foreground/90 transition-colors hover:border-gold/60 hover:text-gold"
              >
                <MessageCircle className="h-3 w-3" /> Ask Tutor
              </button>
              <button
                onClick={() => {
                  if (vocabAdded) return;
                  const alreadyIn = state.userVocab.some((v) => v.word === card.headword);
                  if (!alreadyIn) {
                    dispatch({
                      type: "ADD_VOCAB_ITEMS",
                      payload: [
                        {
                          word: card.headword,
                          translation: card.baseDefinition,
                          category: "topic",
                          correctCount: 0,
                        },
                      ],
                      // Stamps vocabLang on first save so the word survives the
                      // vocabLang gate in Flashcards, Tutor, Word Match, etc.
                      lang: state.selectedLanguage,
                    });
                  }
                  setVocabAdded(true);
                  onXp(5);
                  window.dispatchEvent(new CustomEvent("lt:meaningful-learning-action"));
                }}
                className={`inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
                  vocabAdded
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-border/70 bg-background/40 text-foreground/90 hover:border-gold/60 hover:text-gold"
                }`}
              >
                {vocabAdded ? (
                  <>
                    <BookmarkCheck className="h-3 w-3" /> Added
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="h-3 w-3" /> My Vocab
                  </>
                )}
              </button>
            </div>

            {vocabAdded && (
              <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] p-3">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Saved to My Vocab
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  This word is ready in Flashcards—no re-entry needed.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    dispatch({ type: "SET_TAB", payload: "flashcards" });
                  }}
                  className="mt-2 inline-flex min-h-11 items-center rounded-lg border border-emerald-500/35 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
                >
                  Practice in Flashcards →
                </button>
              </div>
            )}

            {/* Second Flashcards CTA removed — the confirmation panel above
                already offers "Practice in Flashcards" and both performed the
                same navigation. Two identical calls to action immediately after
                the key save made the card feel undeliberate. Synthesis
                correction 6. */}
          </>
        )}
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="space-y-3">
      <div className="shimmer h-8 w-2/3 rounded-md" />
      <div className="shimmer h-3 w-1/3 rounded" />
      <div className="shimmer h-3 w-full rounded" />
      <div className="shimmer h-3 w-5/6 rounded" />
      <div className="shimmer mt-4 h-20 w-full rounded-xl" />
      <div className="shimmer h-3 w-4/6 rounded" />
      <div className="shimmer h-3 w-3/6 rounded" />
    </div>
  );
}
