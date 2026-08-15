import { useCallback, useEffect, useMemo, useState } from "react";
import { Layers, RotateCcw, Volume2, Sparkle, Trash2, BookOpen, Shuffle } from "lucide-react";
import { useApp } from "@/state/app-state";
import {
  useFlashcards,
  FLASHCARD_CATEGORIES,
  CATEGORY_LABEL,
  type FlashcardEntry,
  type FlashcardCategory,
} from "@/state/flashcard-state";
import { nextSectionSelection } from "@/state/section-selection";
import { useSpeech } from "@/state/speech-state";
import { useServerFn } from "@tanstack/react-start";
import { getCategoryBlocks } from "@/lib/flashcard-blocks";
import { translatePhrases } from "@/fns/phrase-translate.functions";
import { configureUtterance } from "@/lib/voices";
import { needsRemoteTTS, speakRemote } from "@/lib/tts";
import { FREQUENCY_CONJUGATIONS, type ConjugationSet } from "@/data/frequency-conjugations";
import type { SrsGrade } from "@/lib/srs";

/** Temporary stub while full file is restored. */
export function FlashcardsStudio() {
  return (
    <div className="fade-in mx-auto flex min-h-[40vh] w-full max-w-5xl flex-col items-center justify-center gap-3 p-8 text-center">
      <Layers className="h-8 w-8 text-gold" />
      <h1 className="font-display text-2xl text-foreground">Flashcards</h1>
      <p className="max-w-md font-mono text-sm text-muted-foreground">
        Restoring full study view (furigana toggle + Japanese verb structure). Hard-refresh in a minute.
      </p>
    </div>
  );
}
