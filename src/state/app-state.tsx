import { WordCardCacheProvider } from "./word-card-cache";
import { ProfileRecoveryContext } from "./profile-recovery-context";
import {
  recoverLegacyProfile,
  type LegacyProfilePatch,
  type ProfileRecoveryKind,
} from "@/lib/legacy-profile-recovery";
import { createDeferredAuthSync } from "@/lib/deferred-auth-sync";
import type { AppTab } from "@/lib/app-navigation";
import { useAuth } from "./auth-state";
import {
  readProfileSnapshot,
  saveProfileSnapshot,
  hasUnassignedProfileSnapshot,
} from "@/lib/profile-device-snapshot";
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
import {
  readDarkModePreference,
  saveDarkModePreference,
  THEME_PREFERENCE_KEY,
} from "@/lib/theme-preference";
import { mergeCore30Log, type Core30Log, type Core30Way } from "@/lib/core30-plan";
import { core30ScopeKey, claimLegacyCore30, type Core30ProgressContext } from "@/lib/core30-scope";
import {
  core30RecordReview,
  core30SetMastered,
  core30SetStartDate,
  core30StepOpened,
  core30WayOpened,
} from "@/lib/core30-state";
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

import { LANGUAGES, NATIVE_LANGUAGES, type Language, type NativeLanguage } from "@/data/languages";
export { LANGUAGES, NATIVE_LANGUAGES, type Language, type NativeLanguage } from "@/data/languages";

export type TabKey = AppTab;

// Learner CEFR-ish self level (used elsewhere for AI prompts)
export type Level = "Beginner" | "Intermediate" | "Advanced" | "Fluent";

// Gamified XP tier
export type XpTier = "Beginner 🌱" | "Apprentice 📖" | "Scholar 🎓" | "Linguist 🗣️" | "Maestro ✦";

const TIERS: { min: number; max: number; name: XpTier }[] = [
  { min: 0, max: 99, name: "Beginner 🌱" },
  { min: 100, max: 299, name: "Apprentice 📖" },
  { min: 300, max: 699, name: "Scholar 🎓" },
  { min: 700, max: 1499, name: "Linguist 🗣️" },
  { min: 1500, max: Infinity, name: "Maestro ✦" },
];

export function tierForXp(xp: number): XpTier {
  return (TIERS.find((t) => xp >= t.min && xp <= t.max) ?? TIERS[0]).name;
}

export function nextTierProgress(xp: number) {
  const i = TIERS.findIndex((t) => xp >= t.min && xp <= t.max);
  const cur = TIERS[i];
  const nxt = TIERS[i + 1];
  if (!nxt) {
    return { current: cur.name, next: null, pct: 100, xpToNext: 0, base: cur.min, target: cur.min };
  }
  const span = nxt.min - cur.min;
  const into = xp - cur.min;
  return {
    current: cur.name,
    next: nxt.name,
    pct: Math.min(100, Math.round((into / span) * 100)),
    xpToNext: nxt.min - xp,
    base: cur.min,
    target: nxt.min,
  };
}

export interface Note {
  id: string;
  text: string;
  createdAt: number;
}

export interface Achievement {
  id: string;
  title: string;
  hint: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-word", title: "First Word! 🔤", hint: "Open your first word card" },
  { id: "deep-reader", title: "Deep Reader 📚", hint: "Save 5 notes" },
  { id: "good-listener", title: "Good Listener 👂", hint: "Listen to 10 sentences" },
  { id: "grammar-apprentice", title: "Grammar Apprentice ✏️", hint: "Complete your first lesson" },
  { id: "grammar-wizard", title: "Grammar Wizard 🧙", hint: "Complete one full CEFR level" },
  { id: "curious-learner", title: "Curious Learner 🧠", hint: "Send 10 tutor messages" },
  { id: "first-conversation", title: "First Conversation 🗣️", hint: "5 conversation exchanges" },
  { id: "conversationalist", title: "Conversationalist 💬", hint: "20 conversation exchanges" },
  { id: "culture-buff", title: "Culture Buff 🌍", hint: "Read every Culture Series text" },
  { id: "author", title: "Author ✍️", hint: "Add a custom text to your library" },
  { id: "polyglot", title: "Polyglot ⭐", hint: "Switch to 3 different languages" },
  { id: "week-streak", title: "Week Streak 🔥", hint: "Keep a 7-day streak" },
  { id: "first-blood", title: "First Blood ⚔️", hint: "Play your first Language Match" },
  { id: "victorious", title: "Victorious 🏆", hint: "Win your first Language Match" },
  { id: "on-a-roll", title: "On a Roll 🔥", hint: "Win 3 matches in a row" },
  { id: "resilient", title: "Resilient 💪", hint: "Lose, then win the next match" },
  { id: "long-game", title: "The Long Game 🕰️", hint: "Survive to Round 7+ in a single match" },
  { id: "silver-tongue", title: "Silver Tongue 🥈", hint: "Reach Silver rank" },
  { id: "golden-word", title: "Golden Word 🥇", hint: "Reach Gold rank" },
  { id: "platinum-standard", title: "Platinum Standard 💎", hint: "Reach Platinum rank" },
  { id: "beyond-diamond", title: "Beyond Diamond 💠", hint: "Reach Diamond rank" },
  { id: "undisputed", title: "Undisputed 🏆", hint: "Reach Champion rank" },
  { id: "unreal", title: "UNREAL 🌟", hint: "Reach Unreal rank" },
  {
    id: "first-sentence",
    title: "First Real Sentence! 🗣️✨",
    hint: "Use your own vocab word with a grammar pattern in Pen Pal",
  },
];

export const VOCAB_MASTERY_THRESHOLD = 5;

export interface UserVocabItem {
  word: string;
  translation: string;
  category: string;
  correctCount: number;
  moduleId?: string;
}

