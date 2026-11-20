import { defaultLearningEntryTab } from "@/lib/app-navigation";
import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronDown, Copy, CircleEllipsis, Sparkles } from "lucide-react";
import { V4StudyActivity, V4StudySpeakBar } from "./V4StudyChrome";
import { useFlashcards } from "@/state/flashcard-state";
import { useSyncedStudyStreak } from "@/hooks/use-study-cloud";
import {
  useLessonsToday,
  usePracticeSettings,
  useTodayPracticeSeconds,
} from "@/hooks/use-practice-time";
import { LESSON_MODES, type LessonModeId } from "./LessonWorkspaceChrome";
import { useApp } from "@/state/app-state";
import { useAuth } from "@/state/auth-state";
import { getModule } from "@/data/modules";
import { CourseLessonPicker } from "./CourseLessonPicker";
import { useTutor } from "@/state/tutor-state";
import { OPEN_LESSON_SPEAK } from "@/lib/lesson-speaking";
import { browserReturnStorage, readLessonReturn, writeLessonReturn } from "@/lib/lesson-return";
import { pointAddressAtLessonReturn } from "@/lib/learning-link";
import { useSpeak } from "@/state/speak-state";

export type V6Destination = LessonModeId | "speak" | "study" | "verbs";
export const V6_MODE_EVENT = "lt:v6-lesson-mode";
export const V6_PENDING_MODE = "lt.v6.pending-mode";
const modes = ["see", "recall", "hear", "write", "type", "say"] as const;

export function V6Header({
  course,
  language,
  lessonNumber,
  totalLessons = 60,
  dueCards,
  onCourses,
  onTutor,
  onReview,
  onMenu,
}: {
  course: string;
  language: string;
  lessonNumber?: number;
  totalLessons?: number;
  dueCards?: number;
  onCourses: () => void;
  onTutor: () => void;
  onReview: () => void;
  onMenu: () => void;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <header className="lt-v6-header">
      <button
        disabled={!ready}
        className="lt-v6-course"
        onClick={onCourses}
        aria-label={`Choose course, ${course}`}
      >
        <BookOpen size={19} aria-hidden />
        <span>{course}</span>
        <ChevronDown size={12} aria-hidden />
      </button>
      <button
        className="lt-v4-header-tutor"
        disabled={!ready}
        onClick={onTutor}
        aria-label="Open tutor"
      >
        <Sparkles size={19} aria-hidden />
      </button>
      <span
        role="group"
        className="lt-v4-lesson-count"
        aria-label={
          lessonNumber ? `Lesson ${lessonNumber} of ${totalLessons}` : `${language} lessons`
        }
      >
        {lessonNumber ? `${lessonNumber}/${totalLessons}` : ""}
      </span>
      <button
        className="lt-v4-header-review"
        disabled={!ready}
        onClick={onReview}
        aria-label={dueCards === undefined ? "Review cards" : `Review cards, ${dueCards} due`}
      >
        <Copy size={21} aria-hidden />
        {dueCards !== undefined && <span>{dueCards}</span>}
      </button>
      <button
        disabled={!ready}
        onClick={onMenu}
        aria-label="Navigation menu"
        data-lesson-workspace-menu
      >
        <CircleEllipsis size={22} aria-hidden />
      </button>
    </header>
  );
}

