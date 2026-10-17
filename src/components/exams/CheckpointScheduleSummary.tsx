import { nextCheckpointGuidance, type ScheduledCheckpoint } from "@/lib/assessments/checkpoint-guidance";

export function CheckpointScheduleSummary({ plan, now }: {
  plan: {status:string;timezone:string;program_scope?:"full_module"|"support_units";checkpoints:ScheduledCheckpoint[]};
  now:number;
}) {
  const guidance = nextCheckpointGuidance(plan,now);
  const name = guidance.checkpoint
    ? plan.program_scope === "support_units"
      ? guidance.checkpoint.checkpoint === "entrance" ? "Before supporting practice" : "After supporting practice"
      : {entrance:"Entrance",day45:"Day 45",day90:"Day 90"}[guidance.checkpoint.checkpoint]
    : null;
  return (
    <div className="mt-3 rounded-xl border border-gold/25 bg-gold/5 p-3 text-sm" aria-label="Checkpoint schedule summary">
      <p className="font-semibold">{name ? `Next scheduled checkpoint · ${name}` : guidance.status}</p>
      {guidance.checkpoint && (
        <p className="mt-1 text-xs text-muted-foreground">
          Recommended <time dateTime={guidance.checkpoint.due_date}>{guidance.checkpoint.due_date}</time> · {plan.timezone}
        </p>
      )}
      {name && <p className="mt-1">{guidance.status}</p>}
      <p className="mt-1 text-xs text-muted-foreground">{guidance.detail}</p>
    </div>
  );
}
