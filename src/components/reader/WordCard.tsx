import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { X, Volume2, MessageCircle, Sparkle, BookmarkPlus, BookmarkCheck } from "lucide-react";
import { useSpeech } from "@/state/speech-state";
import { useTutor } from "@/state/tutor-state";
import { useApp, type Language } from "@/state/app-state";
import { configureUtterance } from "@/lib/voices";
import { needsRemoteTTS, speakRemote } from "@/lib/tts";
import { FuriganaText } from "./FuriganaText";

export type WordCardRequest = {
  word: string;
  sentence?: string;
  language?: string;
  textId?: string;
  textTitle?: string;
  sentenceIndex?: number;
  chapterIndex?: number;
  passage?: string;
  x?: number;
  y?: number;
};

export type WordCardData = {
  word: string;
  translation?: string;
  romanization?: string;
  partOfSpeech?: string;
  example?: string;
  exampleTranslation?: string;
  alternativeReadings?: string[];
  mnemonic?: string;
};

const LOCALE: Record<string, string> = {
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

export function WordCard({
  request,
  onClose,
  onXp,
}: {
  request: WordCardRequest;
  onClose: () => void;
  onXp?: (n: number) => void;
}) {
  const { state } = useApp();
  const lang = (request.language as Language) || state.selectedLanguage;
  const isCjk = lang === "Japanese" || lang === "Chinese" || lang === "Korean";
  const [saved, setSaved] = useState(false);

  function speak(text: string) {
    const locale = LOCALE[lang] ?? "en-US";
    if (needsRemoteTTS(locale)) {
      void speakRemote(text, locale, { rate: 0.9 });
      return;
    }
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const utter = new SpeechSynthesisUtterance(text);
    configureUtterance(utter, locale, undefined);
    utter.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="word-card-pop relative z-50 w-full max-w-sm overflow-hidden rounded-2xl border border-gold/50 bg-card/95 p-6 shadow-luxe backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <style>{
          `.word-card-pop ruby { display: ruby !important; ruby-position: over; ruby-align: center; }
           .word-card-pop rt, .word-card-pop .furigana-rt {
             display: ruby-text !important; font-size: 0.5em; line-height: 1;
             color: color-mix(in oklab, var(--gold) 70%, var(--muted-foreground));
             pointer-events: none; user-select: none;
           }
           .word-card-pop rb, .word-card-pop .furigana-base { vertical-align: baseline; }
           .word-card-pop .furigana-text, .word-card-pop h3 { line-height: 1.15; }`
        }</style>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full border border-border/60 p-1.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {lang} · word
        </div>

        <h3 className="mt-2 font-display text-3xl leading-[1.15] text-foreground">
          {isCjk && lang === "Japanese" ? (
            <FuriganaText text={request.word} mode="above" script="hiragana" />
          ) : (
            request.word
          )}
        </h3>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => speak(request.word)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-foreground/90 hover:border-gold/60 hover:text-gold"
          >
            <Volume2 className="h-3 w-3" /> Pronounce
          </button>
          <button
            type="button"
            onClick={() => {
              setSaved(true);
              onXp?.(5);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-foreground/90 hover:border-gold/60 hover:text-gold"
          >
            {saved ? <BookmarkCheck className="h-3 w-3 text-gold" /> : <BookmarkPlus className="h-3 w-3" />}
            {saved ? "Saved" : "Save"}
          </button>
        </div>

        {request.sentence && (
          <div className="mt-5 rounded-xl border border-border/50 bg-background/30 px-4 py-3">
            <p className="font-display text-sm italic text-foreground">
              {isCjk && lang === "Japanese" ? (
                <FuriganaText text={request.sentence} mode="above" script="hiragana" />
              ) : (
                `"${request.sentence}"`
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
