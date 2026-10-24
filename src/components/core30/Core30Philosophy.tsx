// Built by TAC — 2026-10-15
import { useMemo, type ComponentType } from "react";
import { ArrowLeft, Brain, Eye, Headphones, Keyboard, Mic, PenLine } from "lucide-react";
import {
  buildCore30Philosophy,
  type PhilosophyStage,
  type PhilosophyWay,
  type PhilosophyWayId,
} from "@/data/core30-philosophy";
import { getCurriculum } from "@/data/curriculum";
import { useApp } from "@/state/app-state";
import { cn } from "@/lib/utils";

type IconType = ComponentType<{
  className?: string;
  strokeWidth?: number;
  "aria-hidden"?: boolean;
}>;

const WAY_ICONS: Record<PhilosophyWayId, IconType> = {
  see: Eye,
  recall: Brain,
  hear: Headphones,
  type: Keyboard,
  say: Mic,
  write: PenLine,
};

const MONO_LABEL = "font-mono text-[10px] uppercase tracking-[0.22em]";

function SectionHeading({ id, children }: { id: string; children: string }) {
  return (
    <h2
      id={id}
      className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
    >
      {children}
    </h2>
  );
}

function StageTag({ stage }: { stage: PhilosophyStage }) {
  return <span className={cn(MONO_LABEL, "text-muted-foreground")}>{stage}</span>;
}

