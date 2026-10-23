// Small shared pieces for the owner area: styles, confirm step, CSV download and SVG charts.
// Charts are plain SVG/HTML (no chart library): one series each, gold marks, text in ink tokens.
import { useState, type ReactNode } from "react";
import { ownerNumber } from "@/lib/owner-format";

export const ownerPanel = "rounded-2xl border border-border/60 bg-card/50 p-4 sm:p-5";
export const ownerField =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground";
export const ownerButton =
  "cursor-pointer rounded-lg border border-border px-3 py-2 text-sm transition-colors duration-150 hover:border-gold disabled:cursor-not-allowed disabled:opacity-50";
export const ownerPrimary = ownerButton + " bg-gold font-semibold text-midnight";
export const ownerDanger =
  "cursor-pointer rounded-lg border border-red-600/60 px-3 py-2 text-sm text-red-700 transition-colors duration-150 hover:bg-red-600/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-300";

export function OwnerMessage({ error, notice }: { error?: string; notice?: string }) {
  return (
    <>
      {error && (
        <p
          role="alert"
          className="my-2 rounded-lg border border-red-500/50 p-3 text-sm text-red-700 dark:text-red-300"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="my-2 rounded-lg border border-emerald-500/50 p-3 text-sm text-emerald-800 dark:text-emerald-200"
        >
          {notice}
        </p>
      )}
    </>
  );
}

/**
 * Two-step action. With `phrase`, the owner must type it (case-insensitive) before Confirm
 * enables; without it, a plain second click confirms. Nothing runs on the first click.
 */
export function ConfirmAction({
  label,
  confirmLabel,
  description,
  phrase,
  phraseLabel,
  destructive = false,
  disabled = false,
  canConfirm = true,
  onConfirm,
  children,
}: {
  label: string;
  confirmLabel?: string;
  description: ReactNode;
  phrase?: string;
  phraseLabel?: string;
  destructive?: boolean;
  disabled?: boolean;
  /** Extra inputs inside the confirm step (e.g. a reason) gate only the final button. */
  canConfirm?: boolean;
  onConfirm: (typed: string) => void | Promise<unknown>;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const norm = (v: string) => v.trim().replace(/\s+/g, " ").toLowerCase();
  const ready = !phrase || (norm(phrase).length > 0 && norm(typed) === norm(phrase));
  if (!open)
    return (
      <button
        type="button"
        className={destructive ? ownerDanger : ownerButton}
        disabled={disabled}
        onClick={() => {
          setTyped("");
          setOpen(true);
        }}
      >
        {label}
      </button>
    );
  return (
    <div
      role="group"
      aria-label={`Confirm: ${label}`}
      className={
        "w-full rounded-xl border p-3 text-sm " +
        (destructive ? "border-red-600/60 bg-red-600/5" : "border-gold/50 bg-gold/5")
      }
    >
      <p className="font-semibold">{label}</p>
      <div className="mt-1 text-muted-foreground">{description}</div>
      {children}
      {phrase && (
        <label className="mt-3 block">
          {phraseLabel ?? "Type to confirm"}: <strong className="break-all">{phrase}</strong>
          <input
            className={ownerField + " mt-1"}
            value={typed}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setTyped(e.target.value)}
          />
        </label>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={destructive ? ownerDanger + " font-semibold" : ownerPrimary}
          disabled={disabled || !ready || !canConfirm}
          onClick={() => {
            void Promise.resolve(onConfirm(typed)).finally(() => setOpen(false));
          }}
        >
          {confirmLabel ?? `Confirm ${label.toLowerCase()}`}
        </button>
        <button type="button" className={ownerButton} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className={ownerPanel}>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-gold-ink dark:text-gold sm:text-3xl">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const shortDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

/**
 * Daily column chart: one series, thin rounded columns on a shared baseline, a hover/focus
 * readout, and a table view for screen readers and exact values.
 */
export function DailyColumns({
  title,
  points,
  format = ownerNumber,
}: {
  title: string;
  points: { date: string; value: number }[];
  format?: (v: number) => string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.value));
  const total = points.reduce((sum, p) => sum + p.value, 0);
  const width = 600;
  const height = 140;
  const slot = width / Math.max(1, points.length);
  const bar = Math.max(1.5, Math.min(14, slot - 2));
  const shown = active === null ? null : points[active];
  return (
    <figure className="min-w-0">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold">{title}</span>
        <span className="text-sm tabular-nums text-muted-foreground" aria-live="polite">
          {shown ? `${shortDay(shown.date)}: ${format(shown.value)}` : `Total ${format(total)}`}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height + 18}`}
        className="mt-2 h-auto w-full text-gold-ink dark:text-gold"
        role="img"
        aria-label={`${title}: ${format(total)} over ${points.length} days, peak ${format(max)}`}
        onMouseLeave={() => setActive(null)}
      >
        <line x1="0" x2={width} y1={height} y2={height} className="stroke-border" strokeWidth="1" />
        <text x="0" y="10" className="fill-muted-foreground" fontSize="11">
          {format(max)}
        </text>
        {points.map((p, i) => {
          const h = p.value ? Math.max(2, (p.value / max) * (height - 16)) : 0;
          const x = i * slot + (slot - bar) / 2;
          return (
            <g key={p.date} onMouseEnter={() => setActive(i)}>
              <rect x={i * slot} y="0" width={slot} height={height} fill="transparent" />
              {h > 0 && (
                <rect
                  x={x}
                  y={height - h}
                  width={bar}
                  height={h}
                  rx={Math.min(4, bar / 2)}
                  fill="currentColor"
                  opacity={active === null || active === i ? 1 : 0.45}
                >
                  <title>{`${shortDay(p.date)}: ${format(p.value)}`}</title>
                </rect>
              )}
            </g>
          );
        })}
        {points.length > 0 && (
          <>
            <text x="0" y={height + 14} className="fill-muted-foreground" fontSize="11">
              {shortDay(points[0].date)}
            </text>
            <text
              x={width}
              y={height + 14}
              textAnchor="end"
              className="fill-muted-foreground"
              fontSize="11"
            >
              {shortDay(points[points.length - 1].date)}
            </text>
          </>
        )}
      </svg>
      <details className="mt-1 text-xs text-muted-foreground">
        <summary className="cursor-pointer">Show table</summary>
        <div className="mt-2 max-h-48 overflow-y-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="p-1">Day</th>
                <th className="p-1 text-right">{title}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.date} className="border-t border-border/40">
                  <td className="p-1">{p.date}</td>
                  <td className="p-1 text-right tabular-nums">{format(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

/** Ranked horizontal bars with direct labels: the value is text, the bar only shows proportion. */
export function BarList({
  title,
  rows,
  format = ownerNumber,
  empty = "No data for this period.",
}: {
  title: string;
  rows: { label: string; value: number; note?: string }[];
  format?: (v: number) => string;
  empty?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="min-w-0" aria-label={title}>
      <h3 className="font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {rows.map((r) => (
            <li key={r.label} className="text-sm" title={`${r.label}: ${format(r.value)}`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate">{r.label}</span>
                <span className="shrink-0 tabular-nums">
                  {format(r.value)}
                  {r.note && <span className="ml-1 text-xs text-muted-foreground">{r.note}</span>}
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-gold-ink dark:bg-gold"
                  style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
