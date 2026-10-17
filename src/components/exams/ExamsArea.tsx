import { attemptMatchesOrganization } from "@/lib/assessments/scope";
import { lessonNumberRanges } from "@/lib/lesson-number-ranges";
import type { LessonSourceCoverage } from "@/lib/lesson-source-coverage";
import { ExamSpeechQuestion } from "./ExamSpeechQuestion";
import { SpeechEvidencePlayback } from "./SpeechEvidencePlayback";
import {
  subscribeSpeechDrafts,
  unsavedSpeechCount,
  readSpeechTake,
} from "@/lib/assessments/speech-device";
import { usePrivatePagedReport } from "@/hooks/use-private-paged-report";
import type { OverviewState } from "@/lib/assessments/reporting";
import { CheckpointAttemptHistory } from "./CheckpointAttemptHistory";
import { isPrivateAssessmentContext } from "@/lib/assessment-privacy";
import { isSpeakingPrivacyMode, LANGUAGE_THRESHOLD_GA_ID } from "@/lib/speaking-privacy";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AIWritingProposal } from "./AIWritingProposal";
import { cn } from "@/lib/utils";
import { moduleLessonUrl } from "@/lib/learning-link";
import { ExamListeningQuestion } from "./ExamListeningQuestion";
import { HandwrittenExamAnswer } from "./HandwrittenExamAnswer";
import { hasUnconfirmedExamInk, readExamInk, examInkKey } from "@/lib/assessments/ink";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useAuth } from "@/state/auth-state";
import { AuthModal } from "@/components/auth/AuthModal";
import { MODULES, getModule, moduleSupportsLearningPair } from "@/data/modules";
import { LANGUAGES, NATIVE_LANGUAGES, type Language, type NativeLanguage } from "@/data/languages";
import { getCurriculum } from "@/data/curriculum";
import { assessmentCsv } from "@/lib/assessments/export";
import type {
  checkpointProfiles,
  compareSkillEvidence,
  AssessmentSkill,
} from "@/lib/assessments/core";
import { toDateKey } from "@/lib/core30-plan";
import { browserExamStorage } from "@/lib/assessments/drafts";
import {
  readOfflineExams,
  saveOfflineExam,
  recoveryCopiesForScope,
} from "@/lib/assessments/offline";
import { examRequest } from "@/lib/assessments/client";
import type { AssessmentAnswer, PublicAssessmentItem } from "@/lib/assessments/form";
import { useExamDraft, type ExamAttemptView } from "@/hooks/use-exam-draft";

const ExamReviewQueue = lazy(() =>
  import("./ExamReviewQueue").then((module) => ({ default: module.ExamReviewQueue })),
);
const AssessmentPlanPanel = lazy(() =>
  import("./AssessmentPlanPanel").then((module) => ({ default: module.AssessmentPlanPanel })),
);
type Enrollment = {
  id: string;
  user_id: string;
  module_id: string;
  target_language: Language;
  instruction_language: NativeLanguage;
  scope: "personal" | "team";
  organization_id: string | null;
  organization_name?: string | null;
  role: "primary" | "support";
  status: "active" | "paused" | "archived";
  revision: number;
  timezone: string;
  checkpoints: {
    id: string;
    checkpoint: "entrance" | "day45" | "day90";
    due_date: string;
    status: string;
    ready: boolean;
    pilotReady: boolean;
    attempt_count?: number;
    attempts: {
      id: string;
      status: string;
      attempt_number: number;
      designated: boolean;
      submitted_at: string | null;
      profiles: ReturnType<typeof checkpointProfiles>;
      comparisons: (ReturnType<typeof compareSkillEvidence> & { skill: AssessmentSkill })[];
    }[];
  }[];
};
type OverviewMetadata = {
  activeOrganizationIds: string[];
  canManage: boolean;
  members: { user_id: string; display_name: string }[];
  pilot: boolean;
  limit: number;
};
type Overview = OverviewMetadata & { enrollments: Enrollment[]; hasMore: boolean };
type PlanFilters = {
  module: string;
  learner: string;
  state: OverviewState;
  checkpoint: "" | "entrance" | "day45" | "day90";
  target: "" | Language;
  native: "" | NativeLanguage;
};
const emptyFilters: PlanFilters = {
  module: "",
  learner: "",
  state: "all",
  checkpoint: "",
  target: "",
  native: "",
};
const names = { entrance: "Entrance", day45: "Day 45", day90: "Day 90" } as const;
const checkpointName = (checkpoint: string, programScope?: string) =>
  programScope === "support_units"
    ? checkpoint === "entrance"
      ? "Before supporting practice"
      : "After supporting practice"
    : names[checkpoint as keyof typeof names];
const skills = {
  recognition: "Word recognition",
  recall: "Word recall",
  listening: "Listening",
  reading: "Reading",
  writing: "Written production",
  speaking: "Spoken production",
} as const;
const button =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-semibold text-foreground hover:bg-gold/20 disabled:opacity-50 disabled:cursor-not-allowed";
const primary = cn(button, "bg-gold text-background hover:bg-gold/90");
const input = "mt-1 min-h-11 w-full rounded-xl border border-border bg-background p-3 text-sm";
const card = "rounded-2xl border border-border bg-card/60 p-4 sm:p-5";
const dateLabel = (date: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );
const answerText = (answer: AssessmentAnswer | undefined, item: PublicAssessmentItem) =>
  answer?.missingReason ??
  (answer?.mediaEvidenceId
    ? "Protected recording attached; availability is checked on playback"
    : undefined) ??
  (answer?.choiceId
    ? item.options?.find((option) => option.id === answer.choiceId)?.text
    : (answer?.correctedTranscript ?? answer?.text ?? answer?.originalTranscript)) ??
  "No response";

