import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/state/auth-state";
import { examPlanRequest, examRequest } from "@/lib/assessments/client";
import type {
  AssessmentPlanView,
  SupportRecommendation,
  SupportAssignment,
} from "@/lib/assessments/plans";
import { getModule } from "@/data/modules";
import { getCurriculum } from "@/data/curriculum";
import { toDateKey } from "@/lib/core30-plan";
import { moduleLessonUrl } from "@/lib/learning-link";
const card = "rounded-xl border border-border p-4";
const button =
  "min-h-11 rounded-xl border border-gold/40 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const input = "mt-1 min-h-11 w-full rounded-xl border border-border bg-background p-3 text-sm";
const wayNames: Record<string, string> = {
  see: "See it",
  recall: "Recall it",
  hear: "Hear it",
  type: "Type it",
  say: "Say it",
  write: "Write it",
};
const checkpointNames: Record<string, string> = {
  entrance: "Entrance",
  day45: "Day 45",
  day90: "Day 90",
};
function lessonLabel(id: string) {
  const match = /^([a-z][a-z0-9-]*)\.lesson\.(\d+)$/.exec(id);
  if (!match) return "Reviewed objective";
  const lesson = getCurriculum(match[1])?.lessons.find((row) => row.n === Number(match[2]));
  return lesson ? `Lesson ${lesson.n}: ${lesson.title}` : "Reviewed unit";
}
export function AssessmentPlanPanel({
  enrollmentId,
  sourceAttemptId,
  onOpenAttempt,
}: {
  enrollmentId: string;
  sourceAttemptId?: string;
  onOpenAttempt: (id: string) => void;
}) {
  const { user, isCurrentUser } = useAuth();
  const viewerId = user?.id;
  const [data, setData] = useState<AssessmentPlanView | null>(null),
    [source, setSource] = useState(sourceAttemptId ?? ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const [decision, setDecision] = useState<SupportRecommendation | null>(null),
    [change, setChange] = useState<{ assignment: SupportAssignment; status: string } | null>(null),
    [supportReason, setSupportReason] = useState(""),
    [planReason, setPlanReason] = useState("");
  const [startLesson, setStartLesson] = useState(1),
    [focus, setFocus] = useState<string[]>(["recall"]),
    [catchup, setCatchup] = useState<string[]>([]),
    [reviewDays, setReviewDays] = useState(4);
  const actionLock = useRef(false),
    flight = useRef<{ signature: string; requestId: string } | null>(null);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!viewerId) return;
      const viewer = viewerId;
      try {
        const result = await examPlanRequest<AssessmentPlanView>(
          `/api/exam-plans?enrollment=${encodeURIComponent(enrollmentId)}${source ? `&attempt=${encodeURIComponent(source)}` : ""}`,
          signal,
        );
        if (isCurrentUser(viewer) && !signal?.aborted) {
          setData(result);
          setError("");
        }
      } catch (err) {
        if (isCurrentUser(viewer) && !signal?.aborted)
          setError(err instanceof Error ? err.message : "The learning plan could not be loaded.");
      }
    },
    [enrollmentId, isCurrentUser, source, viewerId],
  );
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  const act = async (body: Record<string, unknown>) => {
    if (actionLock.current || !user) return;
    actionLock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    const viewer = user.id,
      signature = JSON.stringify(body);
    if (flight.current?.signature !== signature)
      flight.current = { signature, requestId: crypto.randomUUID() };
    try {
      await examPlanRequest({ ...body, requestId: flight.current!.requestId });
      if (!isCurrentUser(viewer)) return;
      flight.current = null;
      setDecision(null);
      setChange(null);
      setSupportReason("");
      if (body.action === "revise") setPlanReason("");
      setNotice("Saved. The plan history keeps the decision and its reason.");
      await load();
    } catch (err) {
      if (isCurrentUser(viewer))
        setError(err instanceof Error ? err.message : "The plan could not be changed.");
    } finally {
      actionLock.current = false;
      if (isCurrentUser(viewer)) setBusy(false);
    }
  };
  if (!data)
    return (
      <section className={card}>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button className={button + " mt-3"} onClick={() => void load()}>
              Try again
            </button>
          </>
        ) : (
          <p role="status">Loading learning plan and supporting work…</p>
        )}
      </section>
    );
  const primary = getModule(data.enrollment.moduleId)?.name ?? data.enrollment.moduleId;
  const lessons = getCurriculum(data.enrollment.moduleId)?.lessons ?? [];
  const pending = data.recommendations.filter(
    (rec) => rec.decision === "suggested" || rec.decision === "deferred",
  );
  const qualified = !!data.source && !data.source.pilot && data.source.calibrated;
  const gaps = lessons.filter((lesson) => lesson.n < startLesson);
  return (
    <section className="space-y-4" aria-label="Assessed learning plan and supporting work">
      <header>
        <h3 className="text-lg font-semibold">Learning plan and supporting work</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {primary} stays primary. Starting points are recommendations; previous lessons and
          existing mastery remain available.
        </p>
      </header>
      {error && (
        <p role="alert" className="rounded-xl border border-amber-500/40 p-3">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      <label className="block text-sm">
        Assessment evidence
        <select
          className={input}
          value={source || data.source?.id || ""}
          onChange={(event) => setSource(event.target.value)}
          disabled={busy}
        >
          {!data.availableSources.length && <option value="">No submitted assessment yet</option>}
          {data.availableSources.map((attempt) => (
            <option key={attempt.id} value={attempt.id}>
              {checkpointNames[attempt.checkpoint]} ·{" "}
              {new Date(attempt.submittedAt).toLocaleDateString()} · attempt {attempt.attemptNumber}
              {attempt.designated ? " · original" : " · retake"}
            </option>
          ))}
        </select>
      </label>
      {data.source && (
        <button className={button} onClick={() => onOpenAttempt(data.source!.id)}>
          View this assessment’s evidence
        </button>
      )}
      {data.availability !== "ready" && (
        <p className={card + " text-sm"}>
          {
            (
              {
                access_needed: "Learning access must be active before adding supporting content.",
                assessment_needed:
                  "Submit an entrance assessment to build an evidence-based learning plan.",
                awaiting_calibration:
                  "This assessment is a draft or is awaiting calibration. It can be reviewed, but its scores cannot assign supporting work or change the learning plan.",
                evidence_needed:
                  "No sufficiently assessed gap is available for a supporting-content suggestion. Missing inputs stay unassessed.",
                content_gap:
                  "Content gap: no eligible reviewed supporting units match this evidence. Continue the work module while curriculum staff close the gap.",
              } as Record<string, string>
            )[data.availability]
          }
        </p>
      )}
      {data.revisions[0] && (
        <article className={card}>
          <h4 className="font-semibold">
            Current approved plan · revision {data.revisions[0].revision}
          </h4>
          <p className="mt-2 text-sm">
            Suggested lesson {data.revisions[0].suggested_lesson} · focus{" "}
            {data.revisions[0].focus_ways.map((way) => wayNames[way]).join(", ")} · review every{" "}
            {data.revisions[0].review_every_days} days
          </p>
          <p className="mt-2 text-sm">{data.revisions[0].rationale}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Catch-up:{" "}
            {data.revisions[0].catchup_objectives.length
              ? data.revisions[0].catchup_objectives.map(lessonLabel).join("; ")
              : "No extra catch-up recorded"}
            .
          </p>
          <a
            className={button + " mt-3 inline-flex items-center"}
            href={moduleLessonUrl({
              moduleId: data.enrollment.moduleId,
              target: data.enrollment.targetLanguage,
              native: data.enrollment.instructionLanguage,
              lesson: data.revisions[0].suggested_lesson,
              planId: data.enrollment.id,
              way: data.revisions[0].focus_ways[0],
            })}
          >
            Open the suggested lesson
          </a>
        </article>
      )}
      {data.assignments
        .filter((assignment) => ["active", "paused", "checkpoint_due"].includes(assignment.status))
        .map((assignment) => (
          <article key={assignment.id} className={card}>
            <h4 className="font-semibold">
              {assignment.acknowledged_at ? "Supporting work" : "New supporting assignment"} ·{" "}
              {assignment.capability_snapshot.title}
            </h4>
            <p className="mt-2 text-sm">
              {assignment.status} ·{" "}
              {assignment.mode === "units"
                ? `${assignment.capability_snapshot.lessonIds.length} targeted units`
                : "Full additional module, with its own three exams"}{" "}
              · {assignment.support_weekly_minutes} support + {assignment.primary_weekly_minutes}{" "}
              primary minutes/week
            </p>
            <p className="mt-2 text-xs">
              {assignment.capability_snapshot.offlineAvailable
                ? "Offline content verified"
                : "Connection required"}{" "}
              · content {assignment.capability_snapshot.version}
            </p>
            <p className="mt-2 text-sm">{assignment.budget_reason}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.canManage && (
                <>
                  <button
                    className={button}
                    disabled={busy}
                    onClick={() => {
                      setSupportReason("");
                      setChange({
                        assignment,
                        status: assignment.status === "paused" ? "active" : "paused",
                      });
                    }}
                  >
                    {assignment.status === "paused" ? "Resume support" : "Pause support"}
                  </button>
                  <button
                    className={button}
                    disabled={busy}
                    onClick={() => {
                      setSupportReason("");
                      setChange({ assignment, status: "completed" });
                    }}
                  >
                    Complete support after follow-up
                  </button>
                  <button
                    className={button}
                    disabled={busy}
                    onClick={() => {
                      setSupportReason("");
                      setChange({ assignment, status: "withdrawn" });
                    }}
                  >
                    Withdraw support
                  </button>
                </>
              )}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {assignment.checkpoints.map((cp) => (
                <section key={cp.id} className="rounded-xl border border-border p-3 text-sm">
                  <h5 className="font-semibold">
                    {assignment.mode === "units"
                      ? cp.checkpoint === "entrance"
                        ? "Before practice"
                        : "After practice"
                      : checkpointNames[cp.checkpoint]}
                  </h5>
                  <p>Suggested {cp.due_date}</p>
                  {cp.attempts[0] && (
                    <button
                      className={button + " mt-2"}
                      onClick={() => onOpenAttempt(cp.attempts[0].id)}
                    >
                      {cp.attempts[0].submitted_at ? "View check result" : "Resume check"}
                    </button>
                  )}
                  {data.isLearner &&
                    assignment.status === "active" &&
                    (!cp.attempts[0] || cp.attempts[0].submitted_at) && (
                      <button
                        className={button + " mt-2"}
                        disabled={busy}
                        onClick={() => {
                          if (actionLock.current) return;
                          actionLock.current = true;
                          setBusy(true);
                          setError("");
                          void examRequest<{ id: string }>({
                            action: "start",
                            checkpointId: cp.id,
                            requestId: crypto.randomUUID(),
                          })
                            .then((attempt) => onOpenAttempt(attempt.id))
                            .catch((err) => setError(err.message))
                            .finally(() => {
                              actionLock.current = false;
                              setBusy(false);
                            });
                        }}
                      >
                        {cp.attempts[0] ? "Retake — preserve original" : "Start check"}
                      </button>
                    )}
                </section>
              ))}
            </div>
          </article>
        ))}
      {change && (
        <form
          className={card + " space-y-3"}
          onSubmit={(event) => {
            event.preventDefault();
            void act({
              action: "change_support",
              assignmentId: change.assignment.id,
              status: change.status,
              reason: supportReason,
            });
          }}
        >
          <h4 className="font-semibold">Set support to {change.status}</h4>
          <label className="block text-sm">
            Reason
            <textarea
              className={input}
              required
              minLength={3}
              maxLength={2000}
              value={supportReason}
              onChange={(event) => setSupportReason(event.target.value)}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Completion requires a completed, reviewed follow-up. The primary module’s deadlines and
            mastered lessons stay separate.
          </p>
          <button className={button} disabled={busy}>
            Save support change
          </button>
          <button
            type="button"
            className={button + " ml-2"}
            onClick={() => setChange(null)}
            disabled={busy}
          >
            Cancel
          </button>
        </form>
      )}
      {pending.map((rec) => (
        <article className={card} key={rec.id}>
          <h4 className="font-semibold">Suggested: {rec.capability?.title ?? rec.capability_id}</h4>
          <p className="mt-2 text-sm">{rec.why}</p>
          <p className="mt-2 text-xs">
            {rec.evidence.length} scored task records ·{" "}
            {new Set(rec.evidence.map((item) => item.objectiveId)).size} objectives · {rec.decision}
          </p>
          {data.canManage && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className={button}
                disabled={busy}
                onClick={() => {
                  setDecision(rec);
                  setSupportReason("");
                }}
              >
                Review, edit and approve
              </button>
              <button
                className={button}
                disabled={busy}
                onClick={() => {
                  setDecision(rec);
                  setSupportReason("");
                }}
              >
                Defer or dismiss
              </button>
            </div>
          )}
        </article>
      ))}
      {data.canManage &&
        data.candidates.map((candidate) => (
          <article className={card} key={candidate.capabilityId}>
            <h4 className="font-semibold">Reviewed content match: {candidate.title}</h4>
            <p className="mt-2 text-sm">
              {candidate.lessonIds.length} proposed units · estimated {candidate.weeklyMinutes}{" "}
              minutes/week ·{" "}
              {candidate.offlineAvailable ? "offline verified" : "connection required"}
            </p>
            <p className="mt-2 text-xs">
              Source: {new Date(candidate.assessedAt).toLocaleDateString()} ·{" "}
              {new Set(candidate.evidence.map((item) => item.objectiveId)).size} assessed
              objectives. Missing inputs were excluded.
            </p>
            <button
              className={button + " mt-3"}
              disabled={busy}
              onClick={() =>
                void act({
                  action: "suggest",
                  enrollmentId,
                  attemptId: candidate.sourceAttemptId,
                  capabilityId: candidate.capabilityId,
                  reason: `Reviewed supporting units address the assessed ${[...new Set(candidate.evidence.map((item) => item.skill))].join(", ")} evidence on ${[...new Set(candidate.evidence.map((item) => item.objectiveId))].map(lessonLabel).join("; ")}.`,
                })
              }
            >
              Prepare this suggestion for approval
            </button>
          </article>
        ))}
      {decision && (
        <SupportDecision
          key={decision.id}
          recommendation={decision}
          timezone={data.enrollment.timezone}
          busy={busy}
          error={error}
          onCancel={() => setDecision(null)}
          onSubmit={(body) => void act(body)}
        />
      )}
      {data.canManage && (
        <details className={card}>
          <summary className="min-h-11 cursor-pointer py-2 font-semibold">
            Review a primary lesson-plan change
          </summary>
          <form
            className="mt-3 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!data.source) return;
              void act({
                action: "revise",
                enrollmentId,
                attemptId: data.source.id,
                startLesson,
                focusWays: focus,
                catchupObjectives: catchup,
                reviewEveryDays: reviewDays,
                reason: planReason,
              });
            }}
          >
            {!qualified && (
              <p className="text-sm">
                Reviewed, calibrated evidence is required before this change can be approved.
              </p>
            )}
            <fieldset disabled={!qualified || busy} className="space-y-3">
              <label className="block text-sm">
                Suggested starting lesson
                <select
                  className={input}
                  value={startLesson}
                  onChange={(event) => {
                    const n = Number(event.target.value);
                    setStartLesson(n);
                    setCatchup(
                      lessons
                        .filter((lesson) => lesson.n < n)
                        .map((lesson) => `${data.enrollment.moduleId}.lesson.${lesson.n}`),
                    );
                  }}
                >
                  {lessons.map((lesson) => (
                    <option key={lesson.n} value={lesson.n}>
                      {lesson.n}. {lesson.title}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <p className="text-sm">
                  Focus activities — the server requires corresponding assessed evidence
                </p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {Object.entries(wayNames).map(([way, name]) => (
                    <label className="flex min-h-11 items-center gap-2 text-sm" key={way}>
                      <input
                        type="checkbox"
                        checked={focus.includes(way)}
                        onChange={(event) =>
                          setFocus((previous) =>
                            event.target.checked
                              ? [...previous, way]
                              : previous.filter((value) => value !== way),
                          )
                        }
                      />
                      {name}
                    </label>
                  ))}
                </div>
              </div>
              <label className="block text-sm">
                Review every (days)
                <input
                  type="number"
                  className={input}
                  min={1}
                  max={30}
                  value={reviewDays}
                  onChange={(event) => setReviewDays(Number(event.target.value))}
                  required
                />
              </label>
              {!!gaps.length && (
                <div>
                  <p className="text-sm">Keep targeted catch-up for unassessed prerequisites</p>
                  {gaps.map((lesson) => {
                    const objective = `${data.enrollment.moduleId}.lesson.${lesson.n}`;
                    return (
                      <label className="flex min-h-11 items-center gap-2 text-sm" key={objective}>
                        <input
                          type="checkbox"
                          checked={catchup.includes(objective)}
                          onChange={(event) =>
                            setCatchup((previous) =>
                              event.target.checked
                                ? [...previous, objective]
                                : previous.filter((value) => value !== objective),
                            )
                          }
                        />
                        {lesson.n}. {lesson.title}
                      </label>
                    );
                  })}
                </div>
              )}
              <label className="block text-sm">
                Evidence and reason
                <textarea
                  className={input}
                  required
                  minLength={3}
                  maxLength={2000}
                  value={planReason}
                  onChange={(event) => setPlanReason(event.target.value)}
                />
              </label>
              <button className={button} disabled={!focus.length}>
                Approve this plan revision
              </button>
            </fieldset>
          </form>
        </details>
      )}
      <details className={card}>
        <summary className="min-h-11 cursor-pointer py-2 font-semibold">
          Plan and assignment history
        </summary>
        <p className="my-3 text-xs text-muted-foreground">
          Latest {data.limit} records per history. Participation and self-reported mastery are
          unchanged by these decisions.
        </p>
        {!data.revisions.length && !data.recommendations.length && !data.assignments.length && (
          <p className="text-sm">No assessed plan changes or supporting assignments yet.</p>
        )}
        {data.revisions.map((revision) => (
          <article key={revision.id} className="border-t border-border py-3 text-sm">
            <p className="font-semibold">
              Revision {revision.revision} · {new Date(revision.created_at).toLocaleString()}
            </p>
            <p>{revision.rationale}</p>
            <p>
              Lesson {revision.suggested_lesson} ·{" "}
              {revision.focus_ways.map((way) => wayNames[way]).join(", ")} · review every{" "}
              {revision.review_every_days} days
            </p>
          </article>
        ))}
        {data.recommendations
          .filter((rec) => !["suggested", "deferred"].includes(rec.decision))
          .map((rec) => (
            <article key={rec.id} className="border-t border-border py-3 text-sm">
              <p className="font-semibold">
                {rec.capability?.title ?? rec.capability_id} · {rec.decision}
              </p>
              <p>{rec.decision_reason}</p>
              <p className="text-xs">
                {rec.decided_at && new Date(rec.decided_at).toLocaleString()}
              </p>
            </article>
          ))}
        {data.assignments
          .filter((assignment) => ["completed", "withdrawn"].includes(assignment.status))
          .map((assignment) => (
            <p key={assignment.id} className="border-t border-border py-3 text-sm">
              {assignment.capability_snapshot.title} · {assignment.status} · approved{" "}
              {new Date(assignment.approved_at).toLocaleDateString()}
            </p>
          ))}
      </details>
    </section>
  );
}

