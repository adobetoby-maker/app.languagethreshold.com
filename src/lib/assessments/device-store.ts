import type { ExamDraftStorage } from "./drafts.ts";
/** A tab-lifetime fallback when storage is blocked/full; never a server submission. */
const memory = new Map<string, { raw: string; volatile: boolean; warn: boolean }>();
let warningAttached = false;
const beforeUnload = (event: BeforeUnloadEvent) => {
  if ([...memory.values()].some((value) => value.volatile && value.warn)) {
    event.preventDefault();
    event.returnValue = "";
  }
};
function syncWarning() {
  if (typeof window === "undefined") return;
  const needed = [...memory.values()].some((value) => value.volatile && value.warn);
  if (needed && !warningAttached) {
    window.addEventListener("beforeunload", beforeUnload);
    warningAttached = true;
  } else if (!needed && warningAttached) {
    window.removeEventListener("beforeunload", beforeUnload);
    warningAttached = false;
  }
}
export function readExamDeviceValue(storage: ExamDraftStorage | null, key: string): string | null {
  const cached = memory.get(key);
  if (cached?.volatile) return cached.raw;
  try {
    return storage?.getItem(key) ?? cached?.raw ?? null;
  } catch {
    return cached?.raw ?? null;
  }
}
export function writeExamDeviceValue(
  storage: ExamDraftStorage | null,
  key: string,
  raw: string,
  warnOnLoss: boolean,
): boolean {
  let persisted = false;
  try {
    if (storage) {
      storage.setItem(key, raw);
      persisted = true;
    }
  } catch {
    /* Retain the newest value in memory. */
  }
  memory.set(key, { raw, volatile: !persisted, warn: warnOnLoss });
  syncWarning();
  return persisted;
}
export function removeExamDeviceValue(storage: ExamDraftStorage | null, key: string) {
  memory.delete(key);
  try {
    storage?.removeItem(key);
  } catch {
    /* A blocked store must not prevent account exit. */
  }
  syncWarning();
}
export function examDeviceKeys(storage: ExamDraftStorage | null): string[] {
  const keys = new Set(memory.keys());
  try {
    if (storage)
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) keys.add(key);
      }
  } catch {
    /* Memory remains available. */
  }
  return [...keys];
}
export function isExamDeviceValueVolatile(key: string) {
  return memory.get(key)?.volatile === true;
}
