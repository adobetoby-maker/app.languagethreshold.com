import { ArrowLeft } from "lucide-react";
import { useApp } from "@/state/app-state";
import { pointAddressAtLessonReturn } from "@/lib/learning-link";
import {
  browserReturnStorage,
  readLessonReturn,
  type LessonReturnSection,
} from "@/lib/lesson-return";

/**
 * "Back to Lesson N" pill for the tab a Core 30 lesson sent the learner to (Speak or Reader).
 * It shows only while a fresh return marker for this kind of trip exists, and returns to the
 * Core 30 tab, where the lesson reopens at the section the learner left.
 */
export function LessonReturnPill({ kind }: { kind: LessonReturnSection }) {
  const { state, dispatch } = useApp();
  // Read on every render, so a marker the app has since dropped hides the pill at once.
  const found = readLessonReturn(browserReturnStorage(), Date.now());
  const marker = found && found.section === kind ? found : null;
  if (!marker || marker.moduleId !== state.activeModuleId) return null;
  return (
    <div className="mb-3">
      <button
        type="button"
        data-testid="lesson-return-pill"
        onClick={() => {
          // The URL still names this tab, which would make the Core 30 runner ignore the
          // marker as a stale link. Point it at the lesson first, as a plan entry does.
          pointAddressAtLessonReturn(marker, {
            target: state.selectedLanguage,
            native: state.nativeLanguage,
          });
          dispatch({ type: "SET_TAB", payload: "core30" });
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 text-xs font-semibold text-gold transition-colors hover:bg-gold/20"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        Back to Lesson {marker.lesson}
      </button>
    </div>
  );
}
