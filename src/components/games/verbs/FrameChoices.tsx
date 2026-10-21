// Built by TAC — 2026-10-21
import { useEffect, useRef } from "react";

export const MAX_CHOICES = 6;

/** The option a number key picks: keys 1-6 map to positions, and disabled or missing options map to null. */
export function choiceForKey(
  key: string,
  options: { id: number }[],
  disabled: number[],
): number | null {
  if (!/^[1-6]$/.test(key)) return null;
  const option = options.slice(0, MAX_CHOICES)[Number(key) - 1];
  if (!option || disabled.includes(option.id)) return null;
  return option.id;
}

/** List mode: the frame as a numbered, keyboard-reachable list. Keys 1-6 pick. */
export function FrameChoices(p: {
  prompt: string;
  english: string;
  infinitive: string;
  options: { id: number; label: string }[];
  disabled: number[];
  onPick: (id: number) => void;
}) {
  const latest = useRef(p);
  latest.current = p;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      const id = choiceForKey(e.key, latest.current.options, latest.current.disabled);
      if (id === null) return;
      e.preventDefault();
      latest.current.onPick(id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section className="space-y-3" aria-label={`Choose the form of ${p.infinitive}`} data-testid="frame-choices">
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-gold">{p.infinitive}</div>
        <div className="font-display text-2xl text-foreground">{p.prompt}</div>
        <div className="text-sm text-muted-foreground">{p.english}</div>
      </div>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {p.options.slice(0, MAX_CHOICES).map((o, i) => {
          const off = p.disabled.includes(o.id);
          return (
            <li key={o.id}>
              <button
                type="button"
                data-choice={o.id}
                disabled={off}
                onClick={() => p.onPick(o.id)}
                className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left font-mono text-base text-card-foreground transition-colors duration-150 enabled:cursor-pointer enabled:hover:border-gold disabled:opacity-40"
              >
                <span className="text-xs text-gold">{i + 1}</span>
                <span>{o.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
