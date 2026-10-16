import { supabase } from "@/integrations/supabase/client";
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
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token)
    throw new ExamRequestError("Sign in to play this assessment clip.", 403);
  const response = await fetch(path, {
    headers: { Authorization: `Bearer ${data.session.access_token}` },
    cache: "no-store",
    signal,
  });
  if (response.ok && response.headers.get("Content-Type")?.startsWith("audio/"))
    return { mode: "private_clip", blob: await response.blob() };
  const body = await response.json().catch(() => null);
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
  const { data } = await supabase.auth.getSession();
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
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new ExamRequestError(
      body?.error ?? "Assessment request failed. Your device draft is kept.",
      response.status,
    );
  return body as T;
}
