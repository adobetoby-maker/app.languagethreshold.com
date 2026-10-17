import { useState } from "react";
import { ExamsArea } from "./ExamsArea";
export function TeamExamsPanel({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="my-6 rounded-2xl border border-gold/30 bg-card/50 p-4 sm:p-6"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="min-h-11 cursor-pointer py-2 text-lg font-semibold">
        Exams and assessed progress · entrance / day 45 / day 90
      </summary>
      <p className="my-3 text-sm text-muted-foreground">
        Review this team’s language evidence alongside learning participation. Personal exams stay
        private. Draft tracks are labeled until their reviews are complete.
      </p>
      {open && <ExamsArea orgId={orgId} embedded />}
    </details>
  );
}
