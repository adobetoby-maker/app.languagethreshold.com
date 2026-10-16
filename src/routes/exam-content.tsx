import { createFileRoute } from "@tanstack/react-router";
import { LessonContentReview } from "@/components/exams/LessonContentReview";
import { useCallback, useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/state/auth-state";
import { AuthButton } from "@/components/auth/AuthButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { examRequest } from "@/lib/assessments/client";
import {
  ContentReviewDecision,
  type ContentReviewContext,
} from "@/components/exams/ContentReviewDecision";
import { getModule } from "@/data/modules";
import type { AssessmentFormDefinition } from "@/lib/assessments/form";
import { PrivateExamAudio } from "@/components/exams/PrivateExamAudio";
type Catalog = {
  owner: boolean;
  registeredOwner: boolean;
  releases: {
    id: string;
    module_id: string;
    target_language: string;
    instruction_language: string;
    status: string;
    lesson_manifest: Record<string, unknown>;
    review_records: unknown[];
  }[];
  forms: {
    id: string;
    release_id: string;
    checkpoint: string;
    purpose: string;
    version: string;
    status: string;
    calibrated: boolean;
  }[];
  releaseLimit: number;
  formLimit: number;
};
type PrivateForm = {
  reviewContext: ContentReviewContext | null;
  id: string;
  checkpoint: string;
  purpose: string;
  version: string;
  rubric_version: string;
  status: string;
  calibrated: boolean;
  equivalence_approved: boolean;
  review_records: unknown[];
  definition: AssessmentFormDefinition;
};
export const Route = createFileRoute("/exam-content")({
  head: () => ({
    meta: [
      { title: "Private exam content review | Language Threshold" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => (
    <AuthProvider>
      <PrivateContentPage />
    </AuthProvider>
  ),
});
function PrivateContentPage() {
  const { user } = useAuth();
  return <PrivateContent key={user?.id ?? "guest"} />;
}
function PrivateContent() {
  const { user, isCurrentUser } = useAuth(),
    [catalog, setCatalog] = useState<Catalog | null>(null),
    [releaseId, setRelease] = useState(""),
    [formId, setForm] = useState(""),
    [form, setDetail] = useState<PrivateForm | null>(null),
    [error, setError] = useState(""),
    [epoch, setEpoch] = useState(0);
  const onLessonAccessLost = useCallback(() => {
    setCatalog(null);
    setDetail(null);
    setRelease("");
    setForm("");
    setError("Content access changed. Refresh your assigned permissions before continuing.");
  }, []);
  useEffect(() => {
    if (!user) return;
    const actor = user.id,
      controller = new AbortController();
    setCatalog(null);
    setDetail(null);
    void examRequest<Catalog>("/api/exam-content", controller.signal)
      .then((data) => {
        if (!controller.signal.aborted && isCurrentUser(actor)) {
          setCatalog(data);
          setRelease(
            (current) =>
              current ||
              data.releases.find(
                (release) =>
                  release.module_id === "roofing" &&
                  release.target_language === "Spanish" &&
                  release.instruction_language === "English",
              )?.id ||
              data.releases[0]?.id ||
              "",
          );
          setError("");
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted && isCurrentUser(actor)) setError(err.message);
      });
    return () => controller.abort();
  }, [user, isCurrentUser, epoch]);
  useEffect(() => {
    if (!user || !formId) return;
    const actor = user.id,
      controller = new AbortController();
    setDetail(null);
    void examRequest<{ form: PrivateForm }>(
      `/api/exam-content?form=${encodeURIComponent(formId)}`,
      controller.signal,
    )
      .then((data) => {
        if (!controller.signal.aborted && isCurrentUser(actor)) {
          setDetail(data.form);
          setError("");
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted && isCurrentUser(actor)) setError(err.message);
      });
    return () => controller.abort();
  }, [formId, user, isCurrentUser, epoch]);
  const release = catalog?.releases.find((row) => row.id === releaseId),
    shownForm = form?.id === formId ? form : null;
  return (
    <div className="min-h-screen bg-background p-4 text-foreground sm:p-8">
      <header className="mx-auto mb-6 flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <a
          className="min-h-11 py-2 text-gold underline"
          href={catalog?.owner ? "/owner" : "/exams"}
        >
          {catalog?.owner ? "Owner dashboard" : "My Exams"}
        </a>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <AuthButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-5">
        <h1 className="font-serif text-3xl">Private exam content review</h1>
        <p>
          This workspace shows questions, answer policies and rubrics to assigned content reviewers
          and the platform owner. It contains no learner responses. Opening private keys is
          recorded: this language-track bank cannot subsequently serve as your own official
          assessment. Viewing a draft does not approve, calibrate or publish it.
        </p>
        {!user && <p>Sign in with your assigned content-reviewer or platform owner account.</p>}
        {error && (
          <div role="alert" className="rounded-xl border border-amber-500/40 p-4">
            <p>{error}</p>
            <button
              className="min-h-11 text-gold underline"
              onClick={() => setEpoch((value) => value + 1)}
            >
              Try again
            </button>
          </div>
        )}
        {user && !catalog && !error && <p role="status">Loading private content…</p>}
        {formId && !shownForm && !error && <p role="status">Loading the selected form…</p>}
        {catalog && (
          <>
            {catalog.registeredOwner && (
              <a
                href="/exam-reviewers"
                className="inline-flex min-h-11 items-center text-gold underline"
              >
                Manage reviewer access
              </a>
            )}
            <label className="block text-sm">
              Module and language release
              <select
                className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background p-3"
                value={releaseId}
                onChange={(event) => {
                  setRelease(event.target.value);
                  setForm("");
                  setDetail(null);
                }}
              >
                {catalog.releases.map((row) => (
                  <option key={row.id} value={row.id}>
                    {getModule(row.module_id)?.name ?? row.module_id} · {row.instruction_language} →{" "}
                    {row.target_language} · {row.status} · {row.id}
                  </option>
                ))}
              </select>
            </label>
            {catalog.releases.length >= catalog.releaseLimit && (
              <p>Showing the latest {catalog.releaseLimit} releases.</p>
            )}
            {release && (
              <section className="rounded-2xl border border-border p-4">
                <h2 className="font-semibold">Lesson review status</h2>
                <p>
                  Release: {release.status} · recorded reviews: {release.review_records.length}
                </p>
                <p>
                  Lessons reviewed: {release.lesson_manifest.reviewed === true ? "Yes" : "Pending"}{" "}
                  · offline verified:{" "}
                  {release.lesson_manifest.offlineVerified === true ? "Yes" : "Pending"}
                </p>
                <p className="mt-2 text-sm">
                  Publication requires curriculum, fluent-language and domain review, plus scoring
                  calibration and the approved evidence workflow. Only assigned reviewers can record
                  decisions; these do not publish content.
                </p>
              </section>
            )}
            {release && (
              <LessonContentReview
                key={release.id}
                releaseId={release.id}
                onAccessLost={onLessonAccessLost}
              />
            )}
            <label className="block text-sm">
              Assessment form
              <select
                className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background p-3"
                value={formId}
                onChange={(event) => setForm(event.target.value)}
              >
                <option value="">Choose a form to inspect</option>
                {catalog.forms
                  .filter((row) => row.release_id === releaseId)
                  .map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.checkpoint} · {row.purpose} · {row.version} · {row.status}
                      {row.calibrated ? " · calibrated" : " · calibration pending"}
                    </option>
                  ))}
              </select>
            </label>
            {catalog.forms.length >= catalog.formLimit && (
              <p>Showing the latest {catalog.formLimit} forms.</p>
            )}
            {shownForm && (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold">
                  {shownForm.checkpoint} · {shownForm.status}
                </h2>
                <p>
                  {shownForm.definition.items.length} tasks · rubric {shownForm.rubric_version} ·{" "}
                  {shownForm.review_records.length} imported review records · calibration{" "}
                  {shownForm.calibrated ? "approved" : "pending"} · equivalence{" "}
                  {shownForm.equivalence_approved ? "approved" : "pending"}
                </p>
                {shownForm.definition.items.map((item, index) => (
                  <article key={item.id} className="space-y-3 rounded-2xl border border-border p-4">
                    <h3 className="font-semibold">
                      {index + 1}. {item.prompt}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {item.skill} · {item.objectiveId} · maximum {item.maximum} · inputs{" "}
                      {item.inputMethods.join(", ")}
                    </p>
                    {item.passage && <p className="whitespace-pre-wrap">{item.passage}</p>}
                    {item.audioText && (
                      <p className="rounded-xl border border-border p-3">
                        Listening source: {item.audioText}
                      </p>
                    )}
                    {item.audioRequired &&
                      (item.audioAsset ? (
                        <PrivateExamAudio
                          key={`${shownForm.id}:${item.id}:${item.audioAsset.sha256}`}
                          path={`/api/exam-content?form=${encodeURIComponent(shownForm.id)}&audioItem=${encodeURIComponent(item.id)}`}
                          onAccessLost={() => {
                            setDetail(null);
                            setCatalog(null);
                            setError(
                              "Content access changed. Refresh your assigned permissions before continuing.",
                            );
                          }}
                        />
                      ) : (
                        <p className="text-sm">
                          Versioned listening clip: missing. This item is not ready for official
                          use.
                        </p>
                      ))}
                    {item.options && (
                      <ul>
                        {item.options.map((option) => (
                          <li key={option.id}>
                            {option.text}
                            {option.id === item.correctOptionId ? " · accepted key" : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                    {item.accepted && <p>Accepted answers: {item.accepted.join(" / ")}</p>}
                    {item.rubric && (
                      <ul className="space-y-2">
                        {item.rubric.dimensions.map((d) => (
                          <li key={d.id}>
                            <strong>
                              {d.label} · {d.maximum}
                            </strong>
                            : {d.description}
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="text-sm">Review rationale: {item.rationale}</p>
                  </article>
                ))}
                {shownForm.reviewContext && (
                  <ContentReviewDecision
                    key={`${shownForm.id}:${shownForm.reviewContext.fingerprint}`}
                    formId={shownForm.id}
                    context={shownForm.reviewContext}
                    onRecorded={() => setEpoch((value) => value + 1)}
                    onAccessLost={() => {
                      setDetail(null);
                      setCatalog(null);
                      setError(
                        "Content access changed. Refresh your assigned permissions before continuing.",
                      );
                    }}
                  />
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
