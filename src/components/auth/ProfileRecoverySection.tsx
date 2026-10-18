import { useEffect, useState } from "react";
import { LANGUAGES, type Language } from "@/data/languages";
import { useAuth } from "@/state/auth-state";
import { useProfileRecovery } from "@/state/profile-recovery-context";
import {
  PROFILE_RECOVERY_CATEGORIES,
  inspectLegacyProfile,
  type ProfileRecoveryKind,
} from "@/lib/legacy-profile-recovery";

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function ProfileRecoverySection({ open }: { open: boolean }) {
  const { user } = useAuth();
  const profile = useProfileRecovery();
  const [items, setItems] = useState<ReturnType<typeof inspectLegacyProfile>>([]);
  const [kind, setKind] = useState<ProfileRecoveryKind | null>(null);
  const [language, setLanguage] = useState<Language | "">("");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const actor = user?.id;
  const hasProfile = profile !== null;
  useEffect(() => {
    if (!open || !actor || !hasProfile) return;
    setItems(inspectLegacyProfile(storage(), actor));
    setKind(null);
    setLanguage("");
    setConfirmed(false);
    setMessage("");
    setError("");
  }, [open, actor, hasProfile]);

  if (!actor) return null;
  if (!profile)
    return (
      <section className="space-y-2 border-t pt-4" aria-label="Profile recovery">
        <h3 className="font-semibold">Older profile saves</h3>
        <p className="text-sm">
          Open the learning app to restore profile notes, vocabulary, activity totals or older
          module history.
        </p>
        <a href="/" target="_blank" rel="noopener noreferrer" className="text-sm underline">
          Open learning app (new tab)
        </a>
      </section>
    );
  const available = items.filter((item) => item.status === "available");
  const needsLanguage = items.find((item) => item.kind === kind)?.needsLanguage ?? false;
  function recover() {
    if (!profile || !kind || !actor) return;
    setError("");
    try {
      profile.recover(kind, confirmed, language || undefined);
      setItems(inspectLegacyProfile(storage(), actor));
      setKind(null);
      setConfirmed(false);
      setMessage(
        "Saved to your profile on this browser. Normal account sync will try to save it online; this message does not confirm a cloud backup.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error && cause.name !== "ZodError"
          ? cause.message
          : "These profile saves could not be read safely. Originals remain untouched.",
      );
    }
  }
  return (
    <section className="space-y-3 border-t pt-4" aria-label="Profile recovery">
      <h3 className="font-semibold">Older profile saves</h3>
      <p className="text-sm text-muted-foreground">
        Recover one profile category into your signed-in account. Originals stay intact. Current
        matching notes, vocabulary and module records take priority; known vocabulary resets are
        kept. Activity totals use the higher value, never a sum. Missing older notes will be added.
      </p>
      <p className="text-sm text-muted-foreground">
        This does not import streaks, purchases, assignments, proficiency declarations or exam
        results. Older unlabeled module history remains an archive until you confirm its language
        pair in the learning guide.
      </p>
      {!profile.ready && (
        <p role="status" className="text-sm">
          Reconnect and finish restoring your current account profile before recovery.
        </p>
      )}
      {available.length ? (
        <>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold">Choose one profile category</legend>
            {available.map((item) => (
              <label
                key={item.kind}
                className="flex items-center gap-3 rounded-lg border p-3 text-sm"
              >
                <input
                  type="radio"
                  name="legacy-profile-kind"
                  checked={kind === item.kind}
                  onChange={() => {
                    setKind(item.kind);
                    setLanguage("");
                    setConfirmed(false);
                    setMessage("");
                  }}
                />
                <span>
                  {PROFILE_RECOVERY_CATEGORIES[item.kind]}{" "}
                  <span className="block text-xs text-muted-foreground">
                    {item.count} saved{" "}
                    {item.kind === "activity"
                      ? "totals"
                      : item.kind === "modules"
                        ? "modules"
                        : "items"}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          {needsLanguage && (
            <label className="block text-sm">
              Language of the older unlabeled vocabulary
              <select
                className="mt-1 block w-full rounded border bg-background p-2"
                value={language}
                onChange={(event) => setLanguage(event.target.value as Language | "")}
              >
                <option value="">Choose its language</option>
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>
              I recognize this older profile as mine and want to associate this category with my
              signed-in account.
            </span>
          </label>
          <button
            className="rounded-lg bg-gold px-4 py-3 font-semibold text-background disabled:opacity-50"
            disabled={!profile.ready || !kind || !confirmed || (needsLanguage && !language)}
            onClick={recover}
          >
            Recover profile category
          </button>
        </>
      ) : (
        <p className="text-sm">
          No compatible, unassigned older profile categories are available for this account on this
          browser.
        </p>
      )}
      {items.some((item) => item.status === "other-account") && (
        <p className="text-sm text-muted-foreground">
          The older profile is already associated with another account. Sign in to that account to
          continue.
        </p>
      )}
      {items.some((item) => item.status === "unreadable") && (
        <p className="text-sm text-muted-foreground">
          Some profile saves could not be checked safely. They remain untouched.
        </p>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
