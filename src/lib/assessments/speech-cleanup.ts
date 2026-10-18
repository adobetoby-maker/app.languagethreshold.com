import type { TeamDb } from "@/lib/team-server";
import { ASSESSMENT_SPEECH_BUCKET, MAX_SPEECH_BYTES, speechObjectPath } from "./speech.ts";
/** Operator-only worker. SQL returns no candidates until a real policy enables cleanup.
 * No scheduler is installed here. Retries safely remove an already absent object. */
export async function cleanupAssessmentSpeech(db: TeamDb, execute = false) {
  if (!execute) {
    const policies = await db
      .from("assessment_media_policies")
      .select("version")
      .eq("cleanup_enabled", true)
      .not("approved_at", "is", null);
    if (policies.error) throw new Error("Cleanup policy is unavailable.");
    return { dryRun: true as const, enabledPolicies: policies.data?.length ?? 0, deleted: 0 };
  }
  const bucket = await db.storage.getBucket(ASSESSMENT_SPEECH_BUCKET);
  if (
    bucket.error ||
    bucket.data?.public !== false ||
    bucket.data.file_size_limit !== MAX_SPEECH_BYTES
  )
    throw new Error("Protected speech storage is unavailable.");
  const claimed = await db.rpc("assessment_claim_speech_cleanup", { p_limit: 25 });
  if (claimed.error || !Array.isArray(claimed.data))
    throw new Error("Cleanup queue could not be claimed.");
  const rows = claimed.data as { id: string }[];
  let deleted = 0;
  for (const row of rows) {
    const removed = await db.storage
      .from(ASSESSMENT_SPEECH_BUCKET)
      .remove([speechObjectPath(row.id)]);
    if (removed.error) continue; // Keep deleting state; the next run retries without re-exposing bytes.
    const finished = await db.rpc("assessment_finish_speech_cleanup", { p_evidence: row.id });
    if (!finished.error) deleted++; // Deleted bytes remain hidden/retryable if finalization fails.
  }
  return {
    dryRun: false as const,
    selected: rows.length,
    deleted,
    failed: rows.length - deleted,
    mayHaveMore: rows.length === 25,
  };
}
