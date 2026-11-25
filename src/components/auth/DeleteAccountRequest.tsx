import { useState } from "react";
import { useAuth } from "@/state/auth-state";
import { AuthButton } from "@/components/auth/AuthButton";
import { useOwnerResource } from "@/components/owner/use-owner-resource";

function ConfirmDeletion() {
  const { user } = useAuth();
  return user ? (
    <SignedInDeletion key={user.id} email={user.email ?? ""} />
  ) : (
    <>
      <p>Sign in to verify which account you want to delete.</p>
      <AuthButton />
    </>
  );
}

function SignedInDeletion({ email }: { email: string }) {
  const request = useOwnerResource("/api/account-deletion-request", false);
  const [confirmed, setConfirmed] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);
  if (sent)
    return (
      <p role="status">
        Your deletion request was sent. Language Threshold support will email you when deletion is
        complete.
      </p>
    );
  return (
    <form
      className="grid gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!confirmed || request.busy) return;
        setError(false);
        try {
          const result = await request.run<{ accepted: boolean }>({ confirm: "delete my account" });
          if (result?.accepted) setSent(true);
          else setError(true);
        } catch {
          setError(true);
        }
      }}
    >
      <p>
        Request permanent deletion of {email} and its associated learning data. Support will confirm
        completion by email.
      </p>
      <p>
        Apple subscriptions renew separately.{" "}
        <a className="underline" href="https://apps.apple.com/account/subscriptions">
          Manage or cancel your Apple subscription
        </a>{" "}
        before continuing.
      </p>
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />{" "}
        I want to permanently delete my account and its data.
      </label>
      <button
        type="submit"
        disabled={!confirmed || request.busy}
        className="justify-self-start rounded-lg border border-border px-4 py-2 disabled:opacity-50"
      >
        {request.busy ? "Sending request…" : "Request permanent deletion"}
      </button>
      {error && <p role="alert">We could not confirm your request. Try again.</p>}
    </form>
  );
}

export function DeleteAccountRequest() {
  const [open, setOpen] = useState(false);
  return (
    <section id="delete-account" className="space-y-3">
      <button
        type="button"
        className="underline"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        Delete my account
      </button>
      {open && <ConfirmDeletion />}
    </section>
  );
}
