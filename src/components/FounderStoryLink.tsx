import { Link } from "@tanstack/react-router";

export function FounderStoryLink() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-left text-sm text-foreground">
      <p className="font-semibold">Toby Anderton</p>
      <p className="mt-1 leading-relaxed text-muted-foreground">
        Orthopedic surgeon and linguist, building language practice around the conversations people
        need on the job.
      </p>
      <Link
        to="/founder"
        className="mt-2 inline-flex min-h-11 items-center font-semibold text-gold-ink underline underline-offset-4"
      >
        Why I built Language Threshold
      </Link>
    </div>
  );
}