export interface AppState {
  selectedLanguage: Language;
  nativeLanguage: NativeLanguage;
  darkMode: boolean;
  currentTab: TabKey;
  xp: number;
  streak: number;
  lastActiveDate: string | null;
  lastPracticeDate: string | null;
  lastPracticeDateByLanguage: Partial<Record<Language, string>>;
  practiceStreak: PracticeStreakData;
  practiceReminderLanguage: Language | null;
  level: Level;
  tier: XpTier;
  achievements: string[];
  userNotes: Note[];
  vocabAnswers: string[];
  vocabByLanguage: VocabByLanguage<Language>;
  vocabRevisionsByLanguage: VocabRevisionByLanguage<Language>;
  userVocab: UserVocabItem[];
  vocabLang: Language | null;
  patternProgress: Record<string, number>;
  vocabSM2: Record<string, SM2Card>;
  wordsLookedUp: number;
  notesSaved: number;
  tutorMessages: number;
  conversationExchanges: number;
  lessonsCompleted: number;
  customTextsAdded: number;
  lettersWritten: number;
  cultureRead: string[];
  languagesUsed: Language[];
  cefrLevelsCompleted: string[];
  speakSecondsByLang: Partial<Record<Language, number>>;
  xpSessions: { date: string; xp: number }[];
  challengesCleared: number;
  recentChallenges: ClearedChallenge[];
  pendingLevelUp: XpTier | null;
  purchasedModules: string[];
  activeModuleId: string | null;
  moduleAssignments: Record<string, string>;
  favoriteTeam: string | null;
  departureDate: string | null;
  nextTrips: Partial<Record<Language, NextTripPlan>>;
  speakingFocusByLanguage: Partial<
    Record<Language, { missionId: string; title: string; updatedAt: string }>
  >;
  onboardingComplete: boolean;
  lessonProgress: Record<string, number>;
  core30Log: Core30Log;
  hydrated: boolean;
}

export interface ClearedChallenge {
  id: string;
  kind: "grammar" | "reach";
  hint: string;
  sentence: string;
  language: Language;
  xp: number;
  clearedAt: number;
}

export type AppAction =
  | { type: "RECOVER_PROFILE_CATEGORY"; payload: LegacyProfilePatch }
  | { type: "HYDRATE"; payload: Partial<AppState> }
  | { type: "SET_LANGUAGE"; payload: Language }
  | { type: "SET_NATIVE_LANGUAGE"; payload: NativeLanguage }
  | { type: "TOGGLE_DARK_MODE" }
  | { type: "SET_DARK_MODE"; payload: boolean }
  | { type: "SET_TAB"; payload: TabKey }
  | { type: "ADD_XP"; payload: number }
  | { type: "SET_LAST_ACTIVE_DATE"; payload: string }
  | { type: "EVALUATE_PRACTICE_STREAK"; payload: string }
  | { type: "MARK_PRACTICE"; payload?: { language: Language } }
  | { type: "START_TRAVEL_BREAK"; payload: { days: number } }
  | { type: "SET_REMINDER_LANGUAGE"; payload: Language | null }
  | { type: "SET_LEVEL"; payload: Level }
  | { type: "ADD_ACHIEVEMENT"; payload: string }
  | { type: "ADD_NOTE"; payload: Note }
  | {
      type: "INC_COUNTER";
      payload: keyof Pick<
        AppState,
        | "wordsLookedUp"
        | "notesSaved"
        | "tutorMessages"
        | "conversationExchanges"
        | "lessonsCompleted"
        | "customTextsAdded"
        | "lettersWritten"
      >;
    }
  | { type: "MARK_CULTURE_READ"; payload: string }
  | { type: "MARK_CEFR_COMPLETE"; payload: string }
  | { type: "ADD_SPEAK_SECONDS"; payload: { lang: Language; seconds: number } }
  | { type: "RECORD_CHALLENGE"; payload: ClearedChallenge }
  | { type: "DISMISS_LEVEL_UP" }
  | { type: "PURCHASE_MODULE"; payload: string }
  | { type: "SET_ACTIVE_MODULE"; payload: string | null }
  | { type: "SET_MODULE_ASSIGNMENT"; payload: { moduleId: string; assignmentId: string | null } }
  | { type: "SET_FAVORITE_TEAM"; payload: string | null }
  | { type: "SET_DEPARTURE_DATE"; payload: string | null }
  | {
      type: "SET_NEXT_TRIP";
      payload: { language: Language; plan: NextTripPlan | null };
    }
  | {
      type: "SET_SPEAKING_FOCUS";
      payload: { language: Language; missionId: string; title: string };
    }
  | { type: "COMPLETE_ONBOARDING" }
  | {
      type: "SET_USER_VOCAB";
      payload: { answers: string[]; vocab: UserVocabItem[]; lang: Language };
    }
  | { type: "MASTER_VOCAB_WORD"; payload: string }
  | { type: "ADD_VOCAB_ITEMS"; payload: UserVocabItem[]; lang?: Language }
  | { type: "REMOVE_VOCAB_ITEM"; payload: { language: Language; word: string } }
  | { type: "START_REGRESSION_CHECK" }
  | { type: "SCORE_PATTERN"; payload: string }
  | { type: "PATTERN_REGRESSION_CHECK" }
  | { type: "UPDATE_SM2_CARD"; payload: { key: string; card: SM2Card } }
  | { type: "FIRST_SENTENCE_MOMENT" }
  | { type: "_DERIVE" }
  | {
      type: "COMPLETE_LESSON";
      payload: string | { moduleId: string; context: Core30ProgressContext };
    }
  | {
      type: "CORE30_CLAIM_LEGACY";
      payload: { moduleId: string; context: Core30ProgressContext; at: string };
    }
  | {
      type: "CORE30_STEP_OPENED";
      payload: {
        moduleId: string;
        context?: Core30ProgressContext;
        lesson: number;
        step: number;
        at: string;
      };
    }
  | {
      type: "CORE30_WAY_OPENED";
      payload: {
        moduleId: string;
        context?: Core30ProgressContext;
        lesson: number;
        way: Core30Way;
        at: string;
      };
    }
  | {
      type: "CORE30_SET_MASTERED";
      // `mastered` is the literal true: there is no un-master (cloud merge keeps the earliest masteredAt).
      payload: {
        moduleId: string;
        context?: Core30ProgressContext;
        lesson: number;
        mastered: true;
        at: string;
      };
    }
  | {
      type: "CORE30_SET_START_DATE";
      payload: { moduleId: string; context?: Core30ProgressContext; date: string; at?: string };
    }
  | {
      type: "CORE30_RECORD_REVIEW";
      payload: {
        moduleId: string;
        context?: Core30ProgressContext;
        at: string;
        results: { lesson: number; ok: boolean }[];
      };
    }
  | { type: "MERGE_REMOTE"; payload: PersistedShape };

