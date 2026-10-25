import { createFileRoute } from "@tanstack/react-router";
import { lessonCorrectionSchema } from "@/lib/lesson-correction";
import { deliverLessonCorrection } from "@/lib/lesson-correction-server";
import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import { prepareTeamJson } from "@/lib/team-request";
import {
  authenticatedTeamUser,
  teamAdminClient,
  json,
  scopedTeamError,
  TeamOperationError,
} from "@/lib/team-server";

export const Route = createFileRoute("/api/lesson-correction")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const prepared = await prepareTeamJson(request, lessonCorrectionSchema, 24 * 1024);
        if (prepared.response) return prepared.response;
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request);
          const user = await authenticatedTeamUser(request, db);
          const recent = await db
            .from("platform_audit_events")
            .select("id")
            .eq("actor_user_id", user.id)
            .eq("action", "lesson.correction_submitted")
            .gte("created_at", new Date(Date.now() - 60_000).toISOString())
            .limit(1);
          if (recent.error)
            throw new TeamOperationError(
              "Corrections are temporarily unavailable. Please try again later.",
              503,
            );
          if (recent.data?.length)
            throw new TeamOperationError(
              "Please wait a minute before sending another correction.",
              429,
            );
          // Retain the suggestion before attempting the notification. No content is auto-edited.
          const saved = await db.from("platform_audit_events").insert({
            actor_user_id: user.id,
            action: "lesson.correction_submitted",
            detail: prepared.data,
          });
          if (saved.error)
            throw new TeamOperationError(
              "Your correction could not be saved. Please try again.",
              503,
            );
          return json(
            await deliverLessonCorrection(
              prepared.data,
              { id: user.id, email: user.email! },
              request.signal,
            ),
          );
        } catch (error) {
          return scopedTeamError(error);
        }
      },
    },
  },
});
