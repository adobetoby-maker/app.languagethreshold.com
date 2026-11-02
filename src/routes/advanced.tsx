import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, FolderLock, GraduationCap } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/advanced")({
  component: AdvancedPage,
});

function AdvancedPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:border-gold/50"
          >
            <ArrowLeft className="h-4 w-4" /> Back to learning
          </Link>
          <ThemeToggle />
        </header>

        <section className="py-12 sm:py-16">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-gold-ink">
            Optional tools
          </p>
          <div className="mt-3 flex items-start gap-3">
            <GraduationCap className="mt-1 h-8 w-8 shrink-0 text-gold-ink" />
            <div>
              <h1 className="font-display text-4xl sm:text-5xl">Advanced</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                Bring in your own material when the core lessons feel comfortable. These tools stay
                separate so early learners can focus on the next clear step.
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          <Link
            to="/documents"
            className="group rounded-2xl border border-border/70 bg-card/50 p-6 transition-colors hover:border-gold/50"
          >
            <FileText className="h-7 w-7 text-gold-ink" />
            <h2 className="mt-5 text-2xl font-semibold">Documents</h2>
            <p className="mt-2 leading-6 text-muted-foreground">
              Upload or paste a reading, translate it side by side, save notes, and study assigned
              team readings.
            </p>
            <span className="mt-6 inline-block text-sm font-semibold text-gold-ink group-hover:underline">
              Open Documents →
            </span>
          </Link>

          <Link
            to="/team"
            className="group rounded-2xl border border-border/70 bg-card/50 p-6 transition-colors hover:border-gold/50"
          >
            <FolderLock className="h-7 w-7 text-gold-ink" />
            <h2 className="mt-5 text-2xl font-semibold">Team assignments</h2>
            <p className="mt-2 leading-6 text-muted-foreground">
              Team leads can grant the complete Documents workspace or assign individual readings to
              each learner.
            </p>
            <span className="mt-6 inline-block text-sm font-semibold text-gold-ink group-hover:underline">
              Open team workspace →
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}