export function ExamsArea(props: ExamsAreaProps) {
  const { user } = useAuth();
  // A different account or team starts with empty state, including pending API results.
  return (
    <ExamsAreaContent key={`${user?.id ?? "guest"}:${props.orgId ?? "personal"}`} {...props} />
  );
}
type ExamsAreaProps = {
  embedded?: boolean;
  moduleId?: string;
  targetLanguage?: Language;
  instructionLanguage?: NativeLanguage;
  orgId?: string;
  attemptId?: string;
  reviewMode?: boolean;
  initialModuleFilter?: string;
};
function ExamsAreaContent({
  embedded = false,
  moduleId = "roofing",
  targetLanguage = "Spanish",
  instructionLanguage = "English",
  orgId,
  attemptId,
  reviewMode = false,
  initialModuleFilter,
}: ExamsAreaProps) {
  const { user, loading: authLoading, isCurrentUser } = useAuth();
  useEffect(() => {
    window[`ga-disable-${LANGUAGE_THRESHOLD_GA_ID}`] = true;
    return () => {
      window[`ga-disable-${LANGUAGE_THRESHOLD_GA_ID}`] =
        isSpeakingPrivacyMode() || isPrivateAssessmentContext();
    };
  }, []);
  const Heading = embedded ? "h2" : "h1";
  const [authOpen, setAuthOpen] = useState(false),
    [actionLoading, setLoading] = useState(false),
    [actionError, setError] = useState("");
  const [selection, setSelection] = useState<{
    viewer: string;
    attempt: ExamAttemptView;
    fromDevice?: boolean;
  } | null>(null);
  const selected =
    selection &&
    selection.viewer === user?.id &&
    attemptMatchesOrganization(selection.attempt, orgId)
      ? selection.attempt
      : null;
  const [pending, setPending] = useState<{
    plan: Enrollment;
    checkpoint: Enrollment["checkpoints"][number];
  } | null>(null);
  const [module, setModule] = useState(moduleId),
    [target, setTarget] = useState(targetLanguage),
    [native, setNative] = useState(instructionLanguage),
    [start, setStart] = useState(() => toDateKey(new Date())),
    [learner, setLearner] = useState("");
  const [schedule, setSchedule] = useState<{
      plan: Enrollment;
      change: "pause" | "resume" | "reschedule" | "exempt" | "restore";
      checkpoint?: string;
      date?: string;
    } | null>(null),
    [reason, setReason] = useState("");
  const scheduleRequest = useRef<{ payload: string; id: string } | null>(null);
  const actionLock = useRef(false),
    handledAttempt = useRef<string | null>(null);
  const [filters, setFilters] = useState<PlanFilters>(() => ({
    ...emptyFilters,
    ...(initialModuleFilter
      ? { module: initialModuleFilter, target: targetLanguage, native: instructionLanguage }
      : {}),
  }));
  const [draftFilters, setDraftFilters] = useState(filters);
  const query = new URLSearchParams({
    ...(orgId ? { org: orgId } : {}),
    ...(filters.module ? { module: filters.module } : {}),
    ...(filters.learner ? { learner: filters.learner } : {}),
    ...(filters.state !== "all" ? { state: filters.state } : {}),
    ...(filters.checkpoint ? { checkpoint: filters.checkpoint } : {}),
    ...(filters.target ? { target: filters.target } : {}),
    ...(filters.native ? { native: filters.native } : {}),
  });
  const report = usePrivatePagedReport<Enrollment, OverviewMetadata>(
    `/api/exams?${query}`,
    !!user,
    "enrollments",
  );
  const overview: Overview | null = report.metadata
    ? {
        ...report.metadata,
        enrollments: report.items.filter((plan) =>
          orgId
            ? report.metadata!.canManage || plan.user_id === user?.id
            : plan.scope === "personal" ||
              report.metadata!.activeOrganizationIds.includes(plan.organization_id ?? ""),
        ),
        hasMore: report.hasMore,
      }
    : null;
  const loading = actionLoading || report.loading,
    // Overview errors must not describe a separately loaded active exam as disconnected.
    error = actionError || (selected ? "" : report.error);
  const refreshOverview = report.refresh;
  const load = useCallback(() => {
    setError("");
    refreshOverview();
  }, [refreshOverview]);
  useEffect(() => {
    if (report.metadata)
      setLearner((previous) => previous || report.metadata!.members[0]?.user_id || "");
  }, [report.metadata]);
  const open = useCallback(
    async (id: string, review = false) => {
      if (!user) return;
      const viewer = user.id;
      setLoading(true);
      setError("");
      try {
        const attempt = await examRequest<ExamAttemptView>(
          `/api/exams?action=attempt&attempt=${encodeURIComponent(id)}${review ? "&review=1" : ""}${orgId ? `&org=${encodeURIComponent(orgId)}` : ""}`,
        );
        if (isCurrentUser(viewer)) {
          if (!attemptMatchesOrganization(attempt, orgId))
            throw new Error("This attempt is outside this team view. Open its own Exams view.");
          saveOfflineExam(browserExamStorage(), viewer, attempt);
          setSelection({ viewer, attempt, fromDevice: false });
          setPending(null);
        }
      } catch (err) {
        if (isCurrentUser(viewer)) {
          const saved =
            navigator.onLine === false || err instanceof TypeError
              ? recoveryCopiesForScope(
                  readOfflineExams<ExamAttemptView>(browserExamStorage(), viewer),
                  orgId,
                ).find((row) => row.id === id)
              : null;
          if (saved) {
            setSelection({ viewer, attempt: saved, fromDevice: true });
            setPending(null);
          }
          setError(
            saved
              ? "Resumed this device’s saved copy. Check the sync status before submitting."
              : err instanceof Error
                ? err.message
                : "Exam could not be opened.",
          );
        }
      } finally {
        if (isCurrentUser(viewer)) setLoading(false);
      }
    },
    [isCurrentUser, user, orgId],
  );

  useEffect(() => {
    if (
      user &&
      attemptId &&
      handledAttempt.current !== `${user.id}:${orgId ?? ""}:${attemptId}:${reviewMode}`
    ) {
      handledAttempt.current = `${user.id}:${orgId ?? ""}:${attemptId}:${reviewMode}`;
      void open(attemptId, reviewMode);
    }
  }, [attemptId, open, user, reviewMode, orgId]);
  const act = async (work: () => Promise<void>) => {
    if (actionLock.current || !user) return;
    actionLock.current = true;
    const viewer = user.id;
    setLoading(true);
    setError("");
    try {
      await work();
    } catch (err) {
      if (isCurrentUser(viewer))
        setError(err instanceof Error ? err.message : "Exam action could not finish.");
    } finally {
      actionLock.current = false;
      if (isCurrentUser(viewer)) setLoading(false);
    }
  };
  const returnToPlan = moduleLessonUrl({
    moduleId: selected?.enrollment.moduleId ?? module,
    target: selected?.enrollment.targetLanguage ?? target,
    native: selected?.enrollment.instructionLanguage ?? native,
    planId:
      selected?.isLearner && selected.enrollment.role === "primary"
        ? selected.enrollment.id
        : undefined,
  });
  if (authLoading)
    return (
      <p className="p-5" role="status">
        Loading your account…
      </p>
    );
  if (!user)
    return (
      <section data-private-assessment className={card}>
        <Heading className="font-serif text-3xl">Exams</Heading>
        <p className="my-4">
          Assess your module at entrance, day 45 and day 90. Personal results stay private. Team
          exams belong to their named team plan.
        </p>
        <div className="flex flex-wrap gap-3">
          <button className={primary} onClick={() => setAuthOpen(true)}>
            Sign in to my Exams
          </button>
          <a className={button} href={returnToPlan}>
            Return to my lesson plan
          </a>
        </div>
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      </section>
    );
  const savedCopies = recoveryCopiesForScope(
    readOfflineExams<ExamAttemptView>(browserExamStorage(), user.id),
    orgId,
  ).filter(
    (copy) =>
      (!filters.module || copy.enrollment.moduleId === filters.module) &&
      (!filters.target || copy.enrollment.targetLanguage === filters.target) &&
      (!filters.native || copy.enrollment.instructionLanguage === filters.native) &&
      (!filters.learner || filters.learner === user.id) &&
      (orgId ||
        !overview ||
        copy.enrollment.scope === "personal" ||
        overview.activeOrganizationIds.includes(copy.enrollment.organizationId ?? "")),
  );
  const visibleAttemptIds = new Set(
    overview?.enrollments.flatMap((plan) =>
      plan.checkpoints.flatMap((cp) => cp.attempts.map((attempt) => attempt.id)),
    ) ?? [],
  );
  const needsDeviceRecovery =
    savedCopies.length > 0 &&
    (!overview || !!error || savedCopies.some((copy) => !visibleAttemptIds.has(copy.id)));
  return (
    <section
      data-private-assessment
      className={cn("mx-auto max-w-5xl space-y-5", embedded ? "pb-4" : "pb-32")}
      aria-label="Exams area"
    >
      {selected && <Heading className="sr-only">Exams</Heading>}
      {!selected && (
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-gold">
              {orgId
                ? "Team assessment plans"
                : overview?.enrollments.some((plan) => plan.scope === "team")
                  ? "Your module progress"
                  : "Private personal progress"}
            </p>
            <Heading className="mt-1 font-serif text-3xl">Exams</Heading>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Entrance, day 45 and day 90 show progress by skill. These assess language, not trade
              or safety certification.
            </p>
          </div>
          <a className={button} href={returnToPlan}>
            Return to my lesson plan
          </a>
        </header>
      )}
      {!selected &&
        (orgId ? (
          <p className="text-sm">
            This view contains this team’s exam enrollments.{" "}
            <a className="text-gold underline" href="/exams">
              Open my private Exams
            </a>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Personal exams stay private. Team-assigned plans are labeled separately.
          </p>
        ))}
      {error && (
        <div role="alert" className="rounded-xl border border-amber-500/40 p-4">
          <p>{error}</p>
          <button className={button + " mt-3"} onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}
      {loading && (
        <p role="status" className="text-sm">
          Loading assessment data…
        </p>
      )}
      {!selected && needsDeviceRecovery && (
        <details className={card}>
          <summary className="min-h-11 cursor-pointer py-2 font-semibold">
            Resume an exam saved on this device
          </summary>
          <p className="my-2 text-sm">
            Active exam copies expire after 24 hours. Opening and final submission need a
            connection; a saved attempt can continue during a short interruption.
          </p>
          {savedCopies.map((saved) => (
            <button
              key={saved.id}
              className={button + " mr-2 mt-2"}
              onClick={() => void open(saved.id)}
            >
              {getModule(saved.enrollment.moduleId)?.name} ·{" "}
              {checkpointName(saved.checkpoint.checkpoint, saved.enrollment.programScope)} · resume
            </button>
          ))}
        </details>
      )}
      {!selected && overview && (!orgId || overview.canManage) && (
        <Suspense fallback={<p role="status">Loading reviews…</p>}>
          <ExamReviewQueue
            orgId={orgId}
            members={overview.members}
            onOpen={(id, review) => void open(id, review)}
          />
        </Suspense>
      )}
      {selected ? (
        selected.submittedAt ? (
          <ExamResult
            attempt={selected}
            onBack={() => {
              setSelection(null);
              void load();
            }}
            onRefresh={() => void open(selected.id, selected.canReview)}
            onOpenAttempt={(id) => void open(id)}
          />
        ) : (
          <ExamRunner
            key={`${user.id}:${selected.id}:${selection?.fromDevice ? "device" : "server"}`}
            attempt={selected}
            fromDevice={!!selection?.fromDevice}
            checkingServer={loading}
            onCheckServer={() => void open(selected.id)}
            onBack={() => {
              setSelection(null);
              void load();
            }}
            onSubmitted={() => void open(selected.id)}
          />
        )
      ) : pending ? (
        <section className={card}>
          <button className={button} onClick={() => setPending(null)}>
            Back to Exams
          </button>
          <h2 className="mt-4 text-2xl font-semibold">
            {names[pending.checkpoint.checkpoint as keyof typeof names]} ·{" "}
            {getModule(pending.plan.module_id)?.name}
          </h2>
          <p className="mt-3">
            {pending.plan.instruction_language} instructions → {pending.plan.target_language}.{" "}
            {pending.plan.scope === "personal"
              ? "Only you see this personal result unless you request a review."
              : "This team’s authorized admins can see the result and exam responses."}
          </p>
          {pending.checkpoint.attempts.length > 0 && (
            <p className="mt-3 text-sm">
              Your original attempt stays in the history. A retake may repeat a form you have
              already seen; familiarity can affect the result.
            </p>
          )}
          {pending.checkpoint.pilotReady && !pending.checkpoint.ready && (
            <p className="mt-3 rounded-xl bg-amber-500/10 p-3">
              QA draft only. Content and scoring are not approved for official use.
            </p>
          )}
          <p className="mt-3 text-sm">
            You can pause between questions, revisit earlier answers, and resume. Start and submit
            online. Device-only answers must sync before submission. Unavailable inputs are marked
            “Not assessed”.
          </p>
          <details className="my-4">
            <summary className="min-h-11 cursor-pointer py-3 font-medium">
              Try the inputs — unscored practice
            </summary>
            <label className="block text-sm">
              Try typing any word
              <input className={input} aria-label="Unscored input practice" />
            </label>
            <fieldset className="mt-3 flex gap-4">
              <legend className="mb-2">Try selecting an answer</legend>
              {["Practice A", "Practice B"].map((value) => (
                <label key={value} className="flex min-h-11 items-center gap-2">
                  <input type="radio" name="unscored-example" />
                  {value}
                </label>
              ))}
            </fieldset>
          </details>
          <p className="mb-4 text-sm text-muted-foreground">
            Written responses are reviewed for task completion, understandable meaning and useful
            target language. Draft forms remain provisional; repeated forms are labeled in your
            attempt history.
          </p>
          <button
            className={primary}
            disabled={loading}
            onClick={() =>
              void act(async () => {
                const attempt = await examRequest<ExamAttemptView>({
                  action: "start",
                  checkpointId: pending.checkpoint.id,
                  requestId: crypto.randomUUID(),
                });
                if (isCurrentUser(user.id)) {
                  if (!attemptMatchesOrganization(attempt, orgId))
                    throw new Error(
                      "This attempt is outside this team view. Open its own Exams view.",
                    );
                  setSelection({ viewer: user.id, attempt });
                  setPending(null);
                }
              })
            }
          >
            Start {names[pending.checkpoint.checkpoint as keyof typeof names]} exam
          </button>
        </section>
      ) : (
        <div className="flex flex-col gap-5">
          {(orgId ||
            (overview && (overview.enrollments.length > 1 || overview.hasMore)) ||
            Object.entries(filters).some(([key, value]) =>
              key === "state" ? value !== "all" : !!value,
            )) && (
            <details className={card}>
              <summary className="min-h-11 cursor-pointer py-2 font-semibold">
                Find a module or checkpoint
              </summary>
              <form
                className="mt-3 grid gap-3 sm:grid-cols-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  setFilters({ ...draftFilters });
                  report.refresh();
                  setPending(null);
                  setError("");
                }}
              >
                <label className="text-sm">
                  Module
                  <select
                    className={input}
                    value={draftFilters.module}
                    onChange={(event) =>
                      setDraftFilters((value) => ({ ...value, module: event.target.value }))
                    }
                  >
                    <option value="">All modules</option>
                    {MODULES.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Checkpoint
                  <select
                    className={input}
                    value={draftFilters.checkpoint}
                    onChange={(event) =>
                      setDraftFilters((value) => ({
                        ...value,
                        checkpoint: event.target.value as PlanFilters["checkpoint"],
                      }))
                    }
                  >
                    <option value="">All checkpoints</option>
                    {Object.entries(names).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Plan activity
                  <select
                    className={input}
                    value={draftFilters.state}
                    onChange={(event) =>
                      setDraftFilters((value) => ({
                        ...value,
                        state: event.target.value as OverviewState,
                      }))
                    }
                  >
                    {Object.entries({
                      all: "All plans",
                      active: "Active plans",
                      paused: "Paused plans",
                      needs_review: "Needs review or scoring",
                      in_progress: "Exam in progress",
                      overdue: "Uncompleted overdue checkpoint",
                      upcoming: "Checkpoint due in the next 7 days",
                    }).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                {orgId && overview?.canManage && (
                  <label className="text-sm">
                    Learner
                    <select
                      className={input}
                      value={draftFilters.learner}
                      onChange={(event) =>
                        setDraftFilters((value) => ({ ...value, learner: event.target.value }))
                      }
                    >
                      <option value="">All learners</option>
                      {overview.members.map((member) => (
                        <option key={member.user_id} value={member.user_id}>
                          {member.display_name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="text-sm">
                  Target language
                  <select
                    className={input}
                    value={draftFilters.target}
                    onChange={(event) =>
                      setDraftFilters((value) => ({
                        ...value,
                        target: event.target.value as "" | Language,
                      }))
                    }
                  >
                    <option value="">All target languages</option>
                    {LANGUAGES.map((language) => (
                      <option key={language}>{language}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Instruction language
                  <select
                    className={input}
                    value={draftFilters.native}
                    onChange={(event) =>
                      setDraftFilters((value) => ({
                        ...value,
                        native: event.target.value as "" | NativeLanguage,
                      }))
                    }
                  >
                    <option value="">All instruction languages</option>
                    {NATIVE_LANGUAGES.map((language) => (
                      <option key={language}>{language}</option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap gap-3 sm:col-span-2">
                  <button className={button} disabled={actionLoading}>
                    Apply filters
                  </button>
                  <button
                    className={button}
                    type="button"
                    onClick={() => {
                      setDraftFilters({ ...emptyFilters });
                      setFilters({ ...emptyFilters });
                      setError("");
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              </form>
            </details>
          )}
          {overview?.canManage && (
            <details className={card + (!orgId && overview.enrollments.length ? " order-2" : "")}>
              <summary className="min-h-11 cursor-pointer py-2 font-semibold">
                {orgId ? "Create a learner’s exam plan" : "Add a module to my Exams"}
              </summary>
              <form
                className="mt-4 grid gap-4 sm:grid-cols-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void act(async () => {
                    await examRequest({
                      action: "enroll",
                      moduleId: module,
                      targetLanguage: target,
                      instructionLanguage: native,
                      startDate: start,
                      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                      ...(orgId ? { orgId, learnerId: learner } : {}),
                      requestId: crypto.randomUUID(),
                    });
                    await load();
                  });
                }}
              >
                {orgId && (
                  <label>
                    Learner
                    <select
                      className={input}
                      value={learner}
                      onChange={(event) => setLearner(event.target.value)}
                      required
                    >
                      <option value="">Choose a learner</option>
                      {overview.members.map((member) => (
                        <option key={member.user_id} value={member.user_id}>
                          {member.display_name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  Module
                  <select
                    className={input}
                    value={module}
                    onChange={(event) => {
                      setModule(event.target.value);
                      if (getModule(event.target.value)?.learnDirection === "en-target") {
                        setTarget("English");
                        setNative("Spanish");
                      }
                    }}
                  >
                    {MODULES.filter((item) => getCurriculum(item.id)).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Language to learn
                  <select
                    className={input}
                    value={target}
                    onChange={(event) => setTarget(event.target.value as Language)}
                  >
                    {LANGUAGES.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Instruction language
                  <select
                    className={input}
                    value={native}
                    onChange={(event) => setNative(event.target.value as NativeLanguage)}
                  >
                    {NATIVE_LANGUAGES.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Plan start date
                  <input
                    className={input}
                    type="date"
                    value={start}
                    onChange={(event) => setStart(event.target.value)}
                    required
                  />
                </label>
                <p className="text-sm text-muted-foreground sm:col-span-2">
                  Modules awaiting review can have a plan, but their official exams show “Not yet
                  available”. The entrance baseline stays pending until you complete an available
                  exam.
                </p>
                <button
                  className={primary}
                  disabled={
                    loading ||
                    !getModule(module) ||
                    !moduleSupportsLearningPair(getModule(module)!, target, native) ||
                    target === native
                  }
                >
                  Create {orgId ? "team" : "private"} exam plan
                </button>
              </form>
            </details>
          )}
          {!loading && overview && !overview.enrollments.length && (
            <p className={card}>
              {Object.entries(filters).some(([key, value]) =>
                key === "state" ? value !== "all" : !!value,
              )
                ? "No plans match these filters. Clear the filters or choose another module."
                : "No exam plans yet. Add your module, or return to its lessons while the exams are prepared."}
            </p>
          )}
          {filters.checkpoint && (
            <p className="text-sm text-muted-foreground" role="status">
              Filtering plans by {names[filters.checkpoint]}. Exam activity and due-date filters
              apply to this checkpoint. All three checkpoints remain visible for comparison.
            </p>
          )}
          {overview?.enrollments.map((plan) => {
            const resumable = plan.checkpoints.flatMap((cp) =>
              cp.attempts
                .filter((attempt) => attempt.status === "in_progress")
                .map((attempt) => ({ cp, attempt })),
            )[0];
            return (
              <article key={plan.id} className={card}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {getModule(plan.module_id)?.emoji}{" "}
                      {getModule(plan.module_id)?.name ?? plan.module_id}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {plan.instruction_language} → {plan.target_language} ·{" "}
                      {plan.scope === "personal"
                        ? "Private personal plan"
                        : `Team plan${plan.organization_name ? ` · ${plan.organization_name}` : ""}`}{" "}
                      · {plan.timezone} ·{" "}
                      {plan.role === "support" ? "Supporting module" : "Primary module"}
                    </p>
                    {plan.user_id === user.id && plan.role === "primary" && (
                      <a
                        className="mt-2 inline-flex min-h-11 items-center text-sm text-gold underline"
                        href={moduleLessonUrl({
                          moduleId: plan.module_id,
                          target: plan.target_language,
                          native: plan.instruction_language,
                          planId: plan.id,
                        })}
                      >
                        Open this lesson plan
                      </a>
                    )}
                    {orgId && (
                      <p className="mt-1 text-sm">
                        {overview.members.find((member) => member.user_id === plan.user_id)
                          ?.display_name ?? "Assigned learner"}
                      </p>
                    )}
                  </div>
                  {resumable && plan.user_id === user.id && (
                    <button
                      className={primary}
                      disabled={loading}
                      onClick={() => void open(resumable.attempt.id)}
                    >
                      Resume {names[resumable.cp.checkpoint]} exam
                    </button>
                  )}
                  {plan.role !== "support" && (plan.scope === "personal" || overview.canManage) && (
                    <button
                      className={button}
                      onClick={() => {
                        setReason("");
                        setSchedule({
                          plan,
                          change: plan.status === "paused" ? "resume" : "pause",
                        });
                      }}
                    >
                      {plan.status === "paused" ? "Resume plan" : "Pause plan"}
                    </button>
                  )}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {plan.checkpoints.map((cp) => {
                    const latest = cp.attempts[0];
                    return (
                      <section
                        key={cp.id}
                        className={
                          "rounded-xl border p-4 " +
                          (filters.checkpoint === cp.checkpoint ? "border-gold" : "border-border")
                        }
                      >
                        <h3 className="font-semibold">
                          {names[cp.checkpoint as keyof typeof names]}
                        </h3>
                        <p className="mt-1 text-sm">Recommended {dateLabel(cp.due_date)}</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {cp.status === "exempt"
                            ? "Exempt"
                            : latest
                              ? latest.status.replaceAll("_", " ")
                              : cp.ready
                                ? "Ready"
                                : cp.pilotReady
                                  ? "QA draft available"
                                  : "Not yet available"}
                        </p>
                        {latest && (
                          <button
                            className={button + " mt-3 w-full"}
                            onClick={() => void open(latest.id)}
                          >
                            {latest.submitted_at ? "View result" : "Resume exam"}
                          </button>
                        )}
                        {cp.status !== "exempt" &&
                          (cp.ready || cp.pilotReady) &&
                          plan.status === "active" &&
                          (!latest || latest.submitted_at) &&
                          plan.user_id === user.id && (
                            <button
                              className={button + " mt-2 w-full"}
                              onClick={() => setPending({ plan, checkpoint: cp })}
                            >
                              {latest
                                ? "Retake — keep original"
                                : cp.ready
                                  ? "Start exam"
                                  : "Try QA draft"}
                            </button>
                          )}
                        {latest?.profiles?.map((profile) => (
                          <div className="mt-3 space-y-1 text-xs" key={profile.coverage}>
                            <p className="font-semibold">
                              {profile.coverage === "module"
                                ? "Sampled skills"
                                : profile.coverage === "studied"
                                  ? "Reported studied objectives"
                                  : "Transfer objectives"}
                            </p>
                            {profile.skills.map((skill) => (
                              <p key={skill.skill}>
                                {skills[skill.skill]}:{" "}
                                {skill.score === null
                                  ? skill.state.replaceAll("_", " ")
                                  : `${skill.score}/100`}
                                {skill.provisional ? " · provisional" : ""}
                              </p>
                            ))}
                          </div>
                        ))}
                        {latest?.comparisons?.length > 0 && (
                          <p className="mt-3 text-xs">
                            {latest.comparisons.every((row) => row.change === null)
                              ? "Growth comparison unavailable: equivalent reviewed forms and sufficient shared evidence are required."
                              : latest.comparisons
                                  .filter((row) => row.change !== null)
                                  .map(
                                    (row) =>
                                      `${skills[row.skill]}: ${row.change! > 0 ? "+" : ""}${row.change} points on ${row.objectives.length} shared objectives`,
                                  )
                                  .join(" · ")}
                          </p>
                        )}
                        {(cp.attempt_count ?? cp.attempts.length) > 0 && (
                          <CheckpointAttemptHistory
                            checkpointId={cp.id}
                            attemptCount={cp.attempt_count ?? cp.attempts.length}
                            onOpen={(id) => void open(id)}
                          />
                        )}
                        {plan.role !== "support" &&
                          (plan.scope === "personal" || overview.canManage) &&
                          !latest?.submitted_at && (
                            <button
                              className="mt-2 min-h-11 text-sm text-gold underline"
                              onClick={() => {
                                setReason("");
                                setSchedule({
                                  plan,
                                  change: "reschedule",
                                  checkpoint: cp.id,
                                  date: cp.due_date,
                                });
                              }}
                            >
                              Change checkpoint date
                            </button>
                          )}
                        {plan.role !== "support" &&
                          (plan.scope === "personal" || overview.canManage) &&
                          !latest?.submitted_at && (
                            <button
                              className="mt-2 block min-h-11 text-sm text-gold underline"
                              onClick={() => {
                                setReason("");
                                setSchedule({
                                  plan,
                                  change: cp.status === "exempt" ? "restore" : "exempt",
                                  checkpoint: cp.id,
                                });
                              }}
                            >
                              {cp.status === "exempt"
                                ? "Restore checkpoint"
                                : "Exempt this checkpoint"}
                            </button>
                          )}
                      </section>
                    );
                  })}
                </div>
                {plan.role !== "support" && (
                  <PlanPanelDisclosure
                    enrollmentId={plan.id}
                    onOpenAttempt={(id) => void open(id)}
                  />
                )}
              </article>
            );
          })}
          {overview && (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs text-muted-foreground">
                {overview.enrollments.length} plan{overview.enrollments.length === 1 ? "" : "s"}{" "}
                shown{overview.hasMore ? " · more available" : ""}. Overview shows the latest and
                original checkpoint attempts; open attempt history for every retake.
              </p>
              {overview.hasMore && (
                <button
                  className={button}
                  disabled={report.moreBusy}
                  onClick={() => void report.loadMore()}
                >
                  {report.moreBusy ? "Loading more plans…" : "Load more plans"}
                </button>
              )}
              <button className={button} disabled={loading || report.moreBusy} onClick={load}>
                Refresh exam plans
              </button>
            </div>
          )}
        </div>
      )}
      {!selected && !pending && overview && (
        <div className="flex flex-wrap gap-3">
          <button
            className={button}
            onClick={() => {
              const rows: unknown[][] = [
                [
                  "Learner",
                  "Learner ID",
                  "Plan role",
                  "Module",
                  "Scope",
                  "Language pair",
                  "Timezone",
                  "Checkpoint",
                  "Due date",
                  "Attempt",
                  "Original",
                  "Status",
                  "Submitted",
                  "Coverage",
                  "Skill",
                  "Score",
                  "State",
                  "Scored items",
                  "Objectives",
                  "Needs review",
                  "Not assessed",
                  "Provisional",
                  "Change on comparable objectives",
                ],
              ];
              for (const plan of overview.enrollments)
                for (const cp of plan.checkpoints)
                  for (const attempt of cp.attempts)
                    for (const profile of attempt.profiles)
                      for (const skill of profile.skills)
                        rows.push([
                          overview.members.find((member) => member.user_id === plan.user_id)
                            ?.display_name ??
                            (plan.user_id === user.id ? "Me" : "Assigned learner"),
                          plan.user_id,
                          plan.role,
                          getModule(plan.module_id)?.name ?? plan.module_id,
                          plan.scope,
                          `${plan.instruction_language} → ${plan.target_language}`,
                          plan.timezone,
                          cp.checkpoint,
                          cp.due_date,
                          attempt.attempt_number,
                          attempt.designated,
                          attempt.status,
                          attempt.submitted_at,
                          profile.coverage,
                          skills[skill.skill],
                          skill.score,
                          skill.state,
                          skill.evidenceCount,
                          skill.objectives.length,
                          skill.reviewCount,
                          skill.missingCount,
                          skill.provisional,
                          profile.coverage === "transfer"
                            ? "Not comparable (transfer tasks)"
                            : (attempt.comparisons.find((row) => row.skill === skill.skill)
                                ?.change ?? "Not comparable"),
                        ]);
              const blob = new Blob([assessmentCsv(rows)], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob),
                link = document.createElement("a");
              link.href = url;
              link.download = "language-threshold-assessed-progress.csv";
              link.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            Export shown assessed progress
          </button>
          <p className="self-center text-xs text-muted-foreground">
            Export includes the latest and original skill summaries for loaded plans. Load more
            plans or open attempt history for older records. Raw responses are excluded.
          </p>
        </div>
      )}
      {!selected && !pending && <ReadinessPanel target={target} native={native} />}
      {schedule && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !loading) setSchedule(null);
          }}
        >
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
            <form
              className={card}
              onSubmit={(event) => {
                event.preventDefault();
                void act(async () => {
                  const payload = {
                    action: "schedule",
                    enrollmentId: schedule.plan.id,
                    revision: schedule.plan.revision,
                    change: schedule.change,
                    checkpointId: schedule.checkpoint,
                    date: schedule.date,
                    reason,
                  };
                  const fingerprint = JSON.stringify(payload);
                  if (scheduleRequest.current?.payload !== fingerprint)
                    scheduleRequest.current = { payload: fingerprint, id: crypto.randomUUID() };
                  await examRequest({ ...payload, requestId: scheduleRequest.current.id });
                  scheduleRequest.current = null;
                  setSchedule(null);
                  await load();
                });
              }}
            >
              <DialogTitle>
                {schedule.change === "reschedule"
                  ? "Change checkpoint date"
                  : schedule.change === "pause"
                    ? "Pause this plan"
                    : schedule.change === "exempt"
                      ? "Exempt this checkpoint"
                      : schedule.change === "restore"
                        ? "Restore this checkpoint"
                        : "Resume this plan"}
              </DialogTitle>
              {schedule.date && (
                <label className="mt-3 block">
                  New date
                  <input
                    className={input}
                    type="date"
                    value={schedule.date}
                    onChange={(event) => setSchedule({ ...schedule, date: event.target.value })}
                  />
                </label>
              )}
              <label className="mt-3 block">
                Reason
                <input
                  className={input}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  minLength={3}
                  maxLength={1000}
                  required
                />
              </label>
              <DialogDescription className="my-3 text-sm text-muted-foreground">
                Changes are recorded in the plan history. Completed checkpoints keep their original
                dates and results.
              </DialogDescription>
              {error && (
                <p role="alert" className="my-3 text-sm text-amber-700 dark:text-amber-300">
                  {error}
                </p>
              )}
              <div className="flex gap-3">
                <button className={primary} disabled={loading}>
                  {loading ? "Saving schedule change…" : "Save schedule change"}
                </button>
                <button
                  type="button"
                  className={button}
                  disabled={loading}
                  onClick={() => setSchedule(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}

function ExamRunner({
  attempt,
  fromDevice,
  checkingServer,
  onCheckServer,
  onBack,
  onSubmitted,
}: {
  attempt: ExamAttemptView;
  fromDevice: boolean;
  checkingServer: boolean;
  onCheckServer: () => void;
  onBack: () => void;
  onSubmitted: () => void;
}) {
  const { user } = useAuth();
  const [speechWorking, setSpeechWorking] = useState(false);
  const unsavedSpeech = useSyncExternalStore(
    subscribeSpeechDrafts,
    () => unsavedSpeechCount(user?.id ?? "", attempt.id),
    () => 0,
  );
  const [inputModes, setInputModes] = useState<Record<string, boolean>>({});
  const draft = useExamDraft(attempt, fromDevice),
    item = attempt.form.items[draft.index];
  const handwrite =
    inputModes[item.id] ??
    (draft.answers[item.id]?.inputMethod === "handwriting" ||
      !!(user && readExamInk(browserExamStorage(), examInkKey(user.id, attempt.id, item.id))?.ink));
  const runnerTop = useRef<HTMLElement>(null),
    questionTitle = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    runnerTop.current?.scrollIntoView({ block: "start" });
    questionTitle.current?.focus({ preventScroll: true });
  }, [draft.index]);
  const [submitting, setSubmitting] = useState(false),
    [confirm, setConfirm] = useState(false),
    [error, setError] = useState("");
  const unanswered = attempt.form.items.filter((question) => {
    const answer = draft.answers[question.id];
    return (
      !answer ||
      answer.inputMethod === "unavailable" ||
      (!answer.choiceId &&
        !answer.text &&
        !answer.correctedTranscript &&
        !answer.originalTranscript &&
        !answer.mediaEvidenceId)
    );
  }).length;
  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      if (user && unsavedSpeechCount(user.id, attempt.id))
        throw new Error("Upload or explicitly discard your unsaved recordings before submitting.");
      if (user && hasUnconfirmedExamInk(browserExamStorage(), user.id, attempt.id)) {
        setError(
          "A handwritten response has no confirmed transcript. Return to that question and confirm its transcript before submitting.",
        );
        return;
      }
      if (!(await draft.flush())) {
        setError("Sync your device answers and resolve any conflict before submitting.");
        return;
      }
      await examRequest({
        action: "submit",
        attemptId: attempt.id,
        revision: draft.revision(),
        requestId: crypto.randomUUID(),
      });
      draft.clearSubmitted();
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission could not finish.");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <section ref={runnerTop} className="space-y-4 scroll-mt-4">
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button className={button} onClick={onBack} disabled={submitting || speechWorking}>
            Back to Exams
          </button>
          <p className="text-sm" role="status">
            {draft.status === "synced"
              ? "Last synced to your account"
              : draft.status === "syncing"
                ? "Syncing…"
                : draft.status === "device"
                  ? "Saved on this device — not synced"
                  : draft.status === "conflict"
                    ? "Conflicting server copy"
                    : "Not saved — keep this page open"}
          </p>
        </div>
        {fromDevice && (
          <div className="mt-3 space-y-2 text-sm">
            <p>
              Opened from this device’s saved copy. Connect and check the server copy for its
              current status.
            </p>
            <button
              className={button}
              onClick={onCheckServer}
              disabled={
                checkingServer ||
                submitting ||
                speechWorking ||
                unsavedSpeech > 0 ||
                draft.pendingCount > 0 ||
                draft.status !== "synced"
              }
            >
              {checkingServer ? "Checking server copy…" : "Check server copy"}
            </button>
            {(draft.pendingCount > 0 || unsavedSpeech > 0) && (
              <p>Sync answers and upload or discard recordings before checking another copy.</p>
            )}
          </div>
        )}
        <h2 className="mt-4 text-xl font-semibold">
          {checkpointName(attempt.checkpoint.checkpoint, attempt.enrollment.programScope)} ·{" "}
          {getModule(attempt.enrollment.moduleId)?.name}
        </h2>
        <p className="mt-2 text-sm">
          Question {draft.index + 1} of {attempt.form.items.length} · {skills[item.skill]}
        </p>
        {attempt.checkpoint.checkpoint === "entrance" && attempt.studiedObjectiveCount > 0 && (
          <p className="mt-3 text-sm">
            Current-state baseline: {attempt.studiedObjectiveCount} lesson objectives had recorded
            study before this attempt. This is not a pre-learning measurement.
          </p>
        )}
        {attempt.repeatedForm && (
          <p className="mt-3 text-sm">
            Repeated form: you have seen this checkpoint’s questions before. Interpret changes with
            that exposure in mind.
          </p>
        )}
        {attempt.pilot && (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
            QA draft · not an official or validated result.
          </p>
        )}
        <progress
          className="mt-3 h-2 w-full"
          max={attempt.form.items.length}
          value={draft.index + 1}
        />
      </div>
      {unsavedSpeech > 0 && (
        <p role="status" className="rounded-xl border border-amber-500/40 p-3 text-sm">
          You have an unsaved recording or active microphone for this attempt. Upload or discard it
          before submitting. Audio lives only in memory and is lost if you close or refresh this
          site.
        </p>
      )}
      {(draft.error || error) && (
        <p role="alert" className="rounded-xl border border-amber-500/40 p-4">
          {error || draft.error}
        </p>
      )}
      {draft.conflict && (
        <section className={card}>
          <h3 className="font-semibold">Review both copies</h3>
          <p className="mt-2 text-sm">
            The server changed after this device’s last sync. No conflicting answer has been merged
            automatically.
          </p>
          {Object.keys(draft.answers)
            .filter(
              (id) => JSON.stringify(draft.answers[id]) !== JSON.stringify(draft.serverAnswers[id]),
            )
            .map((id) => {
              const question = attempt.form.items.find((row) => row.id === id);
              return question ? (
                <div key={id} className="my-3 rounded-xl border border-border p-3 text-sm">
                  <p className="font-medium">{question.prompt}</p>
                  <p className="mt-2">This device: {answerText(draft.answers[id], question)}</p>
                  <p className="mt-2">Server: {answerText(draft.serverAnswers[id], question)}</p>
                </div>
              ) : null;
            })}
          <div className="flex flex-wrap gap-3">
            <button
              className={button}
              onClick={() => void draft.resolve(true).catch((err) => setError(err.message))}
            >
              Keep my changed device answers
            </button>
            <button
              className={button}
              onClick={() => void draft.resolve(false).catch((err) => setError(err.message))}
            >
              Use the server copy
            </button>
          </div>
        </section>
      )}
      <fieldset disabled={submitting} className={card}>
        <legend className="sr-only">Question {draft.index + 1}</legend>
        <h3
          ref={questionTitle}
          tabIndex={-1}
          className="text-xl font-semibold leading-relaxed outline-none"
        >
          {item.prompt}
        </h3>
        {item.passage && (
          <p
            lang={attempt.enrollment.targetLanguage === "Spanish" ? "es" : undefined}
            className="my-4 whitespace-pre-line rounded-xl bg-background p-4 text-lg leading-relaxed"
          >
            {item.passage}
          </p>
        )}

        {item.audioRequired ? (
          <ExamListeningQuestion
            key={`${attempt.id}:${item.id}`}
            attemptId={attempt.id}
            item={item}
            answer={draft.answers[item.id]}
            onAnswer={(answer) => draft.edit(item.id, answer)}
          />
        ) : item.skill === "speaking" ? (
          <ExamSpeechQuestion
            key={`${attempt.id}:${item.id}`}
            attemptId={attempt.id}
            itemId={item.id}
            scope={attempt.enrollment.scope}
            evidenceId={draft.answers[item.id]?.mediaEvidenceId}
            evidenceAvailable={
              draft.speechEvidence.find((row) => row.id === draft.answers[item.id]?.mediaEvidenceId)
                ?.available
            }
            flush={draft.flush}
            revision={draft.revision}
            reload={draft.reloadAfterExternal}
            onWorkingChange={setSpeechWorking}
          />
        ) : item.type === "choice" ? (
          <div className="mt-4 grid gap-3">
            {item.options?.map((option) => (
              <label
                key={option.id}
                className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-border p-3"
              >
                <input
                  className="mt-1"
                  type="radio"
                  name={item.id}
                  disabled={item.audioRequired}
                  checked={draft.answers[item.id]?.choiceId === option.id}
                  onChange={() =>
                    draft.edit(item.id, { inputMethod: "choice", choiceId: option.id })
                  }
                />
                <span>{option.text}</span>
              </label>
            ))}
          </div>
        ) : handwrite && item.inputMethods.includes("handwriting") ? (
          <HandwrittenExamAnswer
            key={`${attempt.id}:${item.id}`}
            attemptId={attempt.id}
            itemId={item.id}
            onAnswer={(answer) => draft.edit(item.id, answer)}
          />
        ) : (
          <label className="mt-4 block text-sm">
            Your answer in {attempt.enrollment.targetLanguage}
            <textarea
              className={input}
              rows={item.type === "production" ? 5 : 2}
              value={
                draft.answers[item.id]?.text ??
                draft.answers[item.id]?.correctedTranscript ??
                draft.answers[item.id]?.originalTranscript ??
                ""
              }
              maxLength={4000}
              aria-label="Your exam answer"
              onChange={(event) =>
                draft.edit(item.id, { inputMethod: "typed", text: event.target.value })
              }
            />
          </label>
        )}
        {item.inputMethods.includes("handwriting") && item.skill !== "speaking" && (
          <button
            className={button + " mt-3 mr-2"}
            onClick={() => setInputModes((previous) => ({ ...previous, [item.id]: !handwrite }))}
          >
            {handwrite ? "Use typing instead" : "Write by hand"}
          </button>
        )}
        <button
          className={button + " mt-4"}
          disabled={speechWorking || !!(user && readSpeechTake(user.id, attempt.id, item.id))}
          onClick={() =>
            draft.edit(item.id, {
              inputMethod: "unavailable",
              missingReason: item.audioRequired
                ? "Listening audio unavailable"
                : item.skill === "speaking"
                  ? "Speech recording unavailable"
                  : "Learner skipped this input",
            })
          }
        >
          Mark this input not assessed
        </button>
        {draft.answers[item.id]?.missingReason && (
          <p className="mt-2 text-sm">Not assessed: {draft.answers[item.id].missingReason}</p>
        )}
      </fieldset>
      <div className="flex flex-wrap justify-between gap-3">
        <button
          className={button}
          disabled={!draft.index || submitting || speechWorking}
          onClick={() => draft.setIndex(draft.index - 1)}
        >
          Previous question
        </button>
        <button
          className={button}
          onClick={() => void draft.sync()}
          disabled={submitting || speechWorking || draft.status === "synced"}
        >
          Sync now
        </button>
        {draft.index < attempt.form.items.length - 1 ? (
          <button
            className={primary}
            disabled={submitting || speechWorking}
            onClick={() => draft.setIndex(draft.index + 1)}
          >
            Next question
          </button>
        ) : (
          <button
            className={primary}
            disabled={submitting || speechWorking}
            onClick={() => setConfirm(true)}
          >
            Review submission
          </button>
        )}
      </div>
      {confirm && (
        <section className={card}>
          <h3 className="font-semibold">Submit this attempt</h3>
          <p className="my-3">
            {unanswered
              ? `${unanswered} questions have no assessed response. They will be marked Not assessed, not zero.`
              : "Your responses will be saved before scoring begins."}{" "}
            Written production may need rubric review. Your original attempt is kept if you retake
            later.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              className={primary}
              disabled={
                submitting || speechWorking || unsavedSpeech > 0 || draft.status === "conflict"
              }
              onClick={() => void submit()}
            >
              {submitting ? "Saving and submitting…" : "Sync and submit exam"}
            </button>
            <button
              className={button}
              onClick={() => setConfirm(false)}
              disabled={submitting || speechWorking}
            >
              Keep working
            </button>
          </div>
        </section>
      )}
    </section>
  );
}

function ExamResult({
  attempt,
  onBack,
  onRefresh,
  onOpenAttempt,
}: {
  attempt: ExamAttemptView;
  onBack: () => void;
  onRefresh: () => void;
  onOpenAttempt: (id: string) => void;
}) {
  const [reason, setReason] = useState(""),
    [sharing, setSharing] = useState(false),
    [message, setMessage] = useState("");
  return (
    <section className="space-y-4">
      <div className={card}>
        <button className={button} onClick={onBack}>
          Back to Exams
        </button>
        <h2 className="mt-4 text-2xl font-semibold">
          {checkpointName(attempt.checkpoint.checkpoint, attempt.enrollment.programScope)} result
        </h2>
        <p className="mt-2 text-sm">
          Submitted {new Date(attempt.submittedAt).toLocaleString()} ·{" "}
          {attempt.enrollment.scope === "personal"
            ? "Private personal result"
            : "Team assessment result"}
        </p>
        {attempt.pilot && (
          <p className="mt-3 text-amber-700 dark:text-amber-300">
            QA draft. These results are not a validated assessment or certification.
          </p>
        )}
        <p className="mt-3 text-sm">
          There is no overall score. Opening lessons, self-reported mastery, practice and assessed
          performance remain separate.
        </p>
      </div>
      {attempt.profiles.map((profile) => (
        <section key={profile.coverage}>
          <h3 className="mb-3 font-semibold">
            {profile.coverage === "studied"
              ? "Reported studied objectives"
              : profile.coverage === "transfer"
                ? "Unfamiliar / transfer objectives"
                : "Sampled module skills"}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profile.skills.map((skill) => (
              <article key={skill.skill} className={card}>
                <h4 className="font-semibold">{skills[skill.skill]}</h4>
                <p className="mt-2 text-2xl">
                  {skill.score === null ? skill.state.replaceAll("_", " ") : `${skill.score} / 100`}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {skill.evidenceCount} scored items · {skill.objectives.length} objectives
                  {skill.reviewCount ? ` · ${skill.reviewCount} need review` : ""}
                  {skill.pendingCount ? ` · ${skill.pendingCount} pending` : ""}
                  {skill.missingCount ? ` · ${skill.missingCount} not assessed` : ""}
                </p>
                {skill.provisional && (
                  <p className="mt-2 text-xs">Provisional form; calibration pending.</p>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
      {attempt.isLearner && (attempt.status === "submitted" || attempt.status === "scoring") && (
        <button
          className={button}
          onClick={() =>
            void examRequest({ action: "retry_scoring", attemptId: attempt.id })
              .then(onRefresh)
              .catch((err) => setMessage(err.message))
          }
        >
          Retry pending scoring
        </button>
      )}
      <details className={card}>
        <summary className="min-h-11 cursor-pointer py-2 font-semibold">
          {attempt.isLearner
            ? "My responses and feedback"
            : "This attempt’s responses and feedback"}
        </summary>
        {attempt.form.items.map((item) => {
          const response = attempt.responses.find((response) => response.item_id === item.id),
            answer = response?.answer as AssessmentAnswer | undefined,
            feedback = attempt.feedback?.find((row) => row.itemId === item.id),
            proposal = attempt.aiProposals?.find((row) => row.responseId === response?.id),
            evidence = attempt.evidence.find((row) => row.itemId === item.id);
          return (
            <section key={item.id} className="border-t border-border py-4">
              <h4 className="font-medium">{item.prompt}</h4>
              <p className="mt-2 text-sm">Your response: {answerText(answer, item)}</p>
              <p className="mt-2 text-sm text-muted-foreground">{feedback?.rationale}</p>
              {attempt.isLearner && answer?.mediaEvidenceId && (
                <SpeechEvidencePlayback
                  key={answer.mediaEvidenceId}
                  evidenceId={answer.mediaEvidenceId}
                  available={
                    attempt.speechEvidence.find((row) => row.id === answer.mediaEvidenceId)
                      ?.available
                  }
                  learner
                  onChanged={onRefresh}
                />
              )}
              {proposal && (
                <div className="mt-3 rounded-xl border border-border p-3 text-sm">
                  <p className="font-semibold">AI proposal · requires human review</p>
                  <p>
                    {evidence?.source === "ai_proposal"
                      ? evidence.reason
                      : "A later review decision may supersede this proposal."}
                  </p>
                  <p>
                    {Object.entries(proposal.dimensions)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(" · ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Confidence {Math.round(proposal.confidence * 100)}% · {proposal.model} · rubric{" "}
                    {proposal.rubricVersion}
                  </p>
                </div>
              )}
              {response &&
                answer &&
                attempt.isLearner &&
                attempt.aiWritingAvailable &&
                item.type === "production" &&
                item.skill === "writing" &&
                feedback?.rubric &&
                answer.inputMethod === "typed" &&
                answer.text?.trim() &&
                !answer.recognitionIssue &&
                !answer.missingReason &&
                evidence?.source !== "human" && (
                  <AIWritingProposal
                    attemptId={attempt.id}
                    responseId={response.id}
                    jobStatus={
                      attempt.gradingJobs?.find((job) => job.response_id === response.id)?.status
                    }
                    onRefresh={onRefresh}
                  />
                )}
            </section>
          );
        })}
      </details>
      {attempt.canReview && (
        <ExamRubricReview attempt={attempt} onRefresh={onRefresh} onResolved={onBack} />
      )}
      {attempt.isLearner && (
        <form
          className={card}
          onSubmit={(event) => {
            event.preventDefault();
            setSharing(true);
            void examRequest({
              action: "request_review",
              attemptId: attempt.id,
              reason,
              consentVersion: "assessment-review-v1",
              requestId: crypto.randomUUID(),
            })
              .then(() =>
                setMessage(
                  "Review requested. This does not invent a score while evidence is unresolved.",
                ),
              )
              .catch((err) => setMessage(err.message))
              .finally(() => setSharing(false));
          }}
        >
          <h3 className="font-semibold">Request a review</h3>
          <p className="my-3 text-sm">
            {attempt.enrollment.scope === "personal"
              ? "This explicitly shares this one exam and its responses with an authorized assessment reviewer. Other personal exams and your private profile are not shared."
              : "Your team’s authorized admins can review this team exam and its responses."}
          </p>
          <label className="block text-sm">
            What needs review?
            <textarea
              className={input}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              minLength={3}
              maxLength={2000}
              required
            />
          </label>
          <button className={button + " mt-3"} disabled={sharing}>
            {sharing ? "Requesting…" : "Share this exam for review"}
          </button>
          {message && (
            <p className="mt-3 text-sm" role="status">
              {message}
            </p>
          )}
        </form>
      )}
      {message && !attempt.isLearner && <p role="status">{message}</p>}
      {attempt.enrollment.role === "primary" &&
        (attempt.isLearner || (attempt.enrollment.scope === "team" && attempt.canReview)) && (
          <PlanPanelDisclosure
            enrollmentId={attempt.enrollment.id}
            sourceAttemptId={attempt.id}
            onOpenAttempt={onOpenAttempt}
          />
        )}
      <a
        className={primary}
        href={moduleLessonUrl({
          moduleId: attempt.enrollment.moduleId,
          target: attempt.enrollment.targetLanguage,
          native: attempt.enrollment.instructionLanguage,
          planId:
            attempt.isLearner && attempt.enrollment.role === "primary"
              ? attempt.enrollment.id
              : undefined,
        })}
      >
        Continue my module lessons
      </a>
    </section>
  );
}

function ExamRubricReview({
  attempt,
  onRefresh,
  onResolved,
}: {
  attempt: ExamAttemptView;
  onRefresh: () => void;
  onResolved: () => void;
}) {
  const { user } = useAuth();
  const reviewFlight = useRef<{ payload: string; id: string } | null>(null);
  const [chosen, setChosen] = useState("");
  const [speechReady, setSpeechReady] = useState(false);
  const [state, setState] = useState<"scored" | "not_assessed" | "needs_review">("needs_review");
  const [dimensions, setDimensions] = useState<Record<string, number>>({});
  const [points, setPoints] = useState(0),
    [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const response = attempt.responses.find((row) => row.item_id === chosen);
  const item = attempt.form.items.find((row) => row.id === chosen);
  const feedback = attempt.feedback?.find((row) => row.itemId === chosen);
  const rubric = feedback?.rubric;
  const speechAvailable = attempt.speechEvidence.some(
    (row) => row.id === response?.answer?.mediaEvidenceId && row.available,
  );
  const review = attempt.reviews.find((row) => row.status !== "resolved");
  return (
    <section className={card}>
      <h3 className="font-semibold">Review against the frozen rubric</h3>
      <p className="my-3 text-sm">
        Decisions keep the original scoring history, the reviewer, and a reason. A score requires
        available evidence. Speaking also requires its protected recording and your listening
        acknowledgement.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (
            !response ||
            (item?.skill === "speaking" && state === "scored" && (!speechReady || !speechAvailable))
          )
            return;
          setBusy(true);
          setMessage("");
          const payload = {
            action: "review_score",
            attemptId: attempt.id,
            responseId: response.id,
            state,
            points:
              state === "scored"
                ? rubric
                  ? Object.values(dimensions).reduce((a, b) => a + b, 0)
                  : points
                : null,
            dimensions: state === "scored" && rubric ? dimensions : null,
            reason,
          };
          const fingerprint = JSON.stringify(payload);
          if (reviewFlight.current?.payload !== fingerprint)
            reviewFlight.current = { payload: fingerprint, id: crypto.randomUUID() };
          void examRequest({ ...payload, requestId: reviewFlight.current.id })
            .then(() => {
              reviewFlight.current = null;
              setMessage("Review decision saved with its evidence.");
              onRefresh();
            })
            .catch((err) => setMessage(err.message))
            .finally(() => setBusy(false));
        }}
        className="space-y-4"
      >
        <label className="block text-sm">
          Response to review
          <select
            className={input}
            value={chosen}
            required
            onChange={(event) => {
              setChosen(event.target.value);
              setSpeechReady(false);
              setState("needs_review");
              setDimensions({});
              setPoints(0);
              setReason("");
            }}
          >
            <option value="">Choose a response</option>
            {attempt.form.items.map((question) => (
              <option key={question.id} value={question.id}>
                {skills[question.skill]} · {question.prompt}
              </option>
            ))}
          </select>
        </label>
        {item && (
          <>
            <p className="rounded-xl border border-border p-3 text-sm">
              Learner response: {answerText(response?.answer as AssessmentAnswer | undefined, item)}
            </p>
            {item.skill === "speaking" && response?.answer?.mediaEvidenceId && (
              <SpeechEvidencePlayback
                key={response.answer.mediaEvidenceId}
                evidenceId={response.answer.mediaEvidenceId}
                available={
                  attempt.speechEvidence.find((row) => row.id === response.answer.mediaEvidenceId)
                    ?.available
                }
                onReviewReady={setSpeechReady}
              />
            )}
            <p className="text-sm">
              Frozen rubric version: {attempt.form.rubricVersion}. {feedback?.rationale}
            </p>
            <label className="block text-sm">
              Decision
              <select
                className={input}
                value={state}
                onChange={(event) => setState(event.target.value as typeof state)}
              >
                <option value="needs_review">Needs review</option>
                <option value="not_assessed">Not assessed</option>
                <option
                  value="scored"
                  disabled={item.skill === "speaking" && (!speechReady || !speechAvailable)}
                >
                  Scored against the rubric
                </option>
              </select>
            </label>
            {state === "scored" &&
              (rubric ? (
                <div className="space-y-3">
                  {rubric.dimensions.map((dimension) => (
                    <label className="block text-sm" key={dimension.id}>
                      {dimension.label} · 0–{dimension.maximum}
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {dimension.description}
                      </span>
                      <input
                        type="number"
                        className={input}
                        min={0}
                        max={dimension.maximum}
                        step={0.5}
                        required
                        value={dimensions[dimension.id] ?? ""}
                        onChange={(event) =>
                          setDimensions((old) => ({
                            ...old,
                            [dimension.id]: Number(event.target.value),
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <label className="block text-sm">
                  Points
                  <input
                    className={input}
                    type="number"
                    min={0}
                    max={attempt.evidence.find((e) => e.itemId === chosen)?.maximum ?? 1}
                    step={0.5}
                    value={points}
                    onChange={(event) => setPoints(Number(event.target.value))}
                    required
                  />
                </label>
              ))}
            <label className="block text-sm">
              Evidence and reason for this decision
              <textarea
                className={input}
                minLength={3}
                maxLength={2000}
                required
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            <button className={primary} disabled={busy}>
              {busy ? "Saving review…" : "Save review decision"}
            </button>
          </>
        )}
      </form>
      {review && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-sm">
            Review request: {review.reason} · {review.status}
          </p>
          <button
            className={button + " mt-3"}
            disabled={
              busy ||
              reason.trim().length < 3 ||
              (!!review.reviewer_id && review.reviewer_id !== user?.id)
            }
            onClick={() => {
              setBusy(true);
              void (
                review.reviewer_id === user?.id
                  ? Promise.resolve()
                  : examRequest({ action: "claim_review", reviewId: review.id })
              )
                .then(() =>
                  examRequest({
                    action: "resolve_review",
                    reviewId: review.id,
                    reason,
                    requestId: crypto.randomUUID(),
                  }),
                )
                .then(() => {
                  onResolved();
                })
                .catch((err) => setMessage(err.message))
                .finally(() => setBusy(false));
            }}
          >
            Close review with this reason
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}

type ReadinessTrack = {
  moduleId: string;
  name: string;
  lessonCount: number;
  authoredLessonLists: number;
  contextualPassages: number;
  sourceCoverage: LessonSourceCoverage;
  exams: Record<string, string>;
  status: string;
  contentReviewCount: number;
  lessonsReviewed: boolean;
  calibrated: boolean;
  offlineVerified: boolean;
};
function ReadinessPanel({ target, native }: { target: Language; native: NativeLanguage }) {
  const [tracks, setTracks] = useState<ReadinessTrack[]>([]),
    [error, setError] = useState(""),
    [expanded, setExpanded] = useState(false),
    [selectedModule, setSelectedModule] = useState("");
  const selectedTrack = tracks.find((track) => track.moduleId === selectedModule);
  const shownTracks = selectedTrack ? [selectedTrack] : tracks;
  useEffect(() => {
    if (!expanded) return;
    let active = true;
    setTracks([]);
    setError("");
    void examRequest<{ tracks: ReadinessTrack[] }>(
      `/api/exams?action=readiness&target=${encodeURIComponent(target)}&native=${encodeURIComponent(native)}`,
    )
      .then((data) => {
        if (active) setTracks(data.tracks);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [expanded, target, native]);
  return (
    <details
      className={card}
      open={expanded}
      onToggle={(event) => {
        if (event.target === event.currentTarget) setExpanded(event.currentTarget.open);
      }}
    >
      <summary className="min-h-11 cursor-pointer py-2 font-semibold">
        Module readiness · {native} → {target}
      </summary>
      <p className="my-3 text-sm">
        Roofing sets the first complete standard. Each language track needs 30 reviewed lessons, six
        learning modes, three reviewed exams, calibration and offline verification. A lesson count
        alone does not verify a module. These counts describe shared lesson definitions. Other
        practice sources may be available; they do not establish reviewed readiness.
      </p>
      {error && <p role="alert">{error}</p>}
      <label className="mb-4 block text-sm">
        Module to inspect
        <select
          value={selectedTrack?.moduleId ?? ""}
          onChange={(event) => setSelectedModule(event.target.value)}
          className="mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3"
        >
          <option value="">All modules</option>
          {tracks.map((track) => (
            <option key={track.moduleId} value={track.moduleId}>
              {track.name}
            </option>
          ))}
        </select>
      </label>
      <div className={selectedTrack ? "space-y-3" : "max-h-96 space-y-3 overflow-y-auto"}>
        {shownTracks.map((track) => (
          <article className="rounded-xl border border-border p-3 text-sm" key={track.moduleId}>
            <h3 className="font-semibold">
              {track.name} · {track.status.replaceAll("_", " ")}
            </h3>
            <p className="mt-1">
              {track.lessonCount}/30 lessons · Word lists: {track.authoredLessonLists} · Passages:{" "}
              {track.contextualPassages} · Toolkit settings:{" "}
              {track.sourceCoverage.lessonsWithTeachingSettings}
            </p>
            <p>
              Entrance: {track.exams.entrance} · Day 45: {track.exams.day45} · Day 90:{" "}
              {track.exams.day90}
            </p>
            <details className="my-2 rounded-lg border border-border p-2">
              <summary className="min-h-11 cursor-pointer py-2">Inspect lesson gaps</summary>
              <p className="mb-2 text-xs text-muted-foreground">
                Word-list baseline: 8–12 terms and 4–6 phrases per lesson. Source presence is
                separate from human review.
              </p>
              <dl className="space-y-2 text-xs">
                {(
                  [
                    ["Missing lessons", track.sourceCoverage.missingLessonNumbers],
                    ["Duplicate lesson numbers", track.sourceCoverage.duplicateLessonNumbers],
                    ["No word list in lesson definition", track.sourceCoverage.missingWordLists],
                    [
                      "Word lists outside the quantity baseline",
                      track.sourceCoverage.vocabularyQuantityGaps,
                    ],
                    ["No aligned lesson passage", track.sourceCoverage.missingPassages],
                    ["No lesson toolkit settings", track.sourceCoverage.missingTeachingSettings],
                    [
                      "No explicit recall step in the written plan",
                      track.sourceCoverage.lessonsWithoutExplicitRecallStep,
                    ],
                  ] as const
                ).map(([label, numbers]) => (
                  <div key={label}>
                    <dt className="font-semibold">{label}</dt>
                    <dd className="break-words">
                      {numbers.length ? `Lessons ${lessonNumberRanges(numbers)}` : "None"}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">
                An absent written recall step does not mean a matching game is unavailable: the
                embedded toolkit may provide it. Check the actual lesson before reporting a missing
                game.
              </p>
            </details>
            <p className="mt-1 text-xs text-muted-foreground">
              {track.contentReviewCount} review records · Lesson review:{" "}
              {track.lessonsReviewed ? "complete" : "pending"} · Calibration:{" "}
              {track.calibrated ? "complete" : "pending"} · Offline:{" "}
              {track.offlineVerified ? "verified" : "pending"}
            </p>
          </article>
        ))}
      </div>
    </details>
  );
}

function PlanPanelDisclosure({
  enrollmentId,
  sourceAttemptId,
  onOpenAttempt,
}: {
  enrollmentId: string;
  sourceAttemptId?: string;
  onOpenAttempt: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="mt-4 rounded-xl border border-border p-4"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="min-h-11 cursor-pointer py-2 font-semibold">
        Learning plan, support and decision history
      </summary>
      {open && (
        <Suspense fallback={<p role="status">Loading learning plan…</p>}>
          <AssessmentPlanPanel
            enrollmentId={enrollmentId}
            sourceAttemptId={sourceAttemptId}
            onOpenAttempt={onOpenAttempt}
          />
        </Suspense>
      )}
    </details>
  );
}
