import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { authenticatedUser, requirePlatformOwner, teamAdminClient, json } from "@/lib/team-server";
import { AssessmentAccessError, assessmentBudget } from "@/lib/assessments/server";
export const Route = createFileRoute("/api/exam-content")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient(),
            user = await authenticatedUser(request, db);
          await requirePlatformOwner(db, user);
          await assessmentBudget(user.id, "content_review");
          const formId = new URL(request.url).searchParams.get("form");
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
            return json({ form: result.data });
          }
          const releases = await db
            .from("assessment_releases")
            .select(
              "id,module_id,target_language,instruction_language,content_version,status,lesson_manifest,review_records,verified_at",
            )
            .order("created_at", { ascending: false })
            .limit(200);
          if (releases.error)
            throw new AssessmentAccessError("Private releases could not be loaded.", 503);
          const ids = (releases.data ?? []).map((row) => row.id),
            forms = ids.length
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
            releases: releases.data ?? [],
            forms: forms.data ?? [],
            releaseLimit: 200,
            formLimit: 1000,
          });
        } catch (error) {
          if (error instanceof AssessmentAccessError)
            return json({ error: error.message }, error.status);
          if (error instanceof z.ZodError)
            return json({ error: "Invalid content reference." }, 400);
          if (error instanceof Error && /Sign in|session|owner access required/.test(error.message))
            return json(
              { error: "Sign in with the platform owner account to review private exam content." },
              403,
            );
          return json({ error: "Private content review is temporarily unavailable." }, 503);
        }
      },
    },
  },
});
