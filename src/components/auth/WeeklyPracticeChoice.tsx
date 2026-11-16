export const WEEKLY_PRACTICE_URL = "https://juniorlinguist.com/free-downloads";

export function WeeklyPracticeChoice() {
  return (
    <section aria-label="Optional weekly practice for adults" className="rounded-xl border border-border bg-card p-4 text-foreground">
      <h2 className="mb-2 text-base font-semibold">Keep practicing once a week (optional)</h2>
      <p className="mb-3 text-sm leading-relaxed">Choose a Language Threshold adult series or a parent practice series. Weekly emails start only after you request and confirm a separate invitation. Your account does not subscribe you.</p>
      <a href={WEEKLY_PRACTICE_URL} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold underline underline-offset-4">Choose weekly practice →</a>
    </section>
  );
}
