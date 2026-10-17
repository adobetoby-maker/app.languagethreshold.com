import { useRef, useState } from "react";
import { useAuth } from "@/state/auth-state";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
import { examContentRequest, ExamRequestError } from "@/lib/assessments/client";
export type ContentReviewContext = {
  lessonBindingCurrent?: boolean;
  fingerprint: string;
  reviewKinds: ("curriculum" | "fluent_language" | "domain")[];
  decisions: {
    id: string;
    actor_id: string;
    kind: string;
    decision: string;
    fingerprint: string;
    note: string;
    created_at: string;
    grant_revision: number;
  }[];
};
const labels: Record<string, string> = {
  curriculum: "Curriculum",
  fluent_language: "Fluent language",
  domain: "Domain",
};
type Props = {
  formId: string;
  context: ContentReviewContext;
  onRecorded: () => void;
  onAccessLost: () => void;
};
export function ContentReviewDecision(props: Props) {
  const { user } = useAuth();
  const scope = JSON.stringify([
    user?.id ?? null,
    props.formId,
    props.context.fingerprint,
    props.context.reviewKinds,
    props.context.lessonBindingCurrent,
  ]);
  return <OwnedContentReviewDecision key={scope} {...props} scope={scope} />;
}
function OwnedContentReviewDecision({
  formId,
  context,
  onRecorded,
  onAccessLost,
  scope,
}: Props & { scope: string }) {
  const { user } = useAuth(),
    [kind, setKind] = useState(context.reviewKinds[0] ?? "curriculum"),
    [decision, setDecision] = useState("changes_requested"),
    [note, setNote] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { capture } = usePracticeLifecycle(scope);
  const pending = useRef<AbortController | null>(null);
  const lock = useRef(false),
    request = useRef<{ key: string; id: string } | null>(null);
  async function submit() {
    const lease = capture();
    if (
      !user ||
      !lease.isCurrent() ||
      lock.current ||
      !confirmed ||
      !context.reviewKinds.includes(kind) ||
      note.trim().length < 3 ||
      note.trim().length > 4000 ||
      !["changes_requested", "approved"].includes(decision) ||
      (decision === "approved" && context.lessonBindingCurrent !== true)
    )
      return;
    const body = {
        formId,
        kind,
        decision,
        fingerprint: context.fingerprint,
        note: note.trim(),
        confirmReview: confirmed,
      },
      key = JSON.stringify(body);
    if (request.current?.key !== key) request.current = { key, id: crypto.randomUUID() };
    lock.current = true;
    const controller = new AbortController();
    pending.current = controller;
    const release = lease.own(() => controller.abort());
    const current = () =>
      lease.isCurrent() && pending.current === controller && !controller.signal.aborted;
    setBusy(true);
    setError("");
    try {
      await examContentRequest({ ...body, requestId: request.current.id }, controller.signal);
      if (current()) onRecorded();
    } catch (err) {
      if (current()) {
        if (err instanceof ExamRequestError && (err.status === 401 || err.status === 403))
          onAccessLost();
        else setError(err instanceof Error ? err.message : "Review could not be recorded.");
      }
    } finally {
      if (current()) setBusy(false);
      if (pending.current === controller) {
        pending.current = null;
        lock.current = false;
      }
      release();
      controller.abort();
    }
  }
  return (
    <section className="space-y-4 rounded-2xl border border-border p-4">
      <h3 className="text-xl font-semibold">Human content review</h3>
      <p className="text-sm">
        A decision applies to the exact question, rubric and frozen lesson-material reference shown.
        Changed content needs another review. These decisions do not publish the exam, calibrate
        scoring or approve equivalence.
      </p>
      {context.lessonBindingCurrent !== true && (
        <p className="text-sm">
          Approval is unavailable until the release has frozen lesson materials matching the current
          app. You can still record changes requested.
        </p>
      )}
      {context.reviewKinds.length > 0 ? (
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label>
            My assigned responsibility
            <select
              className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background p-3"
              value={kind}
              disabled={busy}
              onChange={(e) => {
                if (!capture().isCurrent() || lock.current) return;
                setKind(e.target.value as typeof kind);
                setConfirmed(false);
              }}
            >
              {context.reviewKinds.map((k) => (
                <option value={k} key={k}>
                  {labels[k]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Decision
            <select
              className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background p-3"
              value={decision}
              disabled={busy}
              onChange={(e) => {
                if (!capture().isCurrent() || lock.current) return;
                setDecision(e.target.value);
                setConfirmed(false);
              }}
            >
              <option value="changes_requested">Changes requested</option>
              <option value="approved" disabled={context.lessonBindingCurrent !== true}>
                Approved for my responsibility
              </option>
            </select>
          </label>
          <label className="sm:col-span-2">
            Review findings
            <textarea
              className="mt-1 min-h-28 w-full rounded-xl border border-border bg-background p-3"
              required
              minLength={3}
              maxLength={4000}
              value={note}
              disabled={busy}
              onChange={(e) => {
                if (capture().isCurrent() && !lock.current) {
                  setNote(e.target.value);
                  setConfirmed(false);
                }
              }}
            />
          </label>
          <label className="flex min-h-11 items-start gap-3 sm:col-span-2">
            <input
              type="checkbox"
              className="mt-1"
              checked={confirmed}
              disabled={busy}
              onChange={(e) => {
                if (capture().isCurrent() && !lock.current) setConfirmed(e.target.checked);
              }}
            />
            <span>
              I personally reviewed the displayed content in my assigned responsibility. These
              findings are my own review.
            </span>
          </label>
          {error && (
            <p role="alert" className="sm:col-span-2">
              {error}
            </p>
          )}
          <button
            className="min-h-11 rounded-xl border border-gold/40 px-4 py-2 font-semibold disabled:opacity-50 sm:col-span-2"
            disabled={
              busy ||
              !confirmed ||
              (decision === "approved" && context.lessonBindingCurrent !== true)
            }
          >
            {busy ? "Recording review…" : "Record my content review"}
          </button>
        </form>
      ) : (
        <p className="text-sm">
          Inspection access does not grant a review responsibility. An owner assigns qualified
          reviewers through Reviewer access.
        </p>
      )}
      <h4 className="font-semibold">Recent recorded decisions</h4>
      {!context.decisions.length && (
        <p className="text-sm">No human decisions recorded for this form.</p>
      )}
      <ol className="space-y-3">
        {context.decisions.map((d) => (
          <li key={d.id} className="rounded-xl border border-border p-3 text-sm">
            <p className="font-semibold">
              {labels[d.kind] ?? d.kind} ·{" "}
              {d.decision === "approved" ? "Approved for this responsibility" : "Changes requested"}{" "}
              ·{" "}
              {d.fingerprint === context.fingerprint
                ? "Current content"
                : "Earlier content — review again"}
            </p>
            <p className="break-all text-xs text-muted-foreground">
              {new Date(d.created_at).toLocaleString()} · reviewer {d.actor_id} · access revision{" "}
              {d.grant_revision}
            </p>
            <p className="mt-2 whitespace-pre-wrap">{d.note}</p>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">
        Latest 50 decisions; earlier records remain in the audit. Content version fingerprint:{" "}
        <span className="break-all">{context.fingerprint}</span>
      </p>
    </section>
  );
}
