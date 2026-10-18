/** Build-time only: no cron is emitted until an explicit production rollout enables it. */
export function assessmentCleanupSchedule(env) {
  if (env.LT_ASSESSMENT_CLEANUP_SCHEDULE !== "enabled") return {};
  if (
    env.LT_ASSESSMENT_CLEANUP_EXECUTION !== "enabled" ||
    !env.CRON_SECRET ||
    Buffer.byteLength(env.CRON_SECRET) < 32
  )
    throw new Error(
      "Cleanup scheduling requires execution enabled and a configured operator secret of at least 32 bytes. No schedule was emitted.",
    );
  if (env.LT_DEPLOYMENT_STAGE === "preview")
    throw new Error("Cleanup schedules cannot be emitted for a preview build.");
  return { crons: [{ path: "/api/exam-cleanup", schedule: "15 0 * * *" }] };
}
