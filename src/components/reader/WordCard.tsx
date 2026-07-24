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

const LOCALE: Record<Language, string> = {
  Spanish: "es-CR",
  French: "fr-FR",
  German: "de-DE",
  Italian: "it-IT",
  Japanese: "ja-JP",
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

export interface WordCardRequest {
  word: string;
  sentence: string;
  language: Language;
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

  const CARD_W = cardWidth(request.language);

  // Initial position estimate — runs synchronously before first paint
  const initialPos = (() => {
    const pad = 12;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
    const vh = typeof window !== "undefined" ? window.innerHeight : 768;
    let left = request.x + 16;
    let top = request.y + 16;
    if (left + CARD_W + pad > vw) left = Math.max(pad, request.x - CARD_W - 16);
    if (top + CARD_H + pad > vh) top = Math.max(pad, request.y - CARD_H - 16);
    left = Math.max(pad, Math.min(left, vw - CARD_W - pad));
    top = Math.max(pad, Math.min(top, vh - CARD_H - pad));
    return { left, top };
  })();

  const [pos, setPos] = useState(initialPos);

  // After content loads/changes, clamp so the actual rendered bottom stays on-screen
  useLayoutEffect(() => {
    if (!ref.current) return;
    const pad = 12;
    const vh = typeof window !== "undefined" ? window.innerHeight : 768;
    const rect = ref.current.getBoundingClientRect();
    if (rect.bottom > vh - pad) {
      setPos((p) => ({ ...p, top: Math.max(pad, p.top - (rect.bottom - vh + pad)) }));
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
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        width: CARD_W,
      }}
      className="word-card-pop z-50 overflow-hidden rounded-2xl border border-gold/50 bg-card/85 shadow-luxe backdrop-blur-2xl"
    >
      {/* Gold sheen header */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />

      {/* XP flash */}
      <div className="xp-flash pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
        <Sparkle className="h-3 w-3" fill="currentColor" /> +2 XP
      </div>

      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute left-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-background/40 text-muted-foreground transition-colors hover:border-gold/60 hover:text-gold"
      >
        <X className="h-3 w-3" />
      </button>

      <div className="max-h-[80vh] overflow-y-auto px-5 pb-5 pt-12">
        {loading && <CardSkeleton />}

        {!loading && error && (
          <div className="py-6 text-center font-mono text-xs uppercase tracking-[0.18em] text-destructive">
            {error}
          </div>
        )}

        {!loading && card && (
          <>
            <h3 className="font-display text-3xl font-bold leading-tight tracking-tight">
              {request.language === "Japanese" ? (
                <FuriganaText text={card.headword} mode="above" script="hiragana" />
              ) : (
                card.headword
              )}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
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
              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
                📌 In this sentence
              </div>
              <p className="text-[13px] leading-relaxed text-foreground/90">
                {card.conjugationNote}
                {card.contextNuance ? ` ${card.contextNuance}` : ""}
              </p>
            </div>

            <div className="mt-4">
              <p className="font-display text-base italic text-foreground">
                {request.language === "Japanese" ? (
                  <FuriganaText text={card.exampleSentence} mode="above" script="hiragana" />
                ) : (
                  `"${card.exampleSentence}"`
                )}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
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
                      className="rounded-md border border-sky-500/30 bg-sky-500/[0.07] px-1.5 py-0.5 font-mono text-[10px] text-sky-200"
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

            <div className="mt-5 flex items-center gap-2 border-t border-border/60 pt-4">
              <button
                onClick={speak}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/90 transition-colors hover:border-gold/60 hover:text-gold"
              >
                <Volume2 className="h-3 w-3" /> Pronounce
              </button>
              <button
                onClick={() => {
                  tutor.prefill(
                    `Can you explain more about the word "${card.headword}" and how it's used in this sentence?\n\n"${request.sentence}"`,
                  );
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/90 transition-colors hover:border-gold/60 hover:text-gold"
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
                    });
                  }
                  setVocabAdded(true);
                  onXp(5);
                }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                  vocabAdded
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400"
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
              <button
                onClick={() => {
                  dispatch({ type: "SET_TAB", payload: "flashcards" });
                  onClose();
                }}
                className="mt-2 w-full rounded-full border border-gold/40 bg-gold/[0.08] py-1.5 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-gold transition-colors hover:bg-gold/15"
              >
                Study your saved words →
              </button>
            )}
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
