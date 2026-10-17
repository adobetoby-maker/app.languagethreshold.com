import "@tanstack/react-start/server-only";
import type { User } from "@supabase/supabase-js";
import { requirePlatformOwner, type TeamDb } from "@/lib/team-server";
import { AssessmentAccessError } from "./server";
export type ContentGrant = {
  module_id: string;
  target_language: string;
  instruction_language: string;
  kind: "curriculum" | "fluent_language" | "domain";
};
export async function contentPrivileges(db: TeamDb, user: User) {
  let owner = false;
  try {
    await requirePlatformOwner(db, user);
    owner = true;
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "Platform owner access required.")
      throw error;
  }
  const [roles, grants] = await Promise.all([
    db.from("platform_admin_roles").select("role").eq("user_id", user.id).maybeSingle(),
    db
      .from("assessment_content_reviewers")
      .select("module_id,target_language,instruction_language,kind")
      .eq("user_id", user.id)
      .eq("active", true),
  ]);
  if (roles.error || grants.error)
    throw new AssessmentAccessError("Content permissions could not be checked.", 503);
  return {
    owner,
    registeredOwner: roles.data?.role === "owner",
    grants: (grants.data ?? []) as ContentGrant[],
  };
}
export function contentTrackAllowed(
  privileges: Awaited<ReturnType<typeof contentPrivileges>>,
  release: { module_id: string; target_language: string; instruction_language: string },
) {
  return (
    privileges.owner ||
    privileges.grants.some(
      (scope) =>
        scope.module_id === release.module_id &&
        scope.target_language === release.target_language &&
        scope.instruction_language === release.instruction_language,
    )
  );
}
export async function requireRegisteredAssessmentOwner(db: TeamDb, user: User) {
  await requirePlatformOwner(db, user);
  const result = await db
    .from("platform_admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (result.error) throw new AssessmentAccessError("Owner permissions could not be checked.", 503);
  if (result.data?.role !== "owner")
    throw new AssessmentAccessError(
      "A registered platform owner role is required to manage reviewer access.",
      403,
    );
}
