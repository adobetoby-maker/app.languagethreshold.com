import { supabase } from "@/integrations/supabase/client";

export interface TeamRequestOwner {
  userId: string;
  isCurrent: () => boolean;
  signal: AbortSignal;
}
function requireCurrent(owner?: TeamRequestOwner) {
  if (owner && (!owner.userId || owner.signal.aborted || !owner.isCurrent()))
    throw new DOMException("Team request cancelled.", "AbortError");
}
/** Compatibility entry for separately audited callers; private flows should use ownedTeamRequest. */
export function teamRequest<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, body);
}
export function ownedTeamRequest<T>(
  owner: TeamRequestOwner,
  path: string,
  body?: unknown,
): Promise<T> {
  return request<T>(path, body, owner);
}
async function request<T>(path: string, body?: unknown, owner?: TeamRequestOwner): Promise<T> {
  requireCurrent(owner);
  const { data } = await supabase.auth.getSession();
  requireCurrent(owner);
  if (!data.session?.access_token || (owner && data.session.user.id !== owner.userId))
    throw new Error("Sign in to use your team workspace.");
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
    signal: owner?.signal,
  });
  requireCurrent(owner);
  const result = (await response.json()) as T & { error?: string };
  requireCurrent(owner);
  if (!response.ok || result.error) throw new Error(result.error ?? "Request failed.");
  return result;
}
