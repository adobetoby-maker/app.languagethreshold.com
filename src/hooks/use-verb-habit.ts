import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useApp } from "@/state/app-state";
import { useAuth } from "@/state/auth-state";
import { readVerbHabit, type VerbHabit } from "@/lib/verb-habit";
const EVENT = "lt:verb-habit-changed",
  memory = new Map<string, string>();
function read(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}
function write(key: string, value: string) {
  memory.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {
    /* local progress still works in memory */
  }
  window.dispatchEvent(new Event(EVENT));
}
function subscribe(fn: () => void) {
  window.addEventListener(EVENT, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener("storage", fn);
  };
}
export function useVerbHabit() {
  const { state } = useApp(),
    { user } = useAuth();
  const identity = `${user?.id ?? "guest"}:${state.learningResetId ?? ""}`;
  const key = `lt.verb-habit.v1:${identity}:${state.selectedLanguage}:${state.nativeLanguage}`,
    preference = `lt.verb-reminder.v1:${identity}`;
  const raw = useSyncExternalStore(
      subscribe,
      () => read(key),
      () => null,
    ),
    setting = useSyncExternalStore(
      subscribe,
      () => read(preference),
      () => null,
    );
  const habit = useMemo(() => readVerbHabit(raw), [raw]);
  const update = useCallback(
    (change: (data: VerbHabit) => VerbHabit) =>
      write(key, JSON.stringify(change(readVerbHabit(read(key))))),
    [key],
  );
  return {
    habit,
    enabled: setting !== "off",
    setEnabled: (value: boolean) => write(preference, value ? "on" : "off"),
    update,
    key,
  };
}
