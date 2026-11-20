import { useState } from "react";
import { ArrowLeft, ChevronRight, CircleDot } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ModulePickerDialog } from "@/components/ModulePickerDialog";
import { useApp } from "@/state/app-state";
import { getModule } from "@/data/modules";
import { getCurriculum } from "@/data/curriculum";
import { useStageCurriculum } from "@/hooks/use-stage-curriculum";
import { lessonLocation } from "@/lib/learning-link";

/** The same hierarchy as the native course sheet: lessons, then all courses. */
export function CourseLessonPicker({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useApp();
  const [modules, setModules] = useState(!state.activeModuleId);
  const id = state.activeModuleId;
  const status = useStageCurriculum(id, state.selectedLanguage, state.nativeLanguage);
  const curriculum = getCurriculum(id ?? "", state.selectedLanguage, state.nativeLanguage);
  const params = typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
  const current = params?.get("module") === id ? params.get("lesson") : null;
  function openLesson(n: number) {
    if (!id) return;
    const next = lessonLocation(
      window.location.href,
      {
        moduleId: id,
        target: state.selectedLanguage,
        native: state.nativeLanguage,
      },
      { lesson: n, way: "see" },
    );
    if (next) window.history.replaceState(window.history.state, "", next);
    dispatch({ type: "SET_TAB", payload: "core30" });
    window.dispatchEvent(
      new CustomEvent("lt:choose-course-lesson", { detail: { moduleId: id, lesson: n } }),
    );
    onClose();
  }
  if (modules)
    return (
      <ModulePickerDialog
        open
        onClose={onClose}
        onSelect={(selected) => {
          if (selected) setModules(false);
          else onClose();
        }}
      />
    );
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="flex max-h-[88dvh] max-w-2xl flex-col gap-4 overflow-hidden rounded-3xl bg-background p-5 sm:p-6 [&>[data-overlay-close]]:absolute [&>[data-overlay-close]]:right-4 [&>[data-overlay-close]]:top-4"
        aria-describedby={undefined}
      >
        <div className="flex min-h-11 shrink-0 items-center gap-4 pr-12">
          <button
            type="button"
            onClick={() => setModules(true)}
            aria-label="Back to modules"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-gold"
          >
            <ArrowLeft size={20} /> Your courses
          </button>
          <DialogTitle className="text-base">
            {curriculum?.lessons.length ?? ""} lessons
          </DialogTitle>
        </div>
        <h2 className="font-display text-3xl text-foreground">
          {getModule(id)?.name ?? "Your course"}
        </h2>
        {status === "loading" && <p role="status">Loading lessons…</p>}
        {status !== "loading" && !curriculum && (
          <p>This course’s lessons are not available for this language pair yet.</p>
        )}
        <div className="min-h-0 overflow-y-auto rounded-2xl border border-border/60 bg-card">
          {curriculum?.lessons.map((lesson) => (
            <button
              key={lesson.n}
              type="button"
              onClick={() => openLesson(lesson.n)}
              data-testid={`course-lesson-${lesson.n}`}
              className="flex min-h-20 w-full items-center gap-4 border-b border-border/40 px-5 py-4 text-left last:border-b-0 hover:bg-gold/5 focus-visible:outline focus-visible:outline-ring"
            >
              <span className="font-mono text-sm text-gold">
                {String(lesson.n).padStart(2, "0")}
              </span>
              <span className="flex-1 text-base font-medium text-foreground">{lesson.title}</span>
              {current === String(lesson.n) ? (
                <CircleDot size={18} className="text-gold" aria-label="Current lesson" />
              ) : (
                <ChevronRight size={18} className="text-muted-foreground" />
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
