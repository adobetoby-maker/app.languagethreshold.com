// Built by TAC — 2026-10-23
// Exams v2 learner API (start, resume, answer, save, submit, result, claim). All logic and every
// guard lives in src/lib/exams2/server.ts; this file only wires the service-role client, auth and
// the shared request budget.
import { createFileRoute } from "@tanstack/react-router";
import { consumeServerRequestBudget } from "@/lib/speaking-security";
import {
  authenticatedTeamUser,
  readPlatformRole,
  teamAdminClient,
  TeamOperationError,
} from "@/lib/team-server";
import { isPlatformOwnerEmail } from "@/lib/owner-guards-server";
import {
  examCheckResponse,
  examErrorResponse,
  ExamApiError,
  examJson,
  examServiceFetch,
  examsV2Enabled,
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
          // The kill switch answers before any database client is built, so the exams page can tell
          // "switched off" (it shows the previous page) from a real outage.
          if (!examsV2Enabled(env)) {
            void request.body?.cancel().catch(() => {});
            return examJson({ error: "Exams aren't available yet.", code: "disabled" }, 404);
          }
          const db = teamAdminClient(examServiceFetch(request.signal, 8 * 1024 * 1024), request);
          let signedIn: { id: string; email?: string | null; confirmed: boolean } | null = null;
          return await examCheckResponse(request, {
            db,
            env,
            clientIp: trustedExamClientIp(request, env),
            authenticate: async () => {
              if (!request.headers.get("authorization")) return null;
              try {
                const user = await authenticatedTeamUser(request, db);
                signedIn = { id: user.id, email: user.email, confirmed: !!user.email_confirmed_at };
                return { id: user.id };
              } catch (error) {
                throw asExamError(error);
              }
            },
            // Platform staff (any platform role, or the confirmed owner account) can start any
            // form to preview it. A failed role lookup counts as "not staff".
            isStaff: async (userId) => {
              const who = signedIn as {
                id: string;
                email?: string | null;
                confirmed: boolean;
              } | null;
              if (who?.id === userId && who.confirmed && isPlatformOwnerEmail(who.email))
                return true;
              return Boolean((await readPlatformRole(db, userId))?.role);
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
