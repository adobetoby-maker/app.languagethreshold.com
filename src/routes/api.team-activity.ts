import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { prepareTeamJson, MAX_TEAM_ACTIVITY_BYTES } from "@/lib/team-request";
import { getModule } from "@/data/modules";
import { getCurriculum } from "@/data/curriculum";
import { authenticatedUser, json, teamAdminClient, teamError } from "@/lib/team-server";
import { maybeIssueRoofingCertificate } from "@/lib/team-certificate";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("interval"),
    moduleId: z.string().max(80),
    activity: z.string().max(60),
    startedAt: z.string().datetime(),
    activeSeconds: z.number().int().min(1).max(30),
    idempotencyKey: z.string().uuid(),
  }),
  z.object({
    action: z.literal("lesson_start"),
    moduleId: z.string().max(80),
    lessonNumber: z.number().int().min(1).max(1000),
  }),
  z.object({
    action: z.literal("lesson"),
    moduleId: z.string().max(80),
    lessonNumber: z.number().int().min(1).max(1000),
    sessions: z.record(z.string().uuid()),
  }),
]);

export const Route = createFileRoute("/api/team-activity")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const prepared = await prepareTeamJson(request, schema, MAX_TEAM_ACTIVITY_BYTES);
        if (prepared.response) return prepared.response;
        const body = prepared.data;
        try {
          const db = teamAdminClient();
          const user = await authenticatedUser(request, db);
          if (body.moduleId !== "core" && !getModule(body.moduleId))
            throw new Error("Unknown module.");
          if (body.action === "interval") {
            const when = new Date(body.startedAt).getTime();
            if (!Number.isFinite(when) || when > Date.now() + 5000 || when < Date.now() - 120000)
              throw new Error("Activity interval is outside the allowed window.");
            const { error: siteError } = await db.from("platform_activity_intervals").upsert(
              {
                user_id: user.id,
                module_id: body.moduleId,
                activity: body.activity,
                started_at: body.startedAt,
                active_seconds: body.activeSeconds,
                idempotency_key: body.idempotencyKey,
              },
              { onConflict: "idempotency_key", ignoreDuplicates: true },
            );
            if (siteError) throw siteError;
          }
          const memberships =
            body.action === "interval"
              ? await db
                  .from("team_members")
                  .select("organization_id")
                  .eq("user_id", user.id)
                  .eq("role", "learner")
                  .eq("status", "active")
              : await db
                  .from("team_assignments")
                  .select("organization_id")
                  .eq("user_id", user.id)
                  .eq("module_id", body.moduleId);
          if (memberships.error) throw memberships.error;
          if (!memberships.data?.length) return json({ recorded: 0 });
          let recorded = 0;
          const sessions: Record<string, string> = {};
          for (const assignment of memberships.data) {
            const [{ data: member }, { data: entitlement }] = await Promise.all([
              db
                .from("team_members")
                .select("status,role")
                .eq("organization_id", assignment.organization_id)
                .eq("user_id", user.id)
                .maybeSingle(),
              db
                .from("team_entitlements")
                .select("status,period_end")
                .eq("organization_id", assignment.organization_id)
                .maybeSingle(),
            ]);
            if (
              member?.status !== "active" ||
              member.role !== "learner" ||
              !(
                entitlement?.status === "active" ||
                (entitlement?.status === "manual" &&
                  !!entitlement.period_end &&
                  new Date(entitlement.period_end).getTime() > Date.now())
              )
            )
              continue;
            if (body.action === "interval") {
              const { error: insertError } = await db.from("team_activity_intervals").upsert(
                {
                  organization_id: assignment.organization_id,
                  user_id: user.id,
                  module_id: body.moduleId,
                  activity: body.activity,
                  started_at: body.startedAt,
                  active_seconds: body.activeSeconds,
                  idempotency_key: body.idempotencyKey,
                },
                { onConflict: "organization_id,idempotency_key", ignoreDuplicates: true },
              );
              if (insertError) throw insertError;
            } else if (body.action === "lesson_start") {
              const curriculum = getCurriculum(body.moduleId);
              if (!curriculum?.lessons.some((lesson) => lesson.n === body.lessonNumber))
                throw new Error("Unknown lesson.");
              const { data: previous, error: progressError } = await db
                .from("team_lesson_completions")
                .select("lesson_number")
                .eq("organization_id", assignment.organization_id)
                .eq("user_id", user.id)
                .eq("module_id", body.moduleId);
              if (progressError) throw progressError;
              const done = new Set(previous?.map((item) => item.lesson_number) ?? []);
              if (
                Array.from({ length: body.lessonNumber - 1 }, (_, i) => i + 1).some(
                  (n) => !done.has(n),
                )
              )
                throw new Error(
                  "Finish earlier assigned lessons before this one counts toward a certificate.",
                );
              const { data: session, error: sessionError } = await db
                .from("team_lesson_sessions")
                .insert({
                  organization_id: assignment.organization_id,
                  user_id: user.id,
                  module_id: body.moduleId,
                  lesson_number: body.lessonNumber,
                })
                .select("id")
                .single();
              if (sessionError || !session)
                throw sessionError ?? new Error("Could not start lesson session.");
              sessions[assignment.organization_id] = session.id;
            } else {
              const sessionId = body.sessions[assignment.organization_id];
              if (!sessionId)
                throw new Error("Start this lesson in the team workspace before completing it.");
              const { data: session, error: sessionError } = await db
                .from("team_lesson_sessions")
                .select("id,started_at,completed_at")
                .eq("id", sessionId)
                .eq("organization_id", assignment.organization_id)
                .eq("user_id", user.id)
                .eq("module_id", body.moduleId)
                .eq("lesson_number", body.lessonNumber)
                .single();
              if (sessionError || !session)
                throw new Error("Lesson session is invalid or already completed.");
              if (session.completed_at) {
                // An exact accepted session can be replayed after a lost response.
                // Current membership/entitlement and every session scope were checked above.
                const { data: completion, error: completionError } = await db
                  .from("team_lesson_completions")
                  .select("lesson_number")
                  .eq("organization_id", assignment.organization_id)
                  .eq("user_id", user.id)
                  .eq("module_id", body.moduleId)
                  .eq("lesson_number", body.lessonNumber)
                  .maybeSingle();
                if (completionError || !completion)
                  throw new Error("Lesson session completion could not be verified.");
                recorded++;
                continue;
              }
              if (Date.now() - new Date(session.started_at).getTime() < 45000)
                throw new Error(
                  "Spend a little more time practicing before finishing this lesson.",
                );
              const { data: intervals, error: activityError } = await db
                .from("team_activity_intervals")
                .select("active_seconds")
                .eq("organization_id", assignment.organization_id)
                .eq("user_id", user.id)
                .eq("module_id", body.moduleId)
                .gte("started_at", session.started_at)
                .limit(100);
              if (activityError) throw activityError;
              if ((intervals ?? []).reduce((total, item) => total + item.active_seconds, 0) < 30)
                throw new Error(
                  "Use the lesson tools for at least 30 active seconds before finishing.",
                );
              const { error: insertError } = await db.from("team_lesson_completions").upsert(
                {
                  organization_id: assignment.organization_id,
                  user_id: user.id,
                  module_id: body.moduleId,
                  lesson_number: body.lessonNumber,
                },
                {
                  onConflict: "organization_id,user_id,module_id,lesson_number",
                  ignoreDuplicates: true,
                },
              );
              if (insertError) throw insertError;
              await db
                .from("team_lesson_sessions")
                .update({ completed_at: new Date().toISOString() })
                .eq("id", sessionId);
              if (body.moduleId === "roofing")
                await maybeIssueRoofingCertificate(db, assignment.organization_id, user.id);
            }
            recorded++;
          }
          return json({ recorded, sessions });
        } catch (error) {
          return teamError(error);
        }
      },
    },
  },
});
