import { useCallback, useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";
import { useApp } from "@/state/app-state";
import { useGrammar, type CefrLevel } from "@/state/grammar-state";
import { getModule } from "@/data/modules";
import type { LessonStub } from "@/fns/grammar.functions";
import { LevelSidebar } from "./LevelSidebar";
import { LessonView } from "./LessonView";
import { ModuleMatchPanel } from "@/components/modules/ModuleMatchPanel";

const LESSON_HISTORY_STATE = "lt.grammar.lesson";

export function GrammarStudio() {
  const { state } = useApp();
  const { state: gState } = useGrammar();
  const [activeLevel, setActiveLevel] = useState<CefrLevel | null>(null);
  const [activeLesson, setActiveLesson] = useState<LessonStub | null>(null);
  const [requestedExpandLevel, setRequestedExpandLevel] = useState<CefrLevel | null>(null);

  const closeLesson = useCallback(() => {
    setActiveLevel(null);
    setActiveLesson(null);
  }, []);

  // One history entry for the curriculum -> lesson step, so the phone's back
  // gesture returns to the level list instead of exiting the app. Advancing
  // between lessons REPLACES this entry rather than pushing another: without
  // that, finishing five lessons would need five back presses to escape
  // Grammar. (DUO-003 synthesis items 2 and 3.)
  const handleSelect = useCallback(
    (level: CefrLevel, lesson: LessonStub, mode: "push" | "replace" = "push") => {
      setActiveLevel(level);
      setActiveLesson(lesson);
      if (typeof window === "undefined") return;
      const alreadyInLesson = window.history.state?.[LESSON_HISTORY_STATE] === true;
      const next = { ...(window.history.state ?? {}), [LESSON_HISTORY_STATE]: true };
      if (mode === "replace" || alreadyInLesson) {
        window.history.replaceState(next, "");
      } else {
        window.history.pushState(next, "");
      }
    },
    [],
  );

  // Browser/gesture back closes the lesson rather than leaving the app.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPop = () => closeLesson();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [closeLesson]);

  // Leaving Grammar (or changing target language) must not leave a stale lesson
  // entry behind that could reopen under another tab.
  useEffect(() => {
    return () => {
      if (typeof window === "undefined") return;
      if (window.history.state?.[LESSON_HISTORY_STATE]) {
        const cleaned = { ...window.history.state };
        delete cleaned[LESSON_HISTORY_STATE];
        window.history.replaceState(cleaned, "");
      }
    };
  }, []);

  // A lesson from a previous language must not stay open when the learner
  // switches languages from the bottom strip. Also reset any pending
  // level-expand request so it doesn't carry over to the new language.
  useEffect(() => {
    closeLesson();
    setRequestedExpandLevel(null);
  }, [state.selectedLanguage, closeLesson]);

  // Finding 1: close the current lesson and direct the sidebar to expand the
  // named next CEFR level, so "Start A2" actually opens A2 instead of just
  // returning to a collapsed curriculum with nothing selected.
  const handleStartNextLevel = useCallback((nextLevel: CefrLevel) => {
    if (typeof window !== "undefined" && window.history.state?.[LESSON_HISTORY_STATE]) {
      const cleaned = { ...window.history.state };
      delete cleaned[LESSON_HISTORY_STATE];
      window.history.replaceState(cleaned, "");
    }
    setActiveLevel(null);
    setActiveLesson(null);
    setRequestedExpandLevel(nextLevel);
  }, []);

  const backToCurriculum = useCallback(() => {
    if (typeof window !== "undefined" && window.history.state?.[LESSON_HISTORY_STATE]) {
      window.history.back(); // popstate handler closes the lesson
      return;
    }
    closeLesson();
  }, [closeLesson]);

  return (
    <div className="fade-in mx-auto w-full max-w-7xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
            <GraduationCap className="h-3.5 w-3.5" />
            Grammar Studio
          </div>
          <h1 className="font-display text-3xl text-foreground">
            A private tutor for {state.selectedLanguage}
          </h1>
          <p className="font-display text-sm italic text-muted-foreground">
            CEFR-aligned lessons, examples and quick quizzes
          </p>
        </div>
        {gState.badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {gState.badges.map((b) => (
              <span
                key={b}
                className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold"
              >
                {b}
              </span>
            ))}
          </div>
        )}
      </div>

      {(() => {
        const mod = getModule(state.activeModuleId);
        if (!mod) return null;
        return (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-2.5 text-xs">
            <span className="text-base leading-none">{mod.emoji}</span>
            <span className="font-mono uppercase tracking-[0.2em] text-gold">◈ Module focus</span>
            <span className="text-foreground/90">
              {mod.name} — lessons mentioning {mod.vocabFocus.slice(0, 4).join(", ")} float to the
              top.
            </span>
          </div>
        );
      })()}

      <ModuleMatchPanel surface="Grammar Studio" className="mb-4" />

      {/* Below md the list and the lesson are MUTUALLY EXCLUSIVE. Previously
          `flex-col` stacked the lesson beneath the whole CEFR accordion, so
          tapping a lesson loaded it below the fold with no transition — the
          "not visible that it loaded" report. Desktop keeps the split view. */}
      <div className="flex flex-col gap-5 md:flex-row">
        <div className={activeLesson ? "hidden md:block" : "contents md:block"}>
          <LevelSidebar
            activeLevel={activeLevel}
            activeLessonId={activeLesson?.id ?? null}
            onSelect={handleSelect}
            openLevel={requestedExpandLevel}
          />
        </div>

        {activeLesson && activeLevel ? (
          <LessonView
            level={activeLevel}
            lesson={activeLesson}
            onBack={backToCurriculum}
            onSelectLesson={(lvl, lsn) => handleSelect(lvl, lsn, "replace")}
            onStartNextLevel={handleStartNextLevel}
          />
        ) : (
          <div className="hidden flex-1 items-center justify-center md:flex rounded-2xl border border-dashed border-border/60 bg-card/30 p-16 text-center backdrop-blur">
            <div>
              <div className="mb-3 text-4xl text-gold">✦</div>
              <p className="font-display text-lg italic text-foreground">
                Choose a lesson to begin
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Open a CEFR level on the left
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
