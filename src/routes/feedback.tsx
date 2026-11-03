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
function Feedback() {
  const { user } = useAuth();
  const r = useOwnerResource("/api/product-feedback", false);
  const [category, setCategory] = useState("experience");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const id = useRef<string | null>(null);
  useEffect(() => {
    setMessage("");
    setNotice("");
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
              const out = await r.run<{ notice: string }>({ id: id.current, category, message });
              if (out) {
                setNotice(out.notice);
                setMessage("");
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
          <label>
            Your feedback
            <textarea
              required
              minLength={10}
              maxLength={4000}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                id.current = null;
              }}
              rows={7}
              className="block w-full rounded-lg border bg-background p-3"
            />
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
      <Link to="/reddit" className="underline">
        Reddit offer and feedback email preference
      </Link>
      <Link to="/support" className="underline">
        Need account or billing help?
      </Link>
    </main>
  );
}