function WayCard({ way, wide }: { way: PhilosophyWay; wide: boolean }) {
  const Icon = WAY_ICONS[way.id];
  return (
    <li
      data-testid={`core30-way-${way.id}`}
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border border-border bg-card p-4 sm:p-5",
        wide && "sm:col-span-2",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold/40 bg-gold/10 text-gold-ink">
          <Icon className="h-5 w-5" strokeWidth={1.7} aria-hidden />
        </span>
        <h3 className="font-display text-lg font-semibold text-foreground">{way.label}</h3>
        <span className="ml-auto">
          <StageTag stage={way.stage} />
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-foreground">{way.doIt}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">Why it helps. </span>
        {way.why}
      </p>

      <div className="mt-4 rounded-xl border border-gold/25 bg-gold/[0.06] px-3.5 py-3">
        <p className={cn(MONO_LABEL, "text-gold-ink")}>
          {way.exampleLabel ?? `Example \u00b7 Lesson ${way.example.lesson}`}
        </p>
        <p className="mt-1 font-display text-base italic leading-snug text-foreground">
          {way.example.es}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{way.example.en}</p>
        {way.exampleNote ? (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{way.exampleNote}</p>
        ) : null}
      </div>
    </li>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-foreground">
          <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold" />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Core30Philosophy({ onBack }: { onBack?: () => void }) {
  const { state } = useApp();
  const moduleId = state.activeModuleId;
  const language = state.selectedLanguage;
  const nativeLanguage = state.nativeLanguage;
  const { opening, ways, together, mastery, routine, teamLeads } = useMemo(() => {
    const curriculum = moduleId ? getCurriculum(moduleId) : null;
    return buildCore30Philosophy({
      moduleId,
      language,
      nativeLanguage,
      headline: curriculum?.displayHeadline ?? curriculum?.headline ?? null,
      threshold: curriculum?.threshold ?? null,
    });
  }, [moduleId, language, nativeLanguage]);

  return (
    <article
      data-testid="core30-philosophy"
      aria-labelledby="core30-philosophy-title"
      className="mx-auto w-full max-w-[680px] space-y-10 pb-12 text-foreground"
    >
      <header>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            data-testid="core30-philosophy-back"
            className="-ml-2 mb-4 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden />
            Back
          </button>
        ) : null}
        <p className={cn(MONO_LABEL, "text-gold-ink")}>{opening.eyebrow}</p>
        <h1
          id="core30-philosophy-title"
          className="mt-2 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
        >
          {opening.title}
        </h1>
        <blockquote className="mt-5 border-l-2 border-gold pl-4 font-display text-lg leading-snug text-foreground">
          {opening.promise}
        </blockquote>
        <div className="mt-5 space-y-3">
          {opening.body.map((p) => (
            <p key={p} className="text-[15px] leading-relaxed text-muted-foreground">
              {p}
            </p>
          ))}
        </div>
      </header>

      <section aria-labelledby="core30-ways-title">
        <SectionHeading id="core30-ways-title">{ways.title}</SectionHeading>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{ways.intro}</p>
        <ol className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ways.items.map((way, i) => (
            <WayCard key={way.id} way={way} wide={i === 0 || i === ways.items.length - 1} />
          ))}
        </ol>
      </section>

      <section aria-labelledby="core30-together-title">
        <SectionHeading id="core30-together-title">{together.title}</SectionHeading>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{together.intro}</p>
        <ol className="mt-4 space-y-0">
          {together.stages.map((step, i) => (
            <li key={step.stage} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/50 font-mono text-xs text-gold-ink">
                  {i + 1}
                </span>
                {i < together.stages.length - 1 ? (
                  <span aria-hidden className="w-px flex-1 bg-border" />
                ) : null}
              </div>
              <div className={cn("min-w-0 flex-1", i < together.stages.length - 1 && "pb-5")}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="font-display text-base font-semibold">{step.stage}</h3>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    {step.ways.map((id) => {
                      const Icon = WAY_ICONS[id];
                      const label = ways.items.find((w) => w.id === id)?.label ?? id;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 text-xs"
                          data-testid={`core30-stage-${step.stage.toLowerCase()}-${id}`}
                        >
                          <Icon className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
                          {label}
                        </span>
                      );
                    })}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-5 rounded-xl border border-gold/30 bg-gold/[0.06] px-4 py-3 text-sm font-medium leading-relaxed text-foreground">
          {together.mastery}
        </p>
      </section>

      <section aria-labelledby="core30-mastery-title">
        <SectionHeading id="core30-mastery-title">{mastery.title}</SectionHeading>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{mastery.intro}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-gold/30 bg-gold/[0.05] p-4 sm:p-5">
            <h3 className="font-display text-base font-semibold">{mastery.you.heading}</h3>
            <BulletList items={mastery.you.items} />
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <h3 className="font-display text-base font-semibold">{mastery.app.heading}</h3>
            <BulletList items={mastery.app.items} />
          </div>
        </div>
        <h3 className="mt-6 font-display text-base font-semibold">{mastery.rhythm.heading}</h3>
        <dl className="mt-3 divide-y divide-border border-y border-border">
          {mastery.rhythm.items.map((item) => (
            <div key={item.heading} className="py-3">
              <dt className="text-sm font-semibold text-foreground">{item.heading}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="core30-routine-title">
        <SectionHeading id="core30-routine-title">{routine.title}</SectionHeading>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{routine.intro}</p>
        <div className="mt-4 space-y-3">
          {routine.days.map((day) => (
            <div
              key={day.label}
              data-testid={`core30-routine-${day.label.toLowerCase().replace(/\s+/g, "-")}`}
              className="rounded-2xl border border-border bg-card p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="font-display text-base font-semibold">{day.label}</h3>
                <span className={cn(MONO_LABEL, "text-gold-ink")}>{day.length}</span>
              </div>
              <ol className="mt-3 space-y-2.5">
                {day.steps.map((step, i) => (
                  <li key={step} className="flex gap-3 text-sm leading-relaxed text-foreground">
                    <span className="mt-0.5 w-5 shrink-0 font-mono text-xs text-gold-ink">
                      {i + 1}
                    </span>
                    <span className="min-w-0">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        <h3 className="mt-6 font-display text-base font-semibold">{routine.tipsHeading}</h3>
        <dl className="mt-3 divide-y divide-border border-y border-border">
          {routine.tips.map((tip) => (
            <div key={tip.heading} className="py-3">
              <dt className="text-sm font-semibold text-foreground">{tip.heading}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{tip.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        aria-labelledby="core30-leads-title"
        className="rounded-2xl border border-border bg-card p-4 sm:p-5"
      >
        <p className={cn(MONO_LABEL, "text-muted-foreground")}>Note</p>
        <h2 id="core30-leads-title" className="mt-1 font-display text-lg font-semibold">
          {teamLeads.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{teamLeads.text}</p>
      </section>
    </article>
  );
}
