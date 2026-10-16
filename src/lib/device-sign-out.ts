import {
  pendingLibraryChanges,
  clearLibraryDeviceForUser,
  type LibraryStorage,
} from "./library-device.ts";

/** Coordinates the actual SDK sign-out with explicit loss approval and owned Reader cleanup. */
export async function signOutWithDeviceSafety({
  actor,
  scope,
  storage,
  examPending,
  lessonPending = false,
  confirmDiscard,
  signOut,
  onExamDiscardApproved,
  clearExamDrafts,
}: {
  actor: string | null;
  scope?: "global" | "local" | "others";
  storage: LibraryStorage | null;
  examPending: boolean;
  lessonPending?: boolean;
  confirmDiscard: (message: string) => boolean;
  signOut: () => Promise<{ error?: unknown }>;
  onExamDiscardApproved: () => void;
  clearExamDrafts: () => void;
}) {
  const local = !!actor && scope !== "others";
  const reader = local ? pendingLibraryChanges(storage, actor!) : { count: 0, unreadable: false };
  if (local && (examPending || lessonPending || reader.count || reader.unreadable)) {
    const items = [
      examPending ? "exam answers or recordings" : "",
      lessonPending ? "lesson drafts" : "",
      reader.count ? "Reader texts or library changes" : "",
    ]
      .filter(Boolean)
      .join(" and ");
    const message = [
      items
        ? `Some ${items} have not synced.`
        : "This browser could not check for unsynced Reader changes.",
      reader.unreadable && items ? "Unsynced Reader changes could not be checked." : "",
      "Signing out clears this account’s Reader cache and discards unsynced Reader, lesson or exam work on this device. Cloud-saved work remains in your account. Cancel and sync first, or sign out and discard the device-only work.",
    ]
      .filter(Boolean)
      .join(" ");
    if (!confirmDiscard(message))
      return { signedOut: false, cancelled: true, cleanupComplete: false };
    if (examPending) onExamDiscardApproved();
  }
  try {
    const { error } = await signOut();
    if (error) return { signedOut: false, cancelled: false, cleanupComplete: false };
  } catch {
    return { signedOut: false, cancelled: false, cleanupComplete: false };
  }
  if (!local) return { signedOut: true, cancelled: false, cleanupComplete: true };
  let examsCleared = true;
  try {
    clearExamDrafts();
  } catch {
    examsCleared = false;
  }
  const readerCleared = clearLibraryDeviceForUser(storage, actor!);
  return {
    signedOut: true,
    cancelled: false,
    cleanupComplete: readerCleared && examsCleared,
  };
}
