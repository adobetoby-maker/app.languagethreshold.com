import { ArrowRight, BellRing, Layers3 } from "lucide-react";
import { buildLearningReminderContext } from "@/lib/learning-reminders";
import { useApp } from "@/state/app-state";

export function LessonStackCard() {
  const { state, dispatch } = useApp();
  const context = buildLearningReminderContext(state);
  const stack = context.stack;

  if (!stack) {
    return (
      <section className="rounded-2xl border border-gold/25 bg-gold/5 p-5">
        <div className="flex items-start gap-3">
          <Layers3 className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
          <div className="flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
              Lesson stack
            </p>
            <h2 className="mt-1 font-serif text-xl text-foreground">Choose your first stack</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a specialty module to get an exact lesson countdown and a next lesson.
            </p>
            <button
              type="button"
              onClick={() => dispatch({ type: "SET_TAB", payload: "modules" })}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2 text-xs font-semibold text-gold"
            >
              Choose a stack <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>
    );
  }

  const percent = stack.totalLessons
    ? Math.round((stack.completedLessons / stack.totalLessons) * 100)
    : 0;

  return (
    <section className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 via-card/70 to-card/40 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/35 bg-gold/10">
          <Layers3 className="h-4.5 w-4.5 text-gold" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
                Active lesson stack
              </p>
              <h2 className="mt-1 font-serif text-xl text-foreground">{stack.name}</h2>
            </div>
            <div className="text-right">
              <p className="font-display text-3xl text-gold tabular-nums">
                {stack.remainingLessons}
              </p>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                lessons left
              </p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-border/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-soft to-gold transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
            <span>{stack.completedLessons} completed</span>
            <span>{stack.totalLessons} total</span>
          </div>
          {stack.nextLessonTitle && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-border/60 bg-background/35 p-3">
              <BellRing className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                  Up next
                </p>
                <p className="mt-0.5 text-sm text-foreground">{stack.nextLessonTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => dispatch({ type: "SET_TAB", payload: "guide" })}
                className="min-h-11 shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-gold hover:bg-gold/10"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
