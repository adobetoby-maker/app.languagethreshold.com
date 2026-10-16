import "@tanstack/react-start/server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { TeamDb } from "@/lib/team-server";
import { AssessmentAccessError, attemptAccess, rpc } from "./server";
import type { AssessmentFormDefinition } from "./form";
import {
  ASSESSMENT_SPEECH_BUCKET,
  MAX_SPEECH_BYTES,
  MAX_SPEECH_MS,
  SPEECH_MIMES,
  speechObjectPath,
  speechSignatureMatches,
  speechPolicyEnabled,
  type SpeechMime,
} from "./speech";
const uploadSchema = z
  .object({
    attemptId: z.string().uuid(),
    itemId: z.string().min(1).max(160),
    revision: z.number().int().min(0),
    policyVersion: z.string().min(3).max(100),
    consent: z.literal(true),
    mime: z.enum(SPEECH_MIMES),
    durationMs: z.number().int().min(250).max(MAX_SPEECH_MS),
    requestId: z.string().uuid(),
  })
  .strict();

export async function speechPolicy(db: TeamDb) {
  const result = await db
    .from("assessment_media_policies")
    .select(
      "version,notice,retention_days,approved_at,approved_by,collection_enabled,cleanup_enabled",
    )
    .eq("collection_enabled", true)
    .maybeSingle();
  if (result.error) throw new AssessmentAccessError("Speech policy is unavailable.", 503);
  const row = result.data;
  return {
    enabled: speechPolicyEnabled(row),
    version: row?.version ?? null,
    notice:
      row?.notice ??
      "Speech recording is unavailable while its retention policy is reviewed. Speaking can remain not assessed.",
    retentionDays: row?.retention_days ?? null,
  };
}
export async function speechStatus(db: TeamDb, actor: string, attemptId: string) {
  await attemptAccess(db, actor, attemptId);
  return speechPolicy(db);
}
export async function boundedSpeechBody(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_SPEECH_BYTES)
    throw new AssessmentAccessError("Recording exceeds 4 MiB.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AssessmentAccessError("A recording is required.", 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > MAX_SPEECH_BYTES) {
        await reader.cancel();
        throw new AssessmentAccessError("Recording exceeds 4 MiB.", 413);
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  if (length < 32) throw new AssessmentAccessError("Recording is empty or incomplete.", 400);
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
async function privateSpeechBucket(db: TeamDb) {
  const result = await db.storage.getBucket(ASSESSMENT_SPEECH_BUCKET);
  if (
    result.error ||
    result.data?.public !== false ||
    result.data.file_size_limit !== MAX_SPEECH_BYTES
  )
    throw new AssessmentAccessError("Protected speech storage is unavailable.", 503);
  return db.storage.from(ASSESSMENT_SPEECH_BUCKET);
}
/** Validate before reading bytes; the RPC repeats stored ownership/policy/revision checks. */
export async function uploadAssessmentSpeech(db: TeamDb, actor: string, request: Request) {
  const input = uploadSchema.parse(
    JSON.parse(request.headers.get("X-Assessment-Speech") ?? "null"),
  );
  const context = await attemptAccess(db, actor, input.attemptId);
  if (
    context.enrollment.user_id !== actor ||
    context.enrollment.status !== "active" ||
    context.attempt.status !== "in_progress" ||
    context.attempt.submitted_at
  )
    throw new AssessmentAccessError("Active learner assessment access required.");
  const policy = await speechPolicy(db);
  if (!policy.enabled || input.policyVersion !== policy.version)
    throw new AssessmentAccessError("Speech collection policy is not enabled.", 409);
  const item = (context.attempt.form_snapshot.definition as AssessmentFormDefinition).items.find(
    (i) => i.id === input.itemId,
  );
  if (item?.skill !== "speaking" || !item.inputMethods.includes("speech"))
    throw new AssessmentAccessError("Frozen speaking item required.", 400);
  if (request.headers.get("Content-Type")?.split(";")[0] !== input.mime)
    throw new AssessmentAccessError("Recording format does not match.", 400);
  const storage = await privateSpeechBucket(db);
  const bytes = await boundedSpeechBody(request);
  if (!speechSignatureMatches(bytes, input.mime))
    throw new AssessmentAccessError("Recording format is incomplete or unsupported.", 400);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const evidenceId = await rpc<string>(db, "assessment_reserve_speech", {
    p_actor: actor,
    p_attempt: input.attemptId,
    p_item: input.itemId,
    p_revision: input.revision,
    p_policy: input.policyVersion,
    p_sha256: sha256,
    p_bytes: bytes.length,
    p_mime: input.mime,
    p_duration: input.durationMs,
    p_request: input.requestId,
  });
  const path = speechObjectPath(evidenceId);
  const existing = await storage.download(path);
  if (!existing.data) {
    const saved = await storage.upload(path, bytes, {
      contentType: input.mime,
      upsert: false,
      cacheControl: "0",
    });
    if (saved.error) {
      // A concurrent retry may have saved the same immutable object; verify below.
      const retry = await storage.download(path);
      if (!retry.data)
        throw new AssessmentAccessError(
          "Recording upload failed. Keep this page open to retry.",
          503,
        );
    }
  }
  const verified = await storage.download(path);
  if (
    !verified.data ||
    verified.data.size !== bytes.length ||
    createHash("sha256")
      .update(new Uint8Array(await verified.data.arrayBuffer()))
      .digest("hex") !== sha256
  )
    throw new AssessmentAccessError("Recording verification failed. No answer was attached.", 503);
  await rpc<number>(db, "assessment_finish_speech", { p_actor: actor, p_evidence: evidenceId });
  // Return no object URL/hash/path. Caller reloads the current authoritative draft revision.
  return { evidenceId, attached: true };
}
export async function readAssessmentSpeech(db: TeamDb, actor: string, evidenceId: string) {
  const result = await db
    .from("assessment_speech_evidence")
    .select("*")
    .eq("id", evidenceId)
    .maybeSingle();
  const row = result.data;
  if (result.error || !row?.attempt_id || row.state !== "ready" || row.delete_requested_at)
    throw new AssessmentAccessError("Speech evidence is unavailable.", 404);
  const context = await attemptAccess(db, actor, row.attempt_id, actor !== row.learner_id);
  if (actor !== row.learner_id && !context.attempt.submitted_at)
    throw new AssessmentAccessError("Submit this assessment before review.");
  const response = await db
    .from("assessment_responses")
    .select("answer")
    .eq("attempt_id", row.attempt_id)
    .eq("item_id", row.item_id)
    .maybeSingle();
  if (
    response.error ||
    response.data?.answer?.mediaEvidenceId !== evidenceId ||
    response.data.answer.missingReason
  )
    throw new AssessmentAccessError("This recording is not the submitted response.", 404);
  const storage = await privateSpeechBucket(db);
  const download = await storage.download(speechObjectPath(row.id));
  const bytes = download.data ? new Uint8Array(await download.data.arrayBuffer()) : null;
  if (
    !bytes ||
    bytes.length !== row.bytes ||
    !speechSignatureMatches(bytes, row.mime as SpeechMime) ||
    createHash("sha256").update(bytes).digest("hex") !== row.sha256
  )
    throw new AssessmentAccessError("Protected recording verification failed.", 503);
  // Recheck withdrawals and reviewer revocation after fetching storage bytes.
  const current = await db
    .from("assessment_speech_evidence")
    .select("state,delete_requested_at")
    .eq("id", evidenceId)
    .maybeSingle();
  if (current.error || current.data?.state !== "ready" || current.data.delete_requested_at)
    throw new AssessmentAccessError("Speech evidence is unavailable.", 404);
  await attemptAccess(db, actor, row.attempt_id, actor !== row.learner_id);
  return new Response(bytes, {
    headers: {
      "Content-Type": row.mime,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    },
  });
}
