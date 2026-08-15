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
import { useServerFn } from "@/tanstack/react-start";
import { getCategoryBlocks } from "@/lib/flashcard-blocks";
import { translatePhrases } from "@/fns/phrase-translate.functions";
import { configureUtterance } from "@/lib/voices";
import { needsRemoteTTS, speakRemote } from "@/lib/tts";
import { FREQUENCY_CONJUGATIONS, type ConjugationSet } from "@/data/frequency-conjugations";
import { getJapaneseConjugation, type JapaneseConjugationSet } from "@/data/japanese-conjugations";
import { FuriganaText } from "@/components/reader/FuriganaText";
import { JapaneseConjugationCard } from "./JapaneseConjugationCard";
import type { SrsGrade } from "@/lib/srs";

const FURIGANA_FC_KEY = "lt.flashcards.furigana.v1";
