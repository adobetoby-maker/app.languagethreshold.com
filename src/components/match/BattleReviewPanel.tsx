import { useState } from "react";
import { Volume2, X } from "lucide-react";
import { toast } from "sonner";
import { useApp, type Language } from "@/state/app-state";
import { useMatch } from "@/state/match-state";
import type { ReviewedWord } from "./BattleArena";
import { configureUtterance } from "@/lib/voices";
import { needsRemoteTTS, speakRemote } from "@/lib/tts";

const SPEECH_LOCALE: Record<Language, string> = {
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

interface Props {
  words: ReviewedWord[];
  onPlayAgain: () => void;
  onHome: () => void;
  onClose: () => void;
}

export function BattleReviewPanel({ words, onPlayAgain, onHome, onClose }: Props) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl border border-gold/40 bg-[#0a121f]/95 p-6 shadow-[0_0_80px_-15px_rgba(201,168,76,0.55)] match-result-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close review"
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/70 hover:border-gold/60 hover:text-gold"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.3em] text-gold">
          📖 After-Battle Review
        </div>
        <h2 className="font-display text-3xl italic text-white">Words from This Battle</h2>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-white/55">
          {words.length} word{words.length === 1 ? "" : "s"} encountered · save any to your
          vocabulary
        </p>

        <div className="mt-5 flex-1 space-y-3 overflow-y-auto pr-1">
          {words.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center font-mono text-xs uppercase tracking-[0.25em] text-white/55">
              No rounds were played.
            </div>
          )}
          {words.map((w, i) => (
            <WordRow key={i} word={w} />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onPlayAgain}
            className="rounded-full bg-gradient-to-r from-[#E5C158] via-gold to-[#E5C158] px-6 py-2.5 font-display italic text-base text-[#1a1208] shadow-[0_0_30px_-5px_rgba(201,168,76,0.6)] transition-transform hover:scale-105"
          >
            ⚔️ Play Again
          </button>
          <button
            onClick={onHome}
            className="rounded-full border border-white/30 px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.25em] text-white/80 transition-colors hover:border-gold/60 hover:text-gold"
          >
            🏠 Home
          </button>
        </div>
      </div>
    </div>
  );
}

function WordRow({ word }: { word: ReviewedWord }) {
  const { saveVocabWord, savedVocab } = useMatch();
  const { dispatch } = useApp();
  const alreadySaved = savedVocab.some(
    (v) => v.word.toLowerCase() === word.word.toLowerCase() && v.language === word.language,
  );
  const [saved, setSaved] = useState(alreadySaved);

  const speak = () => {
    try {
      if (
        typeof window === "undefined" ||
        !window.speechSynthesis ||
        typeof SpeechSynthesisUtterance === "undefined"
      ) {
        return;
      }
      if (needsRemoteTTS(SPEECH_LOCALE[word.language])) {
        void speakRemote(word.word, SPEECH_LOCALE[word.language], { rate: 0.9 });
        return;
      }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word.word);
      configureUtterance(u, SPEECH_LOCALE[word.language]);
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  };

  const handleSave = () => {
    if (saved) return;
    const ok = saveVocabWord({
      word: word.word,
      definition: word.correctDefinition,
      language: word.language,
      cefr: word.cefr,
    });
    if (ok) {
      setSaved(true);
      dispatch({ type: "ADD_XP", payload: 2 });
      toast(`Saved “${word.word}”`, {
        description: "Added to Battle Vocabulary",
        className: "achievement-toast",
      });
    } else {
      setSaved(true);
    }
  };

  return (
    <div
      className={`rounded-2xl border p-4 ${
        word.playerCorrect
          ? "border-emerald-500/30 bg-emerald-500/[0.06]"
          : "border-red-500/30 bg-red-500/[0.06]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display italic text-2xl text-gold drop-shadow">
              {word.word}
            </h3>
            <button
              onClick={speak}
              aria-label={`Pronounce ${word.word}`}
              className="shrink-0 rounded-full border border-gold/40 bg-white/5 p-1.5 text-gold transition-colors hover:bg-gold/15"
            >
              <Volume2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-1.5 text-sm leading-snug text-white/85">{word.correctDefinition}</p>
          <div className="mt-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.22em] text-white/50">
            <span>Round {word.round}</span>
            <span>·</span>
            <span>{word.cefr}</span>
            <span>·</span>
            <span>{word.language}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {word.playerCorrect ? (
            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-200">
              Nailed it ✓
            </span>
          ) : (
            <span className="rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-red-200">
              Missed
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saved}
            className={`rounded-full border px-3 py-1 font-mono text-[9px] uppercase tracking-[0.22em] transition-colors ${
              saved
                ? "border-gold/40 bg-gold/15 text-gold cursor-default"
                : "border-white/20 text-white/80 hover:border-gold/60 hover:text-gold"
            }`}
          >
            {saved ? "Saved ★" : "Save to Vocab"}
          </button>
        </div>
      </div>
    </div>
  );
}
