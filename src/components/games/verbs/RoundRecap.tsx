// Built by TAC — 2026-10-21
import { useEffect, useRef } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { PERSON_LABEL } from "@/lib/verb-games/families";
import type { EndReason, FamilyId, Person, RoundMode, RoundResult } from "@/lib/verb-games/types";
import { countSummary, endLine, roundTime } from "./mode-labels";
import { groupMisses, practiceFamily, type MissRow } from "./recap-groups";

const EYEBROW = "font-mono text-[11px] uppercase tracking-[0.22em] text-gold-ink";
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-gold";
const BUTTON = `inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full px-4 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors duration-200 ${FOCUS}`;
const PRIMARY = `${BUTTON} border border-gold bg-gold px-5 text-[#0a1220] hover:bg-gold/90`;
const SECONDARY = `${BUTTON} border border-gold/50 bg-gold/10 text-gold-ink hover:bg-gold/20`;
const STAT = "rounded-xl border border-border/60 bg-background/40 p-3.5";

const n = (v: number) => v.toLocaleString("en-US");


/** `salo ✗ → salgo · I leave`: one text node, so the row reads the same in a screen reader and in a test. */
const missLine = (r: MissRow) => `${r.attempted ?? "no answer"} ✗ → ${r.correct} · ${r.english}`;

/**
 * The round recap: score, best streak, personal best, board placement, then misses grouped by family.
 * `best` is the personal best before this round. The send controls are hidden with `showSend={false}`
 * until Verb Cards can take them.
 */
