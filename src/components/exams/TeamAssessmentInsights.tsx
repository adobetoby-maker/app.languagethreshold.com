import { useState } from "react";
import { MODULES } from "@/data/modules";
import { getCurriculum } from "@/data/curriculum";
import { LANGUAGES, NATIVE_LANGUAGES, type Language, type NativeLanguage } from "@/data/languages";
import { usePrivatePagedReport } from "@/hooks/use-private-paged-report";
import type { InsightCell, TeamInsightReport } from "@/lib/assessments/team-insights";
const skills = {
  recognition: "Word recognition",
  recall: "Word recall",
  listening: "Listening",
  reading: "Reading",
  writing: "Written production",
  speaking: "Spoken production",
};
const names = { entrance: "Entrance", day45: "Day 45", day90: "Day 90" };
const input = "mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2";
const button =
  "min-h-11 rounded-xl border border-gold/50 px-4 py-2 text-sm font-semibold text-gold disabled:opacity-50";
export function TeamAssessmentInsights({
  orgId,
  moduleId,
  target,
  native,
}: {
  orgId: string;
  moduleId: string;
  target: Language;
  native: NativeLanguage;
}) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState({
    module: moduleId,
    target,
    native,
    checkpoint: "entrance" as keyof typeof names,
  });
  const [draft, setDraft] = useState(scope);
  const path =
    "/api/exams?" + new URLSearchParams({ action: "team_insights", org: orgId, ...scope });
  const report = usePrivatePagedReport<InsightCell, TeamInsightReport>(path, open);
  const metadata = report.metadata;
  const source = getCurriculum(scope.module);
  return (
    <details
      className="rounded-2xl border border-border bg-card/50 p-4 sm:p-6"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="min-h-11 cursor-pointer py-2 font-semibold">
        Team learning evidence
      </summary>
      {open && (
        <div className="mt-3 space-y-4">
          <p className="text-sm text-muted-foreground">
            Review skill and lesson-objective evidence for active primary-module learners. Each
            summary uses one reviewed exam version. Missing evidence and missing content stay
            separate from demonstrated performance.
          </p>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              setScope({ ...draft });
            }}
          >
            <label className="text-sm">
              Insight module
              <select
                className={input}
                value={draft.module}
                onChange={(event) =>
                  setDraft((value) => ({ ...value, module: event.target.value }))
                }
              >
                {MODULES.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Insight checkpoint
              <select
                className={input}
                value={draft.checkpoint}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    checkpoint: event.target.value as keyof typeof names,
                  }))
                }
              >
                {Object.entries(names).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Insight target language
              <select
                className={input}
                value={draft.target}
                onChange={(event) =>
                  setDraft((value) => ({ ...value, target: event.target.value as Language }))
                }
              >
                {LANGUAGES.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Insight instruction language
              <select
                className={input}
                value={draft.native}
                onChange={(event) =>
                  setDraft((value) => ({ ...value, native: event.target.value as NativeLanguage }))
                }
              >
                {NATIVE_LANGUAGES.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <button className={button} disabled={report.loading}>
              Apply insight scope
            </button>
          </form>
          <p className="text-sm">
            {MODULES.find((module) => module.id === scope.module)?.name ?? scope.module} ·{" "}
            {scope.native} → {scope.target} · {names[scope.checkpoint]}
          </p>
          {report.loading && <p role="status">Loading team evidence…</p>}
          {report.error && <p role="alert">{report.error}</p>}
          {!report.loading && metadata?.status === "content_pending" && (
            <p role="status">
              Lesson review or a calibrated exam is still being prepared for this track. This is a
              content gap, not evidence of learner weakness. Check Module readiness below.
            </p>
          )}
          {!report.loading && metadata?.status === "small_group" && (
            <p role="status">
              This group is too small for a team summary. At least {metadata.minimumGroup} learners
              are required; individual records remain in their authorized plan views.
            </p>
          )}
          {!report.loading && metadata?.status === "too_large" && (
            <p role="status">
              This cohort exceeds the current reporting limit. No partial team average is shown.
            </p>
          )}
          {!report.loading && metadata?.status === "available" && (
            <>
              <p className="text-sm text-muted-foreground">
                {metadata.learnerCount} active primary-module learners · form {metadata.formVersion}{" "}
                · rubric {metadata.rubricVersion}. Small nonzero categories suppress the entire
                cell, including its average. Averages include final scored evidence only; copying
                and practice points are excluded.
              </p>
              {metadata.evidenceScope === "fixed_core" && (
                <p className="text-sm text-muted-foreground">
                  Team patterns use the fixed core shared by all learners. Individual results
                  include each learner’s selected branch.
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {report.items
                  .filter((cell) => cell.kind === "skill")
                  .map((cell) => (
                    <InsightCard
                      key={cell.id}
                      cell={cell}
                      title={skills[cell.skill]}
                      total={metadata.learnerCount!}
                    />
                  ))}
              </div>
              <details>
                <summary className="min-h-11 cursor-pointer py-2 font-semibold">
                  Evidence by lesson objective
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {report.items
                    .filter((cell) => cell.kind === "objective")
                    .map((cell) => {
                      const lesson = source?.lessons.find(
                        (lesson) => `${scope.module}.lesson.${lesson.n}` === cell.objectiveId,
                      );
                      return (
                        <InsightCard
                          key={cell.id}
                          cell={cell}
                          title={`${lesson ? `Lesson ${lesson.n} · ${lesson.title}` : cell.objectiveId} · ${skills[cell.skill]}`}
                          total={metadata.learnerCount!}
                        />
                      );
                    })}
                </div>
              </details>
            </>
          )}
          <button
            className={button}
            disabled={report.loading}
            onClick={() => void report.refresh()}
          >
            Refresh team evidence
          </button>
        </div>
      )}
    </details>
  );
}
function InsightCard({ cell, title, total }: { cell: InsightCell; title: string; total: number }) {
  return (
    <article className="min-w-0 rounded-xl border border-border p-4">
      <h4 className="break-words font-semibold">{title}</h4>
      {cell.visibility === "suppressed" ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Hidden to protect a small group. No average or category counts are shown.
        </p>
      ) : (
        <>
          <p className="mt-2 font-semibold">
            {cell.meanScore === null
              ? "No final score available"
              : `${cell.meanScore}/100 average response credit`}
          </p>
          <p className="mt-1 text-sm">
            {cell.scoredLearners} scored / {total} learners
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {cell.counts!.needs_review} need review · {cell.counts!.pending} pending ·{" "}
            {cell.counts!.insufficient_coverage} insufficient coverage · {cell.counts!.not_assessed}{" "}
            not assessed
          </p>
        </>
      )}
    </article>
  );
}
