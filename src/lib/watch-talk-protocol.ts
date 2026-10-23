/** No account identifiers or credentials are sent to the Watch. Each mission gets a new capability. */
export interface WatchTranscript {
  contextId: string;
  requestId: string;
  text: string;
  createdAt: number;
}
export function validWatchTranscript(
  value: unknown,
  contextId: string,
  now: number,
): value is WatchTranscript {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<WatchTranscript>;
  return (
    v.contextId === contextId &&
    typeof v.requestId === "string" &&
    /^[a-f0-9-]{36}$/i.test(v.requestId) &&
    typeof v.text === "string" &&
    v.text.trim().length > 0 &&
    v.text.length <= 2000 &&
    typeof v.createdAt === "number" &&
    Number.isFinite(v.createdAt) &&
    v.createdAt <= now + 5000 &&
    now - v.createdAt <= 60000
  );
}

export function claimWatchTranscript(
  value: unknown,
  contextId: string,
  now: number,
  seen: Set<string>,
): string | null {
  if (!validWatchTranscript(value, contextId, now) || seen.has(value.requestId)) return null;
  seen.add(value.requestId);
  if (seen.size > 64) seen.delete(seen.values().next().value!);
  return value.text.trim();
}
