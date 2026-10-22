// Built by TAC — 2026-10-21
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { FAMILIES, familyById } from "@/lib/verb-games/families";
import { sourceFilterFor, suggestedFamily, type VerbDeviceState } from "@/lib/verb-games/device";
import { frameSlots, poolVerbs } from "@/lib/verb-games/pool";
import {
  COUNT_SIZES,
  ROUND_MS,
  crushGoalSlots,
  crushTargets,
  levelAvailable,
  modeKey,
  orderFamilies,
  roundFamilies,
  type FamilyPick,
} from "@/lib/verb-games/rules";
import type { CrushLevel, FamilyId, GameId, PatternData, RoundMode, SourceFilter } from "@/lib/verb-games/types";
import type { VerbScreen } from "@/lib/verb-games/verb-route";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const EYEBROW = "font-mono text-[11px] uppercase tracking-[0.22em] text-gold-ink";
const CAPTION = "font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground dark:focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const GAME_TITLE: Record<GameId, string> = { bubble: "Bubble Pop", crush: "Verb Crush" };

type Settings = VerbDeviceState["settings"];
type Level = CrushLevel["level"];

const plural = (n: number) => `${n} ${n === 1 ? "verb" : "verbs"}`;

/** "5 forms · 20 moves", scaled for a count round; forever deals lists of the level's size. */
function levelTargets(row: CrushLevel, mode: RoundMode): string {
  const t = crushTargets(row, mode);
  return mode.kind === "forever" ? `${t.goalCount} per list · ${t.moveBudget} moves` : `${t.goalCount} forms · ${t.moveBudget} moves`;
}

function familyVerbCount(data: PatternData, source: SourceFilter, family: FamilyId | "mix" | readonly FamilyId[]): number {
  const pool = poolVerbs(data, source);
  if (family === "mix") return pool.length;
  const ids: readonly FamilyId[] = typeof family === "string" ? [family] : family;
  return pool.filter((v) => v.forms.some((f) => f.families.some((id) => ids.includes(id)))).length;
}

/** The route fields for a pick: one family as `family`, two or more as `families`. */
function pickFields(pick: FamilyPick): { family: FamilyId | "mix"; families?: FamilyId[] } {
  if (pick === "mix") return { family: "mix" };
  return pick.length === 1 ? { family: pick[0] as FamilyId } : { family: "mix", families: [...pick] };
}

type ModeOption = { key: string; mode: RoundMode; label: string };

/** Timed · 5 · 10 · 15 · Forever, in that order. */
function modeOptions(game: GameId): ModeOption[] {
  return [
    { key: "timed", mode: { kind: "timed" }, label: `${ROUND_MS[game] / 1000} sec` },
    ...COUNT_SIZES.map((n) => ({ key: `count${n}`, mode: { kind: "count", n } as RoundMode, label: `${n} words` })),
    { key: "forever", mode: { kind: "forever" }, label: "Forever" },
  ];
}

const keyOf = (mode: RoundMode) => modeKey(mode) || "timed";

function modeHint(game: GameId, mode: RoundMode): string {
  if (mode.kind === "timed") return game === "crush" ? "Make the goal forms before the clock or the moves run out." : "Score as much as you can before the clock runs out.";
  if (mode.kind === "count") {
    return game === "crush"
      ? `No clock. Make ${mode.n} forms before the moves run out. Not ranked.`
      : `No clock. The round ends after ${mode.n} correct words. Not ranked.`;
  }
  return game === "crush"
    ? "No clock. Each finished goal list deals a new one and more moves. A trap ends the round. Not ranked."
    : "No clock. Keep going until your first miss. Not ranked.";
}

/**
 * The Mode segmented control: one radio group, one row of five equal segments at every width
 * (a label wraps inside its segment before the row would). Arrow keys, Home and End move the choice.
 */
