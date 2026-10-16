import "@tanstack/react-start/server-only";
import type { TeamDb } from "@/lib/team-server";
import { AssessmentAccessError, rpc } from "./server";
import { ASSESSMENT_SPEECH_BUCKET, MAX_SPEECH_BYTES, speechObjectPath } from "./speech";
/** Operator-only worker. SQL returns no candidates until a real policy enables cleanup.
 * No scheduler is installed here. Retries safely remove an already absent object. */
export async function cleanupAssessmentSpeech(db: TeamDb, execute = false) {
  if (!execute) {
    const policies = await db
      .from("assessment_media_policies")
      .select("version")
      .eq("cleanup_enabled", true)
      .not("approved_at", "is", null);
    if (policies.error) throw new AssessmentAccessError("Cleanup policy is unavailable.", 503);
    return { dryRun: true, enabledPolicies: policies.data?.length ?? 0, deleted: 0 };
  }
  const bucket = await db.storage.getBucket(ASSESSMENT_SPEECH_BUCKET);
  if (
    bucket.error ||
    bucket.data?.public !== false ||
    bucket.data.file_size_limit !== MAX_SPEECH_BYTES
  )
    throw new AssessmentAccessError("Protected speech storage is unavailable.", 503);
  const rows = await rpc<{ id: string }[]>(db, "assessment_claim_speech_cleanup", { p_limit: 25 });
  let deleted = 0;
  for (const row of rows) {
    const removed = await db.storage
      .from(ASSESSMENT_SPEECH_BUCKET)
      .remove([speechObjectPath(row.id)]);
    if (removed.error) continue; // Keep deleting state; the next run retries without re-exposing bytes.
    await rpc(db, "assessment_finish_speech_cleanup", { p_evidence: row.id });
    deleted++;
  }
  return { dryRun: false, selected: rows.length, deleted };
}
