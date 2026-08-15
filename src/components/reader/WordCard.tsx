import { X } from "lucide-react";

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
};

/** Temporary WordCard restore so the app builds. Full card with furigana leveling returns next. */
export function WordCard({
  request,
  onClose,
}: {
  request: WordCardRequest;
  onClose: () => void;
  onXp?: (n: number) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-sm rounded-2xl border border-gold/50 bg-card p-6 shadow-luxe">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full border border-border/60 p-1.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Word</div>
        <div className="mt-2 font-display text-3xl text-foreground">{request.word}</div>
        {request.sentence && (
          <p className="mt-4 text-sm italic text-muted-foreground">"{request.sentence}"</p>
        )}
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Full lookup · tutor · save restoring next
        </p>
      </div>
    </div>
  );
}
