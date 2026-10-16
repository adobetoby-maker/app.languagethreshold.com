import type { TeamDb } from "@/lib/team-server";
import { cleanupAssessmentSpeech } from "./speech-cleanup.ts";
export async function runSpeechCleanup(
  db: TeamDb,
  source: "operator" | "scheduled_endpoint",
  id: string,
  workDb: TeamDb = db,
) {
  const begun = await db.rpc("assessment_begin_cleanup_run", { p_id: id, p_source: source });
  if (begun.error) throw new Error("Cleanup run could not be recorded. No work started.");
  if (!begun.data)
    return {
      busy: true as const,
      selected: 0,
      deleted: 0,
      failed: 0,
      mayHaveMore: false,
      batches: 0,
    };
  const result = {
    busy: false as const,
    selected: 0,
    deleted: 0,
    failed: 0,
    mayHaveMore: false,
    batches: 0,
  };
  try {
    for (let i = 0; i < 10; i++) {
      const batch = await cleanupAssessmentSpeech(workDb, true);
      if (batch.dryRun) throw new Error("Unexpected cleanup mode.");
      result.batches++;
      result.selected += batch.selected;
      result.deleted += batch.deleted;
      result.failed += batch.failed;
      result.mayHaveMore = batch.mayHaveMore;
      if (batch.failed || !batch.mayHaveMore) break;
    }
  } catch {
    await db.rpc("assessment_finish_cleanup_run", {
      p_id: id,
      p_selected: result.selected,
      p_deleted: result.deleted,
      p_failed: result.failed,
      p_more: result.mayHaveMore,
      p_error: true,
    });
    throw new Error(
      "Cleanup failed. Inspect its run history and retry; pending tombstones stay hidden.",
    );
  }
  const finished = await db.rpc("assessment_finish_cleanup_run", {
    p_id: id,
    p_selected: result.selected,
    p_deleted: result.deleted,
    p_failed: result.failed,
    p_more: result.mayHaveMore,
    p_error: false,
  });
  if (finished.error)
    throw new Error("Cleanup run completion could not be recorded. Check history before retrying.");
  return result;
}
export type CleanupRun = {
  source: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  selected_count: number;
  deleted_count: number;
  failed_count: number;
  may_have_more: boolean;
  failure_code: string | null;
};
export function cleanupRunHealth(runs: CleanupRun[], now = Date.now()) {
  const scheduled = runs.find((r) => r.source === "scheduled_endpoint");
  if (!scheduled) return "not_observed" as const;
  if (scheduled.status === "running")
    return now - Date.parse(scheduled.started_at) > 2 * 60 * 1000
      ? ("attention" as const)
      : ("running" as const);
  if (scheduled.status !== "succeeded") return "attention" as const;
  const age = now - Date.parse(scheduled.finished_at ?? "");
  return Number.isFinite(age) && age >= 0 && age <= 26 * 60 * 60 * 1000
    ? ("healthy" as const)
    : ("overdue" as const);
}

export function boundedCleanupFetch(requestMs: number, deadline?: AbortSignal): typeof fetch {
  return (input, init) =>
    fetch(input, {
      ...init,
      signal: AbortSignal.any([
        AbortSignal.timeout(requestMs),
        ...(deadline ? [deadline] : []),
        ...(init?.signal ? [init.signal] : []),
      ]),
    });
}
