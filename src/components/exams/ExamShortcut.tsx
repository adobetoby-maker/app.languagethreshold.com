import { ListChecks } from "lucide-react";
import { useApp } from "@/state/app-state";
import { getModule } from "@/data/modules";
import { moduleBaseId } from "@/lib/module-order";
import { examsFromLessonLocation } from "@/lib/exam-navigation";

/** Course entry only; the Exams route still owns access and published-form availability. */
export function ExamShortcut() {
  const { state } = useApp();
  const base = state.activeModuleId ? moduleBaseId(state.activeModuleId) : null;
  const moduleId = base && getModule(base) ? base : state.activeModuleId;
  return (
    <button
      type="button"
      onClick={() =>
        window.location.assign(
          examsFromLessonLocation(window.location.href, {
            moduleId,
            target: state.selectedLanguage,
            native: state.nativeLanguage,
            orgId: new URLSearchParams(window.location.search).get("org"),
          }),
        )
      }
      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gold/30 px-4 py-2 text-sm font-semibold text-gold hover:bg-gold/10"
    >
      <ListChecks className="h-4 w-4" aria-hidden="true" /> Exams
    </button>
  );
}