const initialState: AppState = {
  selectedLanguage: "Spanish",
  nativeLanguage: "English",
  darkMode: true,
  currentTab: "reader",
  xp: 0,
  streak: 0,
  lastActiveDate: null,
  lastPracticeDate: null,
  lastPracticeDateByLanguage: {},
  practiceStreak: initialPracticeStreak(),
  practiceReminderLanguage: null,
  level: "Beginner",
  tier: "Beginner 🌱",
  achievements: [],
  userNotes: [],
  wordsLookedUp: 0,
  notesSaved: 0,
  tutorMessages: 0,
  conversationExchanges: 0,
  lessonsCompleted: 0,
  customTextsAdded: 0,
  lettersWritten: 0,
  cultureRead: [],
  languagesUsed: ["Spanish"],
  cefrLevelsCompleted: [],
  speakSecondsByLang: {},
  xpSessions: [],
  challengesCleared: 0,
  recentChallenges: [],
  pendingLevelUp: null,
  purchasedModules: ["orthopedics", "lds-missionary", "framer", "soccer", "baseball", "or-evs"],
  activeModuleId: null,
  moduleAssignments: {},
  favoriteTeam: null,
  departureDate: null,
  nextTrips: {},
  speakingFocusByLanguage: {},
  onboardingComplete: false,
  lessonProgress: {},
  core30Log: {},
  vocabAnswers: [],
  userVocab: [],
  vocabByLanguage: {},
  vocabRevisionsByLanguage: {},
  vocabLang: null,
  patternProgress: {},
  vocabSM2: {},
  hydrated: false,
};

function practiceStreakFromLegacy(
  value: PracticeStreakData | undefined,
  legacy: { streak?: number; lastPracticeDate?: string | null },
): PracticeStreakData {
  if (value && typeof value === "object") {
    return {
      ...initialPracticeStreak(),
      ...value,
      best: Math.max(value.best ?? 0, value.current ?? 0),
      practiceDates: Array.isArray(value.practiceDates) ? value.practiceDates.slice(-370) : [],
      today: value.today ?? { date: null, lessonsCompleted: 0 },
    };
  }
  const current = Math.max(0, legacy.streak ?? 0);
  return {
    ...initialPracticeStreak(),
    current,
    best: current,
    lastPracticeDate: legacy.lastPracticeDate ?? null,
    practiceDates: legacy.lastPracticeDate ? [legacy.lastPracticeDate] : [],
  };
}

function withPracticeStreak(state: AppState, practiceStreak: PracticeStreakData): AppState {
  return {
    ...state,
    practiceStreak,
    streak: practiceStreak.current,
    lastPracticeDate: practiceStreak.lastPracticeDate,
  };
}

