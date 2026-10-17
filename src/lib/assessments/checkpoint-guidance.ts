import type { Checkpoint } from "./core";

export interface ScheduledCheckpoint {
  id: string;
  checkpoint: Checkpoint;
  due_date: string;
  status: string;
  ready: boolean;
  attempts: readonly { status: string; submitted_at: string | null }[];
}
export interface CheckpointGuidance {
  checkpoint: ScheduledCheckpoint | null;
  status: string;
  detail: string;
}
const order = {entrance: 0, day45: 1, day90: 2};

function validDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const stamp = Date.parse(`${date}T12:00:00Z`);
  return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0,10) === date;
}

/** Match the server's enrollment-timezone calendar day, never the browser's zone. */
export function assessmentDateKey(now: number, timezone: string): string | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {timeZone: timezone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(now));
    const part = (type: string) => parts.find(p => p.type === type)?.value;
    const key = `${part("year")}-${part("month")}-${part("day")}`;
    return validDate(key) ? key : null;
  } catch { return null; }
}

/** Scheduling guidance is not a score, passing decision or permission to start. */
export function nextCheckpointGuidance(plan: {
  status: string;
  timezone: string;
  checkpoints: readonly ScheduledCheckpoint[];
}, now: number): CheckpointGuidance {
  if (plan.status !== "active") return {
    checkpoint: null,
    status: plan.status === "paused" ? "Plan paused" : "Plan archived",
    detail: "Checkpoint dates and saved attempts below are shown for reference.",
  };
  if (!plan.checkpoints.length) return {checkpoint:null,status:"No checkpoints scheduled",detail:"Open the plan details to check its assessment schedule."};
  const remaining = plan.checkpoints.filter(cp => cp.status !== "exempt" && !cp.attempts.some(a => Boolean(a.submitted_at)));
  if (!remaining.length) return {
    checkpoint:null,status:"Scheduled checkpoints submitted or exempt",
    detail:"Submitted work may still need scoring or review. Retakes do not erase an earlier submission.",
  };
  if (remaining.some(cp => !validDate(cp.due_date))) return {checkpoint:null,status:"Schedule needs checking",detail:"A checkpoint date could not be read. Check the plan before relying on a due-date label."};
  const cp = [...remaining].sort((a,b) => a.due_date.localeCompare(b.due_date) || order[a.checkpoint] - order[b.checkpoint])[0];
  if (cp.attempts.some(a => a.status === "in_progress")) return {
    checkpoint:cp,status:"Saved attempt in progress",
    detail:"The saved attempt can be opened below. Content availability is shown separately.",
  };
  if (!cp.ready) return {
    checkpoint:cp,status:"Content not yet available",
    detail:"Reviewed exam content is required before an official start. Keep practicing lessons; this is a content gap, not learner lateness.",
  };
  const today = assessmentDateKey(now,plan.timezone);
  if (!today) return {checkpoint:cp,status:"Schedule needs checking",detail:"The plan's timezone could not be read. The recommended date is shown below."};
  return {
    checkpoint:cp,
    status:cp.due_date < today ? "Recommended date passed" : cp.due_date === today ? "Due today" : "Upcoming",
    detail:"Available for a new attempt. Previous lessons remain available.",
  };
}
