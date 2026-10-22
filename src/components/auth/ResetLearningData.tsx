import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/auth-state";
import { resetLearningDevice } from "@/lib/learning-reset";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const resetButtonStyle = { backgroundColor: "#dc2626", color: "#ffffff", minHeight: 48 };

export function ResetLearningData() {
  const { user, isCurrentUser } = useAuth();
  const resetRequest = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cloudResult, setCloudResult] = useState<{ resetId: string; profile: object } | null>(null);
  if (!user) return null;
  async function reset() {
    if (!user || confirmation !== "RESET" || busy) return;
    const actor = user.id;
    setBusy(true);
    setError("");
    try {
      if (!isCurrentUser(actor))
        throw Error("Your account changed. Close this dialog and try again.");
      let result = cloudResult;
      if (!result) {
        const rpc = supabase.rpc.bind(supabase) as unknown as (
          name: string,
          args: { confirmation: string; request_id: string },
        ) => PromiseLike<{ data: unknown; error: unknown }>;
        resetRequest.current ??= crypto.randomUUID();
        const response = await rpc("reset_my_learning_data", {
          confirmation,
          request_id: resetRequest.current,
        });
        if (response.error)
          throw Error("The cloud reset could not be confirmed. Reconnect and try again.");
        const value = response.data as { resetId?: unknown; profile?: unknown } | null;
        if (
          typeof value?.resetId !== "string" ||
          !value.profile ||
          typeof value.profile !== "object" ||
          Array.isArray(value.profile) ||
          (value.profile as Record<string, unknown>).learningResetId !== value.resetId
        )
          throw Error("The reset response was incomplete. Try again.");
        result = { resetId: value.resetId, profile: value.profile };
        setCloudResult(result);
      }
      if (!isCurrentUser(actor))
        throw Error(
          "Cloud reset finished for the original account. Sign back into it to finish clearing its device data.",
        );
      try {
        resetLearningDevice(window.localStorage, actor, result.resetId, result.profile);
      } catch {
        throw Error(
          "Cloud data was reset, but this browser could not finish clearing its saved data. Allow site storage or free device space, then finish clearing this browser.",
        );
      }
      window.location.replace("/");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Reset failed. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mb-4 rounded-2xl border border-red-500/50 bg-red-500/5 p-5">
      <h2 className="text-sm font-semibold text-foreground">Start over</h2>
      <p className="my-3 text-sm text-muted-foreground">
        Delete this account’s learning progress and saved materials. Your account, subscription,
        purchases, family accounts, and official exam/team records stay.
      </p>
      <button
        type="button"
        onClick={() => {
          setConfirmation("");
          setError("");
          setOpen(true);
        }}
        style={resetButtonStyle}
        className="min-h-12 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700"
      >
        Delete all progress and start over
      </button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent
          className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (busy) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Delete your learning data?</DialogTitle>
            <DialogDescription>
              This cannot be undone. This resets every language and module for the signed-in
              account.
            </DialogDescription>
          </DialogHeader>
          <p className="break-all text-sm font-semibold">{user.email}</p>
          <ul className="list-disc space-y-2 pl-5 text-sm">
            <li>Lesson progress, mastery, XP, streaks, achievements and game scores</li>
            <li>Saved vocabulary, cards and review schedules</li>
            <li>Reader books, notes, highlights, Tutor conversations and speaking history</li>
            <li>Unsubmitted practice drafts on this browser</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Your account and paid access stay. Official exam records, team records and other family
            members are not deleted. Cloud data is reset online; other devices clear old learning
            saves when they reconnect in the updated app.
          </p>
          <label className="text-sm font-medium" htmlFor="learning-reset-confirm">
            Type RESET to confirm
          </label>
          <input
            id="learning-reset-confirm"
            autoComplete="off"
            value={confirmation}
            disabled={busy}
            onChange={(event) => setConfirmation(event.target.value)}
            className="min-h-12 rounded-lg border border-border bg-background px-3 text-foreground"
          />
          {error && (
            <p role="alert" className="text-sm text-red-500">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
              className="min-h-12 rounded-xl border border-border px-4 py-3 text-sm"
            >
              {cloudResult ? "Close" : "Keep my progress"}
            </button>
            <button
              type="button"
              disabled={busy || confirmation !== "RESET"}
              onClick={() => void reset()}
              style={resetButtonStyle}
              className="min-h-12 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-40"
            >
              {busy
                ? "Resetting…"
                : cloudResult
                  ? "Finish clearing this browser"
                  : "Permanently delete learning data"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
