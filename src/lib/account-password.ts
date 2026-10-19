import type { SupabaseClient } from "@supabase/supabase-js";

export function passwordInputError(password: string, confirmation: string): string | null {
  if (password.length < 12 || password.length > 128)
    return "Use a password between 12 and 128 characters.";
  if (password !== confirmation) return "The passwords do not match.";
  return null;
}

/** Never accept an account ID from a URL or expose provider diagnostics. */
export async function setOwnAccountPassword(
  client: Pick<SupabaseClient, "auth">,
  actor: string,
  isCurrent: (actor: string) => boolean,
  password: string,
  confirmation: string,
): Promise<string | null> {
  const invalid = passwordInputError(password, confirmation);
  if (invalid) return invalid;
  const expired = "Your sign-in changed or the link expired. Request a new password link.";
  try {
    if (!isCurrent(actor)) return expired;
    const verified = await client.auth.getUser();
    if (verified.error || verified.data.user?.id !== actor || !isCurrent(actor)) return expired;
    const result = await client.auth.updateUser({ password });
    if (!isCurrent(actor)) return expired;
    if (result.error || result.data.user?.id !== actor)
      return "We could not confirm the password change. Try again or request a new link.";
    return null;
  } catch {
    return "We could not confirm the password change. Try again or request a new link.";
  }
}
