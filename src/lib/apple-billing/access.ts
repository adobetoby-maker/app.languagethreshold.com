import type { TeamDb } from "../team-server";

export async function applePlan(db: TeamDb, owner: string, environment = "Production") {
  const { data, error } = await db
    .rpc("v4_apple_account_access", { p_user: owner, p_environment: environment })
    .maybeSingle();
  if (error) throw error;
  return data as { product_id: string; expires_at: string; is_family_member: boolean } | null;
}
