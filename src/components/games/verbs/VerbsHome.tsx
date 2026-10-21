// Built by TAC — 2026-10-21
import { ArrowRight, Trophy } from "lucide-react";
import { FAMILIES } from "@/lib/verb-games/families";
import { familyMastery, sourceFilterFor, suggestedFamily, type VerbDeviceState } from "@/lib/verb-games/device";
import { poolVerbs } from "@/lib/verb-games/pool";
import { ROUND_MS } from "@/lib/verb-games/rules";
import type { FamilyId, GameId, PatternData, PatternFamily, VerbEntry } from "@/lib/verb-games/types";
import { practiceScreen, type VerbScreen } from "@/lib/verb-games/verb-route";
import { PieceTile } from "./PieceTile";

const EYEBROW = "font-mono text-[11px] uppercase tracking-[0.22em] text-gold-ink";
const CAPTION = "font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground dark:focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const GAME_COPY: Record<GameId, { title: string; blurb: string; pieces: { kind: "stem" | "ending" | "whole"; label: string }[] }> = {
  bubble: {
    title: "Bubble Pop",
    blurb: "Bubbles rise carrying endings and whole forms. Pop the one the sentence needs before it escapes.",
    pieces: [
      { kind: "ending", label: "go" },
      { kind: "whole", label: "vengo" },
    ],
  },
  crush: {
    title: "Verb Crush",
    blurb: "Swap neighbouring tiles to snap a stem onto its ending. Build the forms on the goal list in few moves.",
    pieces: [
      { kind: "stem", label: "ten" },
      { kind: "ending", label: "go" },
    ],
  },
};

const GAMES: GameId[] = ["bubble", "crush"];

function rankOf(verb: VerbEntry): number {
  return Math.min(...verb.sources.flatMap((s) => (s.kind === "core" ? [s.rank] : [])), Number.MAX_SAFE_INTEGER);
}

/** The yo forms of the family's most common verbs in the pool, e.g. ["tengo", "hago", "digo"]. */
function exampleForms(verbs: VerbEntry[], id: FamilyId): string[] {
  return verbs
    .filter((v) => v.forms[0]?.families.includes(id))
    .sort((a, b) => rankOf(a) - rankOf(b))
    .slice(0, 3)
    .map((v) => v.forms[0].full);
}

function bestScore(device: VerbDeviceState, game: GameId): number | null {
  const scores = Object.entries(device.bests).flatMap(([key, b]) => (key.startsWith(`${game}|`) ? [b.score] : []));
  return scores.length > 0 ? Math.max(...scores) : null;
}

function bestRank(device: VerbDeviceState, game: GameId): number | null {
  const ranks = Object.entries(device.ranks).flatMap(([key, r]) => (key.startsWith(`${game}|`) && r.rank !== null ? [r.rank] : []));
  return ranks.length > 0 ? Math.min(...ranks) : null;
}

function FamilyTile(p: {
  family: PatternFamily;
  /** The verbs of the learner's chosen source: the same pool the picker counts. */
  pool: VerbEntry[];
  device: VerbDeviceState;
  suggested: boolean;
  wide: boolean;
  go(s: VerbScreen): void;
}) {
  const infinitives = p.pool.filter((v) => v.forms.some((f) => f.families.includes(p.family.id))).map((v) => v.infinitive);
  const mastery = familyMastery(p.device, p.family.id, infinitives);
  const total = infinitives.length;
  const pct = total === 0 ? 0 : Math.round((mastery.verbsMastered / total) * 100);
  return (
    <button
      type="button"
      data-family={p.family.id}
      data-suggested={p.suggested ? "true" : undefined}
      onClick={() => p.go(practiceScreen(p.family.id))}
      className={`group flex min-w-0 cursor-pointer flex-col gap-2 rounded-xl border p-3.5 text-left transition-colors duration-200 hover:bg-card/80 ${FOCUS} ${
        p.suggested ? "border-gold/70 bg-gold/[0.06] hover:border-gold" : "border-border/60 bg-background/40 hover:border-gold/50"
      } ${p.wide ? "col-span-2" : ""}`}
    >
      {p.suggested && (
        <span className="inline-flex items-center gap-1 self-start rounded-full border border-gold/50 bg-gold/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-gold-ink">
          <ArrowRight className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
          Suggested
        </span>
      )}
      <span className="flex items-start justify-between gap-2">
        <span className="font-display text-base font-semibold leading-tight text-foreground sm:text-lg">{p.family.label}</span>
        <ArrowRight
          className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-colors duration-200 group-hover:text-gold-ink"
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </span>
      <span className="block truncate font-mono text-xs text-muted-foreground">
        {exampleForms(p.pool, p.family.id).map((form, i) => (
          <span key={form} className={i > 0 ? "hidden sm:inline" : undefined}>
            {i > 0 && <span aria-hidden="true"> · </span>}
            {form}
          </span>
        ))}
      </span>
      <span className="mt-auto flex flex-col gap-1.5 pt-1">
        <span
          role="progressbar"
          aria-label={`${p.family.label} mastery`}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={mastery.verbsMastered}
          data-family-meter={p.family.id}
          className="block h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <span className="block h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
        </span>
        <span className={CAPTION}>
          {mastery.verbsMastered} of {total} verbs
          <span className="block">{mastery.mastered ? "Mastered" : mastery.picks === 0 ? "Not started" : `${mastery.picks} picks`}</span>
        </span>
      </span>
    </button>
  );
}

