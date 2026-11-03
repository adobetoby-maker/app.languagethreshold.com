import { useState } from "react";
import { useOwnerResource } from "./use-owner-resource";
import { ownerPanel, ownerButton } from "./owner-ui";
type Entry = {
  user_id: string;
  rewarded_at?: string | null;
  code: string;
  expires_at: string;
  feedback_email_consent: boolean;
  consent_updated_at: string;
  contact: { email: string; name: string } | null;
};
type Data = {
  hasMore: boolean;
  redemptions: Entry[];
  feedback: {
    id: string;
    user_id: string;
    category: string;
    message: string;
    created_at: string;
  }[];
};
export function RedditFeedbackCohort() {
  const [page, setPage] = useState(0);
  const r = useOwnerResource<Data>(`/api/owner-reddit?page=${page}`);
  const [onlyConsent, setOnlyConsent] = useState(true);
  const [approve, setApprove] = useState<string | null>(null);
  const [rewardNotice, setRewardNotice] = useState("");
  const [emailReview, setEmailReview] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  return (
    <section className={ownerPanel} aria-label="Reddit offer feedback group">
      <h2 className="text-lg font-semibold">Reddit coupon users</h2>
      <p className="mt-2 text-sm">
        REDDITMONTH: claim by December 1, 2026, 11:59 p.m. Mountain Time. One month, no card or
        auto-renewal. Feedback email permission is separate from marketing permission. Use Users →
        Customer email to prepare and review feedback requests; existing unsubscribe rules still
        apply.
      </p>
      <label className="mt-3 flex gap-2">
        <input
          type="checkbox"
          checked={onlyConsent}
          onChange={(e) => setOnlyConsent(e.target.checked)}
        />
        Show people who agreed to feedback emails
      </label>
      <button className={ownerButton} onClick={r.refresh} disabled={r.busy}>
        Refresh permissions
      </button>
      {r.error && <p role="alert">{r.error}</p>}
      {r.loading && <p role="status">Loading coupon users…</p>}
      <ul className="mt-3 grid gap-3">
        {r.data?.redemptions
          ?.filter((e) => !onlyConsent || e.feedback_email_consent)
          .map((e) => (
            <li key={e.user_id} className="rounded-lg border p-3">
              <p>
                {e.contact?.name ?? "Account"} — {e.contact?.email ?? "No CRM email available"}
              </p>
              <p className="text-sm">
                Feedback email: {e.feedback_email_consent ? "Agreed" : "Not agreed"}; expires{" "}
                {new Date(e.expires_at).toLocaleDateString()}
              </p>
              <p className="text-sm">Account: {e.user_id}</p>
              {e.rewarded_at ? (
                <p className="text-sm">Two-month feedback reward already approved.</p>
              ) : emailReview === e.user_id ? (
                <div className="mt-3 grid gap-2">
                  <label>
                    Summary of the thoughtful feedback received by email
                    <textarea
                      className="block w-full rounded-lg border bg-background p-2"
                      value={summary}
                      onChange={(event) => setSummary(event.target.value)}
                      minLength={10}
                      maxLength={1000}
                    />
                  </label>
                  <button
                    className={ownerButton}
                    disabled={r.busy || summary.trim().length < 10}
                    onClick={async () => {
                      try {
                        const result = await r.run<{ notice: string }>({
                          userId: e.user_id,
                          feedbackSummary: summary,
                          confirm: true,
                        });
                        if (result) {
                          setRewardNotice(result.notice);
                          setEmailReview(null);
                          setSummary("");
                        }
                      } catch (error) {
                        setRewardNotice(
                          error instanceof Error
                            ? error.message
                            : "Reward not confirmed. Refresh before retrying.",
                        );
                      }
                    }}
                  >
                    Confirm two-month reward for emailed feedback
                  </button>
                  <button className={ownerButton} onClick={() => setEmailReview(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className={ownerButton}
                  disabled={r.busy}
                  onClick={() => {
                    setEmailReview(e.user_id);
                    setSummary("");
                  }}
                >
                  Review emailed feedback for reward
                </button>
              )}
            </li>
          ))}
      </ul>
      <div className="mt-3 flex gap-3">
        <button
          className={ownerButton}
          disabled={page === 0 || r.loading}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </button>
        <span>Page {page + 1}</span>
        <button
          className={ownerButton}
          disabled={!r.data?.hasMore || r.loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
      <h3 className="mt-6 font-semibold">Latest product feedback</h3>
      <p className="text-sm">
        Approve thoughtful, specific feedback for a two-month reward. Critical feedback qualifies.
        One reward per Reddit coupon user; approval is manual.
      </p>
      {rewardNotice && <p role="status">{rewardNotice}</p>}
      <ul className="grid gap-3">
        {r.data?.feedback?.map((f) => (
          <li key={f.id} className="rounded-lg border p-3">
            <p>
              {f.category} · {new Date(f.created_at).toLocaleDateString()}
            </p>
            <p className="whitespace-pre-wrap">{f.message}</p>
            <p className="text-sm">Account: {f.user_id}</p>
            {approve === f.id ? (
              <div className="mt-3 grid gap-2">
                <p>
                  Confirm this is thoughtful, specific feedback. This adds two months after the
                  later of the current expiry and today; paid billing stays unchanged.
                </p>
                <button
                  className={ownerButton}
                  disabled={r.busy}
                  onClick={async () => {
                    try {
                      const result = await r.run<{ notice: string }>({
                        feedbackId: f.id,
                        confirm: true,
                      });
                      if (result) {
                        setRewardNotice(result.notice);
                        setApprove(null);
                      }
                    } catch (e) {
                      setRewardNotice(
                        e instanceof Error
                          ? e.message
                          : "Reward not confirmed. Refresh before retrying.",
                      );
                    }
                  }}
                >
                  Confirm two-month reward
                </button>
                <button className={ownerButton} onClick={() => setApprove(null)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button className={ownerButton} disabled={r.busy} onClick={() => setApprove(f.id)}>
                Review for two-month reward
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
