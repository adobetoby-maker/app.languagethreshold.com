import { supabase } from "@/integrations/supabase/client";

export type SpeakingRequestOwner = { userId: string; isCurrent: () => boolean };

export async function speakingRequestHeaders(owner?: SpeakingRequestOwner, signal?: AbortSignal) {
  requireCurrent(signal, owner?.isCurrent);
  if (owner && !owner.userId) throw new DOMException("Cancelled", "AbortError");
  const { data } = await supabase.auth.getSession();
  requireCurrent(signal, owner?.isCurrent);
  const token = data.session?.access_token;
  if (!token || (owner && data.session?.user?.id !== owner.userId))
    throw new Error("Sign in to use AI speaking practice.");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function requireCurrent(signal?: AbortSignal, current?: () => boolean) {
  if (signal?.aborted || (current && !current())) throw new DOMException("Cancelled", "AbortError");
}

export async function getSpeakingAgeAttestation(
  signal?: AbortSignal,
  owner?: SpeakingRequestOwner,
) {
  const current = owner?.isCurrent;
  requireCurrent(signal, current);
  const headers = await speakingRequestHeaders(owner, signal);
  requireCurrent(signal, current);
  const response = await fetch("/api/speaking-consent", {
    method: "GET",
    headers,
    cache: "no-store",
    signal,
  });
  requireCurrent(signal, current);
  if (!response.ok) throw new Error("The account age self-attestation could not be loaded.");
  const data = (await response.json()) as { attested: boolean };
  requireCurrent(signal, current);
  return data.attested;
}

export async function saveSpeakingAgeAttestation(
  attested: boolean,
  signal?: AbortSignal,
  current?: () => boolean,
  owner?: SpeakingRequestOwner,
) {
  const active = () => (!current || current()) && (!owner || owner.isCurrent());
  requireCurrent(signal, active);
  const headers = await speakingRequestHeaders(owner, signal);
  requireCurrent(signal, active);
  const response = await fetch("/api/speaking-consent", {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify({ attested }),
  });
  requireCurrent(signal, active);
  if (!response.ok) throw new Error("The account age self-attestation could not be saved.");
  const data = (await response.json()) as { attested: boolean };
  requireCurrent(signal, active);
  return data.attested;
}
