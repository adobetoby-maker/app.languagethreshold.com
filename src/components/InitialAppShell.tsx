/** Public content only: authentication and learner data remain behind restoration. */
export function InitialAppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="startup-shell">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <span className="text-lg font-semibold">Language Threshold</span>
        <a
          href="/pricing"
          className="min-h-11 rounded-lg px-3 py-3 text-sm font-semibold text-gold-ink underline"
        >
          Pricing
        </a>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12" aria-busy="true">
        <p className="mb-4 text-sm font-semibold text-gold-ink">
          Job-specific language training for nurses and foremen
        </p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
          Practice the conversations your work actually needs.
        </h1>
        <p role="status" className="mt-8 text-base text-muted-foreground">
          Loading your learning space…
        </p>
      </main>
    </div>
  );
}
