import "@tanstack/react-start/server-only";
import { createHash } from "node:crypto";
import { json, type TeamDb } from "@/lib/team-server";
import { AssessmentAccessError, attemptAccess, pilotAllowed } from "./server";
import type { AssessmentFormDefinition } from "./form";
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
  const context = await attemptAccess(db, actor, attemptId);
  if (
    context.enrollment.user_id !== actor ||
    context.attempt.submitted_at ||
    context.attempt.status !== "in_progress" ||
    context.enrollment.status !== "active"
  )
    throw new AssessmentAccessError("Active learner assessment access required.");
  const form = context.attempt.form_snapshot.definition as AssessmentFormDefinition;
  const item = form.items.find((row) => row.id === itemId);
  if (!item?.audioRequired || !item.audioText)
    throw new AssessmentAccessError("Listening audio is unavailable for this item.", 503);
  if (item.audioAsset) return assessmentAudioResponse(db, item.audioAsset);
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
