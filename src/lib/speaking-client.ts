import {
  isSpeakingTestActor,
  isSpeakingTestHost,
  SPEAKING_TEST_ACTOR_PREFIX,
} from "./speaking-test-access";
import { supabase } from "@/integrations/supabase/client";

export class SpeakingConsentSaveError extends Error {
  readonly outcome: "rejected" | "unknown";
  constructor(outcome: "rejected" | "unknown") {
    super(
      outcome === "unknown"
        ? "The speaking confirmation could not be confirmed. Check its saved status."
        : "The speaking confirmation was not saved. Try again.",
    );
    this.outcome = outcome;
  }
}

export type SpeakingRequestOwner = { userId: string; isCurrent: () => boolean };

export async function speakingRequestHeaders(
  owner?: SpeakingRequestOwner,
  signal?: AbortSignal,
): Promise<Record<string, string>> {
  requireCurrent(signal, owner?.isCurrent);
  if (owner && !owner.userId) throw new DOMException("Cancelled", "AbortError");
  if (
    owner &&
    isSpeakingTestActor(owner.userId) &&
    typeof window !== "undefined" &&
    isSpeakingTestHost(window.location?.hostname ?? "")
  ) {
    return {
      "Content-Type": "application/json",
      "x-speaking-test-adult": "true",
      "x-speaking-test-session": owner.userId.slice(SPEAKING_TEST_ACTOR_PREFIX.length),
    };
  }
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

export const SPEAKING_CONFIRMATION_WAIT_MS = 30_000;
class ConfirmationWaitExpired extends Error {}
async function withConfirmationWait<T>(
  incoming: AbortSignal | undefined,
  current: (() => boolean) | undefined,
  action: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  requireCurrent(incoming, current);
  const controller = new AbortController();
  let expired = false;
  const abort = () => controller.abort();
  const timer = setTimeout(() => {
    expired = true;
    controller.abort();
  }, SPEAKING_CONFIRMATION_WAIT_MS);
  incoming?.addEventListener("abort", abort, { once: true });
  let rejectAbort: (() => void) | undefined;
  try {
    if (incoming?.aborted) controller.abort();
    requireCurrent(controller.signal, current);
    const value = await Promise.race([
      action(controller.signal),
      new Promise<never>((_, reject) => {
        rejectAbort = () => reject(new DOMException("Cancelled", "AbortError"));
        controller.signal.addEventListener("abort", rejectAbort, { once: true });
        if (controller.signal.aborted) rejectAbort();
      }),
    ]);
    requireCurrent(controller.signal, current);
    return value;
  } catch (error) {
    controller.abort();
    requireCurrent(incoming, current);
    if (expired) throw new ConfirmationWaitExpired();
    throw error;
  } finally {
    clearTimeout(timer);
    incoming?.removeEventListener("abort", abort);
    if (rejectAbort) controller.signal.removeEventListener("abort", rejectAbort);
  }
}
function confirmationFetch(options: RequestInit, signal: AbortSignal) {
  const pending = fetch("/api/speaking-consent", { ...options, signal, cache: "no-store" });
  void pending.then(
    (response) => {
      if (signal.aborted) void response.body?.cancel().catch(() => {});
    },
    () => {},
  );
  return pending;
}
export async function getSpeakingAgeAttestation(
  signal?: AbortSignal,
  owner?: SpeakingRequestOwner,
) {
  const current = owner?.isCurrent;
  if (
    owner &&
    isSpeakingTestActor(owner.userId) &&
    typeof window !== "undefined" &&
    isSpeakingTestHost(window.location?.hostname ?? "")
  ) {
    requireCurrent(signal, current);
    return true;
  }
  try {
    return await withConfirmationWait(signal, current, async (operation) => {
      const headers = await speakingRequestHeaders(owner, operation);
      requireCurrent(operation, current);
      let response: Response;
      try {
        response = await confirmationFetch({ method: "GET", headers }, operation);
      } catch {
        requireCurrent(operation, current);
        throw new Error("The account age self-attestation could not be loaded.");
      }
      requireCurrent(operation, current);
      if (!response.ok) {
        void response.body?.cancel().catch(() => {});
        throw new Error("The account age self-attestation could not be loaded.");
      }
      let data: { attested?: unknown } | null;
      try {
        data = await response.json();
      } catch {
        requireCurrent(operation, current);
        throw new Error("The account age self-attestation could not be loaded.");
      }
      requireCurrent(operation, current);
      if (typeof data?.attested !== "boolean")
        throw new Error("The account age self-attestation could not be loaded.");
      return data.attested;
    });
  } catch (error) {
    requireCurrent(signal, current);
    if (error instanceof ConfirmationWaitExpired)
      throw new Error("The account age self-attestation could not be loaded.");
    throw error;
  }
}
export async function saveSpeakingAgeAttestation(
  attested: boolean,
  signal?: AbortSignal,
  current?: () => boolean,
  owner?: SpeakingRequestOwner,
) {
  const active = () => (!current || current()) && (!owner || owner.isCurrent());
  let dispatched = false;
  try {
    return await withConfirmationWait(signal, active, async (operation) => {
      const headers = await speakingRequestHeaders(owner, operation);
      requireCurrent(operation, active);
      dispatched = true;
      const response = await confirmationFetch(
        { method: "POST", headers, body: JSON.stringify({ attested }) },
        operation,
      );
      requireCurrent(operation, active);
      if (!response.ok) {
        let outcome: unknown;
        try {
          outcome = await response.json();
        } catch {
          /* An interrupted/proxy response is unconfirmed. */
        }
        requireCurrent(operation, active);
        const rejected = Boolean(
          outcome &&
          typeof outcome === "object" &&
          "writeOutcome" in outcome &&
          outcome.writeOutcome === "not_started",
        );
        throw new SpeakingConsentSaveError(rejected ? "rejected" : "unknown");
      }
      const data: unknown = await response.json();
      requireCurrent(operation, active);
      if (!data || typeof data !== "object" || !("attested" in data) || data.attested !== attested)
        throw new SpeakingConsentSaveError("unknown");
      return data.attested;
    });
  } catch (error) {
    requireCurrent(signal, active);
    if (error instanceof SpeakingConsentSaveError) throw error;
    if (dispatched || error instanceof ConfirmationWaitExpired)
      throw new SpeakingConsentSaveError(dispatched ? "unknown" : "rejected");
    throw error;
  }
}