export function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "RECOVER_PROFILE_CATEGORY": {
      const next = { ...state, ...action.payload };
      return {
        ...next,
        userVocab: deriveUserVocab(next.vocabByLanguage, next.selectedLanguage),
        vocabLang: next.selectedLanguage,
        tier: tierForXp(next.xp),
        pendingLevelUp: null,
      };
    }
    case "HYDRATE": {
      const hydrated = { ...state, ...action.payload };
      const vocabByLanguage = includeLegacyVocab(
        hydrated.vocabByLanguage,
        hydrated.vocabLang,
        hydrated.userVocab,
        hydrated.selectedLanguage,
      );
      const practiceStreak = practiceStreakFromLegacy(hydrated.practiceStreak, hydrated);
      return {
        ...hydrated,
        practiceStreak,
        streak: practiceStreak.current,
        lastPracticeDate: practiceStreak.lastPracticeDate,
        vocabByLanguage,
        userVocab: vocabByLanguage[hydrated.selectedLanguage] ?? [],
        vocabLang: hydrated.selectedLanguage,
        hydrated: true,
      };
    }
    case "SET_LANGUAGE": {
      const languagesUsed = state.languagesUsed.includes(action.payload)
        ? state.languagesUsed
        : [...state.languagesUsed, action.payload];
      const vocabByLanguage = includeLegacyVocab(
        state.vocabByLanguage,
        state.vocabLang,
        state.userVocab,
        state.selectedLanguage,
      );
      return {
        ...state,
        selectedLanguage: action.payload,
        languagesUsed,
        vocabByLanguage,
        userVocab: vocabByLanguage[action.payload] ?? [],
        vocabLang: action.payload,
      };
    }
    case "SET_NATIVE_LANGUAGE":
      return { ...state, nativeLanguage: action.payload };
    case "TOGGLE_DARK_MODE":
      return { ...state, darkMode: !state.darkMode };
    case "SET_DARK_MODE":
      return { ...state, darkMode: action.payload };
    case "SET_TAB":
      return { ...state, currentTab: action.payload };
    case "ADD_XP": {
      const xp = state.xp + action.payload;
      const newTier = tierForXp(xp);
      const leveled = newTier !== state.tier;
      const today = todayKey();
      const sessions = [...state.xpSessions];
      const last = sessions[sessions.length - 1];
      if (last && last.date === today) {
        sessions[sessions.length - 1] = { date: today, xp: last.xp + action.payload };
      } else {
        sessions.push({ date: today, xp: action.payload });
      }
      while (sessions.length > 7) sessions.shift();
      return {
        ...state,
        xp,
        tier: newTier,
        xpSessions: sessions,
        pendingLevelUp: leveled ? newTier : state.pendingLevelUp,
      };
    }
    case "SET_LAST_ACTIVE_DATE":
      return { ...state, lastActiveDate: action.payload };
    case "EVALUATE_PRACTICE_STREAK":
      return withPracticeStreak(
        state,
        evaluatePracticeStreak(state.practiceStreak, action.payload),
      );
    case "MARK_PRACTICE": {
      const today = todayKey();
      const language = action.payload?.language ?? state.selectedLanguage;
      return withPracticeStreak(
        {
          ...state,
          lastPracticeDateByLanguage: {
            ...state.lastPracticeDateByLanguage,
            [language]: today,
          },
        },
        recordPracticeCompletion(state.practiceStreak, today),
      );
    }
    case "START_TRAVEL_BREAK":
      return withPracticeStreak(
        state,
        startTravelBreak(state.practiceStreak, todayKey(), action.payload.days),
      );
    case "SET_REMINDER_LANGUAGE":
      return { ...state, practiceReminderLanguage: action.payload };
    case "SET_LEVEL":
      return { ...state, level: action.payload };
    case "ADD_ACHIEVEMENT":
      if (state.achievements.includes(action.payload)) return state;
      return { ...state, achievements: [...state.achievements, action.payload] };
    case "ADD_NOTE":
      return { ...state, userNotes: [action.payload, ...state.userNotes] };
    case "INC_COUNTER":
      return { ...state, [action.payload]: (state[action.payload] as number) + 1 } as AppState;
    case "MARK_CULTURE_READ":
      if (state.cultureRead.includes(action.payload)) return state;
      return { ...state, cultureRead: [...state.cultureRead, action.payload] };
    case "MARK_CEFR_COMPLETE":
      if (state.cefrLevelsCompleted.includes(action.payload)) return state;
      return {
        ...state,
        cefrLevelsCompleted: [...state.cefrLevelsCompleted, action.payload],
      };
    case "ADD_SPEAK_SECONDS": {
      const cur = state.speakSecondsByLang[action.payload.lang] ?? 0;
      return {
        ...state,
        speakSecondsByLang: {
          ...state.speakSecondsByLang,
          [action.payload.lang]: cur + action.payload.seconds,
        },
      };
    }
    case "DISMISS_LEVEL_UP":
      return { ...state, pendingLevelUp: null };
    case "PURCHASE_MODULE": {
      if (state.purchasedModules.includes(action.payload)) return state;
      return {
        ...state,
        purchasedModules: [...state.purchasedModules, action.payload],
      };
    }
    case "SET_ACTIVE_MODULE": {
      const purchasedModules =
        action.payload && !state.purchasedModules.includes(action.payload)
          ? [...state.purchasedModules, action.payload]
          : state.purchasedModules;
      const next = { ...state, activeModuleId: action.payload, purchasedModules };
      if (action.payload === "lds-missionary") {
        next.currentTab = "missionary";
      } else if (action.payload === "orthopedics") {
        next.currentTab = "orthopedics";
      } else if (action.payload === "soccer") {
        next.currentTab = "soccer";
      } else if (action.payload === "baseball") {
        next.currentTab = "baseball";
      } else if (action.payload === "or-evs") {
        next.currentTab = "orEvs";
      } else if (action.payload === "fmg") {
        next.currentTab = "fmg";
      } else if (
        state.currentTab === "missionary" ||
        state.currentTab === "discussions" ||
        state.currentTab === "orthopedics" ||
        state.currentTab === "soccer" ||
        state.currentTab === "baseball" ||
        state.currentTab === "orEvs" ||
        state.currentTab === "fmg"
      ) {
        next.currentTab = "reader";
      }
      return next;
    }
    case "SET_FAVORITE_TEAM":
      return { ...state, favoriteTeam: action.payload };
    case "SET_DEPARTURE_DATE":
      return { ...state, departureDate: action.payload };
    case "SET_NEXT_TRIP": {
      const nextTrips = { ...state.nextTrips };
      if (action.payload.plan) nextTrips[action.payload.language] = action.payload.plan;
      else delete nextTrips[action.payload.language];
      return { ...state, nextTrips };
    }
    case "SET_SPEAKING_FOCUS":
      return {
        ...state,
        speakingFocusByLanguage: {
          ...state.speakingFocusByLanguage,
          [action.payload.language]: {
            missionId: action.payload.missionId,
            title: action.payload.title.slice(0, 140),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    case "COMPLETE_ONBOARDING":
      return { ...state, onboardingComplete: true };
    case "COMPLETE_LESSON": {
      const payload =
        typeof action.payload === "string" ? { moduleId: action.payload } : action.payload;
      const moduleId = core30ScopeKey(
        payload.moduleId,
        "context" in payload
          ? payload.context
          : {
              targetLanguage: state.selectedLanguage,
              instructionLanguage: state.nativeLanguage,
            },
      );
      const current = state.lessonProgress[moduleId] ?? 0;
      return withPracticeStreak(
        {
          ...state,
          lessonProgress: { ...state.lessonProgress, [moduleId]: current + 1 },
          lessonsCompleted: state.lessonsCompleted + 1,
          lastPracticeDateByLanguage: {
            ...state.lastPracticeDateByLanguage,
            ["context" in payload ? payload.context.targetLanguage : state.selectedLanguage]:
              todayKey(),
          },
        },
        recordPracticeCompletion(state.practiceStreak, todayKey()),
      );
    }
    case "CORE30_CLAIM_LEGACY": {
      const { moduleId, context, at } = action.payload;
      const claimed = claimLegacyCore30(
        state.core30Log,
        state.lessonProgress,
        moduleId,
        context,
        at,
      );
      return { ...state, core30Log: claimed.log, lessonProgress: claimed.progress };
    }
    case "CORE30_STEP_OPENED": {
      const core30Log = core30StepOpened(state.core30Log, {
        ...action.payload,
        moduleId: core30ScopeKey(
          action.payload.moduleId,
          action.payload.context ?? {
            targetLanguage: state.selectedLanguage,
            instructionLanguage: state.nativeLanguage,
          },
        ),
      });
      return core30Log === state.core30Log ? state : { ...state, core30Log };
    }
    case "CORE30_WAY_OPENED": {
      const core30Log = core30WayOpened(state.core30Log, {
        ...action.payload,
        moduleId: core30ScopeKey(
          action.payload.moduleId,
          action.payload.context ?? {
            targetLanguage: state.selectedLanguage,
            instructionLanguage: state.nativeLanguage,
          },
        ),
      });
      return core30Log === state.core30Log ? state : { ...state, core30Log };
    }
    case "CORE30_SET_MASTERED":
      return {
        ...state,
        core30Log: core30SetMastered(state.core30Log, {
          ...action.payload,
          moduleId: core30ScopeKey(
            action.payload.moduleId,
            action.payload.context ?? {
              targetLanguage: state.selectedLanguage,
              instructionLanguage: state.nativeLanguage,
            },
          ),
        }),
      };
    case "CORE30_SET_START_DATE":
      return {
        ...state,
        core30Log: core30SetStartDate(state.core30Log, {
          ...action.payload,
          moduleId: core30ScopeKey(
            action.payload.moduleId,
            action.payload.context ?? {
              targetLanguage: state.selectedLanguage,
              instructionLanguage: state.nativeLanguage,
            },
          ),
        }),
      };
    case "CORE30_RECORD_REVIEW":
      return {
        ...state,
        core30Log: core30RecordReview(state.core30Log, {
          ...action.payload,
          moduleId: core30ScopeKey(
            action.payload.moduleId,
            action.payload.context ?? {
              targetLanguage: state.selectedLanguage,
              instructionLanguage: state.nativeLanguage,
            },
          ),
        }),
      };
    case "SET_USER_VOCAB": {
      const base = includeLegacyVocab(
        state.vocabByLanguage,
        state.vocabLang,
        state.userVocab,
        state.selectedLanguage,
      );
      const vocabByLanguage = replaceLanguageVocab(
        base,
        action.payload.lang,
        action.payload.vocab as VocabItem[],
      );
      const vocabRevisionsByLanguage = bumpVocabRevision(
        state.vocabRevisionsByLanguage ?? {},
        action.payload.lang,
      );
      return {
        ...state,
        vocabAnswers: action.payload.answers,
        vocabByLanguage,
        vocabRevisionsByLanguage,
        userVocab: deriveUserVocab(vocabByLanguage, state.selectedLanguage),
        vocabLang: action.payload.lang,
      };
    }
    case "MASTER_VOCAB_WORD": {
      const vocabByLanguage = applyMasteryIncrement(
        state.vocabByLanguage,
        state.selectedLanguage,
        action.payload,
      );
      const vocabRevisionsByLanguage =
        vocabByLanguage === state.vocabByLanguage
          ? (state.vocabRevisionsByLanguage ?? {})
          : bumpVocabRevision(state.vocabRevisionsByLanguage ?? {}, state.selectedLanguage);
      return {
        ...state,
        vocabByLanguage,
        vocabRevisionsByLanguage,
        userVocab: deriveUserVocab(vocabByLanguage, state.selectedLanguage),
      };
    }
    case "ADD_VOCAB_ITEMS": {
      const language = action.lang ?? state.selectedLanguage;
      const base = includeLegacyVocab(
        state.vocabByLanguage,
        state.vocabLang,
        state.userVocab,
        state.selectedLanguage,
      );
      const vocabByLanguage = {
        ...base,
        [language]: mergeVocabItems(base[language] ?? [], action.payload as VocabItem[]),
      } as VocabByLanguage<Language>;
      const vocabRevisionsByLanguage = bumpVocabRevision(
        state.vocabRevisionsByLanguage ?? {},
        language,
      );
      return {
        ...state,
        vocabByLanguage,
        vocabRevisionsByLanguage,
        userVocab: vocabByLanguage[state.selectedLanguage] ?? [],
        vocabLang: state.selectedLanguage,
      };
    }
    case "REMOVE_VOCAB_ITEM": {
      const { language, word } = action.payload;
      const current = state.vocabByLanguage[language] ?? [];
      const next = current.filter(
        (item) => item.word.trim().toLowerCase() !== word.trim().toLowerCase(),
      );
      if (next.length === current.length) return state;
      const vocabByLanguage = { ...state.vocabByLanguage, [language]: next };
      return {
        ...state,
        vocabByLanguage,
        vocabRevisionsByLanguage: bumpVocabRevision(state.vocabRevisionsByLanguage ?? {}, language),
        userVocab: deriveUserVocab(vocabByLanguage, state.selectedLanguage),
      };
    }
    case "START_REGRESSION_CHECK": {
      const vocabByLanguage = applyRegressionReset(
        state.vocabByLanguage,
        state.selectedLanguage,
        VOCAB_MASTERY_THRESHOLD,
      );
      const vocabRevisionsByLanguage =
        vocabByLanguage === state.vocabByLanguage
          ? (state.vocabRevisionsByLanguage ?? {})
          : bumpVocabRevision(state.vocabRevisionsByLanguage ?? {}, state.selectedLanguage);
      return {
        ...state,
        vocabByLanguage,
        vocabRevisionsByLanguage,
        userVocab: deriveUserVocab(vocabByLanguage, state.selectedLanguage),
      };
    }
    case "SCORE_PATTERN":
      return {
        ...state,
        patternProgress: {
          ...state.patternProgress,
          [action.payload]: (state.patternProgress[action.payload] ?? 0) + 1,
        },
      };
    case "PATTERN_REGRESSION_CHECK": {
      const updated = { ...state.patternProgress };
      for (const id of Object.keys(updated)) {
        if ((updated[id] ?? 0) >= VOCAB_MASTERY_THRESHOLD) {
          updated[id] = VOCAB_MASTERY_THRESHOLD - 2;
        }
      }
      return { ...state, patternProgress: updated };
    }
    case "UPDATE_SM2_CARD":
      return {
        ...state,
        vocabSM2: { ...state.vocabSM2, [action.payload.key]: action.payload.card },
      };
    case "FIRST_SENTENCE_MOMENT":
      return {
        ...state,
        achievements: state.achievements.includes("First Real Sentence! 🗣️✨")
          ? state.achievements
          : [...state.achievements, "First Real Sentence! 🗣️✨"],
      };
    case "SET_MODULE_ASSIGNMENT": {
      const next = { ...state.moduleAssignments };
      if (action.payload.assignmentId == null) {
        delete next[action.payload.moduleId];
      } else {
        next[action.payload.moduleId] = action.payload.assignmentId;
      }
      return { ...state, moduleAssignments: next };
    }
    case "RECORD_CHALLENGE": {
      const recent = [action.payload, ...state.recentChallenges].slice(0, 5);
      return {
        ...state,
        challengesCleared: state.challengesCleared + 1,
        recentChallenges: recent,
      };
    }
    case "MERGE_REMOTE": {
      const { __v: _v, ...remote } = action.payload;
      const localXp = state.xp;
      const remoteXp = typeof remote.xp === "number" ? remote.xp : 0;
      const xp = Math.max(localXp, remoteXp);
      const achievements = Array.from(
        new Set([...state.achievements, ...(remote.achievements ?? [])]),
      );
      const userNotes = (() => {
        const seen = new Set(state.userNotes.map((n) => n.id));
        const merged = [...state.userNotes];
        for (const n of remote.userNotes ?? []) {
          if (!seen.has(n.id)) {
            merged.push(n);
            seen.add(n.id);
          }
        }
        return merged.sort((a, b) => b.createdAt - a.createdAt);
      })();
      const cultureRead = Array.from(
        new Set([...state.cultureRead, ...(remote.cultureRead ?? [])]),
      );
      const languagesUsed = Array.from(
        new Set([...state.languagesUsed, ...(remote.languagesUsed ?? [])]),
      ) as Language[];
      const cefrLevelsCompleted = Array.from(
        new Set([...state.cefrLevelsCompleted, ...(remote.cefrLevelsCompleted ?? [])]),
      );
      const selectedLanguage = (remote.selectedLanguage ?? state.selectedLanguage) as Language;
      const { vocabByLanguage, vocabRevisionsByLanguage } = reconcileVocabByLanguage(
        state.vocabByLanguage ?? {},
        includeLegacyVocab(
          remote.vocabByLanguage,
          remote.vocabLang,
          remote.userVocab,
          selectedLanguage,
        ),
        state.vocabRevisionsByLanguage ?? {},
        remote.vocabRevisionsByLanguage ?? {},
      );
      const remotePracticeStreak = practiceStreakFromLegacy(remote.practiceStreak, remote);
      const localPracticeStreak = practiceStreakFromLegacy(state.practiceStreak, state);
      const practiceStreak =
        remotePracticeStreak.updatedAt >= localPracticeStreak.updatedAt
          ? remotePracticeStreak
          : localPracticeStreak;
      return {
        ...state,
        ...(remote as Partial<AppState>),
        xp,
        tier: tierForXp(xp),
        achievements,
        userNotes,
        cultureRead,
        languagesUsed,
        cefrLevelsCompleted,
        selectedLanguage,
        nextTrips: { ...state.nextTrips, ...(remote.nextTrips ?? {}) },
        speakingFocusByLanguage: {
          ...state.speakingFocusByLanguage,
          ...(remote.speakingFocusByLanguage ?? {}),
        },
        lastPracticeDateByLanguage: {
          ...state.lastPracticeDateByLanguage,
          ...(remote.lastPracticeDateByLanguage ?? {}),
        },
        vocabByLanguage,
        vocabRevisionsByLanguage,
        userVocab: deriveUserVocab(vocabByLanguage, selectedLanguage),
        vocabLang: selectedLanguage,
        practiceStreak,
        streak: practiceStreak.current,
        lastPracticeDate: practiceStreak.lastPracticeDate,
        wordsLookedUp: Math.max(state.wordsLookedUp, remote.wordsLookedUp ?? 0),
        notesSaved: Math.max(state.notesSaved, remote.notesSaved ?? 0),
        tutorMessages: Math.max(state.tutorMessages, remote.tutorMessages ?? 0),
        conversationExchanges: Math.max(
          state.conversationExchanges,
          remote.conversationExchanges ?? 0,
        ),
        lessonsCompleted: Math.max(state.lessonsCompleted, remote.lessonsCompleted ?? 0),
        customTextsAdded: Math.max(state.customTextsAdded ?? 0, remote.customTextsAdded ?? 0),
        lettersWritten: Math.max(state.lettersWritten ?? 0, remote.lettersWritten ?? 0),
        challengesCleared: Math.max(state.challengesCleared, remote.challengesCleared ?? 0),
        lessonProgress: (() => {
          const local = state.lessonProgress ?? {};
          const rem = (remote.lessonProgress ?? {}) as Record<string, number>;
          const merged: Record<string, number> = { ...local };
          for (const [k, v] of Object.entries(rem)) {
            merged[k] = Math.max(local[k] ?? 0, v);
          }
          return merged;
        })(),
        core30Log: mergeCore30Log(state.core30Log, remote.core30Log),
        pendingLevelUp: null,
      };
    }
    case "_DERIVE":
      return state;
    default:
      return state;
  }
}

const SCHEMA_VERSION = 5;

type PersistedShape = Partial<AppState> & { __v?: number };

function migrate(raw: unknown): PersistedShape {
  if (!raw || typeof raw !== "object") return { __v: SCHEMA_VERSION };
  const data = { ...(raw as Record<string, unknown>) } as PersistedShape;
  let v = typeof data.__v === "number" ? data.__v : 1;

  if (v < 2) {
    data.purchasedModules ??= [];
    data.activeModuleId ??= null;
    data.moduleAssignments ??= {};
    data.speakSecondsByLang ??= {};
    data.xpSessions ??= [];
    data.recentChallenges ??= [];
    data.cultureRead ??= [];
    data.languagesUsed ??= [];
    data.cefrLevelsCompleted ??= [];
    v = 2;
  }

  if (v < 3) {
    data.nextTrips ??= {};
    v = 3;
  }

  if (v < 4) {
    data.speakingFocusByLanguage ??= {};
    data.lastPracticeDate ??= null;
    v = 4;
  }

  if (v < 5) {
    data.practiceStreak = practiceStreakFromLegacy(undefined, data);
    data.practiceReminderLanguage ??= null;
    data.lastPracticeDateByLanguage = data.lastPracticeDate
      ? { [data.selectedLanguage ?? "Spanish"]: data.lastPracticeDate }
      : {};
    v = 5;
  }

  const allowed = new Set<string>([...(PERSIST_KEYS as string[]), "__v"]);
  for (const k of Object.keys(data)) {
    if (!allowed.has(k)) delete (data as Record<string, unknown>)[k];
  }

  // core30Log was added after schema v5; absent state loads as {} via initialState.
  if (
    data.core30Log !== undefined &&
    (!data.core30Log || typeof data.core30Log !== "object" || Array.isArray(data.core30Log))
  ) {
    delete data.core30Log;
  }

  if (data.selectedLanguage && !LANGUAGES.includes(data.selectedLanguage)) {
    delete data.selectedLanguage;
  }
  if (data.practiceReminderLanguage && !LANGUAGES.includes(data.practiceReminderLanguage)) {
    data.practiceReminderLanguage = null;
  }

  data.__v = SCHEMA_VERSION;
  return data;
}

const PERSIST_KEYS: (keyof AppState)[] = [
  "selectedLanguage",
  "nativeLanguage",
  "darkMode",
  "currentTab",
  "xp",
  "streak",
  "lastActiveDate",
  "lastPracticeDate",
  "lastPracticeDateByLanguage",
  "practiceStreak",
  "practiceReminderLanguage",
  "level",
  "tier",
  "achievements",
  "userNotes",
  "wordsLookedUp",
  "notesSaved",
  "tutorMessages",
  "conversationExchanges",
  "lessonsCompleted",
  "customTextsAdded",
  "lettersWritten",
  "cultureRead",
  "languagesUsed",
  "cefrLevelsCompleted",
  "speakSecondsByLang",
  "xpSessions",
  "challengesCleared",
  "recentChallenges",
  "purchasedModules",
  "activeModuleId",
  "moduleAssignments",
  "vocabAnswers",
  "userVocab",
  "vocabByLanguage",
  "vocabRevisionsByLanguage",
  "vocabLang",
  "patternProgress",
  "vocabSM2",
  "onboardingComplete",
  "lessonProgress",
  "core30Log",
  "favoriteTeam",
  "departureDate",
  "nextTrips",
  "speakingFocusByLanguage",
];

function todayKey() {
  const d = new Date();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  pingActivity: () => void;
  profileReadyUserId: string | null;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const actor = user?.id ?? null;
  if (loading)
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground"
        role="status"
      >
        Loading your learning space…
      </div>
    );
  return (
    <AccountAppProvider key={actor ?? "guest"} actor={actor}>
      {children}
    </AccountAppProvider>
  );
}

