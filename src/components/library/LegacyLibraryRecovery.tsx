import { useState } from "react";
import { useAuth } from "@/state/auth-state";
import { useLibrary } from "@/state/library-state";
import { inspectLegacyLibrary } from "@/lib/legacy-library";

export function LegacyLibraryRecovery() {
  const { user } = useAuth();
  const { recoverOlderLibrary } = useLibrary();
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const inspect = () => {
    try {
      return inspectLegacyLibrary(window.localStorage, user?.id ?? null);
    } catch {
      return { status: "unreadable", count: 0 };
    }
  };
  const [summary, setSummary] = useState<ReturnType<typeof inspect>>(inspect);
  function recover() {
    try {
      const count = recoverOlderLibrary(confirmed);
      setResult(
        count
          ? `${count} older text${count === 1 ? " is" : "s are"} saved in your library on this device, queued to sync.`
          : "These texts are already recovered or were removed from this account’s library. No duplicate copies were added.",
      );
      setError("");
      setOpen(false);
      setConfirmed(false);
    } catch (cause) {
      setError(
        cause instanceof Error && cause.name !== "ZodError"
          ? cause.message
          : "These saves could not be read safely. Originals remain untouched.",
      );
    }
  }
  return (
    <div className="mt-2 space-y-3">
      <p>An older library save is on this device. Recover only texts you know belong to you.</p>
      {!open && (
        <button
          type="button"
          className="min-h-11 rounded-lg border border-border px-3"
          onClick={() => {
            setSummary(inspect());
            setOpen(true);
            setError("");
            setResult("");
          }}
        >
          Recover older texts
        </button>
      )}
      {open && (
        <section
          aria-label="Recover older Reader texts"
          className="space-y-3 rounded-lg border border-border p-3"
        >
          {!user ? (
            <p>Sign in to recover older texts into your account.</p>
          ) : summary.status === "other-account" ? (
            <p>
              These texts are associated with another account. Sign in to that account to recover
              them.
            </p>
          ) : summary.status === "unreadable" ? (
            <p>The older library could not be checked safely. Originals remain untouched.</p>
          ) : !summary.count ? (
            <p>No compatible older texts were found.</p>
          ) : (
            <>
              <p>
                Recover {summary.count} text{summary.count === 1 ? "" : "s"} into{" "}
                <strong className="break-words">{user.email ?? "your signed-in account"}</strong>.
              </p>
              <p>
                Copies save on this device first and sync to your account when connected. Originals
                remain untouched. Reading status and notes are not imported here.
              </p>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="mt-1"
                />
                <span>I recognize these texts as mine and want to copy them to this account.</span>
              </label>
              <button
                type="button"
                disabled={!confirmed}
                onClick={recover}
                className="min-h-11 rounded-lg border border-border px-3 disabled:opacity-50"
              >
                Copy older texts to my library
              </button>
            </>
          )}
          <button
            type="button"
            className="block min-h-11 rounded-lg border border-border px-3"
            onClick={() => {
              setOpen(false);
              setConfirmed(false);
              setError("");
            }}
          >
            Leave originals untouched
          </button>
        </section>
      )}
      {result && <p role="status">{result}</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
