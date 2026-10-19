import { useSyncExternalStore } from "react";
const id = "10000000-0000-4000-8000-000000000001";
let active = true;
const listeners = new Set<() => void>();
export const fixtureAuth = {
  signOut() {
    active = false;
    listeners.forEach((f) => f());
  },
};
const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
};
const current = (value: string) => active && value === id;
export function useAuth() {
  const signed = useSyncExternalStore(
    subscribe,
    () => active,
    () => active,
  );
  return {
    user: signed ? { id, email: "owner@example.invalid" } : null,
    loading: false,
    canUseReader: current,
    isCurrentUser: current,
  };
}
