import { learningResetKey } from "./learning-reset-epoch.ts";
import { clearLibraryDeviceForUser } from "./library-device";
import { discardPrivateLearningDrafts } from "./private-draft-discard";
import { profileSnapshotKey } from "./profile-device-snapshot";
import { clearSpeechForUser } from "./assessments/speech-device";

export interface ResetStorage {
  length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
/** Only this account's owned learning stores. Never clear all site data or other accounts. */
export function resetLearningDevice(
  storage: ResetStorage,
  actor: string,
  resetId: string,
  profile: object,
) {
  storage.setItem(learningResetKey(actor), resetId);
  const suffix = `.user.${encodeURIComponent(actor)}`;
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith("lt.learner-device.v1.") && key.endsWith(suffix)) keys.push(key);
  }
  for (const key of keys) storage.removeItem(key);
  if (!clearLibraryDeviceForUser(storage, actor) || !discardPrivateLearningDrafts(storage, actor))
    throw Error(
      "Cloud data was reset, but this browser could not finish clearing its saved data. Retry before continuing.",
    );
  clearSpeechForUser(actor);
  storage.setItem(
    profileSnapshotKey(actor),
    JSON.stringify({ schema: 1, userId: actor, data: profile }),
  );
}
