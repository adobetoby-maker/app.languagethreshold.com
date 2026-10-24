// Built by TAC — 2026-10-23
// Exams v2 learner API (start, resume, answer, save, submit, result, claim). All logic and every
// guard lives in src/lib/exams2/server.ts; this file only wires the service-role client, auth and
// the shared request budget.
import { createFileRoute } from "@tanstack/react-router";
import { consumeServerRequestBudget } from "@/lib/speaking-security";
import { authenticatedTeamUser, teamAdminClient, TeamOperationError } from "@/lib/team-server";
import {
  examCheckResponse,
  examErrorResponse,
  ExamApiError,
  examServiceFetch,
  trustedExamClientIp,
} from "@/lib/exams2/server";

const asExamError = (error: unknown) =>
  error instanceof TeamOperationError
    ? new ExamApiError(
        error.status === 499 ? 499 : error.status === 503 ? 503 : 403,
        error.message,
        "auth",
      )
    : error;

export const Route = createFileRoute("/api/exam-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const env = process.env;
          const db = teamAdminClient(examServiceFetch(request.signal, 8 * 1024 * 1024), request);
          return await examCheckResponse(request, {
            db,
            env,
            clientIp: trustedExamClientIp(request, env),
            authenticate: async () => {
              if (!request.headers.get("authorization")) return null;
              try {
                const user = await authenticatedTeamUser(request, db);
                return { id: user.id };
              } catch (error) {
                throw asExamError(error);
              }
            },
            budget: (namespace, value, limit, windowSeconds) =>
              consumeServerRequestBudget(namespace, value, limit, windowSeconds, request.signal),
          });
        } catch (error) {
          return examErrorResponse(asExamError(error));
        }
      },
    },
  },
});
