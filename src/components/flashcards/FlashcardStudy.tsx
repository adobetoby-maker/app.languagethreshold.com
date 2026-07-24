import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, X, RotateCcw } from "lucide-react";
import { useApp, type Language } from "@/state/app-state";
import { updateSM2, sortByDue } from "@/state/sm2";
import { configureUtterance } from "@/lib/voices";
import { needsRemoteTTS, speakRemote } from "@/lib/tts";

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

export interface StudyCard {
  key: string; // stable id within the block (the English word)
  front: string;
  back: string;
}

function calcStars(wrongCount: number): 1 | 2 | 3 {
  if (wrongCount === 0) return 3;
  if (wrongCount <= 2) return 2;
  return 1;
}

export function FlashcardStudy({
  blockId,
  title,
  cards,
  isMyVocab,
  backLanguage,
  onExit,
}: {
  blockId: string;
  title: string;
  cards: StudyCard[];
  isMyVocab?: boolean;
  /** Language the `back` face of each card is actually written in — category
   * decks flip English→target, but My Vocab cards are saved target-language
   * word→English gloss, so the back face there is English, not the target. */
  backLanguage: Language;
  onExit: () => void;
}) {
  const { state, dispatch } = useApp();
  const [queue, setQueue] = useState<StudyCard[]>(() =>
    sortByDue(state.vocabSM2, cards, (c) => `${blockId}:${c.key}`),
  );
  const [flipped, setFlipped] = useState(false);
  const [gotIt, setGotIt] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const total = cards.length;
  const current = queue[0];
  const done = queue.length === 0;
  const voiceUnavailable = useRef(false);

  const speak = useCallback(
    (text: string) => {
      const locale = LOCALE[backLanguage] ?? "es-CR";
      if (needsRemoteTTS(locale)) {
        void speakRemote(text, locale, { rate: 0.9 });
        return;
      }
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        voiceUnavailable.current = true;
        return;
      }
      const utter = new SpeechSynthesisUtterance(text);
      configureUtterance(utter, locale, undefined);
      utter.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    },
    [backLanguage],
  );

  useEffect(() => {
    if (flipped && current) speak(current.back);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, current?.key]);

  function grade(grade: 0 | 3 | 5) {
    if (!current) return;
    const key = `${blockId}:${current.key}`;
    const card = updateSM2(state.vocabSM2, key, grade);
    dispatch({ type: "UPDATE_SM2_CARD", payload: { key, card } });
    if (isMyVocab && grade >= 3) {
      dispatch({ type: "MASTER_VOCAB_WORD", payload: current.key });
    }
    if (grade >= 3) {
      dispatch({ type: "ADD_XP", payload: 1 });
      setQueue((q) => q.slice(1));
      setGotIt((n) => n + 1);
    } else {
      setQueue((q) => [...q.slice(1), current]);
      setWrongCount((n) => n + 1);
    }
    setFlipped(false);
  }

  if (done) {
    const stars = calcStars(wrongCount);
    return (
      <div className="mx-auto max-w-sm space-y-6 px-5 pt-10 text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">
          {title} — Complete
        </div>
        <div className="text-5xl">
          {"★".repeat(stars)}
          <span className="text-muted-foreground/30">{"★".repeat(3 - stars)}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {Math.max(0, total - wrongCount)} of {total} learned on the first try
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              setQueue(sortByDue(state.vocabSM2, cards, (c) => `${blockId}:${c.key}`));
              setGotIt(0);
              setWrongCount(0);
              setFlipped(false);
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-4 py-2.5 font-mono text-xs uppercase tracking-[0.18em] text-gold transition-colors hover:bg-gold/20"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Study Again
          </button>
          <button
            onClick={onExit}
            className="rounded-full border border-border/60 bg-background/40 px-4 py-2.5 font-mono text-xs uppercase tracking-[0.18em] text-foreground/80 transition-colors hover:border-gold/40"
          >
            Back to Decks
          </button>
        </div>
      </div>
    );
  }

  const progress = total === 0 ? 0 : gotIt / total;

  return (
    <div className="mx-auto max-w-sm px-5 pt-6 pb-16">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
          {title}
        </span>
        <button
          onClick={onExit}
          aria-label="Exit"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-border/40">
        <div
          className="h-full rounded-full bg-gold transition-all"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      <p className="mb-5 text-center font-mono text-[11px] text-muted-foreground">
        {gotIt} of {total} learned
      </p>

      <button
        onClick={() => !flipped && setFlipped(true)}
        className="flex min-h-[220px] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-gold/40 bg-card/60 p-8 text-center transition-colors hover:border-gold/70"
      >
        {!flipped ? (
          <span className="font-display text-2xl font-semibold text-foreground">
            {current.front}
          </span>
        ) : (
          <>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
              {backLanguage}
            </span>
            <span className="font-display text-2xl font-semibold text-foreground">
              {current.back}
            </span>
            <span
              role="button"
              aria-label="Pronounce"
              onClick={(e) => {
                e.stopPropagation();
                speak(current.back);
              }}
              className="mt-1 inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-gold/50 hover:text-gold"
            >
              <Volume2 className="h-3 w-3" /> Pronounce
            </span>
          </>
        )}
      </button>

      {!flipped && (
        <p className="mt-4 text-center font-mono text-[11px] text-muted-foreground">
          Tap the card to reveal the {backLanguage} word
        </p>
      )}

      {flipped && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => grade(0)}
            className="flex-1 rounded-full bg-rose-500/15 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-rose-300 transition-colors hover:bg-rose-500/25"
          >
            Not yet
          </button>
          <button
            onClick={() => grade(5)}
            className="shrink-0 rounded-full bg-amber-500/15 px-3 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-amber-300 transition-colors hover:bg-amber-500/25"
          >
            ⚡
          </button>
          <button
            onClick={() => grade(3)}
            className="flex-1 rounded-full bg-emerald-500/15 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-emerald-300 transition-colors hover:bg-emerald-500/25"
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
}
