/** Device progress is account-bound. This is never server authorization. */
interface SnapshotStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export function profileSnapshotKey(userId: string | null) {
  return userId === null
    ? "lt.profile-device.v1.guest"
    : `lt.profile-device.v1.user.${encodeURIComponent(userId)}`;
}
function decode<T extends object>(raw: string, userId: string | null): T | null {
  if (!raw || raw.length > 8 * 1024 * 1024) return null;
  const value = JSON.parse(raw);
  if (
    value?.schema !== 1 ||
    value.userId !== userId ||
    !value.data ||
    typeof value.data !== "object" ||
    Array.isArray(value.data)
  )
    return null;
  return value.data as T;
}
export function inspectProfileSnapshot<T extends object>(
  storage: SnapshotStorage | null,
  userId: string | null,
): { status: "absent" } | { status: "unreadable" } | { status: "ready"; data: T } {
  try {
    if (!storage) return { status: "unreadable" };
    const raw = storage.getItem(profileSnapshotKey(userId));
    if (raw === null) return { status: "absent" };
    const data = decode<T>(raw, userId);
    return data ? { status: "ready", data } : { status: "unreadable" };
  } catch {
    return { status: "unreadable" };
  }
}
export function readProfileSnapshot<T extends object>(
  storage: SnapshotStorage | null,
  userId: string | null,
): T | null {
  const result = inspectProfileSnapshot<T>(storage, userId);
  return result.status === "ready" ? result.data : null;
}
export function saveProfileSnapshot(
  storage: SnapshotStorage | null,
  userId: string | null,
  data: object,
) {
  try {
    if (!storage) return false;
    // Startup defaults and later cloud restores must not erase a rejected device envelope.
    if (inspectProfileSnapshot(storage, userId).status === "unreadable") return false;
    const raw = JSON.stringify({ schema: 1, userId, data });
    if (!decode(raw, userId)) return false;
    storage.setItem(profileSnapshotKey(userId), raw);
    return true;
  } catch {
    return false;
  }
}
export function hasUnassignedProfileSnapshot(storage: SnapshotStorage | null) {
  try {
    return (
      !!storage && ["lt.app.v2", "lt.app.v1", "lt.app"].some((key) => storage.getItem(key) !== null)
    );
  } catch {
    return false;
  }
}
