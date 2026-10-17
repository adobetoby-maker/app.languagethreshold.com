import { useEffect, useState } from "react";
import { useAuth } from "@/state/auth-state";
import { examRequest } from "@/lib/assessments/client";
import { getModule } from "@/data/modules";
type QueueRow = {
  attempt_id: string;
  submitted_at: string;
  attempt_number: number;
  status: string;
  checkpoint: string;
  module_id: string;
  target_language: string;
  instruction_language: string;
  learner_id: string | null;
  review_id: string | null;
  reviewer_id: string | null;
};
type QueuePage = {
  eligible: boolean;
  items: QueueRow[];
  hasMore: boolean;
  nextCursor: { submittedAt: string; id: string } | null;
};
export function ExamReviewQueue({
  orgId,
  members,
  onOpen,
}: {
  orgId?: string;
  members: { user_id: string; display_name: string }[];
  onOpen: (id: string, review: boolean) => void;
}) {
  const { user, isCurrentUser } = useAuth();
  const [page, setPage] = useState<QueuePage | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [epoch, setEpoch] = useState(0);
  useEffect(() => {
    if (!user) return;
    const actor = user.id,
      controller = new AbortController();
    setError("");
    const params = new URLSearchParams({
      action: "review_queue",
      ...(orgId ? { org: orgId } : {}),
    });
    void examRequest<QueuePage>(`/api/exams?${params}`, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted && isCurrentUser(actor)) setPage(result);
      })
      .catch((err) => {
        if (!controller.signal.aborted && isCurrentUser(actor)) setError(err.message);
      });
    return () => controller.abort();
  }, [orgId, user, isCurrentUser, epoch]);
  if (!user || (!orgId && !error && (!page || !page.eligible))) return null;
  const loadMore = async () => {
    if (busy || !page?.nextCursor) return;
    const actor = user.id;
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({
        action: "review_queue",
        ...(orgId ? { org: orgId } : {}),
        after: page.nextCursor.submittedAt,
        afterId: page.nextCursor.id,
      });
      const next = await examRequest<QueuePage>(`/api/exams?${params}`);
      if (isCurrentUser(actor))
        setPage((current) => ({
          ...next,
          items: [
            ...(current?.items ?? []),
            ...next.items.filter(
              (row) => !current?.items.some((old) => old.attempt_id === row.attempt_id),
            ),
          ],
        }));
    } catch (err) {
      if (isCurrentUser(actor))
        setError(err instanceof Error ? err.message : "Review queue could not load.");
    } finally {
      if (isCurrentUser(actor)) setBusy(false);
    }
  };
  return (
    <details className="rounded-2xl border border-border p-4">
      <summary className="min-h-11 cursor-pointer py-2 font-semibold">
        Review queue{page ? ` · ${page.items.length}${page.hasMore ? "+" : ""}` : ""}
      </summary>
      <p className="my-3 text-sm text-muted-foreground">
        {orgId
          ? "Submitted assessments needing review for this team. Your own attempts are excluded."
          : "Only active reviewers see explicitly shared personal attempts for their approved module and language pair. Claiming one opens only that attempt."}
      </p>
      {error && (
        <p role="alert" className="my-3 text-sm">
          {error}
        </p>
      )}
      {!page && !error && <p role="status">Loading review queue…</p>}
      {page?.items.length === 0 && (
        <p className="my-3 text-sm">No assessments are waiting for your review.</p>
      )}
      <ul className="space-y-3">
        {page?.items.map((row) => (
          <li key={row.attempt_id} className="rounded-xl border border-border p-3 text-sm">
            <p className="font-semibold">
              {getModule(row.module_id)?.name ?? row.module_id} ·{" "}
              {row.checkpoint === "entrance"
                ? "Entrance"
                : row.checkpoint === "day45"
                  ? "Day 45"
                  : "Day 90"}{" "}
              · attempt {row.attempt_number}
            </p>
            <p>
              {row.target_language} · instructions in {row.instruction_language}
            </p>
            {row.learner_id && (
              <p>
                {members.find((member) => member.user_id === row.learner_id)?.display_name ??
                  "Team learner"}
              </p>
            )}
            <p>Submitted {new Date(row.submitted_at).toLocaleString()}</p>
            <button
              disabled={busy}
              className="mt-2 min-h-11 rounded-xl border border-gold/40 px-4 py-2 font-semibold disabled:opacity-50"
              onClick={async () => {
                if (busy) return;
                const actor = user.id;
                setBusy(true);
                setError("");
                try {
                  if (row.review_id && !row.reviewer_id)
                    await examRequest({ action: "claim_review", reviewId: row.review_id });
                  if (isCurrentUser(actor)) onOpen(row.attempt_id, true);
                } catch (err) {
                  if (isCurrentUser(actor))
                    setError(err instanceof Error ? err.message : "Review could not open.");
                } finally {
                  if (isCurrentUser(actor)) setBusy(false);
                }
              }}
            >
              {row.review_id && !row.reviewer_id
                ? "Claim and review shared attempt"
                : "Open rubric review"}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-3">
        {page?.hasMore && (
          <button
            disabled={busy}
            className="min-h-11 px-3 text-sm text-gold underline"
            onClick={() => void loadMore()}
          >
            Load more reviews
          </button>
        )}
        <button
          disabled={busy}
          className="min-h-11 px-3 text-sm text-gold underline"
          onClick={() => setEpoch((value) => value + 1)}
        >
          Refresh queue
        </button>
      </div>
    </details>
  );
}
