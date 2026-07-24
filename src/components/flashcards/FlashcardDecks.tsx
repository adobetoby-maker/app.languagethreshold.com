import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Layers, Loader2 } from "lucide-react";
import { useApp, type Language } from "@/state/app-state";
import { getDueCount } from "@/state/sm2";
import { getCategoryBlocks } from "@/lib/flashcard-blocks";
import { translatePhrases } from "@/fns/phrase-translate.functions";
import { FlashcardStudy, type StudyCard } from "./FlashcardStudy";

// Caps how many words from a category block get translated (and thus
// studied) in one sitting — keeps the AI translation batch bounded. Shown
// explicitly in the tile ("30 of 47 words") rather than silently truncated.
const MAX_CARDS_PER_BLOCK = 30;

interface DeckTile {
  id: string;
  label: string;
  wordCount: number;
  totalWords: number;
  dueCount: number;
  isMyVocab: boolean;
}

export function FlashcardDecks() {
  const { state } = useApp();
  const translate = useServerFn(translatePhrases);
  const [session, setSession] = useState<{
    blockId: string;
    title: string;
    cards: StudyCard[];
    isMyVocab: boolean;
    backLanguage: Language;
  } | null>(null);
  const [loadingBlock, setLoadingBlock] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categoryBlocks = useMemo(() => getCategoryBlocks(), []);

  const myVocabCards: StudyCard[] = state.userVocab.map((v) => ({
    key: v.word,
    front: v.word,
    back: v.translation,
  }));

  const tiles: DeckTile[] = [
    {
      id: "myVocab",
      label: "My Vocab",
      wordCount: myVocabCards.length,
      totalWords: myVocabCards.length,
      dueCount: getDueCount(
        state.vocabSM2,
        myVocabCards.map((c) => `myVocab:${c.key}`),
      ),
      isMyVocab: true,
    },
    ...categoryBlocks.map((b) => {
      const shown = Math.min(b.words.length, MAX_CARDS_PER_BLOCK);
      return {
        id: b.id,
        label: b.label,
        wordCount: shown,
        totalWords: b.words.length,
        dueCount: getDueCount(
          state.vocabSM2,
          b.words.slice(0, MAX_CARDS_PER_BLOCK).map((w) => `${b.id}:${w}`),
        ),
        isMyVocab: false,
      };
    }),
  ];

  async function openBlock(tile: DeckTile) {
    setError(null);
    if (tile.isMyVocab) {
      if (myVocabCards.length === 0) {
        setError('Save a word with "My Vocab" in the Reader first — then it shows up here.');
        return;
      }
      setSession({
        blockId: "myVocab",
        title: "My Vocab",
        cards: myVocabCards,
        isMyVocab: true,
        backLanguage: "English",
      });
      return;
    }

    const block = categoryBlocks.find((b) => b.id === tile.id);
    if (!block || block.words.length === 0) return;

    setLoadingBlock(tile.id);
    try {
      const words = block.words.slice(0, MAX_CARDS_PER_BLOCK);
      const chunks: string[][] = [];
      for (let i = 0; i < words.length; i += 8) chunks.push(words.slice(i, i + 8));

      const results = await Promise.all(
        chunks.map((chunk) =>
          translate({
            data: {
              phrases: chunk,
              targetLanguage: state.selectedLanguage,
              context: block.label,
            },
          }),
        ),
      );

      const cards: StudyCard[] = [];
      for (const res of results) {
        if (res.error || !res.phrases) continue;
        for (const p of res.phrases) cards.push({ key: p.english, front: p.english, back: p.translation });
      }

      if (cards.length === 0) {
        setError("Couldn't translate this deck right now — try again.");
        return;
      }
      setSession({
        blockId: block.id,
        title: block.label,
        cards,
        isMyVocab: false,
        backLanguage: state.selectedLanguage,
      });
    } finally {
      setLoadingBlock(null);
    }
  }

  if (session) {
    return (
      <FlashcardStudy
        blockId={session.blockId}
        title={session.title}
        cards={session.cards}
        isMyVocab={session.isMyVocab}
        backLanguage={session.backLanguage}
        onExit={() => setSession(null)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">
          ⌘ Flashcards
        </div>
        <h2 className="mt-1 font-display text-3xl font-semibold">Pick a deck</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Due cards surface first. "Not yet" brings a word back sooner — "Got it" grows the gap.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => (
          <button
            key={tile.id}
            onClick={() => openBlock(tile)}
            disabled={tile.totalWords === 0 || loadingBlock === tile.id}
            className="group flex flex-col items-stretch gap-3 rounded-2xl border border-border/60 bg-card/40 p-5 text-left transition-all hover:border-gold/60 hover:bg-card/70 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <div className="flex items-center justify-between">
              <Layers className="h-6 w-6 text-gold" strokeWidth={1.6} />
              {tile.dueCount > 0 && (
                <span className="rounded-full border border-gold/40 bg-gold/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
                  {tile.dueCount} due
                </span>
              )}
            </div>
            <div>
              <div className="font-display text-lg font-semibold text-foreground">{tile.label}</div>
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {loadingBlock === tile.id ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Preparing…
                  </span>
                ) : tile.totalWords === 0 ? (
                  "No words yet"
                ) : tile.wordCount < tile.totalWords ? (
                  `${tile.wordCount} of ${tile.totalWords} words`
                ) : (
                  `${tile.wordCount} words`
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
