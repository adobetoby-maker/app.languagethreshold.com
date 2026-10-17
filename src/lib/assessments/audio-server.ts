import "@tanstack/react-start/server-only";
import { createHash } from "node:crypto";
import { json, type TeamDb } from "@/lib/team-server";
import { AssessmentAccessError, attemptAccess, pilotAllowed } from "./server";
import { selectedAttemptPath } from "./routing-path-server";
import {
  ASSESSMENT_AUDIO_BUCKET,
  assessmentAudioPath,
  audioSignatureMatches,
  validAssessmentAudioAsset,
  type AssessmentAudioAsset,
} from "./audio";

export async function readAssessmentListening(
  db: TeamDb,
  actor: string,
  attemptId: string,
  itemId: string,
) {
  const context = await attemptAccess(db, actor, attemptId, false, "routing");
  if (
    context.enrollment.user_id !== actor ||
    context.attempt.submitted_at ||
    context.attempt.status !== "in_progress" ||
    context.enrollment.status !== "active"
  )
    throw new AssessmentAccessError("Active learner assessment access required.");
  const path = await selectedAttemptPath(db, context);
  const item = path.items.find((row) => row.id === itemId);
  if (!item)
    throw new AssessmentAccessError(
      "Listening audio is unavailable outside the selected assessment path.",
      404,
    );
  if (!item?.audioRequired || !item.audioText)
    throw new AssessmentAccessError("Listening audio is unavailable for this item.", 503);
  if (item.audioAsset) {
    const response = await assessmentAudioResponse(db, item.audioAsset);
    // Recheck membership/status after the protected storage read.
    const current = await attemptAccess(db, actor, attemptId, false, "routing");
    if (
      current.enrollment.user_id !== actor ||
      current.attempt.submitted_at ||
      current.attempt.status !== "in_progress" ||
      current.enrollment.status !== "active"
    )
      throw new AssessmentAccessError("Active learner assessment access required.");
    return response;
  }
  if (!context.attempt.form_snapshot.pilot || !pilotAllowed(actor))
    throw new AssessmentAccessError(
      "Reviewed assessment audio has not been published for this form.",
      503,
    );
  return json({
    text: item.audioText,
    language: context.enrollment.target_language,
    mode: "device_speech_qa_only",
  });
}

/** Service-only proxy: no public/signed object URLs or private paths reach the learner. */
export async function assessmentAudioResponse(db: TeamDb, asset: AssessmentAudioAsset) {
  if (!validAssessmentAudioAsset(asset))
    throw new AssessmentAccessError("The reviewed audio reference is invalid.", 503);
  const bucket = await db.storage.getBucket(ASSESSMENT_AUDIO_BUCKET);
  if (bucket.error || !bucket.data || bucket.data.public !== false)
    throw new AssessmentAccessError("Protected listening audio is unavailable.", 503);
  const download = await db.storage
    .from(ASSESSMENT_AUDIO_BUCKET)
    .download(assessmentAudioPath(asset));
  if (download.error || !download.data || download.data.size !== asset.bytes)
    throw new AssessmentAccessError("The reviewed listening clip is unavailable.", 503);
  const bytes = new Uint8Array(await download.data.arrayBuffer());
  if (
    !audioSignatureMatches(bytes, asset.mime) ||
    createHash("sha256").update(bytes).digest("hex") !== asset.sha256
  )
    throw new AssessmentAccessError("The listening clip does not match the reviewed version.", 503);
  return new Response(bytes, {
    headers: {
      "Content-Type": asset.mime,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    },
  });
}
