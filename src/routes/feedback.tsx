import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { AuthProvider, useAuth } from "@/state/auth-state";
import { AuthButton } from "@/components/auth/AuthButton";
import { useOwnerResource } from "@/components/owner/use-owner-resource";
export const Route = createFileRoute("/feedback")({
  component: () => (
    <AuthProvider>
      <Feedback />
    </AuthProvider>
  ),
});
function Rating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="font-medium">{label} (optional)</legend>
      <p className="text-sm">1 = poor, 5 = excellent</p>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className="flex min-h-12 min-w-0 cursor-pointer items-center justify-center gap-1 rounded-lg border border-border bg-background px-1"
          >
            <input
              type="radio"
              name={label}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
            />
            <span>
              {n}
              <span aria-hidden="true"> ★</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
function Feedback() {
  const { user } = useAuth();
  const r = useOwnerResource("/api/product-feedback", false);
  const [category, setCategory] = useState("experience");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [rating, setRating] = useState<number>();
  const [easeRating, setEaseRating] = useState<number>();
  const [usefulnessRating, setUsefulnessRating] = useState<number>();
  const [improvement, setImprovement] = useState("");
  const [testimonialConsent, setTestimonialConsent] = useState(false);
  const followup = useOwnerResource("/api/crm-signup", false);
  const [emailConsent, setEmailConsent] = useState(false);
  const [followupNotice, setFollowupNotice] = useState("");
  const id = useRef<string | null>(null);
  useEffect(() => {
    setMessage("");
    setNotice("");
    setRating(undefined);
    setEaseRating(undefined);
    setUsefulnessRating(undefined);
    setImprovement("");
    setTestimonialConsent(false);
    setEmailConsent(false);
    setFollowupNotice("");
    id.current = null;
  }, [user?.id]);
  return (
    <main className="mx-auto grid max-w-xl gap-5 px-5 py-12 text-foreground">
      <Link to="/" className="underline">
        Back to Language Threshold
      </Link>
      <h1 className="text-3xl font-semibold">Help us improve</h1>
      <p>What worked, what was confusing, and what would make learning easier?</p>
      <AuthButton />
      {user && (
        <form
          className="grid gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (r.busy) return;
            id.current ??= crypto.randomUUID();
            try {
              const out = await r.run<{ notice: string }>({
                id: id.current,
                category,
                message,
                rating,
                easeRating,
                usefulnessRating,
                improvement,
                testimonialConsent,
              });
              if (out) {
                setNotice(out.notice);
                setMessage("");
                setRating(undefined);
                setEaseRating(undefined);
                setUsefulnessRating(undefined);
                setImprovement("");
                setTestimonialConsent(false);
                id.current = null;
              }
            } catch (e) {
              setNotice(
                e instanceof Error
                  ? e.message
                  : "Submission not confirmed. Retry the same feedback to avoid a duplicate.",
              );
            }
          }}
        >
          <label>
            Type
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                id.current = null;
              }}
              className="block w-full rounded-lg border bg-background p-3"
            >
              <option value="experience">My experience</option>
              <option value="idea">An idea</option>
              <option value="problem">Something is broken</option>
            </select>
          </label>
          <Rating
            label="Overall experience"
            value={rating}
            onChange={(value) => {
              setRating(value);
              id.current = null;
            }}
          />
          <Rating
            label="Ease of use"
            value={easeRating}
            onChange={(value) => {
              setEaseRating(value);
              id.current = null;
            }}
          />
          <Rating
            label="Usefulness"
            value={usefulnessRating}
            onChange={(value) => {
              setUsefulnessRating(value);
              id.current = null;
            }}
          />
          <label>
            What worked, and what was confusing or broken?
            <textarea
              required
              minLength={10}
              maxLength={2500}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                id.current = null;
              }}
              rows={7}
              className="block w-full rounded-lg border bg-background p-3"
            />
          </label>
          <label>
            What one change would make this better? (optional)
            <textarea
              value={improvement}
              maxLength={750}
              rows={3}
              onChange={(e) => {
                setImprovement(e.target.value);
                id.current = null;
              }}
              className="block w-full rounded-lg border bg-background p-3"
            />
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={testimonialConsent}
              onChange={(e) => {
                setTestimonialConsent(e.target.checked);
                id.current = null;
              }}
              className="mt-1"
            />
            <span>
              You may consider my comment for a public testimonial after review. Leave unchecked to
              keep it private. My email address will not be published.
            </span>
          </label>
          <p className="text-sm">
            Saved with your account so we can understand your experience. Please omit passwords,
            payment details and patient information.
          </p>
          <button
            disabled={r.busy || message.trim().length < 10}
            className="rounded-xl bg-primary p-4 text-primary-foreground disabled:opacity-50"
          >
            {r.busy ? "Saving…" : "Send feedback"}
          </button>
        </form>
      )}
      {notice && <p role="status">{notice}</p>}
      {user && (
        <section
          className="grid gap-4 rounded-xl border border-border p-5"
          aria-labelledby="followup-title"
        >
          <h2 id="followup-title" className="text-xl font-semibold">
            Stay in touch (optional)
          </h2>
          <p>
            Get a welcome email, learning tips and requests for feedback. This is separate from
            submitting feedback. Unsubscribe using the link in any email.
          </p>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={emailConsent}
              onChange={(e) => setEmailConsent(e.target.checked)}
              className="mt-1"
            />
            <span>
              Send these emails to my account address. I understand I must confirm my subscription
              by email.
            </span>
          </label>
          <button
            type="button"
            disabled={!emailConsent || followup.busy}
            className="min-h-12 rounded-xl bg-primary p-3 text-primary-foreground disabled:opacity-50"
            onClick={async () => {
              setFollowupNotice("");
              try {
                const out = await followup.run<{ notice: string }>({ consent: true });
                if (out) {
                  setFollowupNotice(out.notice);
                  setEmailConsent(false);
                }
              } catch (e) {
                setFollowupNotice(
                  e instanceof Error
                    ? e.message
                    : "Subscription not confirmed. Check your inbox before trying again.",
                );
              }
            }}
          >
            {followup.busy ? "Requesting…" : "Request follow-up emails"}
          </button>
          {followupNotice && <p role="status">{followupNotice}</p>}
        </section>
      )}
      <Link to="/reddit" className="underline">
        Reddit offer and feedback email preference
      </Link>
      <Link to="/support" className="underline">
        Need account or billing help?
      </Link>
    </main>
  );
}
