import { useState } from "react";
import { useAuth } from "@/state/auth-state";
import { useOwnerResource } from "./use-owner-resource";
import { ConfirmAction, OwnerMessage, ownerField } from "./owner-ui";
import { isDisabled } from "@/lib/owner-directory";
import type { OwnerDirectory, OwnerUser, OwnerUserResult } from "@/lib/owner-users";

/**
 * Disable / re-enable, confirmation email, email and name changes for one account. Every action
 * has an explicit confirm step; the server re-checks owner access, self/owner protection and the
 * typed confirmation. Passwords are never shown or set here (use the password invitation).
 */
export function OwnerAccountControls({
  account,
  onChanged,
}: {
  account: OwnerUser;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const actions = useOwnerResource<OwnerDirectory>("/api/owner-users", false);
  const [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [reason, setReason] = useState(""),
    [newEmail, setNewEmail] = useState(""),
    [markConfirmed, setMarkConfirmed] = useState(true),
    [name, setName] = useState(account.displayName ?? "");
  if (!actions.allowed) return null;
  const email = account.email ?? "";
  const disabled = isDisabled(account);
  if (user?.id === account.id)
    return (
      <p className="mt-4 rounded-lg border border-border p-3 text-sm text-muted-foreground">
        This is your own account. Account controls are not available for it here.
      </p>
    );
  async function act(body: Record<string, unknown>) {
    setNotice("");
    setError("");
    try {
      const result = await actions.run<OwnerUserResult>({ userId: account.id, ...body });
      if (result) {
        setNotice(result.notice);
        onChanged();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not confirm this change. Refresh first.");
    }
  }
  const busy = actions.busy;
  return (
    <section
      className="mt-5 border-t border-border pt-4"
      aria-labelledby={`controls-${account.id}`}
    >
      <h4 id={`controls-${account.id}`} className="font-semibold">
        Account controls
      </h4>
      <p className="mt-1 text-sm text-muted-foreground">
        Status:{" "}
        <strong>
          {disabled
            ? "Disabled"
            : account.confirmed
              ? "Active, email confirmed"
              : "Active, email not confirmed"}
        </strong>
        . Every change is recorded in Activity.
      </p>
      <OwnerMessage error={error} notice={notice} />
      <div className="mt-3 flex flex-wrap gap-2">
        {disabled ? (
          <ConfirmAction
            label="Re-enable account"
            disabled={busy}
            description={`${email} will be able to sign in again.`}
            onConfirm={() => act({ action: "enable" })}
          />
        ) : (
          <ConfirmAction
            label="Disable account"
            destructive
            disabled={busy}
            canConfirm={reason.trim().length >= 3}
            phrase={email}
            phraseLabel="Type the account email"
            description="Blocks sign-in and signs the account out everywhere. Data, subscriptions and team seats are kept. You can re-enable it later."
            onConfirm={(typed) => act({ action: "disable", confirmEmail: typed, reason })}
          >
            <label className="mt-3 block">
              Reason (kept in the activity log)
              <input
                className={ownerField + " mt-1"}
                value={reason}
                minLength={3}
                maxLength={500}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          </ConfirmAction>
        )}
        {!account.confirmed && (
          <>
            <ConfirmAction
              label="Resend confirmation email"
              disabled={busy}
              description={`Sends the sign-up confirmation email to ${email} again. Limited to one per minute.`}
              onConfirm={() =>
                act({ action: "resend_confirmation", requestId: crypto.randomUUID() })
              }
            />
            <ConfirmAction
              label="Mark email confirmed"
              disabled={busy}
              description={`Marks ${email} as confirmed without an email. Use only when you know the person owns this address.`}
              onConfirm={() => act({ action: "force_confirm" })}
            />
          </>
        )}
      </div>
      <div className="mt-3 grid justify-items-start gap-3 lg:grid-cols-2">
        <ConfirmAction
          label="Change email"
          destructive
          disabled={busy}
          canConfirm={newEmail.includes("@")}
          phrase={newEmail.trim()}
          phraseLabel="Type the new email again"
          description="The person signs in with the new address from now on. The old address stops working."
          onConfirm={(typed) =>
            act({ action: "change_email", email: newEmail, confirmEmail: typed, markConfirmed })
          }
        >
          <label className="mt-3 block">
            New email
            <input
              type="email"
              className={ownerField + " mt-1"}
              value={newEmail}
              maxLength={254}
              autoComplete="off"
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </label>
          <label className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={markConfirmed}
              onChange={(e) => setMarkConfirmed(e.target.checked)}
            />
            Mark the new address as confirmed
          </label>
          {!markConfirmed && (
            <p className="mt-1 text-xs text-muted-foreground">
              The confirmation status stays as it is now; use Resend confirmation if needed.
            </p>
          )}
        </ConfirmAction>
        <ConfirmAction
          label="Change display name"
          disabled={busy}
          canConfirm={!!name.trim()}
          description="Updates the name shown for this account. Company team names are unchanged."
          onConfirm={() => act({ action: "change_name", name })}
        >
          <label className="mt-3 block">
            Display name
            <input
              className={ownerField + " mt-1"}
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        </ConfirmAction>
      </div>
    </section>
  );
}
