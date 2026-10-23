// Built by TAC — 2026-10-22
import { Headphones, Keyboard, Layers, Link2, ListChecks, type LucideIcon } from "lucide-react";
import type { SeriesStep } from "@/lib/verb-games/series";

export const EYEBROW = "font-mono text-[11px] uppercase tracking-[0.22em] text-gold-ink";
export const CAPTION = "font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground";
/** Focus ring: ink on the light theme, gold on the dark one. */
export const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-gold";
export const PRIMARY = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-gold px-5 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#0a1220] transition-[filter] duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`;
export const SECONDARY = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-4 font-mono text-[11px] uppercase tracking-[0.18em] text-gold-ink transition-colors duration-200 hover:bg-gold/20 ${FOCUS}`;
/** Same panel as the lesson steps (See / Recall / Hear / Type / Say / Write). */
export const STEP_PANEL = "rounded-2xl border border-border/60 bg-card/40 p-4";

export interface StepMeta {
  label: string;
  /** Step bar label, like the lesson bar's "See" / "Hear". */
  short: string;
  why: string;
  pass: string;
  Icon: LucideIcon;
}

export const STEP_META: Record<SeriesStep, StepMeta> = {
  pick: { label: "Pick it", short: "Pick", why: "Choose the right form from four.", pass: "8 of 10 to pass", Icon: ListChecks },
  match: { label: "Match it", short: "Match", why: "Pair each form with its person and English.", pass: "All 5 pairs, at most 2 mistakes", Icon: Link2 },
  cards: { label: "Cards", short: "Cards", why: "Flip each card and rate how well you knew it. Again brings it back.", pass: "Rate every card Good or Easy", Icon: Layers },
  listen: { label: "Listen", short: "Listen", why: "Hear the form, then pick the one you heard.", pass: "8 of 10 to pass", Icon: Headphones },
  type: { label: "Type it", short: "Type", why: "Type the form from memory. This is the mastery check.", pass: "8 of 10 exact to pass", Icon: Keyboard },
};

/** Dev only: answer hooks for e2e (`data-correct`, `data-pair`, `data-answer`). Always false in production builds. */
export const DEV = Boolean(import.meta.env?.DEV);

export interface StepRun {
  /** Right answers; Match: clean pairs (never part of a wrong attempt). */
  score: number;
  total: number;
  passed: boolean;
  /** Match only: every wrong attempt, which can be more than the pairs. */
  mistakes?: number;
}
