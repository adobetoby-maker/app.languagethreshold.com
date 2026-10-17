import { supabase } from "@/integrations/supabase/client";

export async function speakingRequestHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in to use AI speaking practice.");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function requireCurrent(signal?: AbortSignal, current?: () => boolean) {
  if (signal?.aborted || (current && !current())) throw new DOMException("Cancelled", "AbortError");
}

export async function getSpeakingAgeAttestation(signal?: AbortSignal) {
  requireCurrent(signal);
  const headers = await speakingRequestHeaders();
  requireCurrent(signal);
  const response = await fetch("/api/speaking-consent", {
    method: "GET",
    headers,
    cache: "no-store",
    signal,
  });
  requireCurrent(signal);
  if (!response.ok) throw new Error("The account age self-attestation could not be loaded.");
  const data = (await response.json()) as { attested: boolean };
  requireCurrent(signal);
  return data.attested;
}

export async function saveSpeakingAgeAttestation(
  attested: boolean,
  signal?: AbortSignal,
  current?: () => boolean,
) {
  requireCurrent(signal, current);
  const headers = await speakingRequestHeaders();
  requireCurrent(signal, current);
  const response = await fetch("/api/speaking-consent", {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify({ attested }),
  });
  requireCurrent(signal, current);
  if (!response.ok) throw new Error("The account age self-attestation could not be saved.");
  const data = (await response.json()) as { attested: boolean };
  requireCurrent(signal, current);
  return data.attested;
}
