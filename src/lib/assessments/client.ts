import { supabase } from "@/integrations/supabase/client";
/** Cancellation must also survive transports/parsers that finish after abort. */
function requireActive(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Assessment request cancelled.", "AbortError");
}
export class ExamRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
export function examRequest<T>(pathOrBody: string | Record<string, unknown>, signal?: AbortSignal) {
  return assessmentRequest<T>(pathOrBody, "/api/exams", signal);
}
export function examPlanRequest<T>(
  pathOrBody: string | Record<string, unknown>,
  signal?: AbortSignal,
) {
  return assessmentRequest<T>(pathOrBody, "/api/exam-plans", signal);
}
export function examReviewerRequest<T>(body: Record<string, unknown>, signal?: AbortSignal) {
  return assessmentRequest<T>(body, "/api/exam-reviewers", signal);
}
export function examContentRequest<T>(body: Record<string, unknown>, signal?: AbortSignal) {
  return assessmentRequest<T>(body, "/api/exam-content", signal);
}
export type ExamAudioInput =
  | { mode: "private_clip"; blob: Blob }
  | { mode: "device_speech_qa_only"; text: string; language: string };
export async function examAudioRequest(
  path: string,
  signal?: AbortSignal,
): Promise<ExamAudioInput> {
  requireActive(signal);
  const { data } = await supabase.auth.getSession();
  requireActive(signal);
  if (!data.session?.access_token)
    throw new ExamRequestError("Sign in to play this assessment clip.", 403);
  const response = await fetch(path, {
    headers: { Authorization: `Bearer ${data.session.access_token}` },
    cache: "no-store",
    signal,
  });
  requireActive(signal);
  if (response.ok && response.headers.get("Content-Type")?.startsWith("audio/")) {
    const blob = await response.blob();
    requireActive(signal);
    return { mode: "private_clip", blob };
  }
  const body = await response.json().catch(() => null);
  requireActive(signal);
  if (!response.ok)
    throw new ExamRequestError(
      body?.error ?? "The assessment clip could not be played.",
      response.status,
    );
  if (
    body?.mode === "device_speech_qa_only" &&
    typeof body.text === "string" &&
    typeof body.language === "string"
  )
    return body as ExamAudioInput;
  throw new ExamRequestError("The assessment clip response was invalid.", 503);
}
async function assessmentRequest<T>(
  pathOrBody: string | Record<string, unknown>,
  endpoint: string,
  signal?: AbortSignal,
): Promise<T> {
  requireActive(signal);
  const { data } = await supabase.auth.getSession();
  requireActive(signal);
  if (!data.session?.access_token)
    throw new ExamRequestError("Sign in to continue this assessment.", 403);
  const get = typeof pathOrBody === "string";
  const response = await fetch(get ? pathOrBody : endpoint, {
    method: get ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      ...(!get ? { "Content-Type": "application/json" } : {}),
    },
    ...(!get ? { body: JSON.stringify(pathOrBody) } : {}),
    cache: "no-store",
    signal,
  });
  requireActive(signal);
  const body = await response.json().catch(() => null);
  requireActive(signal);
  if (!response.ok)
    throw new ExamRequestError(
      body?.error ?? "Assessment request failed. Your device draft is kept.",
      response.status,
    );
  return body as T;
}

export async function uploadExamSpeech(
  metadata: {
    attemptId: string;
    itemId: string;
    revision: number;
    policyVersion: string;
    consent: true;
    mime: string;
    durationMs: number;
    requestId: string;
  },
  blob: Blob,
  signal?: AbortSignal,
) {
  requireActive(signal);
  const { data } = await supabase.auth.getSession();
  requireActive(signal);
  if (!data.session?.access_token)
    throw new ExamRequestError("Sign in to upload this recording.", 403);
  const response = await fetch("/api/exams?action=speech_upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      "Content-Type": metadata.mime,
      "X-Assessment-Speech": JSON.stringify(metadata),
    },
    body: blob,
    cache: "no-store",
    signal,
  });
  requireActive(signal);
  const body = await response.json().catch(() => null);
  requireActive(signal);
  if (!response.ok)
    throw new ExamRequestError(
      body?.error ?? "Recording upload failed. Keep this page open to retry.",
      response.status,
    );
  if (body?.attached !== true || typeof body.evidenceId !== "string")
    throw new ExamRequestError(
      "Recording attachment could not be confirmed. Keep this page open to retry.",
      503,
    );
  return body as { evidenceId: string; attached: true };
}

/** Download private CSV through authenticated fetch; never put a bearer token in a link. */
export async function examHistoryExport(enrollmentId: string, signal?: AbortSignal) {
  requireActive(signal);
  const { data } = await supabase.auth.getSession();
  requireActive(signal);
  if (!data.session?.access_token) throw new ExamRequestError("Sign in to export this plan.", 403);
  const response = await fetch(
    `/api/exam-plans?${new URLSearchParams({ action: "history_export", enrollment: enrollmentId })}`,
    {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
      cache: "no-store",
      signal,
    },
  );
  requireActive(signal);
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    requireActive(signal);
    throw new ExamRequestError(
      result?.error ?? "Plan history could not be exported. No partial file was created.",
      response.status,
    );
  }
  if (!response.headers.get("content-type")?.startsWith("text/csv"))
    throw new ExamRequestError("The export response was invalid.", 503);
  const rawCount = response.headers.get("x-lt-export-events"),
    eventCount = Number(rawCount);
  if (
    rawCount === null ||
    !Number.isSafeInteger(eventCount) ||
    eventCount < 0 ||
    eventCount > 10000
  )
    throw new ExamRequestError("The export count was invalid. No file was downloaded.", 503);
  const blob = await response.blob();
  requireActive(signal);
  return { blob, eventCount };
}
