import { lessonReviewSnapshot, lessonReviewFingerprint } from "@/lib/lesson-review";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticatedUser, teamAdminClient, json } from "@/lib/team-server";
import { AssessmentAccessError, assessmentBudget, rpc } from "@/lib/assessments/server";
import { contentPrivileges, contentTrackAllowed } from "@/lib/assessments/content-server";
import { isStrictSameOrigin } from "@/lib/speaking-security";
import { assessmentAudioResponse } from "@/lib/assessments/audio-server";
import type { AssessmentFormDefinition } from "@/lib/assessments/form";
const review = z
  .object({
    formId: z.string().min(3).max(160),
    kind: z.enum(["curriculum", "fluent_language", "domain"]),
    decision: z.enum(["approved", "changes_requested"]),
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    note: z.string().trim().min(3).max(4000),
    requestId: z.string().uuid(),
    confirmReview: z.literal(true),
  })
  .strict();
function fail(error: unknown) {
  if (error instanceof AssessmentAccessError) return json({ error: error.message }, error.status);
  if (error instanceof z.ZodError)
    return json({ error: "Check the content reference, review and confirmation." }, 400);
  if (error instanceof Error && /Sign in|session|owner access required/.test(error.message))
    return json(
      { error: "Sign in with an authorized content reviewer or platform owner account." },
      403,
    );
  return json({ error: "Private content review is temporarily unavailable." }, 503);
}
export const Route = createFileRoute("/api/exam-content")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient(),
            user = await authenticatedUser(request, db),
            access = await contentPrivileges(db, user);
          if (!access.owner && !access.grants.length)
            throw new AssessmentAccessError(
              "Assigned content reviewer or platform owner access required.",
              403,
            );
          await assessmentBudget(user.id, "content_review");
          const params = new URL(request.url).searchParams;
          const lessonRelease = params.get("lessons");
          if (lessonRelease) {
            const id = z.string().min(3).max(160).parse(lessonRelease);
            const result = await db
              .from("assessment_releases")
              .select(
                "id,module_id,target_language,instruction_language,content_version,lesson_manifest",
              )
              .eq("id", id)
              .maybeSingle();
            if (result.error)
              throw new AssessmentAccessError("Lesson release could not be loaded.", 503);
            if (!result.data) throw new AssessmentAccessError("Lesson release was not found.", 404);
            if (!contentTrackAllowed(access, result.data))
              throw new AssessmentAccessError("Assigned content reviewer access required.", 403);
            const snapshot = lessonReviewSnapshot(
              result.data.module_id,
              result.data.target_language,
              result.data.instruction_language,
            );
            if (!snapshot)
              throw new AssessmentAccessError("Current lesson curriculum is not available.", 404);
            const fingerprint = await lessonReviewFingerprint(snapshot);
            const stored = result.data.lesson_manifest?.lessonSnapshotFingerprint;
            const storedFingerprint =
              typeof stored === "string" && /^[a-f0-9]{64}$/.test(stored) ? stored : null;
            return json({
              snapshot,
              fingerprint,
              releaseId: id,
              releaseContentVersion: result.data.content_version,
              storedFingerprint,
              matchesStoredSnapshot: storedFingerprint === fingerprint,
            });
          }
          const formId = params.get("form");
          if (formId) {
            const id = z.string().min(3).max(160).parse(formId),
              result = await db
                .from("assessment_forms")
                .select(
                  "id,release_id,checkpoint,purpose,version,rubric_version,status,calibrated,equivalence_approved,review_records,definition",
                )
                .eq("id", id)
                .maybeSingle();
            if (result.error)
              throw new AssessmentAccessError("Private content could not be loaded.", 503);
            if (!result.data)
              throw new AssessmentAccessError("Assessment form was not found.", 404);
            const release = await db
              .from("assessment_releases")
              .select("module_id,target_language,instruction_language")
              .eq("id", result.data.release_id)
              .single();
            if (release.error)
              throw new AssessmentAccessError("Content permissions could not be checked.", 503);
            if (!contentTrackAllowed(access, release.data))
              throw new AssessmentAccessError("Assigned content reviewer access required.", 403);
            await rpc(db, "assessment_note_content_exposure", { p_actor: user.id, p_form: id });
            const audioItem = new URL(request.url).searchParams.get("audioItem");
            if (audioItem) {
              const item = (
                result.data.definition as unknown as AssessmentFormDefinition
              ).items.find((row) => row.id === audioItem);
              if (!item?.audioRequired || !item.audioAsset)
                throw new AssessmentAccessError(
                  "A versioned listening clip is not attached to this item.",
                  404,
                );
              return await assessmentAudioResponse(db, item.audioAsset);
            }
            const context =
              access.registeredOwner || access.grants.length
                ? await rpc(db, "assessment_content_review_context", {
                    p_actor: user.id,
                    p_form: id,
                  })
                : null;
            return json({ form: { ...result.data, reviewContext: context } });
          }
          let query = db
            .from("assessment_releases")
            .select(
              "id,module_id,target_language,instruction_language,content_version,status,lesson_manifest,review_records,verified_at",
            )
            .order("created_at", { ascending: false })
            .limit(200);
          if (!access.owner)
            query = query
              .in("module_id", [...new Set(access.grants.map((g) => g.module_id))])
              .in("target_language", [...new Set(access.grants.map((g) => g.target_language))])
              .in("instruction_language", [
                ...new Set(access.grants.map((g) => g.instruction_language)),
              ]);
          const releases = await query;
          if (releases.error)
            throw new AssessmentAccessError("Private releases could not be loaded.", 503);
          const allowed = (releases.data ?? []).filter((row) => contentTrackAllowed(access, row)),
            ids = allowed.map((row) => row.id);
          const forms = ids.length
            ? await db
                .from("assessment_forms")
                .select("id,release_id,checkpoint,purpose,version,status,calibrated")
                .in("release_id", ids)
                .order("created_at", { ascending: false })
                .limit(1000)
            : { data: [], error: null };
          if (forms.error)
            throw new AssessmentAccessError("Private form catalog could not be loaded.", 503);
          return json({
            releases: allowed,
            forms: forms.data ?? [],
            releaseLimit: 200,
            formLimit: 1000,
            owner: access.owner,
            registeredOwner: access.registeredOwner,
          });
        } catch (error) {
          return fail(error);
        }
      },
      POST: async ({ request }) => {
        try {
          if (!isStrictSameOrigin(request))
            throw new AssessmentAccessError("Same-origin content review required.", 403);
          const db = teamAdminClient(),
            user = await authenticatedUser(request, db);
          await assessmentBudget(user.id, "content_review_write");
          const raw = await request.text();
          if (raw.length > 16000)
            throw new AssessmentAccessError("Content review is too large.", 400);
          let body: unknown;
          try {
            body = JSON.parse(raw);
          } catch {
            throw new AssessmentAccessError("Invalid content review.", 400);
          }
          const data = review.parse(body);
          return json({
            id: await rpc(db, "assessment_record_content_review", {
              p_actor: user.id,
              p_form: data.formId,
              p_kind: data.kind,
              p_decision: data.decision,
              p_fingerprint: data.fingerprint,
              p_note: data.note,
              p_request: data.requestId,
            }),
          });
        } catch (error) {
          return fail(error);
        }
      },
    },
  },
});
