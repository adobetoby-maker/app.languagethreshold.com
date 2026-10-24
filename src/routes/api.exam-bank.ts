// Built by TAC — 2026-10-23
// Owner-only exams v2 bank list, preview and approval. The platform-owner check runs before any
// parsing or private read; every action is written to platform_audit_events.
import { createFileRoute } from "@tanstack/react-router";
import {
  authenticatedTeamUser,
  requirePlatformOwner,
  teamAdminClient,
  TeamOperationError,
} from "@/lib/team-server";
import {
  examBankResponse,
  examErrorResponse,
  ExamApiError,
  examServiceFetch,
} from "@/lib/exams2/server";

const asExamError = (error: unknown) =>
  error instanceof TeamOperationError
    ? new ExamApiError(
        error.status === 499 ? 499 : error.status === 503 ? 503 : 403,
        error.message,
        "auth",
      )
    : error;

async function handle(request: Request) {
  try {
    const db = teamAdminClient(examServiceFetch(request.signal), request);
    return await examBankResponse(request, {
      db,
      requireOwner: async () => {
        try {
          const actor = await authenticatedTeamUser(request, db);
          await requirePlatformOwner(db, actor);
          return { id: actor.id };
        } catch (error) {
          throw asExamError(error);
        }
      },
      audit: async (actorId, action, detail) => {
        // Same row as team-server's audit(), but a failed insert is surfaced (action id only).
        const { error } = await db
          .from("platform_audit_events")
          .insert({ actor_user_id: actorId, action, organization_id: null, detail });
        if (error) console.error(`Exam bank audit event could not be recorded: ${action}`);
      },
    });
  } catch (error) {
    return examErrorResponse(asExamError(error));
  }
}

export const Route = createFileRoute("/api/exam-bank")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
