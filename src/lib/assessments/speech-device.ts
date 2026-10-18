import type { SpeechMime } from "./speech.ts";
export interface SpeechDeviceTake {
  blob: Blob;
  mime: SpeechMime;
  durationMs: number;
  policyVersion: string;
  upload?: { requestId: string; revision: number };
}
type Entry = { userId: string; attemptId: string; itemId: string; take: SpeechDeviceTake };
const takes = new Map<string, Entry>();
const captures = new Map<string, { userId: string; attemptId: string; cancel: () => void }>();
const listeners = new Set<() => void>();
let guarding = false;
const keyFor = (user: string, attempt: string, item: string) =>
  JSON.stringify([user, attempt, item]);
function warn(event: BeforeUnloadEvent) {
  if (takes.size || captures.size) {
    event.preventDefault();
    event.returnValue = "";
  }
}
function changed() {
  if (typeof window !== "undefined") {
    const needed = Boolean(takes.size || captures.size);
    if (needed && !guarding) window.addEventListener("beforeunload", warn);
    if (!needed && guarding) window.removeEventListener("beforeunload", warn);
    guarding = needed;
  }
  for (const listener of listeners) listener();
}
export function subscribeSpeechDrafts(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function readSpeechTake(user: string, attempt: string, item: string) {
  return takes.get(keyFor(user, attempt, item))?.take;
}
/** Memory only: never localStorage, IndexedDB, a service worker, analytics or offline packs. */
export function saveSpeechTake(
  userId: string,
  attemptId: string,
  itemId: string,
  take: SpeechDeviceTake,
) {
  takes.set(keyFor(userId, attemptId, itemId), { userId, attemptId, itemId, take });
  changed();
}
export function clearSpeechTake(user: string, attempt: string, item: string) {
  takes.delete(keyFor(user, attempt, item));
  changed();
}
export function registerSpeechCapture(
  userId: string,
  attemptId: string,
  item: string,
  cancel: () => void,
) {
  const key = keyFor(userId, attemptId, item);
  const entry = { userId, attemptId, cancel };
  captures.set(key, entry);
  changed();
  return () => {
    if (captures.get(key) === entry) captures.delete(key);
    changed();
  };
}
/** A delayed recorder must not replace a newer capture/take for the same question. */
export function isSpeechCaptureCurrent(
  user: string,
  attempt: string,
  item: string,
  cancel: () => void,
) {
  return captures.get(keyFor(user, attempt, item))?.cancel === cancel;
}
export function unsavedSpeechCount(userId: string, attemptId?: string) {
  const matching = (v: { userId: string; attemptId: string }) =>
    v.userId === userId && (!attemptId || v.attemptId === attemptId);
  return (
    [...takes.values()].filter(matching).length + [...captures.values()].filter(matching).length
  );
}
export function clearSpeechForUser(user: string) {
  for (const [key, entry] of takes) if (entry.userId === user) takes.delete(key);
  for (const [key, entry] of captures)
    if (entry.userId === user) {
      captures.delete(key);
      try {
        entry.cancel();
      } catch {
        // One device cleanup failure must not keep another capture or block identity loss.
      }
    }
  changed();
}
