import { useCallback, useEffect, useMemo, useState } from "react";
import { Layers, Volume2, Sparkle, BookOpen, Shuffle } from "lucide-react";
import { useApp } from "@/state/app-state";
import {
  useFlashcards,
  FLASHCARD_CATEGORIES,
  CATEGORY_LABEL,
  type FlashcardEntry,
} from "@/state/flashcard-state";
import { useSpeech } from "@/state/speech-state";
import { configureUtterance } from "@/lib/voices";
import { needsRemoteTTS, speakRemote } from "@/lib/tts";
import { FREQUENCY_CONJUGATIONS, type ConjugationSet } from "@/data/frequency-conjugations";
import { getJapaneseConjugation, type JapaneseConjugationSet } from "@/data/japanese-conjugations";
import { FuriganaText } from "@/components/reader/FuriganaText";
import { JapaneseConjugationCard } from "./JapaneseConjugationCard";
import type { SrsGrade } from "@/lib/srs";

const FURIGANA_FC_KEY = "lt.flashcards.furigana.v1";

const PERSON_LABEL = {
  Italian: { s1: "io", s2: "tu", s3: "lui/lei", p1: "noi", p2: "voi", p3: "loro" },
  Spanish: { s1: "yo", s2: "tú", s3: "él/ella", p1: "nosotros", p2: "vosotros", p3: "ellos" },
  French: { s1: "je", s2: "tu", s3: "il/elle", p1: "nous", p2: "vous", p3: "ils" },
  German: { s1: "ich", s2: "du", s3: "er/sie", p1: "wir", p2: "ihr", p3: "sie" },
  Portuguese: { s1: "eu", s2: "tu", s3: "ele/ela", p1: "nós", p2: "vós", p3: "eles" },
} as const;

