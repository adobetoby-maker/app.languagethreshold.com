import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BookmarkPlus, X } from "lucide-react";
import { toast } from "sonner";
import { lookupWord } from "@/fns/word-lookup.functions";
import { useApp } from "@/state/app-state";

type Selection = { word: string; sentence: string; x: number; y: number };

/** A single vocabulary entry point shared by games, speaking, stories and every other app tab. */
export function GlobalVocabCapture() {
  const { state, dispatch } = useApp();
  const lookup = useServerFn(lookupWord);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [sourceSentence, setSourceSentence] = useState("");
  const [translation, setTranslation] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const capture = () => {
      if (open) return;
      const native = window.getSelection();
      const selected = native?.toString().trim() ?? "";
      if (!selected || selected.length > 80 || selected.includes("\n")) {
        setSelection(null);
        return;
      }
      const anchor = native?.anchorNode?.parentElement;
      if (anchor?.closest("input, textarea, [contenteditable=true], .word-card-pop")) return;
      const rect = native?.rangeCount ? native.getRangeAt(0).getBoundingClientRect() : null;
      setSelection({
        word: selected,
        sentence: anchor?.textContent?.trim().slice(0, 300) || selected,
        x: rect
          ? Math.min(window.innerWidth - 64, Math.max(64, rect.left + rect.width / 2))
          : window.innerWidth / 2,
        y: rect ? Math.max(60, rect.top - 8) : 80,
      });
    };
    document.addEventListener("mouseup", capture);
    document.addEventListener("touchend", capture);
    return () => {
      document.removeEventListener("mouseup", capture);
      document.removeEventListener("touchend", capture);
    };
  }, [open]);

  const showForm = () => {
    setWord(selection?.word ?? "");
    setSourceSentence(selection?.sentence ?? "");
    setTranslation("");
    setOpen(true);
    setSelection(null);
  };

  async function save() {
    const cleanWord = word.trim();
    if (!cleanWord || cleanWord.length > 80) {
      toast.error("Enter a word or short phrase (80 characters or fewer).");
      return;
    }
    setBusy(true);
    try {
      let gloss = translation.trim();
      if (!gloss) {
        const result = await lookup({
          data: {
            word: cleanWord,
            sentence: sourceSentence || cleanWord,
            language: state.selectedLanguage,
            nativeLanguage: state.nativeLanguage,
          },
        });
        gloss = result.card?.baseDefinition?.trim() ?? "";
      }
      if (!gloss) {
        toast.error("Add a meaning to save this word.");
        return;
      }
      dispatch({
        type: "ADD_VOCAB_ITEMS",
        lang: state.selectedLanguage,
        payload: [{ word: cleanWord, translation: gloss, category: "saved", correctCount: 0 }],
      });
      setOpen(false);
      toast.success(`Saved to My Vocab · ${state.selectedLanguage}`);
    } catch {
      toast.error("Word lookup is unavailable. Add a meaning and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {selection && !open && (
        <button
          type="button"
          onPointerDown={(event) => event.preventDefault()}
          onClick={showForm}
          style={{ left: selection.x, top: selection.y }}
          className="fixed z-[70] -translate-x-1/2 -translate-y-full rounded-full border border-gold/50 bg-card px-3 py-2 text-xs font-semibold text-gold shadow-xl"
          aria-label={`Save ${selection.word} to My Vocab`}
        >
          <BookmarkPlus className="mr-1 inline h-3.5 w-3.5" /> Save to My Vocab
        </button>
      )}
      <button
        type="button"
        onClick={showForm}
        className="fixed bottom-24 left-3 z-40 flex items-center gap-1.5 rounded-full border border-gold/40 bg-card/95 px-3 py-2 text-xs font-semibold text-gold shadow-lg backdrop-blur-sm desktop:bottom-5"
        aria-label="Add a word to My Vocab from this page"
      >
        <BookmarkPlus className="h-4 w-4" /> <span className="hidden sm:inline">Add word</span>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Add to My Vocab"
            className="w-full max-w-md rounded-2xl border border-gold/30 bg-card p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add to My Vocab</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Save a word or short phrase from any page. It will be available to flashcards and
              practice games in {state.selectedLanguage}.
            </p>
            <label className="mb-3 block text-sm">
              Word or phrase
              <input
                autoFocus
                maxLength={80}
                value={word}
                onChange={(event) => setWord(event.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
              />
            </label>
            <label className="mb-4 block text-sm">
              Meaning{" "}
              <span className="text-muted-foreground">(optional if AI lookup is available)</span>
              <input
                maxLength={160}
                value={translation}
                onChange={(event) => setTranslation(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void save();
                }}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground"
              />
            </label>
            <button
              type="button"
              onClick={() => void save()}
              disabled={busy || !word.trim()}
              className="w-full rounded-lg bg-gold px-4 py-2.5 font-semibold text-background disabled:opacity-50"
            >
              {busy ? "Looking up meaning…" : "Save word"}
            </button>
          </section>
        </div>
      )}
    </>
  );
}
