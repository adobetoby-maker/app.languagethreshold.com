import { supabase } from "@/integrations/supabase/client";
export class ExamRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
export async function examRequest<T>(
  pathOrBody: string | Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token)
    throw new ExamRequestError("Sign in to continue this assessment.", 403);
  const get = typeof pathOrBody === "string";
  const response = await fetch(get ? pathOrBody : "/api/exams", {
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
