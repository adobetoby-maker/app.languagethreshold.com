import { requireCurrentTeamRequest, type TeamDb } from "@/lib/team-server";
import { AssessmentAccessError } from "./errors";

type Track = { module_id: string; target_language: string; instruction_language: string };
/** Exact active track permission, or limit-one personal queue eligibility. */
export async function evidenceReviewerStatus(db: TeamDb, actor: string, track?: Track) {
  requireCurrentTeamRequest(db);
  let query = db
    .from("assessment_reviewers")
    .select("user_id")
    .eq("user_id", actor)
    .eq("active", true)
    .retry(false);
  if (track)
    query = query
      .eq("module_id", track.module_id)
      .eq("target_language", track.target_language)
      .eq("instruction_language", track.instruction_language);
  const { data, error } = await (track ? query.maybeSingle() : query.limit(1));
  requireCurrentTeamRequest(db);
  if (error) throw new AssessmentAccessError("Reviewer status could not be loaded.", 503);
  return Array.isArray(data) ? data.length > 0 : !!data;
}
