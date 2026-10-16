import { browserExamStorage } from "@/lib/assessments/drafts";
import {
  examGuidanceKey,
  saveOfflineGuidance,
  readOfflineGuidance,
} from "@/lib/assessments/offline";
import { lazy, Suspense, useEffect, useState } from "react";
import { useAuth } from "@/state/auth-state";
import { examPlanRequest, examRequest } from "@/lib/assessments/client";
import type { PlanRevision, SupportAssignment } from "@/lib/assessments/plans";
import { getCurriculum } from "@/data/curriculum";
import { moduleLessonUrl } from "@/lib/learning-link";
import { lessonPositionKey, readLessonPosition } from "@/lib/lesson-drafts";
import type { Language, NativeLanguage } from "@/data/languages";
const ExamsArea = lazy(() =>
  import("./ExamsArea").then((module) => ({ default: module.ExamsArea })),
);
export type AssessedPlanTiming = {
  reviewEveryDays: number;
  startDate?: string;
  timezone?: string;
  pausedOn?: string | null;
  status?: string;
  organizationId?: string | null;
};
type DailyView = {
  plans: {
    enrollmentId: string;
    scope: "personal" | "team";
    organizationId: string | null;
    startDate: string;
    timezone: string;
    status: string;
    pausedOn: string | null;
    revision: PlanRevision | null;
    assignments: (Pick<
      SupportAssignment,
      | "id"
      | "capability_snapshot"
      | "mode"
      | "support_enrollment_id"
      | "primary_weekly_minutes"
      | "support_weekly_minutes"
      | "status"
      | "acknowledged_at"
    > & {
      reason: string;
      primaryObjectives: string[];
      checkpoints: SupportAssignment["checkpoints"];
    })[];
  }[];
  returnContexts: {
    assignmentId: string;
    primaryEnrollmentId: string;
    primaryModuleId: string;
    primaryModuleName: string;
    status: string;
    scope: string;
  }[];
  limit: number;
};
const button =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-gold/40 px-4 py-2 text-sm font-semibold disabled:opacity-50";
export function DailyLessonPlan(props: Parameters<typeof DailyLessonPlanContent>[0]) {
  const { user } = useAuth();
  return (
    <DailyLessonPlanContent
      key={`${user?.id ?? "guest"}:${props.moduleId}:${props.target}:${props.native}:${props.activePlanId ?? "all"}`}
      {...props}
    />
  );
}
function DailyLessonPlanContent({
  moduleId,
  target,
  native,
  lessonNumber,
  activePlanId,
  onPlanTiming,
}: {
  moduleId: string;
  target: Language;
  native: NativeLanguage;
  lessonNumber?: number;
  activePlanId?: string;
  onPlanTiming?: (timing: AssessedPlanTiming | null) => void;
}) {
  const { user, isCurrentUser } = useAuth();
  const viewer = user?.id;
  const [connectionEpoch, setConnectionEpoch] = useState(0);
  useEffect(() => {
    const online = () => setConnectionEpoch((value) => value + 1);
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, []);
  const [localAttempts, setLocalAttempts] = useState<Record<string, string>>({});
  const [data, setData] = useState<DailyView | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [attemptId, setAttemptId] = useState<string | null>(null);
  useEffect(() => {
    if (!viewer) return;
    const controller = new AbortController();
    setError("");
    void examPlanRequest<DailyView>(
      `/api/exam-plans?action=daily&module=${encodeURIComponent(moduleId)}&target=${encodeURIComponent(target)}&native=${encodeURIComponent(native)}${activePlanId ? `&plan=${encodeURIComponent(activePlanId)}` : ""}`,
      controller.signal,
    )
      .then((result) => {
        if (isCurrentUser(viewer) && !controller.signal.aborted) {
          setData(result);
          saveOfflineGuidance(
            browserExamStorage(),
            examGuidanceKey(viewer, moduleId, target, native, activePlanId),
            result,
          );
          const selected = result.plans.find((plan) => plan.enrollmentId === activePlanId);
          onPlanTiming?.(
            activePlanId
              ? selected
                ? {
                    startDate: selected.startDate,
                    timezone: selected.timezone,
                    status: selected.status,
                    pausedOn: selected.pausedOn,
                    organizationId: selected.organizationId,
                    reviewEveryDays: selected.revision?.review_every_days ?? 4,
                  }
                : null
              : { reviewEveryDays: 4 },
          );
        }
      })
      .catch((err) => {
        if (isCurrentUser(viewer) && !controller.signal.aborted) {
          const cached =
            err instanceof TypeError || !navigator.onLine
              ? readOfflineGuidance<DailyView>(
                  browserExamStorage(),
                  examGuidanceKey(viewer, moduleId, target, native, activePlanId),
                )
              : null;
          if (cached) {
            setData(cached);
            setError("Using the saved learning plan. Reconnect to check for updates.");
            const selected = cached.plans.find((plan) => plan.enrollmentId === activePlanId);
            onPlanTiming?.(
              activePlanId
                ? selected
                  ? {
                      startDate: selected.startDate,
                      timezone: selected.timezone,
                      status: selected.status,
                      pausedOn: selected.pausedOn,
                      organizationId: selected.organizationId,
                      reviewEveryDays: selected.revision?.review_every_days ?? 4,
                    }
                  : null
                : { reviewEveryDays: 4 },
            );
          } else {
            setError(err.message);
            onPlanTiming?.(activePlanId ? null : { reviewEveryDays: 4 });
          }
        }
      });
    return () => controller.abort();
  }, [
    isCurrentUser,
    moduleId,
    native,
    target,
    viewer,
    attemptId,
    activePlanId,
    onPlanTiming,
    connectionEpoch,
  ]);
  if (!user) return null;
  const examUrl = `/exams?module=${encodeURIComponent(moduleId)}&target=${encodeURIComponent(target)}&native=${encodeURIComponent(native)}`;
  if (attemptId)
    return (
      <section className="my-4 rounded-2xl border border-gold/30 p-4">
        <button className={button + " mb-4"} onClick={() => setAttemptId(null)}>
          Return to this module lesson
        </button>
        <Suspense fallback={<p role="status">Opening your supporting check…</p>}>
          <ExamsArea
            embedded
            moduleId={moduleId}
            targetLanguage={target}
            instructionLanguage={native}
            attemptId={attemptId}
          />
        </Suspense>
      </section>
    );
  const plans = data?.plans ?? [];
  const hasGuidance =
    plans.some((plan) => plan.revision || plan.assignments.length) || !!data?.returnContexts.length;
  if (!hasGuidance && activePlanId) {
    const selected = plans.find((plan) => plan.enrollmentId === activePlanId);
    const selectedExamUrl = selected?.organizationId
      ? `${examUrl}&org=${encodeURIComponent(selected.organizationId)}`
      : examUrl;
    return (
      <aside
        aria-label="Your selected learning plan"
        className="my-4 space-y-2 rounded-xl border border-border p-4 text-sm"
      >
        {selected ? (
          <>
            <h3 className="font-semibold">
              {selected.scope === "personal" ? "Private personal plan" : "Team plan"}
            </h3>
            <p className="text-xs text-muted-foreground">
              Start date: {selected.startDate} · {selected.timezone} · {selected.status}
            </p>
            <p>
              Approved learning guidance is not available for this plan yet. You can keep practicing
              any lesson.
            </p>
            {error && (
              <p role="status" className="text-xs">
                {error}
              </p>
            )}
          </>
        ) : data === null && !error ? (
          <p role="status">Loading this plan… Your lesson is available.</p>
        ) : (
          <p role="status">
            This selected plan could not be loaded. Your lesson is still available.
          </p>
        )}
        <a href={selectedExamUrl} className="inline-flex min-h-11 items-center text-gold underline">
          Open my module Exams
        </a>
      </aside>
    );
  }
  if (!hasGuidance) {
    if (lessonNumber)
      return error ? (
        <p className="my-3 text-xs text-muted-foreground">
          Assessment guidance needs a connection. Your lesson is still available.
        </p>
      ) : null;
    return (
      <aside className="my-4 rounded-xl border border-border p-4 text-sm">
        <p>Assess this module at entrance, day 45 and day 90. Personal results stay private.</p>
        <a href={examUrl} className="mt-2 inline-flex min-h-11 items-center text-gold underline">
          Open my module Exams
        </a>
        {error && (
          <p className="mt-2 text-xs">
            Your saved assessment plan needs a connection. Lessons remain available.
          </p>
        )}
      </aside>
    );
  }
  return (
    <aside
      className="my-4 space-y-3 rounded-2xl border border-gold/30 bg-gold/5 p-4"
      aria-label="Your assessed daily learning plan"
    >
      <h3 className="font-semibold">Your lesson plan</h3>
      {error && (
        <p role="alert" className="text-sm">
          {error}
        </p>
      )}
      {data?.returnContexts.map((context) => {
        let previous = null;
        try {
          previous = readLessonPosition(
            window.localStorage,
            lessonPositionKey(
              user.id,
              context.primaryModuleId,
              target,
              native,
              context.primaryEnrollmentId,
            ),
          );
        } catch {
          /* Default to the first primary lesson when private storage is blocked. */
        }
        return (
          <section key={context.assignmentId} className="space-y-2 text-sm">
            <p>
              Supporting practice for {context.primaryModuleName}. Your main module stays available.
            </p>
            <a
              className={button}
              href={moduleLessonUrl({
                moduleId: context.primaryModuleId,
                planId: context.primaryEnrollmentId,
                target,
                native,
                lesson: previous?.lesson ?? 1,
                way: previous?.way ?? "see",
              })}
            >
              Return to {context.primaryModuleName}
              {previous ? ` · lesson ${previous.lesson}` : ""}
            </a>
          </section>
        );
      })}
      {plans.map((plan) => (
        <div key={plan.enrollmentId} className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {plan.scope === "personal" ? "Private personal plan" : "Team plan"}
          </p>
          {plan.revision && activePlanId !== plan.enrollmentId && (
            <a
              className={button}
              href={moduleLessonUrl({
                moduleId,
                target,
                native,
                lesson: lessonNumber ?? plan.revision.suggested_lesson,
                way: plan.revision.focus_ways[0],
                planId: plan.enrollmentId,
              })}
            >
              Use this approved plan’s focus and review schedule
            </a>
          )}
          {plan.revision &&
            (!lessonNumber ||
              lessonNumber === plan.revision.suggested_lesson ||
              plan.revision.catchup_objectives.includes(`${moduleId}.lesson.${lessonNumber}`)) && (
              <section className="space-y-2 text-sm">
                <p>{plan.revision.rationale}</p>
                <p>
                  Review every {plan.revision.review_every_days} days. Earlier lessons remain
                  available.
                </p>
                {!lessonNumber && (
                  <a
                    className={button}
                    href={moduleLessonUrl({
                      moduleId,
                      target,
                      native,
                      lesson: plan.revision.suggested_lesson,
                      planId: plan.enrollmentId,
                      way: plan.revision.focus_ways[0],
                    })}
                  >
                    Open suggested lesson {plan.revision.suggested_lesson}
                  </a>
                )}
                {lessonNumber && (
                  <div className="flex flex-wrap gap-2">
                    {plan.revision.focus_ways.map((way) => (
                      <a
                        key={way}
                        className={button}
                        href={moduleLessonUrl({
                          moduleId,
                          target,
                          native,
                          lesson: lessonNumber,
                          planId: plan.enrollmentId,
                          way,
                        })}
                      >
                        Focus:{" "}
                        {
                          (
                            {
                              see: "See it",
                              recall: "Recall it",
                              hear: "Hear it",
                              type: "Type it",
                              say: "Say it",
                              write: "Write it",
                            } as Record<string, string>
                          )[way]
                        }
                      </a>
                    ))}
                  </div>
                )}
              </section>
            )}
          {plan.assignments
            .filter(
              (assignment) =>
                !lessonNumber ||
                assignment.primaryObjectives.includes(`${moduleId}.lesson.${lessonNumber}`),
            )
            .map((assignment) => (
              <section
                key={assignment.id}
                className="space-y-2 rounded-xl border border-border p-3 text-sm"
              >
                <h4 className="font-semibold">
                  {assignment.acknowledged_at ? "Support for your lesson" : "New supporting work"}:{" "}
                  {assignment.capability_snapshot.title}
                </h4>
                <p>{assignment.reason}</p>
                <p className="text-xs">
                  {assignment.support_weekly_minutes} support + {assignment.primary_weekly_minutes}{" "}
                  primary minutes/week · {assignment.status}
                </p>
                {assignment.status === "paused" ? (
                  <p>Supporting work is paused. Continue your primary module.</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {assignment.capability_snapshot.lessonIds.map((id) => {
                        const match = /\.lesson\.(\d+)$/.exec(id),
                          n = match ? Number(match[1]) : null;
                        if (!n) return null;
                        const title = getCurriculum(
                          assignment.capability_snapshot.moduleId,
                        )?.lessons.find((lesson) => lesson.n === n)?.title;
                        return (
                          <button
                            key={id}
                            className={button}
                            disabled={busy}
                            onClick={() => {
                              setBusy(true);
                              setError("");
                              void examPlanRequest({
                                action: "acknowledge",
                                assignmentId: assignment.id,
                                requestId: crypto.randomUUID(),
                              })
                                .then(() => {
                                  if (isCurrentUser(user.id))
                                    window.location.assign(
                                      moduleLessonUrl({
                                        moduleId: assignment.capability_snapshot.moduleId,
                                        target,
                                        native,
                                        lesson: n,
                                        way: "see",
                                      }),
                                    );
                                })
                                .catch((err) => setError(err.message))
                                .finally(() => setBusy(false));
                            }}
                          >
                            Practice {n}
                            {title ? `: ${title}` : ""}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {assignment.checkpoints.map((cp) => (
                        <button
                          key={cp.id}
                          className={button}
                          disabled={busy}
                          onClick={() => {
                            const existing = cp.attempts[0]?.id ?? localAttempts[cp.id];
                            if (existing) {
                              setAttemptId(existing);
                              return;
                            }
                            setBusy(true);
                            setError("");
                            void examRequest<{ id: string }>({
                              action: "start",
                              checkpointId: cp.id,
                              requestId: crypto.randomUUID(),
                            })
                              .then((attempt) => {
                                if (isCurrentUser(user.id)) {
                                  setLocalAttempts((previous) => ({
                                    ...previous,
                                    [cp.id]: attempt.id,
                                  }));
                                  setAttemptId(attempt.id);
                                }
                              })
                              .catch((err) => setError(err.message))
                              .finally(() => setBusy(false));
                          }}
                        >
                          {assignment.mode === "units"
                            ? cp.checkpoint === "entrance"
                              ? "Before-practice check"
                              : "After-practice check"
                            : (
                                {
                                  entrance: "Entrance exam",
                                  day45: "Day 45 exam",
                                  day90: "Day 90 exam",
                                } as Record<string, string>
                              )[cp.checkpoint]}
                          {cp.attempts[0]?.submitted_at
                            ? " · view result"
                            : cp.attempts[0] || localAttempts[cp.id]
                              ? " · resume"
                              : " · start"}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </section>
            ))}
          <a
            className="inline-flex min-h-11 items-center text-sm text-gold underline"
            href={`${examUrl}${plan.organizationId ? `&org=${encodeURIComponent(plan.organizationId)}` : ""}`}
          >
            Review this plan’s evidence and history
          </a>
        </div>
      ))}
    </aside>
  );
}
