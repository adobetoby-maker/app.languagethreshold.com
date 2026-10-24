// Built by TAC — 2026-10-23
// Client for /api/exam-check. Sends the signed-in learner's token when there is one (the overview
// also works signed out). Errors carry the server's fixed learner-safe message and its code.
import { supabase } from "@/integrations/supabase/client";

export class ExamsApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

/** A failure to reach the server at all (offline, dropped connection), as opposed to a refusal. */
export class ExamsNetworkError extends Error {}

export async function examsRequest<T>(
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  let token: string | undefined;
  try {
    token = (await supabase.auth.getSession()).data.session?.access_token;
  } catch {
    token = undefined;
  }
  let response: Response;
  try {
    response = await fetch("/api/exam-check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal,
    });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    throw new ExamsNetworkError("We couldn't reach the server. Check your connection.");
  }
  let data: Record<string, unknown> = {};
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }
  if (!response.ok) {
    const { error, code, ...extra } = data;
    throw new ExamsApiError(
      response.status,
      typeof error === "string" && error ? error : "Something went wrong. Please try again.",
      typeof code === "string" ? code : "error",
      extra,
    );
  }
  return data as T;
}

/** Random id for one answer request. Repeating it is harmless on the server. */
export function newRequestId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return "r" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
