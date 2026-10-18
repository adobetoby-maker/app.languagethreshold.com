import { useState } from "react";
import { useApp } from "@/state/app-state";
import { core30ScopeKey, type Core30ProgressContext } from "@/lib/core30-scope";
import { summarizeCore30, toDateKey } from "@/lib/core30-plan";
import { getCurriculum } from "@/data/curriculum";

export function LegacyCore30History({
  moduleId,
  context,
}: {
  moduleId: string;
  context: Core30ProgressContext;
}) {
  const { state, dispatch } = useApp();
  const key = core30ScopeKey(moduleId, context);
  const [confirmedKey, setConfirmedKey] = useState<string | null>(null);
  const legacy = state.core30Log[moduleId];
  const completed = state.lessonProgress[moduleId] ?? 0;
  if (!legacy && !completed) return null;
  const summary = summarizeCore30(
    legacy,
    getCurriculum(moduleId)?.lessons.length ?? 30,
    toDateKey(new Date()),
  );
  const imported = state.core30Log[key]?.legacyImportedAt;
  return (
    <details className="my-4 rounded-xl border border-border bg-card/40 p-4 text-sm">
      <summary className="cursor-pointer font-medium">
        Earlier progress · language and plan not recorded
      </summary>
      <p className="mt-3 text-muted-foreground">
        Your earlier record is preserved. It does not automatically count toward a new language pair
        or plan.
      </p>
      <p className="mt-2">
        {summary.mastered} self-marked mastered · {summary.lessonsOpened} lessons opened ·{" "}
        {completed} sequential lessons recorded
      </p>
      {legacy?.startDate && <p className="mt-1">Earlier plan start: {legacy.startDate}</p>}
      {imported ? (
        <p className="mt-3" role="status">
          You linked a copy to this language pair and plan. The original history remains saved.
        </p>
      ) : (
        <>
          <label className="mt-4 flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-1"
              checked={confirmedKey === key}
              onChange={(event) => setConfirmedKey(event.target.checked ? key : null)}
            />
            <span>
              This earlier record belongs to {context.instructionLanguage} →{" "}
              {context.targetLanguage},{" "}
              {context.enrollmentId ? "this exam plan" : "my independent practice"}.
            </span>
          </label>
          <button
            type="button"
            className="mt-3 min-h-11 rounded-lg border border-border px-4 disabled:opacity-50"
            disabled={confirmedKey !== key}
            onClick={() => {
              if (confirmedKey !== key) return;
              dispatch({
                type: "CORE30_CLAIM_LEGACY",
                payload: { moduleId, context, at: new Date().toISOString() },
              });
            }}
          >
            Link a copy of this history
          </button>
          <p className="mt-2 text-xs text-muted-foreground">
            This identifies your own practice history. It does not create an exam score or
            certificate, or award XP.
          </p>
        </>
      )}
    </details>
  );
}