const GRADE_BUTTONS: { grade: SrsGrade; label: string; hint: string; cls: string }[] = [
  { grade: "again", label: "Again", hint: "< 1d", cls: "border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20" },
  { grade: "hard", label: "Hard", hint: "1d", cls: "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20" },
  { grade: "good", label: "Good", hint: "6d", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20" },
  { grade: "easy", label: "Easy", hint: "16d+", cls: "border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20" },
];

export function FlashcardsStudio() {
  const { state: appState } = useApp();
  const { state, reviewCard, cardsForCategories, dueCardsForCategories } = useFlashcards();
  const { accent, voiceURI } = useSpeech();
  const language = appState.selectedLanguage;
  const [flipped, setFlipped] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [showFurigana, setShowFurigana] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["verbs", "vocab"]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FURIGANA_FC_KEY);
      if (raw === "off") setShowFurigana(false);
      else if (raw === "on") setShowFurigana(true);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(FURIGANA_FC_KEY, showFurigana ? "on" : "off"); } catch { /* ignore */ }
  }, [showFurigana]);

  const dueCards = useMemo(
    () => dueCardsForCategories(language, selectedCategories),
    [dueCardsForCategories, language, selectedCategories],
  );
  const allCards = useMemo(
    () => cardsForCategories(language, selectedCategories),
    [cardsForCategories, language, selectedCategories],
  );
  const current = dueCards[0] ?? null;
  const activeCard = current ?? allCards[0];

  const conjugation: ConjugationSet | undefined =
    activeCard?.frequencyId && FREQUENCY_CONJUGATIONS[activeCard.frequencyId]
      ? FREQUENCY_CONJUGATIONS[activeCard.frequencyId][language]
      : undefined;
  const personLabels =
    language in PERSON_LABEL ? PERSON_LABEL[language as keyof typeof PERSON_LABEL] : null;

  const japaneseConjugation: JapaneseConjugationSet | undefined =
    language === "Japanese" && activeCard
      ? getJapaneseConjugation(activeCard.word) ??
        (activeCard.romanization ? getJapaneseConjugation(activeCard.romanization) : undefined)
      : undefined;

  const grade = useCallback(
    (g: SrsGrade) => {
      if (!current) return;
      reviewCard(current.id, g);
      setFlipped(false);
      setReviewedCount((n) => n + 1);
    },
    [current, reviewCard],
  );

  function speak(word: string) {
    if (typeof window === "undefined") return;
    if (needsRemoteTTS(accent, voiceURI)) {
      void speakRemote(word, accent, { rate: 0.9, voiceURI });
      return;
    }
    if (!("speechSynthesis" in window)) return;
    const utter = new SpeechSynthesisUtterance(word);
    configureUtterance(utter, accent, voiceURI);
    utter.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  return (
    <div className="fade-in mx-auto w-full max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
            <Layers className="h-3.5 w-3.5" /> Flashcards
          </div>
          <h1 className="font-display text-3xl text-foreground">Spaced repetition for {language}</h1>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 px-1">
        {FLASHCARD_CATEGORIES.filter((c) => c !== "module").map((cat) => {
          const active = selectedCategories.includes(cat);
          return (
            <button
              key={cat}
              type="button"
              onClick={() =>
                setSelectedCategories((prev) =>
                  active ? prev.filter((x) => x !== cat) : [...prev, cat],
                )
              }
              className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors ${
                active
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-border/60 bg-card/30 text-muted-foreground hover:border-gold/40"
              }`}
            >
              {CATEGORY_LABEL[cat as keyof typeof CATEGORY_LABEL] ?? cat}
            </button>
          );
        })}
      </div>

      {current ? (
        <div className="flex flex-col items-center gap-5">
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            className="flex min-h-[260px] w-full max-w-xl flex-col items-center justify-center rounded-2xl border border-border/60 bg-card/40 p-8 text-center shadow-luxe backdrop-blur transition-colors hover:border-gold/40"
          >
            {!flipped ? (
              <>
                <span className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {current.partOfSpeech ?? "word"} · tap to flip
                </span>
                {language === "Japanese" && showFurigana ? (
                  <span className="font-display text-4xl text-foreground leading-tight">
                    <FuriganaText text={current.word} mode="above" script="hiragana" />
                  </span>
                ) : (
                  <span className="font-display text-4xl text-foreground">{current.word}</span>
                )}
                {current.romanization && (
                  <span className="mt-2 font-mono text-sm text-gold/80">{current.romanization}</span>
                )}
              </>
            ) : (
              <>
                <span className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
                  ✦ translation
                </span>
                <span className="font-display text-3xl text-foreground">{current.translation}</span>

                {japaneseConjugation && (
                  <div className="mt-4 w-full max-w-sm space-y-2">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <span className="rounded-full border border-border/60 bg-background/40 px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
                        て <span className="text-foreground">{japaneseConjugation.teForm ?? japaneseConjugation.bases.te}</span>
                      </span>
                      <span className="rounded-full border border-border/60 bg-background/40 px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
                        た <span className="text-foreground">{japaneseConjugation.taForm ?? japaneseConjugation.forms.plain.past}</span>
                      </span>
                      <span className="rounded-full border border-border/60 bg-background/40 px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
                        -masu <span className="text-foreground">{japaneseConjugation.forms.polite.present}</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {(["a", "i", "u", "e", "te"] as const).map((b) => (
                        <span key={b} className="rounded-md bg-muted/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                          <span className="opacity-60 uppercase">{b}</span>{" "}
                          <span className="text-foreground">{japaneseConjugation.bases[b]}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {current.example && (
                  <div className="mt-5 rounded-xl border border-border/50 bg-background/30 px-4 py-3">
                    <p className="font-display text-base italic text-foreground">
                      {language === "Japanese" && showFurigana ? (
                        <FuriganaText text={current.example} mode="above" script="hiragana" />
                      ) : (
                        `"${current.example}"`
                      )}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      {current.exampleTranslation}
                    </p>
                  </div>
                )}
              </>
            )}
          </button>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); speak(current.word); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/90 hover:border-gold/60 hover:text-gold"
            >
              <Volume2 className="h-3 w-3" /> Pronounce
            </button>
            {language === "Japanese" && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowFurigana((v) => !v); }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${
                  showFurigana
                    ? "border-gold/50 bg-gold/10 text-gold"
                    : "border-border/70 bg-background/40 text-muted-foreground hover:border-gold/40"
                }`}
              >
                あ Furigana {showFurigana ? "ON" : "OFF"}
              </button>
            )}
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {reviewedCount} reviewed this session
            </span>
          </div>

          {flipped && (
            <div className="grid w-full max-w-xl grid-cols-4 gap-2">
              {GRADE_BUTTONS.map((b, i) => (
                <button
                  key={b.grade}
                  type="button"
                  onClick={() => grade(b.grade)}
                  className={`flex flex-col items-center rounded-xl border px-2 py-3 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${b.cls}`}
                >
                  {b.label}
                  <span className="mt-0.5 text-[9px] opacity-70">{b.hint}</span>
                  <span className="mt-1 rounded border border-current/30 px-1 text-[8px] opacity-60">{i + 1}</span>
                </button>
              ))}
            </div>
          )}

          {japaneseConjugation && (
            <div className="mt-4 w-full max-w-xl">
              <div className="mb-3 flex items-center gap-2 px-1">
                <BookOpen className="h-3.5 w-3.5 text-gold" />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Verb structure · {japaneseConjugation.infinitive} · {japaneseConjugation.english}
                </span>
              </div>
              <JapaneseConjugationCard set={japaneseConjugation} onSpeak={speak} />
            </div>
          )}

          {conjugation && personLabels && (
            <div className="mt-4 w-full max-w-xl overflow-hidden rounded-xl border border-border/60 bg-card/40">
              <div className="border-b border-border/50 bg-card/60 px-4 py-3 font-display text-lg">
                {conjugation.infinitive}
              </div>
              <div className="grid grid-cols-2 gap-px border-t border-border/50 bg-border/30">
                <div className="bg-card/40 px-4 py-3">
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Gerund</div>
                  <div className="mt-0.5 font-display text-[15px]">{conjugation.gerund}</div>
                </div>
                <div className="bg-card/40 px-4 py-3">
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Past participle</div>
                  <div className="mt-0.5 font-display text-[15px]">{conjugation.pastParticiple}</div>
                  <div className="mt-1 font-mono text-[10px] text-gold/80">{conjugation.perfectExample}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border/60 bg-card/30 p-14 text-center">
          <Sparkle className="h-6 w-6 text-gold" />
          <p className="font-display text-lg italic text-foreground">All caught up</p>
          <p className="font-mono text-[11px] text-muted-foreground">
            {allCards.length} cards in selected sections · none due right now
          </p>
        </div>
      )}
    </div>
  );
}
