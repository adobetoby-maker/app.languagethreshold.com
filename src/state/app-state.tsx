import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { SM2Card } from "./sm2";
import type { NextTripPlan } from "@/data/travel-destinations";
import {
  evaluatePracticeStreak,
  initialPracticeStreak,
  recordPracticeCompletion,
  startTravelBreak,
  type PracticeStreakData,
} from "@/lib/practice-streak";
import {
  applyMasteryIncrement,
  applyRegressionReset,
  bumpVocabRevision,
  deriveUserVocab,
  includeLegacyVocab,
  mergeVocabItems,
  reconcileVocabByLanguage,
  replaceLanguageVocab,
  type VocabByLanguage,
  type VocabItem,
  type VocabRevisionByLanguage,
} from "./vocab-store";

export type Language =
  | "Spanish"
  | "French"
  | "German"
  | "Italian"
  | "Japanese"
  | "Chinese"
  | "Korean"
  | "Portuguese"
  | "Pashto"
  | "English";

export const LANGUAGES: Language[] = [
  "Spanish",
  "French",
  "German",
  "Italian",
  "Japanese",
  "Chinese",
  "Korean",
  "Portuguese",
  "Pashto",
  "English",
];