export function RoundRecap(p: {
  result: RoundResult;
  best: { score: number } | null;
  placement: { rank: number | null; period: string } | null;
  signedIn: boolean;
  onPlayAgain(): void;
  onPractice(f: FamilyId): void;
  onBack(): void;
  onSendCards(items: { infinitive: string; person: Person }[]): void;
  /** `${infinitive}|${person}` of every card already saved. */
  savedKeys: string[];
  eyebrow?: string;
  /** False for list-mode rounds, which never set a personal best. */
  countsForBest?: boolean;
  /** False while public boards are closed. */
  boardsOpen?: boolean;
  /** False hides "Send to cards" and "Send all". */
  showSend?: boolean;
  /** The round's mode (default timed): forever leads with the streak, count with words and time. */
  mode?: RoundMode;
  /** Why the round ended, from the engine. A forever round names it under the headline. */
  endReason?: EndReason;
}) {
  const { result } = p;
  const mode: RoundMode = p.mode ?? { kind: "timed" };
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const groups = groupMisses(result.misses);
  const practice = practiceFamily(result.misses);
  const saved = new Set(p.savedKeys);
  const showSend = p.showSend !== false;
  const unsaved = groups.flatMap((g) => g.rows).filter((r) => !saved.has(r.key));

  const countsForBest = p.countsForBest !== false;
  const previous = p.best?.score ?? 0;
  const isNewBest = countsForBest && result.score > previous;

  let placement: string | null = null;
  if (p.boardsOpen === false) placement = "Leaderboards coming soon";
  else if (p.placement) placement = p.placement.rank === null ? null : `${p.placement.period} #${p.placement.rank}`;
  else if (!p.signedIn) placement = "Sign in to join the board";

  return (
    <section className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-border/60 bg-card/30 p-4 sm:p-6" data-testid="round-over">
      <header className="space-y-1">
        <div className={EYEBROW}>{p.eyebrow ?? "ROUND RECAP"}</div>
        <h2 ref={titleRef} tabIndex={-1} data-testid="recap-title" className="font-display text-3xl font-semibold focus:outline-none">
          {mode.kind === "forever" ? `Streak ${n(result.bestStreak)}` : "Round over"}
          <span className="sr-only">{` · ${n(result.score)} points`}</span>
        </h2>
        {mode.kind === "count" && (
          <p className="font-mono text-sm tabular-nums text-foreground" data-testid="recap-summary">
            {countSummary(result, mode.n)}
          </p>
        )}
        {mode.kind === "forever" && endLine(p.endReason) && (
          <p className="text-sm text-muted-foreground" data-testid="recap-summary">
            {endLine(p.endReason)}
          </p>
        )}
      </header>

      <dl className="grid grid-cols-2 gap-3">
        <div className={`${STAT} col-span-2`}>
          <dt className={EYEBROW}>Score</dt>
          <dd className="mt-1 font-display text-5xl font-semibold tabular-nums leading-none" data-testid="recap-score">
            {n(result.score)}
          </dd>
        </div>
        {mode.kind === "forever" ? (
          <div className={STAT}>
            <dt className={EYEBROW}>Time</dt>
            <dd className="mt-1 font-mono text-2xl tabular-nums" data-testid="recap-time">
              {roundTime(result.durationMs)}
            </dd>
          </div>
        ) : (
          <div className={STAT}>
            <dt className={EYEBROW}>Best streak</dt>
            <dd className="mt-1 font-mono text-2xl tabular-nums" data-testid="recap-streak">{`×${result.bestStreak}`}</dd>
          </div>
        )}
        <div className={STAT}>
          <dt className={EYEBROW}>Personal best</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-2xl tabular-nums" data-testid="recap-best">
              {isNewBest ? n(result.score) : countsForBest && previous > 0 ? n(previous) : "—"}
            </span>
            {isNewBest && (
              <span
                data-testid="recap-new-best"
                className="rounded-full border border-gold/60 bg-gold/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-gold-ink"
              >
                New best
              </span>
            )}
          </dd>
          {isNewBest && previous > 0 && <dd className="mt-1 text-xs text-muted-foreground">{`Was ${n(previous)}`}</dd>}
          {!countsForBest && <dd className="mt-1 text-xs text-muted-foreground">List mode rounds do not set personal bests.</dd>}
        </div>
      </dl>

      {placement && (
        <p className="font-mono text-sm text-foreground" data-testid="recap-placement">
          {placement}
        </p>
      )}

      <div className="space-y-4" data-testid="recap-misses">
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No misses this round.</p>
        ) : (
          <>
            <h3 className="font-display text-xl font-semibold">Misses</h3>
            {groups.map((g) => (
              <div key={g.familyId ?? "other"} className="space-y-2" data-testid="recap-group" data-family={g.familyId ?? "other"}>
                <h4 className="flex items-baseline justify-between gap-2 border-b border-border/60 pb-1.5">
                  <span className="font-display text-base font-semibold">{g.label}</span>
                  <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{`${g.count} ${g.count === 1 ? "miss" : "misses"}`}</span>
                </h4>
                <ul className="space-y-2">
                  {g.rows.map((r) => (
                    <li
                      key={r.key}
                      data-testid="recap-miss"
                      data-key={r.key}
                      className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="break-words font-mono text-sm text-foreground">{missLine(r)}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {`${r.infinitive} · ${PERSON_LABEL[r.person]}${r.times > 1 ? ` · missed ×${r.times}` : ""}`}
                        </p>
                      </div>
                      {saved.has(r.key) ? (
                        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-gold-ink">
                          <Check className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                          Saved on this device
                        </span>
                      ) : (
                        showSend && (
                          <button
                            type="button"
                            onClick={() => p.onSendCards([{ infinitive: r.infinitive, person: r.person }])}
                            className={`${SECONDARY} shrink-0`}
                          >
                            Send to cards
                          </button>
                        )
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {showSend && unsaved.length > 0 && (
              <button
                type="button"
                onClick={() => p.onSendCards(unsaved.map((r) => ({ infinitive: r.infinitive, person: r.person })))}
                className={SECONDARY}
              >
                Send all
              </button>
            )}
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={p.onPlayAgain} className={PRIMARY}>
          Play again
        </button>
        {practice && (
          <button type="button" onClick={() => p.onPractice(practice)} className={SECONDARY}>
            Practice this family
          </button>
        )}
        <button type="button" onClick={p.onBack} className={SECONDARY}>
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          Back to Verbs
        </button>
      </div>
    </section>
  );
}