function SupportDecision({
  recommendation,
  timezone,
  busy,
  error,
  onCancel,
  onSubmit,
}: {
  recommendation: SupportRecommendation;
  timezone: string;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [decision, setDecision] = useState<"approved" | "deferred" | "dismissed">("approved"),
    [reason, setReason] = useState(""),
    [mode, setMode] = useState(recommendation.capability?.assignment_mode ?? "units");
  const [primary, setPrimary] = useState(80),
    [support, setSupport] = useState(recommendation.capability?.weekly_minutes ?? 20),
    [cap, setCap] = useState(20),
    [days, setDays] = useState(7),
    [start, setStart] = useState(() => toDateKey(new Date()));
  const [units, setUnits] = useState(recommendation.capability?.lesson_ids ?? []),
    share = primary + support > 0 ? Math.round((1000 * support) / (primary + support)) / 10 : 100;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onCancel();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review supporting-work decision</DialogTitle>
          <DialogDescription>
            Check the units, learner goal and weekly workload before approving.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="rounded-xl border border-amber-500/40 p-3 text-sm">
            {error}
          </p>
        )}
        <form
          className={card + " space-y-3"}
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(
              decision === "approved"
                ? {
                    action: "approve",
                    recommendationId: recommendation.id,
                    reason,
                    mode,
                    ...(mode === "units" ? { units } : {}),
                    primaryMinutes: primary,
                    supportMinutes: support,
                    capPercent: cap,
                    startDate: start,
                    timezone,
                    followupDays: days,
                  }
                : { action: "decide", recommendationId: recommendation.id, decision, reason },
            );
          }}
        >
          <label className="block text-sm">
            Decision
            <select
              className={input}
              value={decision}
              onChange={(event) => setDecision(event.target.value as typeof decision)}
            >
              <option value="approved">Approve or edit</option>
              <option value="deferred">Defer</option>
              <option value="dismissed">Dismiss</option>
            </select>
          </label>
          {decision === "approved" && (
            <>
              <label className="block text-sm">
                Scope
                <select
                  className={input}
                  value={mode}
                  onChange={(event) => setMode(event.target.value as typeof mode)}
                >
                  <option
                    value="units"
                    disabled={recommendation.capability?.assignment_mode === "full_module"}
                  >
                    Targeted units with short before/after checks
                  </option>
                  <option value="full_module">
                    Full additional module with entrance/day45/day90
                  </option>
                </select>
              </label>
              {mode === "units" && (
                <div>
                  <p className="text-sm">Reviewed units</p>
                  {recommendation.capability?.lesson_ids.map((unit) => (
                    <label key={unit} className="flex min-h-11 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={units.includes(unit)}
                        onChange={(event) =>
                          setUnits((previous) =>
                            event.target.checked
                              ? [...previous, unit]
                              : previous.filter((value) => value !== unit),
                          )
                        }
                      />
                      {lessonLabel(unit)}
                    </label>
                  ))}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    name: "Primary minutes/week",
                    value: primary,
                    set: setPrimary,
                    min: 20,
                    max: 1200,
                  },
                  {
                    name: "Support minutes/week",
                    value: support,
                    set: setSupport,
                    min: 1,
                    max: 180,
                  },
                  { name: "Maximum support share (%)", value: cap, set: setCap, min: 1, max: 50 },
                ].map((field) => (
                  <label className="block text-sm" key={field.name}>
                    {field.name}
                    <input
                      className={input}
                      type="number"
                      min={field.min}
                      max={field.max}
                      required
                      value={field.value}
                      onChange={(event) => field.set(Number(event.target.value))}
                    />
                  </label>
                ))}
              </div>
              <p className="text-sm">
                Projected total: {primary + support} minutes/week · support {share}% · primary{" "}
                {Math.round((100 - share) * 10) / 10}%. Default cap is 20%; a change needs a reason.
                The primary module’s existing deadlines remain separate.
              </p>
              <label className="block text-sm">
                Start date
                <input
                  className={input}
                  type="date"
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                  required
                />
              </label>
              {mode === "units" && (
                <label className="block text-sm">
                  Follow-up check after (days)
                  <input
                    className={input}
                    type="number"
                    min={1}
                    max={90}
                    value={days}
                    onChange={(event) => setDays(Number(event.target.value))}
                    required
                  />
                </label>
              )}
            </>
          )}
          <label className="block text-sm">
            Why this decision?
            {mode === "full_module" && decision === "approved"
              ? " Include the learner goal that justifies a whole additional module."
              : ""}
            <textarea
              className={input}
              required
              minLength={decision === "approved" && (cap !== 20 || mode === "full_module") ? 20 : 3}
              maxLength={2000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              className={button}
              disabled={
                busy ||
                (decision === "approved" && (share > cap || (mode === "units" && !units.length)))
              }
            >
              {decision === "approved"
                ? "Approve this workload"
                : decision === "deferred"
                  ? "Defer suggestion"
                  : "Dismiss suggestion"}
            </button>
            <button type="button" className={button} disabled={busy} onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
