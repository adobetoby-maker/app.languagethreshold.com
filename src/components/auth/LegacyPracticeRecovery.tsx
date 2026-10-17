import { useEffect, useState } from "react";
import { useAuth } from "@/state/auth-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LEGACY_PRACTICE,
  inspectLegacyPractice,
  recoverLegacyPractice,
  type LegacyPracticeKind,
} from "@/lib/legacy-practice-recovery";

function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function LegacyPracticeRecovery({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user, canUseReader } = useAuth();
  const [items, setItems] = useState<ReturnType<typeof inspectLegacyPractice>>([]);
  const [kind, setKind] = useState<LegacyPracticeKind | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open || !user) return;
    setItems(inspectLegacyPractice(browserStorage(), user.id));
    setKind(null);
    setConfirmed(false);
    setError("");
  }, [open, user]);
  if (!user) return null;
  const available = items.filter((item) => item.status === "available");
  function recover() {
    if (!user || !kind) return;
    try {
      recoverLegacyPractice({
        storage: browserStorage(),
        actor: user.id,
        kind,
        confirmed,
        isCurrent: () => canUseReader(user.id),
      });
      // Recreate all providers from the merged device record before any new practice begins.
      window.location.reload();
    } catch (cause) {
      setError(
        cause instanceof Error && cause.name !== "ZodError"
          ? cause.message
          : "These saves could not be read safely. Your original saves remain intact.",
      );
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recover older saves</DialogTitle>
          <DialogDescription>
            Older app versions saved practice on this browser without an account label. Recover only
            saves you know belong to you. On a shared device, leave another learner’s saves
            untouched.
          </DialogDescription>
        </DialogHeader>
        <p className="break-words text-sm">
          Recover into: <strong>{user.email ?? "your signed-in account"}</strong>
        </p>
        {available.length > 0 ? (
          <>
            <fieldset className="space-y-3">
              <legend className="mb-2 text-sm font-semibold">Choose one category</legend>
              {available.map((item) => (
                <label
                  key={item.kind}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm"
                >
                  <input
                    type="radio"
                    name="legacy-practice-kind"
                    value={item.kind}
                    checked={kind === item.kind}
                    onChange={() => setKind(item.kind)}
                  />
                  <span>
                    {LEGACY_PRACTICE[item.kind].label}
                    <span className="block text-xs text-muted-foreground">
                      {item.count} saved {item.count === 1 ? "item" : "items"}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
            <p className="text-sm text-muted-foreground">
              Your current saves take priority when the same item appears twice. Recovery keeps the
              originals and reloads this page. These saves remain on this browser; this does not
              create a cloud backup.
            </p>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="mt-1"
              />
              <span>
                I recognize these as my saves and want to associate this category with my account on
                this device.
              </span>
            </label>
            <button
              className="rounded-lg bg-gold px-4 py-3 font-semibold text-background disabled:opacity-50"
              disabled={!kind || !confirmed}
              onClick={recover}
            >
              Recover and reload
            </button>
          </>
        ) : (
          <p className="text-sm">
            No compatible, unassigned older practice saves are available for this account on this
            browser.
          </p>
        )}
        {items.some((item) => item.status === "other-account") && (
          <p className="text-sm text-muted-foreground">
            Some older saves are already associated with another account. Sign in to that account to
            recover them.
          </p>
        )}
        {items.some((item) => item.status === "unreadable") && (
          <p className="text-sm text-muted-foreground">
            Some saves could not be checked safely. They remain untouched.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <button className="rounded-lg border px-4 py-3 text-sm" onClick={() => onOpenChange(false)}>
          Leave saves untouched
        </button>
      </DialogContent>
    </Dialog>
  );
}
