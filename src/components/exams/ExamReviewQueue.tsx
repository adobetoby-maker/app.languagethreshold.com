import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/state/auth-state";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
import { examRequest, ExamRequestError } from "@/lib/assessments/client";
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
type Props = {
  orgId?: string;
  members: { user_id: string; display_name: string }[];
  onOpen: (id: string, review: boolean) => void;
};
export function ExamReviewQueue(props: Props) {
  const { user } = useAuth();
  if (!user) return null;
  return <OwnedExamReviewQueue key={JSON.stringify([user.id, props.orgId ?? null])} {...props} />;
}
function OwnedExamReviewQueue({ orgId, members, onOpen }: Props) {
  const [epoch, setEpoch] = useState(0),
    [expanded, setExpanded] = useState(false);
  const { actor, key, capture, cancel } = usePracticeLifecycle(
    JSON.stringify([orgId ?? null, epoch]),
  );
  const view = capture();
  const [record, setRecord] = useState<{ key: string; page: QueuePage } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const flight = useRef<AbortController | null>(null);
  const page = record?.key === key ? record.page : null;
  const activePage = useRef<QueuePage | null>(null);
  useEffect(() => {
    activePage.current = page;
    return () => {
      activePage.current = null;
    };
  }, [page]);
  const queuePath = () =>
    `/api/exams?${new URLSearchParams({ action: "review_queue", ...(orgId ? { org: orgId } : {}) })}`;
  useEffect(() => {
    const lease = capture();
    if (!actor || !lease.isCurrent()) return;
    const controller = new AbortController();
    const release = lease.own(() => controller.abort());
    const current = () => lease.isCurrent() && !controller.signal.aborted;
    setError("");
    setLoading(true);
    setBusy(false);
    void examRequest<QueuePage>(
      `/api/exams?${new URLSearchParams({ action: "review_queue", ...(orgId ? { org: orgId } : {}) })}`,
      controller.signal,
    )
      .then((result) => {
        if (current()) setRecord({ key, page: result });
      })
      .catch((err) => {
        if (current()) {
          setRecord(null);
          setError(err instanceof Error ? err.message : "Review queue could not load.");
        }
      })
      .finally(() => {
        if (current()) setLoading(false);
        release();
      });
    return () => {
      controller.abort();
      release();
    };
  }, [actor, orgId, key, capture]);
  const currentView = () => !!actor && view.isCurrent() && !loading && activePage.current === page;
  async function act(work: (signal: AbortSignal, current: () => boolean) => Promise<void>) {
    if (!currentView() || flight.current) return;
    const controller = new AbortController();
    flight.current = controller;
    const release = view.own(() => {
      controller.abort();
      if (flight.current === controller) flight.current = null;
    });
    const current = () =>
      view.isCurrent() && flight.current === controller && !controller.signal.aborted;
    setBusy(true);
    setError("");
    try {
      await work(controller.signal, current);
    } catch (err) {
      if (current()) {
        if (err instanceof ExamRequestError && [401, 403].includes(err.status)) setRecord(null);
        setError(err instanceof Error ? err.message : "Review queue action could not finish.");
      }
    } finally {
      if (current()) setBusy(false);
      if (flight.current === controller) flight.current = null;
      release();
      controller.abort();
    }
  }
  const loadMore = () => {
    if (!page?.hasMore || !page.nextCursor) return;
    return act(async (signal, current) => {
      const params = new URLSearchParams(queuePath().split("?")[1]);
      params.set("after", page.nextCursor!.submittedAt);
      params.set("afterId", page.nextCursor!.id);
      const next = await examRequest<QueuePage>(`/api/exams?${params}`, signal);
      if (current())
        setRecord({
          key,
          page: {
            ...next,
            items: next.eligible
              ? [
                  ...new Map(
                    [...page.items, ...next.items].map((row) => [row.attempt_id, row]),
                  ).values(),
                ]
              : [],
          },
        });
    });
  };
  const openReview = (row: QueueRow) => {
    if (!page?.eligible || !page.items.includes(row)) return;
    return act(async (signal, current) => {
      if (row.review_id && !row.reviewer_id)
        await examRequest({ action: "claim_review", reviewId: row.review_id }, signal);
      if (current()) onOpen(row.attempt_id, true);
    });
  };
  const refresh = () => {
    if (!view.isCurrent() || flight.current || loading) return;
    cancel();
    setError("");
    setEpoch((value) => value + 1);
  };
  if (!orgId && !error && (!page || !page.eligible)) return null;
  return (
    <details
      className="rounded-2xl border border-border p-4"
      open={expanded}
      onToggle={(event) => {
        if (event.target === event.currentTarget && view.isCurrent())
          setExpanded(event.currentTarget.open);
      }}
    >
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
              disabled={busy || loading}
              className="mt-2 min-h-11 rounded-xl border border-gold/40 px-4 py-2 font-semibold disabled:opacity-50"
              onClick={() => void openReview(row)}
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
            disabled={busy || loading}
            className="min-h-11 px-3 text-sm text-gold underline"
            onClick={() => void loadMore()}
          >
            Load more reviews
          </button>
        )}
        <button
          disabled={busy || loading}
          className="min-h-11 px-3 text-sm text-gold underline"
          onClick={refresh}
        >
          Refresh queue
        </button>
      </div>
    </details>
  );
}
