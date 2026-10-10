import type { TeamDb } from "@/lib/team-server";

export async function maybeIssueRoofingCertificate(db: TeamDb, orgId: string, userId: string) {
  const { data: assignment, error: assignmentError } = await db
    .from("team_assignments")
    .select("require_certificate")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .eq("module_id", "roofing")
    .maybeSingle();
  if (assignmentError) throw assignmentError;
  if (!assignment?.require_certificate) return null;
  const [lessons, attempts, member, entitlement] = await Promise.all([
    db
      .from("team_lesson_completions")
      .select("lesson_number")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .eq("module_id", "roofing"),
    db
      .from("team_assessment_attempts")
      .select("score,total")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .eq("module_id", "roofing")
      .not("submitted_at", "is", null),
    db
      .from("team_members")
      .select("display_name,status,role")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .single(),
    db.from("team_entitlements").select("status,period_end").eq("organization_id", orgId).single(),
  ]);
  for (const result of [lessons, attempts, member, entitlement])
    if (result.error) throw result.error;
  if (member.data?.status !== "active" || member.data.role !== "learner") return null;
  if (
    entitlement.data?.status !== "active" &&
    !(
      entitlement.data?.status === "manual" &&
      entitlement.data.period_end &&
      new Date(entitlement.data.period_end).getTime() > Date.now()
    )
  )
    return null;
  const completed = new Set(lessons.data?.map((l) => l.lesson_number) ?? []);
  if (Array.from({ length: 30 }, (_, i) => i + 1).some((n) => !completed.has(n))) return null;
  const best = Math.max(
    0,
    ...(attempts.data ?? []).filter((a) => a.total === 25).map((a) => a.score ?? 0),
  );
  if (best < 20) return null;
  const score = best * 4;
  const { data, error } = await db
    .from("team_certificates")
    .upsert(
      {
        organization_id: orgId,
        user_id: userId,
        learner_name: member.data!.display_name,
        module_id: "roofing",
        version: 1,
        score,
        lesson_count: 30,
      },
      { onConflict: "organization_id,user_id,module_id,version", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}
