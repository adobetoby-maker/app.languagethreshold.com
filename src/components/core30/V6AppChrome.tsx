import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronDown, Layers, Menu, MessageCircle, Sparkles } from "lucide-react";
import { LESSON_MODES, type LessonModeId } from "./LessonWorkspaceChrome";
import { useApp } from "@/state/app-state";
import { useAuth } from "@/state/auth-state";
import { getModule } from "@/data/modules";
import { ModulePickerDialog } from "@/components/ModulePickerDialog";
import { useTutor } from "@/state/tutor-state";

export type V6Destination = LessonModeId | "speak" | "study" | "verbs";
export const V6_MODE_EVENT = "lt:v6-lesson-mode";
export const V6_PENDING_MODE = "lt.v6.pending-mode";
const modes = ["see", "recall", "hear", "write", "type", "say"] as const;

export function V6Header({
  course,
  language,
  onCourses,
  onTutor,
  onReview,
  onMenu,
}: {
  course: string;
  language: string;
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
      <button disabled={!ready} onClick={onTutor} aria-label="Open tutor">
        <Sparkles size={19} aria-hidden />
      </button>
      <span className="lt-v6-language">{language}</span>
      <button disabled={!ready} onClick={onReview} aria-label="Review cards">
        <Layers size={20} aria-hidden />
      </button>
      <button
        disabled={!ready}
        onClick={onMenu}
        aria-label="Navigation menu"
        data-lesson-workspace-menu
      >
        <Menu size={21} aria-hidden />
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
  const studying = active !== "speak";
  return (
    <div className="lt-v6-bottom">
      {studying && (
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
          <button
            disabled={!ready}
            aria-label="Verbs"
            aria-current={active === "verbs" ? "page" : undefined}
            onClick={() => onSelect("verbs")}
          >
            <span className="text-xl">Abc</span>
            <span>Verbs</span>
          </button>
        </nav>
      )}
      <nav className="lt-v6-dock" aria-label="Study and speak">
        <button
          disabled={!ready}
          data-testid="v6-nav-study"
          aria-current={studying ? "page" : undefined}
          onClick={() => onSelect("study")}
        >
          <BookOpen size={23} fill="currentColor" aria-hidden />
          <span>Study</span>
        </button>
        <button
          disabled={!ready}
          data-testid="v6-nav-speak"
          aria-current={!studying ? "page" : undefined}
          onClick={() => onSelect("speak")}
        >
          <MessageCircle size={23} fill="currentColor" aria-hidden />
          <span>Speak</span>
        </button>
      </nav>
    </div>
  );
}

/** Native-style navigation over the existing website providers and activities. */
export function V6AppNavigation() {
  const { state, dispatch, profileReadyUserId } = useApp();
  const { user, loading } = useAuth();
  const tutor = useTutor();
  const [courses, setCourses] = useState(false);
  const [courseDestination, setCourseDestination] = useState<LessonModeId | null>(null);
  const [mode, setMode] = useState<LessonModeId>("see");
  const landedFor = useRef<string | null>(null);
  const entryQuery = useRef(typeof window === "undefined" ? "" : window.location.search);

  useEffect(() => {
    if (!state.hydrated || loading || (user && profileReadyUserId !== user.id)) return;
    const identity = user?.id ?? "guest";
    if (landedFor.current === identity) return;
    if (landedFor.current !== null) {
      landedFor.current = identity;
      return;
    }
    landedFor.current = identity;
    const params = new URLSearchParams(entryQuery.current);
    // Assignments, login returns, and explicit tool links keep their intended destination.
    if (
      ![
        "tab",
        "lesson",
        "panel",
        "module",
        "code",
        "error",
        "token_hash",
        "type",
        "session_id",
        "checkout",
        "payment",
      ].some((key) => params.has(key))
    ) {
      dispatch({ type: "SET_TAB", payload: "speak" });
    }
  }, [state.hydrated, loading, user, profileReadyUserId, dispatch]);
  useEffect(() => {
    const update = (event: Event) => setMode((event as CustomEvent<LessonModeId>).detail);
    window.addEventListener("lt:v6-mode-changed", update);
    return () => window.removeEventListener("lt:v6-mode-changed", update);
  }, []);
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
    const next = destination === "study" ? mode : destination;
    if (next === "speak") {
      try {
        sessionStorage.removeItem(V6_PENDING_MODE);
      } catch {
        /* optional storage */
      }
      dispatch({ type: "SET_TAB", payload: "speak" });
    } else {
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
      <ModulePickerDialog open={courses} onClose={() => setCourses(false)} />
    </>
  );
}
