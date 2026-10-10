import { supabase } from "@/integrations/supabase/client";

export async function teamRequest<T>(path: string, body?: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error("Sign in to use your team workspace.");
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok || result.error) throw new Error(result.error ?? "Request failed.");
  return result;
}