export function V6Dock({
  active,
  onSelect,
}: {
  active: V6Destination | null;
  onSelect: (mode: V6Destination) => void;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  // CSS hides this whole dock on NativeSpeakSurface. Keep the fallback for mission screens.
  const studying = active !== "speak";
  return (
    <div className="lt-v6-bottom">
      {modes.some((id) => id === active) && (
        <nav className="lt-v6-study-modes" aria-label="Lesson practice modes">
          {modes.map((id) => {
            const mode = LESSON_MODES.find((item) => item.id === id)!;
            return (
              <button
                disabled={!ready}
                key={id}
                data-testid={`v6-nav-${id}`}
                aria-label={mode.label}
                aria-current={active === id ? "page" : undefined}
                onClick={() => onSelect(id)}
              >
                <mode.Icon size={22} strokeWidth={1.6} aria-hidden />
                <span>{mode.label}</span>
                <i aria-hidden />
              </button>
            );
          })}
        </nav>
      )}
      <div inert={!ready}>
        <V4StudySpeakBar
          speaking={!studying}
          onStudy={() => onSelect("study")}
          onSpeak={() => onSelect("speak")}
          testPrefix="v6"
        />
      </div>
    </div>
  );
}

/** Native-style navigation over the existing website providers and activities. */
export function V6AppNavigation() {
  const { state, dispatch, profileReadyUserId } = useApp();
  const { user, loading } = useAuth();
  const { lesson: speakingLesson } = useSpeak();
  const tutor = useTutor();
  const { dueCardsForLanguage } = useFlashcards();
  const [lessonContext, setLessonContext] = useState<{
    moduleId: string;
    n: number;
    total: number;
    owner: string | null;
    targetLanguage: string;
    nativeLanguage: string;
  } | null>(null);
  const profileReady = state.hydrated && !loading && profileReadyUserId === (user?.id ?? null);
  const currentLesson =
    profileReady &&
    state.currentTab === "core30" &&
    lessonContext?.moduleId === state.activeModuleId &&
    lessonContext.owner === (user?.id ?? null) &&
    lessonContext.targetLanguage === state.selectedLanguage &&
    lessonContext.nativeLanguage === state.nativeLanguage
      ? lessonContext
      : null;
  const [courses, setCourses] = useState(false);
  useEffect(() => {
    const open = () => setCourses(true);
    window.addEventListener("lt:course-lessons", open);
    return () => window.removeEventListener("lt:course-lessons", open);
  }, []);
  const [courseDestination, setCourseDestination] = useState<LessonModeId | null>(null);
  const [mode, setMode] = useState<LessonModeId>("see");
  const landedFor = useRef<string | null>(null);
  const entryQuery = useRef(typeof window === "undefined" ? "" : window.location.search);
  useEffect(() => {
    const update = (event: Event) =>
      setLessonContext((event as CustomEvent<NonNullable<typeof lessonContext> | null>).detail);
    window.addEventListener("lt:v4-lesson-context", update);
    return () => window.removeEventListener("lt:v4-lesson-context", update);
  }, []);

  useEffect(() => {
    if (!state.hydrated || loading || (user && profileReadyUserId !== user.id)) return;
    const identity = user?.id ?? "guest";
    if (landedFor.current === identity) return;
    if (landedFor.current !== null) {
      landedFor.current = identity;
      return;
    }
    landedFor.current = identity;
    const startupTab = defaultLearningEntryTab(entryQuery.current);
    if (startupTab) dispatch({ type: "SET_TAB", payload: startupTab });
  }, [state.hydrated, loading, user, profileReadyUserId, dispatch]);
  useEffect(() => {
    const update = (event: Event) => setMode((event as CustomEvent<LessonModeId>).detail);
    window.addEventListener("lt:v6-mode-changed", update);
    return () => window.removeEventListener("lt:v6-mode-changed", update);
  }, []);
  const resumeTab = useRef(state.currentTab);
  resumeTab.current = state.currentTab;
  useEffect(() => {
    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!installed) return;
    let backgroundedAt: number | null = null;
    const resume = () => {
      if (document.visibilityState === "hidden") backgroundedAt = Date.now();
      else if (backgroundedAt !== null) {
        const away = Date.now() - backgroundedAt;
        backgroundedAt = null;
        if (away >= 30_000 && resumeTab.current === "speak")
          dispatch({ type: "SET_TAB", payload: "core30" });
      }
    };
    document.addEventListener("visibilitychange", resume);
    return () => document.removeEventListener("visibilitychange", resume);
  }, [dispatch]);
  const currentSelect = useRef<(destination: V6Destination) => void>(() => {});
  currentSelect.current = select;
  useEffect(() => {
    if (courseDestination && !courses) {
      setCourseDestination(null);
      if (state.activeModuleId) currentSelect.current(courseDestination);
    }
  }, [courseDestination, courses, state.activeModuleId]);
  useEffect(() => {
    const open = () => currentSelect.current("study");
    window.addEventListener("lt:v6-open-study", open);
    return () => window.removeEventListener("lt:v6-open-study", open);
  }, [dispatch]);
  function select(destination: V6Destination) {
    if (destination === "verbs") {
      dispatch({ type: "SET_TAB", payload: "verbs" });
      return;
    }
    let next = destination === "study" ? mode : destination;
    if (next === "speak") {
      if (currentLesson && mode === "say") {
        const open = new Event(OPEN_LESSON_SPEAK, { cancelable: true });
        if (!window.dispatchEvent(open)) return;
      }
      try {
        sessionStorage.removeItem(V6_PENDING_MODE);
      } catch {
        /* optional storage */
      }
      dispatch({ type: "SET_TAB", payload: "speak" });
    } else {
      if (destination === "study") {
        const storage = browserReturnStorage();
        const marker =
          state.currentTab === "speak" &&
          speakingLesson?.moduleId === state.activeModuleId &&
          speakingLesson.nativeLanguage === state.nativeLanguage
            ? {
                moduleId: speakingLesson.moduleId,
                lesson: speakingLesson.lessonNumber,
                section: "say" as const,
                at: Date.now(),
              }
            : readLessonReturn(storage, Date.now());
        if (marker?.section === "say" && marker.moduleId === state.activeModuleId) {
          next = marker.section;
          writeLessonReturn(storage, marker);
          pointAddressAtLessonReturn(marker, {
            target: state.selectedLanguage,
            native: state.nativeLanguage,
          });
        }
      }
      if (!state.activeModuleId) {
        setCourseDestination(next);
        setCourses(true);
        return;
      }
      setMode(next);
      try {
        sessionStorage.setItem(V6_PENDING_MODE, next);
      } catch {
        /* event still works */
      }
      dispatch({ type: "SET_TAB", payload: "core30" });
      window.dispatchEvent(new CustomEvent(V6_MODE_EVENT, { detail: next }));
    }
  }
  return (
    <>
      <V6Header
        course={getModule(state.activeModuleId)?.name ?? "Core Basics"}
        language={state.selectedLanguage}
        lessonNumber={currentLesson?.n}
        totalLessons={currentLesson?.total}
        dueCards={profileReady ? dueCardsForLanguage(state.selectedLanguage).length : undefined}
        onCourses={() => {
          try {
            sessionStorage.removeItem(V6_PENDING_MODE);
          } catch {
            /* optional storage */
          }
          setCourses(true);
        }}
        onTutor={() => tutor.setOpen(true)}
        onReview={() => dispatch({ type: "SET_TAB", payload: "flashcards" })}
        onMenu={() => window.dispatchEvent(new Event("lt:lesson-workspace-navigation"))}
      />
      {profileReady && state.currentTab === "core30" && <CurrentStudyActivity />}
      <V6Dock
        active={
          state.currentTab === "speak"
            ? "speak"
            : state.currentTab === "core30"
              ? mode
              : state.currentTab === "verbs"
                ? "verbs"
                : null
        }
        onSelect={select}
      />
      {courses && <CourseLessonPicker onClose={() => setCourses(false)} />}
    </>
  );
}

function CurrentStudyActivity() {
  const { goalMinutes } = usePracticeSettings();
  const seconds = useTodayPracticeSeconds();
  const lessons = useLessonsToday();
  const streak = useSyncedStudyStreak(goalMinutes);
  return (
    <V4StudyActivity
      streak={streak}
      seconds={seconds}
      lessons={lessons ?? 0}
      goalMinutes={goalMinutes}
    />
  );
}
