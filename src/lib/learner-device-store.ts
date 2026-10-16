/** Local practice data is owned by an account (or guest), never inferred from a legacy key. */
export interface LearnerStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export function learnerDeviceKey(kind: string, actor: string | null) {
  return `lt.learner-device.v1.${encodeURIComponent(kind)}.${actor === null ? "guest" : `user.${encodeURIComponent(actor)}`}`;
}
export function createLearnerDeviceStore({
  kind,
  actor,
  storage,
  isCurrent,
}: {
  kind: string;
  actor: string | null;
  storage: LearnerStorage | null;
  isCurrent: () => boolean;
}) {
  const key = learnerDeviceKey(kind, actor);
  return {
    read(): unknown {
      if (!isCurrent()) return null;
      try {
        const raw = storage?.getItem(key);
        if (!raw || raw.length > 8 * 1024 * 1024) return null;
        const value = JSON.parse(raw);
        if (value?.schema !== 1 || value.actor !== actor || value.kind !== kind) return null;
        return value.data ?? null;
      } catch {
        return null;
      }
    },
    write(data: unknown) {
      if (!storage || !isCurrent()) return false;
      try {
        const raw = JSON.stringify({ schema: 1, actor, kind, data });
        if (raw.length > 8 * 1024 * 1024) return false;
        storage.setItem(key, raw);
        return true;
      } catch {
        return false;
      }
    },
  };
}
