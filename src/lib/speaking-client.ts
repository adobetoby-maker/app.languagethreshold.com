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

export async function getSpeakingAgeAttestation(signal?: AbortSignal) {
  const response = await fetch("/api/speaking-consent", {
    method: "GET",
    headers: await speakingRequestHeaders(),
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error("The account age self-attestation could not be loaded.");
  return ((await response.json()) as { attested: boolean }).attested;
}

export async function saveSpeakingAgeAttestation(attested: boolean) {
  const response = await fetch("/api/speaking-consent", {
    method: "POST",
    headers: await speakingRequestHeaders(),
    body: JSON.stringify({ attested }),
  });
  if (!response.ok) throw new Error("The account age self-attestation could not be saved.");
  return ((await response.json()) as { attested: boolean }).attested;
}
