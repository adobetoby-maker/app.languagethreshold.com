import { Layers } from "lucide-react";
import type { MorphologyBreakdown } from "@/fns/grammar.functions";
import { useApp } from "@/state/app-state";

/**
 * Visual morphology breakdown — shows the unchanging ROOT in gold and the
 * changing ENDING in ivory, so learners can see at a glance which part of
 * a word transforms across conjugations / declensions.
 *
 * Example (Japanese): "i" stays put, "ku / kimasu / kanai / kō / keba" change.
 */
export function MorphologyCard({ morph }: { morph: MorphologyBreakdown }) {
  const { state } = useApp();
  // Defense-in-depth alongside the server-side zod validation: cached
  // lessons written before that validation existed can still carry a
  // morphology object with missing base/table — render defensively rather
  // than crash the whole lesson view.
  const base = morph.base ?? { word: "", root: "", ending: "", gloss: "" };
  return (
    <div className="mb-7 overflow-hidden rounded-xl border border-gold/30 bg-card/40">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/50 bg-card/60 px-5 py-3">
        <Layers className="h-3.5 w-3.5 text-gold" strokeWidth={1.8} />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
          Root &amp; Ending · what changes
        </span>
      </div>

      <div className="px-5 py-5">
        <p className="mb-5 font-display text-[15px] italic leading-relaxed text-foreground/85">
          {morph.summary}
        </p>

        {/* Base form spotlight */}
        <div className="mb-6 rounded-lg border border-border/50 bg-background/40 px-4 py-4">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Base form · {base.gloss}
          </div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <ChunkedWord root={base.root} ending={base.ending} size="lg" />
            {base.romanization && (
              <span className="font-mono text-[12px] tracking-wide text-muted-foreground">
                {base.romanization}
              </span>
            )}
          </div>
        </div>

        {/* Conjugation table */}
        <div className="overflow-hidden rounded-lg border border-border/50">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-card/60 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <th className="px-4 py-2 font-normal">Form</th>
                <th className="px-4 py-2 font-normal">Root + ending</th>
                <th className="hidden px-4 py-2 font-normal sm:table-cell">
                  {state.nativeLanguage}
                </th>
              </tr>
            </thead>
            <tbody>
              {(morph.table ?? []).map((row, i) => (
                <tr
                  key={i}
                  className="border-t border-border/40 align-top transition-colors hover:bg-gold/5"
                >
                  <td className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-foreground/70">
                    {row.form}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <ChunkedWord root={row.root} ending={row.ending} />
                      {row.romanization && (
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {row.romanization}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 font-display text-[12px] italic text-muted-foreground sm:hidden">
                      {row.english}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 font-display text-[14px] italic text-muted-foreground sm:table-cell">
                    {row.english}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-gold" />
            root (stays the same)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-foreground/70" />
            ending (changes)
          </span>
        </div>
      </div>
    </div>
  );
}

function ChunkedWord({
  root,
  ending,
  size = "md",
}: {
  root: string;
  ending: string;
  size?: "md" | "lg";
}) {
  const cls =
    size === "lg"
      ? "font-display text-[28px] leading-tight"
      : "font-display text-[18px] leading-tight";
  return (
    <span className={cls}>
      <span className="font-semibold text-gold">{root}</span>
      <span className="mx-0.5 text-gold/40">·</span>
      <span className="text-foreground">{ending}</span>
    </span>
  );
}