function AccountAppProvider({ children, actor }: { children: ReactNode; actor: string | null }) {
  const { isCurrentUser, canUseReader } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const stored = readProfileSnapshot<object>(window.localStorage, actor);
    const parsed = stored ? migrate(stored) : null;
    if (!parsed && hasUnassignedProfileSnapshot(window.localStorage))
      toast("Progress from an older app version is still on this device", {
        id: "account-progress-migration",
        description:
          "Reconnect while signed in to restore your account’s cloud progress. Earlier offline changes remain untouched for recovery.",
        duration: 10000,
      });
    if (parsed) {
      const xp = typeof parsed.xp === "number" ? parsed.xp : 0;
      const { __v: _v, ...rest } = parsed;
      dispatch({
        type: "HYDRATE",
        payload: {
          ...rest,
          darkMode: readDarkModePreference(),
          tier: tierForXp(xp),
          pendingLevelUp: null,
        },
      });
    } else {
      dispatch({ type: "HYDRATE", payload: { darkMode: readDarkModePreference() } });
    }
  }, [actor]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === THEME_PREFERENCE_KEY)
        dispatch({ type: "SET_DARK_MODE", payload: readDarkModePreference() });
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const ranStreak = useRef(false);
  useEffect(() => {
    if (!state.hydrated || ranStreak.current) return;
    ranStreak.current = true;
    dispatch({ type: "EVALUATE_PRACTICE_STREAK", payload: todayKey() });
  }, [state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      const toSave: Record<string, unknown> = { __v: SCHEMA_VERSION };
      for (const k of PERSIST_KEYS) {
        toSave[k] = (state as unknown as Record<string, unknown>)[k];
      }
      saveProfileSnapshot(window.localStorage, actor, toSave);
    } catch {
      /* ignore quota */
    }
  }, [state, actor]);

  useEffect(() => {
    if (state.hydrated) saveDarkModePreference(state.darkMode);
  }, [state.darkMode, state.hydrated]);

  useEffect(() => {
    if (!state.hydrated) return;
    type Cond = { id: string; ok: boolean };
    const conds: Cond[] = [
      { id: "First Word! 🔤", ok: state.wordsLookedUp >= 1 },
      { id: "Deep Reader 📚", ok: state.notesSaved >= 5 },
      { id: "Good Listener 👂", ok: false },
      { id: "Grammar Apprentice ✏️", ok: state.lessonsCompleted >= 1 },
      { id: "Grammar Wizard 🧙", ok: state.cefrLevelsCompleted.length >= 1 },
      { id: "Curious Learner 🧠", ok: state.tutorMessages >= 10 },
      { id: "First Conversation 🗣️", ok: state.conversationExchanges >= 5 },
      { id: "Conversationalist 💬", ok: state.conversationExchanges >= 20 },
      { id: "Culture Buff 🌍", ok: state.cultureRead.length >= 3 },
      { id: "Author ✍️", ok: state.customTextsAdded >= 1 },
      { id: "Polyglot ⭐", ok: state.languagesUsed.length >= 3 },
      { id: "Week Streak 🔥", ok: state.streak >= 7 },
    ];
    for (const c of conds) {
      if (c.ok && !state.achievements.includes(c.id)) {
        dispatch({ type: "ADD_ACHIEVEMENT", payload: c.id });
        toast(c.id, {
          description: "Achievement Unlocked!",
          className: "achievement-toast",
        });
      }
    }
  }, [
    state.hydrated,
    state.wordsLookedUp,
    state.notesSaved,
    state.lessonsCompleted,
    state.cefrLevelsCompleted.length,
    state.tutorMessages,
    state.conversationExchanges,
    state.cultureRead.length,
    state.customTextsAdded,
    state.languagesUsed.length,
    state.streak,
    state.achievements,
  ]);

  const [userId, setUserId] = useState<string | null>(null);
  const [profileReadyUserId, setProfileReadyUserId] = useState<string | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!actor) return;
    const profileSync = createDeferredAuthSync({
      reset() {
        setUserId(null);
        setProfileReadyUserId(null);
        if (syncTimer.current) {
          clearTimeout(syncTimer.current);
          syncTimer.current = null;
        }
      },
      load: (uid) =>
        Promise.resolve(supabase.from("profiles").select("data").eq("id", uid).maybeSingle()),
      apply(uid, { data, error }) {
        if (uid !== actor || !isCurrentUser(actor)) return;
        setProfileReadyUserId(uid);
        if (error) return;
        if (data?.data) {
          const remote = migrate(data.data as unknown);
          dispatch({ type: "MERGE_REMOTE", payload: remote });
        }
        setUserId(uid);
      },
      failed(uid) {
        if (uid === actor && isCurrentUser(actor)) setProfileReadyUserId(uid);
      },
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user.id === actor) profileSync.handle(session);
      else profileSync.handle(null);
    });
    const retry = () => {
      if (isCurrentUser(actor)) profileSync.handle({ user: { id: actor } });
    };
    retry();
    window.addEventListener("online", retry);
    return () => {
      profileSync.dispose();
      sub.subscription.unsubscribe();
      window.removeEventListener("online", retry);
    };
  }, [actor, isCurrentUser]);

  useEffect(() => {
    if (!state.hydrated || !userId || userId !== actor || !isCurrentUser(userId)) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      if (userId !== actor || !isCurrentUser(userId)) return;
      const toSave: Record<string, unknown> = { __v: SCHEMA_VERSION };
      for (const k of PERSIST_KEYS) toSave[k] = (state as unknown as Record<string, unknown>)[k];
      await supabase.from("profiles").upsert({ id: userId, data: toSave });
    }, 2000);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [state, userId, actor, isCurrentUser]);

  const pingActivity = useCallback(() => {
    const today = todayKey();
    if (state.lastActiveDate === today) return;
    dispatch({ type: "SET_LAST_ACTIVE_DATE", payload: today });
  }, [state.lastActiveDate]);

  const value = useMemo(
    () => ({ state, dispatch, pingActivity, profileReadyUserId }),
    [state, pingActivity, profileReadyUserId],
  );
  const recoveryReady =
    !!actor &&
    userId === actor &&
    profileReadyUserId === actor &&
    state.hydrated &&
    canUseReader(actor!);
  const recoverProfile = useCallback(
    (kind: ProfileRecoveryKind, confirmed: boolean, language?: Language) => {
      if (!actor || !recoveryReady || !canUseReader(actor))
        throw Error("Reconnect and finish restoring your current profile before recovery.");
      const snapshot: Record<string, unknown> = { __v: SCHEMA_VERSION };
      for (const key of PERSIST_KEYS) snapshot[key] = state[key];
      recoverLegacyProfile({
        storage: window.localStorage,
        actor,
        kind,
        current: state,
        snapshot,
        confirmed,
        chosenLanguage: language,
        isCurrent: () => canUseReader(actor),
        apply: (patch) => dispatch({ type: "RECOVER_PROFILE_CATEGORY", payload: patch }),
      });
    },
    [actor, recoveryReady, canUseReader, state],
  );

  return (
    <AppContext.Provider value={value}>
      <ProfileRecoveryContext.Provider value={{ ready: recoveryReady, recover: recoverProfile }}>
        <WordCardCacheProvider>{children}</WordCardCacheProvider>
      </ProfileRecoveryContext.Provider>
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
