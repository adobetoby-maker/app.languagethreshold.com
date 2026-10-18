import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { prepareTeamJson, MAX_TEAM_ASSESSMENT_BYTES } from "@/lib/team-request";
import {
  authenticatedTeamUser,
  json,
  memberRole,
  teamAdminClient,
  scopedTeamError,
  TeamOperationError,
} from "@/lib/team-server";
import {
  drawRoofingQuestions,
  publicRoofingQuestion,
  scoreRoofingAnswers,
} from "@/lib/roofing-assessment";
import { maybeIssueRoofingCertificate } from "@/lib/team-certificate";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), orgId: z.string().uuid() }),
  z.object({
    action: z.literal("submit"),
    attemptId: z.string().uuid(),
    answers: z.record(z.string().max(300)),
  }),
]);

export const Route = createFileRoute("/api/team-assessment")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const prepared = await prepareTeamJson(request, bodySchema, MAX_TEAM_ASSESSMENT_BYTES);
        if (prepared.response) return prepared.response;
        const body = prepared.data;
        try {
          const db = teamAdminClient(undefined, request);
          const user = await authenticatedTeamUser(request, db);
          if (body.action === "start") {
            const member = await memberRole(db, body.orgId, user.id);
            if (!member || member.role !== "learner")
              throw new TeamOperationError("Assigned learner access required.", 403);
            const { data: entitlement, error: entitlementError } = await db
              .from("team_entitlements")
              .select("status,period_end")
              .eq("organization_id", body.orgId)
              .single();
            if (entitlementError) throw entitlementError;
            if (
              entitlement.status !== "active" &&
              !(
                entitlement.status === "manual" &&
                entitlement.period_end &&
                new Date(entitlement.period_end).getTime() > Date.now()
              )
            )
              throw new TeamOperationError("An active team plan is required for this test.");
            const { data: assignment } = await db
              .from("team_assignments")
              .select("id,require_certificate")
              .eq("organization_id", body.orgId)
              .eq("user_id", user.id)
              .eq("module_id", "roofing")
              .maybeSingle();
            if (!assignment)
              throw new TeamOperationError("Roofing Foreman is not assigned to you.");
            const { data: attempts, error } = await db
              .from("team_assessment_attempts")
              .select("id,question_ids,started_at,submitted_at")
              .eq("organization_id", body.orgId)
              .eq("user_id", user.id)
              .eq("module_id", "roofing")
              .order("started_at", { ascending: false })
              .limit(1);
            if (error) throw error;
            const latest = attempts?.[0];
            if (
              latest &&
              !latest.submitted_at &&
              Date.now() - new Date(latest.started_at).getTime() < 3600000
            )
              return json({
                attemptId: latest.id,
                questions: latest.question_ids.map((id: string) =>
                  publicRoofingQuestion(id, latest.id),
                ),
              });
            if (
              latest?.submitted_at &&
              Date.now() - new Date(latest.submitted_at).getTime() < 300000
            )
              throw new TeamOperationError(
                "Wait five minutes before another attempt so you can review the lessons.",
              );
            const { data: attempt, error: insertError } = await db
              .from("team_assessment_attempts")
              .insert({
                organization_id: body.orgId,
                user_id: user.id,
                module_id: "roofing",
                version: 1,
                question_ids: drawRoofingQuestions(),
                total: 25,
              })
              .select("id,question_ids")
              .single();
            if (insertError || !attempt)
              throw insertError ?? new TeamOperationError("Could not start test.");
            return json({
              attemptId: attempt.id,
              questions: attempt.question_ids.map((id: string) =>
                publicRoofingQuestion(id, attempt.id),
              ),
            });
          }
          const { data: attempt, error } = await db
            .from("team_assessment_attempts")
            .select("id,organization_id,user_id,module_id,question_ids,started_at,submitted_at")
            .eq("id", body.attemptId)
            .single();
          if (error || !attempt || attempt.user_id !== user.id || attempt.module_id !== "roofing")
            throw new TeamOperationError("Assessment attempt not found.");
          const member = await memberRole(db, attempt.organization_id, user.id);
          if (!member || member.role !== "learner")
            throw new TeamOperationError("Assigned learner access required.", 403);
          const { data: entitlement, error: entitlementError } = await db
            .from("team_entitlements")
            .select("status,period_end")
            .eq("organization_id", attempt.organization_id)
            .single();
          if (entitlementError) throw entitlementError;
          if (
            entitlement.status !== "active" &&
            !(
              entitlement.status === "manual" &&
              entitlement.period_end &&
              new Date(entitlement.period_end).getTime() > Date.now()
            )
          )
            throw new TeamOperationError("An active team plan is required for this test.");
          if (attempt.submitted_at)
            throw new TeamOperationError("This attempt has already been submitted.");
          if (Date.now() - new Date(attempt.started_at).getTime() > 3600000)
            throw new TeamOperationError("This attempt expired. Start a new test.");
          if (Object.keys(body.answers).some((key) => !attempt.question_ids.includes(key)))
            throw new TeamOperationError("Answers contain an unknown question.");
          const scored = scoreRoofingAnswers(attempt.question_ids, body.answers);
          const { data: saved, error: updateError } = await db
            .from("team_assessment_attempts")
            .update({
              answers: body.answers,
              area_scores: scored.areaScores,
              score: scored.correct,
              submitted_at: new Date().toISOString(),
            })
            .eq("id", attempt.id)
            .is("submitted_at", null)
            .select("id")
            .maybeSingle();
          if (updateError || !saved)
            throw updateError ?? new TeamOperationError("This attempt has already been submitted.");
          const certificateId = await maybeIssueRoofingCertificate(
            db,
            attempt.organization_id,
            user.id,
          );
          return json({
            correct: scored.correct,
            total: scored.total,
            passed: scored.correct >= 20,
            areaScores: scored.areaScores,
            certificateId,
          });
        } catch (error) {
          return scopedTeamError(error);
        }
      },
    },
  },
});