function Ladder(p: { eyebrow: string; families: readonly PatternFamily[]; pool: VerbEntry[]; device: VerbDeviceState; suggested: FamilyId; go(s: VerbScreen): void }) {
  return (
    <div className="space-y-2.5">
      <h3 className={CAPTION}>{p.eyebrow}</h3>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {p.families.map((family, i) => (
          <FamilyTile
            key={family.id}
            family={family}
            pool={p.pool}
            device={p.device}
            suggested={family.id === p.suggested}
            wide={p.families.length % 2 === 1 && i === p.families.length - 1}
            go={p.go}
          />
        ))}
      </div>
    </div>
  );
}

function GameCard(p: { game: GameId; suggested: FamilyId; device: VerbDeviceState; boardsOpen: boolean; go(s: VerbScreen): void }) {
  const copy = GAME_COPY[p.game];
  const best = bestScore(p.device, p.game);
  const rank = bestRank(p.device, p.game);
  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border/60 bg-card/50 p-4 sm:p-5">
      <div className={EYEBROW}>GAME · {ROUND_MS[p.game] / 1000} SEC</div>
      <span aria-hidden="true" className="flex items-center gap-1.5">
        {copy.pieces.map((piece) => (
          <PieceTile key={piece.label} kind={piece.kind} label={piece.label} />
        ))}
      </span>
      <div className="space-y-1.5">
        <h3 className="font-display text-2xl font-semibold leading-tight text-foreground">{copy.title}</h3>
        <p className="text-sm leading-snug text-muted-foreground">{copy.blurb}</p>
      </div>
      <dl className={`grid gap-3 border-t border-border/50 pt-3 ${p.boardsOpen ? "grid-cols-2" : "grid-cols-1"}`}>
        <div>
          <dt className={CAPTION}>Personal best</dt>
          <dd className="mt-0.5 font-mono text-lg tabular-nums text-foreground">{best === null ? "—" : best.toLocaleString("en-US")}</dd>
        </div>
        {p.boardsOpen && (
          <div>
            <dt className={CAPTION}>Weekly rank</dt>
            <dd className="mt-0.5 font-mono text-lg tabular-nums text-foreground">{rank === null ? "—" : `#${rank}`}</dd>
          </div>
        )}
      </dl>
      <button
        type="button"
        data-game={p.game}
        onClick={() => p.go({ screen: "pick", game: p.game, family: p.suggested })}
        className={`mt-auto inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gold px-5 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#0a1220] transition-[filter] duration-200 hover:brightness-110 ${FOCUS}`}
      >
        Choose a pattern
        <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
      </button>
    </article>
  );
}

export function VerbsHome(p: {
  data: PatternData;
  device: VerbDeviceState;
  moduleId: string | null;
  /** Public boards are closed until the leaderboard server lands; the Weekly rank cell shows only when open. */
  boardsOpen?: boolean;
  go(s: VerbScreen): void;
}) {
  const boardsOpen = p.boardsOpen ?? false;
  const suggested = suggestedFamily(p.device, p.data);
  const pool = poolVerbs(p.data, sourceFilterFor(p.device.settings, p.moduleId));
  const tier1 = FAMILIES.filter((f) => f.tier === 1);
  const tier2 = FAMILIES.filter((f) => f.tier === 2);
  return (
    <section
      aria-labelledby="verbs-title"
      data-testid="verbs-home"
      data-module={p.moduleId ?? undefined}
      className="space-y-6 rounded-2xl border border-border/60 bg-card/30 p-4 sm:p-6"
    >
      <header>
        <div className={EYEBROW}>VERBS</div>
        <h2 id="verbs-title" className="mt-1 font-display text-3xl font-semibold">
          Practice by pattern
        </h2>
        <p className="mt-1.5 max-w-xl text-sm leading-snug text-muted-foreground">
          Learn a rule once and it opens a dozen verbs. Start where the ladder suggests, or open any pattern.
        </p>
      </header>

      <div className="space-y-5">
        <Ladder eyebrow="Ladder · start here" families={tier1} pool={pool} device={p.device} suggested={suggested} go={p.go} />
        <Ladder eyebrow="Ladder · stem changes" families={tier2} pool={pool} device={p.device} suggested={suggested} go={p.go} />
      </div>

      <div className="space-y-2.5">
        <h3 className={CAPTION}>Play a round</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {GAMES.map((game) => (
            <GameCard key={game} game={game} suggested={suggested} device={p.device} boardsOpen={boardsOpen} go={p.go} />
          ))}
        </div>
        <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
          <Trophy className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
          Leaderboards coming soon
        </p>
      </div>
    </section>
  );
}