function ModeControl(p: { game: GameId; value: RoundMode; onChange(mode: RoundMode): void }) {
  const options = modeOptions(p.game);
  const current = keyOf(p.value);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (e: React.KeyboardEvent, i: number) => {
    const last = options.length - 1;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? (i + 1) % options.length
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? (i + last) % options.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    p.onChange((options[next] as ModeOption).mode);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-labelledby="mode-label" data-testid="mode-control" className="grid grid-cols-5 gap-1 rounded-xl border border-border/60 bg-background/40 p-1">
      {options.map((o, i) => {
        const selected = o.key === current;
        return (
          <button
            key={o.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            data-testid={`mode-${o.key}`}
            onClick={() => p.onChange(o.mode)}
            onKeyDown={(e) => move(e, i)}
            className={`flex min-h-11 min-w-0 cursor-pointer items-center justify-center rounded-lg border px-1 py-1.5 text-center text-[13px] leading-tight text-foreground transition-colors duration-200 ${FOCUS} ${
              selected ? "border-gold bg-gold/15 font-semibold" : "border-transparent font-medium hover:bg-card/70"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Words never break inside ("-ar" stays whole); the line can only wrap between words. */
function NoBreak({ text }: { text: string }) {
  return (
    <>
      {text.split(" ").map((word, i) => (
        <span key={i}>
          {i > 0 ? " " : ""}
          <span className="whitespace-nowrap">{word}</span>
        </span>
      ))}
    </>
  );
}

function Choice(p: { selected: boolean; onClick(): void; children: React.ReactNode; testId?: string; wide?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={p.selected}
      data-testid={p.testId}
      disabled={p.disabled}
      onClick={p.onClick}
      className={`relative flex min-h-11 min-w-0 items-center rounded-xl border py-2.5 pl-3.5 pr-9 text-left transition-colors duration-200 ${FOCUS} ${
        p.disabled
          ? "cursor-not-allowed border-dashed border-border/50 bg-background/20"
          : p.selected
            ? "cursor-pointer border-gold bg-gold/10"
            : "cursor-pointer border-border/60 bg-background/40 hover:border-gold/50 hover:bg-card/70"
      } ${p.wide ? "col-span-2" : ""}`}
    >
      {p.children}
      {/* Absolutely placed and the space always reserved (pr-9), so selecting never reflows the label. */}
      {p.selected && <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold-ink" strokeWidth={2.2} aria-hidden="true" />}
    </button>
  );
}

export function VerbPicker(p: {
  data: PatternData;
  device: VerbDeviceState;
  moduleId: string | null;
  game: GameId;
  family: FamilyId | "mix" | null;
  /** Two or more picked patterns (the route's `vfamilies`); then `family` is "mix". */
  families?: FamilyId[];
  go(s: VerbScreen): void;
  onSettings(s: VerbDeviceState["settings"]): void;
}) {
  const reduced = useReducedMotion();
  const [pickedLevel, setPickedLevel] = useState<Level | null>(null);
  const settings = p.device.settings;
  const source = sourceFilterFor(settings, p.moduleId);
  const multi = p.families && p.families.length > 1 ? orderFamilies(p.families) : null;
  const single: FamilyId | "mix" = p.family ?? suggestedFamily(p.device, p.data);
  /** The pick on screen: the route's families, else its one family (or Mix), else the suggestion. */
  const pick: FamilyPick = multi ?? (single === "mix" ? "mix" : [single]);
  /**
   * A single preselected family (the suggestion, a ladder tile, a game card) is a default: the first
   * chip tap on this screen replaces it, exactly as picking worked before multi-select. Later taps add
   * and remove families.
   */
  const [touched, setTouched] = useState(false);
  const mode: RoundMode = settings.mode ?? { kind: "timed" };
  const sourceKind = source.kind;

  const coreCount = poolVerbs(p.data, { kind: "core" }).length;
  const moduleCount = p.moduleId ? poolVerbs(p.data, { kind: "module", moduleId: p.moduleId }).length : 0;

  const setSource = (next: Settings["source"]) => p.onSettings({ ...settings, source: next });

  // Crush: levels that cannot be built for this pick (its union pool) and source are listed but disabled.
  const levels = p.data.crushLevels.map((row) => ({ row, available: levelAvailable(p.data, row, pick, source) }));
  const firstAvailable = levels.find((l) => l.available)?.row.level ?? null;
  const level: Level | null = pickedLevel !== null && levels.some((l) => l.row.level === pickedLevel && l.available) ? pickedLevel : firstAvailable;
  const levelRow = p.game === "crush" && level !== null ? (levels.find((l) => l.row.level === level)?.row ?? null) : null;
  /** A level with its own fixed patterns (Crossover) ignores the pick. */
  const fixedLevel = levelRow !== null && Array.isArray(levelRow.families) ? levelRow : null;
  // Crush: only families that have goal forms at the chosen level can be picked.
  const familyOk = (id: FamilyId) => p.game !== "crush" || levelRow === null || fixedLevel !== null || crushGoalSlots(p.data, levelRow, id, source).length > 0;
  const effective: FamilyPick = pick === "mix" ? "mix" : pick.filter(familyOk);

  const canStart =
    effective !== "mix" && effective.length === 0
      ? false
      : p.game === "crush"
        ? levelRow !== null && levelAvailable(p.data, levelRow, effective, source)
        : frameSlots(
            p.data,
            roundFamilies({ game: "bubble", ...pickFields(effective), level: null, source, seed: 0, listMode: false, reducedMotion: false }, p.data),
            "family",
            source,
          ).length > 0;

  const choose = (next: FamilyPick) => {
    setTouched(true);
    p.go({ screen: "pick", game: p.game, ...pickFields(next) });
  };
  /** Mix clears the families; a family clears Mix; tapping a picked family drops it (the last one goes back to Mix). */
  const toggle = (id: FamilyId) => {
    if (!touched && pick !== "mix" && pick.length === 1) return choose([id]);
    if (pick === "mix") return choose([id]);
    const next = pick.includes(id) ? pick.filter((x) => x !== id) : orderFamilies([...pick, id]);
    choose(next.length === 0 ? "mix" : next);
  };
  const setMode = (next: RoundMode) =>
    p.onSettings({ source: settings.source, listMode: settings.listMode, ...(next.kind === "timed" ? {} : { mode: next }) });
  const start = () =>
    p.go({
      screen: "play",
      game: p.game,
      ...pickFields(effective),
      level: p.game === "crush" ? level : null,
      ...(mode.kind === "timed" ? {} : { mode }),
    });
  const picked = (id: FamilyId) => pick !== "mix" && pick.includes(id);

  return (
    <section aria-labelledby="picker-title" data-testid="verb-picker" className="space-y-6 rounded-2xl border border-border/60 bg-card/30 p-4 sm:p-6">
      <header className="space-y-1">
        <button
          type="button"
          onClick={() => p.go({ screen: "home" })}
          className={`-ml-1 mb-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors duration-200 hover:text-foreground ${FOCUS}`}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          Verbs
        </button>
        <div className={EYEBROW}>GAME · {GAME_TITLE[p.game].toUpperCase()}</div>
        <h2 id="picker-title" className="font-display text-3xl font-semibold">
          Choose your round
        </h2>
      </header>

      <fieldset className="space-y-2.5">
        <legend className={`${CAPTION} mb-2.5`}>Pattern · pick one or more</legend>
        <div className="grid grid-cols-2 gap-2">
          <Choice selected={pick === "mix"} onClick={() => choose("mix")} testId="family-mix" wide>
            <span className="min-w-0">
              <span className="block font-display text-base font-semibold text-foreground">Mix</span>
              <span className="block font-mono text-xs text-muted-foreground">Every pattern · {plural(familyVerbCount(p.data, source, "mix"))}</span>
            </span>
          </Choice>
          {FAMILIES.map((f, i) => (
            <Choice
              key={f.id}
              selected={picked(f.id) && familyOk(f.id)}
              disabled={!familyOk(f.id)}
              onClick={() => toggle(f.id)}
              testId={`family-${f.id}`}
              wide={i === FAMILIES.length - 1 && i % 2 === 0}
            >
              <span className="min-w-0">
                <span className="block font-display text-base font-semibold text-foreground">
                  <NoBreak text={f.label} />
                </span>
                <span className="block font-mono text-xs text-muted-foreground">{plural(familyVerbCount(p.data, source, f.id))}</span>
              </span>
            </Choice>
          ))}
        </div>
        {effective !== "mix" && effective.length > 1 && (
          <p className="font-mono text-xs text-muted-foreground" data-testid="pick-summary">
            {`${effective.length} patterns · ${plural(familyVerbCount(p.data, source, effective))}`}
          </p>
        )}
        {fixedLevel && Array.isArray(fixedLevel.families) && (
          <p className="text-xs leading-snug text-muted-foreground" data-testid="fixed-level-note">
            {`Level ${fixedLevel.level} always uses ${fixedLevel.families.map((id) => familyById(id).pill).join(" and ")}.`}
          </p>
        )}
      </fieldset>

      <fieldset className="space-y-2.5">
        <legend id="mode-label" className={`${CAPTION} mb-2.5`}>
          Mode
        </legend>
        <ModeControl game={p.game} value={mode} onChange={setMode} />
        <p className="text-xs leading-snug text-muted-foreground" data-testid="mode-hint">
          {modeHint(p.game, mode)}
        </p>
      </fieldset>

      <fieldset className="space-y-2.5">
        <legend className={`${CAPTION} mb-2.5`}>Verbs from</legend>
        <div className="flex flex-wrap gap-2">
          {p.moduleId && (
            <Choice selected={sourceKind === "module"} onClick={() => setSource("module")} testId="source-module">
              <span className="font-mono text-sm text-foreground">Your module · {plural(moduleCount)}</span>
            </Choice>
          )}
          <Choice selected={sourceKind === "core"} onClick={() => setSource("core")} testId="source-core">
            <span className="font-mono text-sm text-foreground">Core · {plural(coreCount)}</span>
          </Choice>
          {p.moduleId && (
            <Choice selected={sourceKind === "both"} onClick={() => setSource("both")} testId="source-both">
              <span className="font-mono text-sm text-foreground">Both</span>
            </Choice>
          )}
        </div>
      </fieldset>

      {p.game === "crush" && (
        <fieldset className="space-y-2.5">
          <legend className={`${CAPTION} mb-2.5`}>Level</legend>
          <div className="grid gap-2">
            {levels.map(({ row, available }) => (
              <button
                key={row.level}
                type="button"
                data-level={row.level}
                disabled={!available}
                aria-pressed={available && level === row.level}
                onClick={() => setPickedLevel(row.level)}
                className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors duration-200 ${FOCUS} ${
                  !available
                    ? "cursor-not-allowed border-dashed border-border/50 bg-background/20"
                    : level === row.level
                      ? "cursor-pointer border-gold bg-gold/10"
                      : "cursor-pointer border-border/60 bg-background/40 hover:border-gold/50 hover:bg-card/70"
                }`}
              >
                <span className="min-w-0">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-gold-ink">Level {row.level}</span>
                  <span className={`block text-sm font-medium ${available ? "text-foreground" : "text-muted-foreground"}`}>{row.label}</span>
                </span>
                <span className="shrink-0 text-right font-mono text-xs text-muted-foreground">
                  {available ? levelTargets(row, mode) : "Needs more verbs"}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/40 px-3.5 py-3">
        <div className="min-w-0">
          <div id="list-mode-label" className="text-sm font-medium text-foreground">
            List mode
          </div>
          <p className="text-xs leading-snug text-muted-foreground">Pick from a list of options. Good with a screen reader or keyboard. Not ranked.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.listMode}
          aria-labelledby="list-mode-label"
          data-testid="list-mode"
          onClick={() => p.onSettings({ ...settings, listMode: !settings.listMode })}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 ${FOCUS} ${
            settings.listMode ? "border-gold bg-gold" : "border-border bg-muted"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-[#f4f1e8] ring-1 ring-black/30 ${reduced ? "" : "transition-transform duration-200"} ${
              settings.listMode ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          data-testid="start-round"
          disabled={!canStart}
          onClick={start}
          className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 font-mono text-xs font-semibold uppercase tracking-[0.2em] transition-[filter] duration-200 ${FOCUS} ${
            canStart ? "cursor-pointer bg-gold text-[#0a1220] hover:brightness-110" : "cursor-not-allowed bg-muted text-muted-foreground"
          }`}
        >
          Start round
          <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </button>
        {!canStart && (
          <p role="status" className="text-center text-xs text-muted-foreground">
            No verbs match this pattern in the selected source. Try Core or Both.
          </p>
        )}
      </div>
    </section>
  );
}
