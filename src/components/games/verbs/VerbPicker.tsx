// Built by TAC — 2026-10-21
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { FAMILIES } from "@/lib/verb-games/families";
import { sourceFilterFor, suggestedFamily, type VerbDeviceState } from "@/lib/verb-games/device";
import { frameSlots, poolVerbs } from "@/lib/verb-games/pool";
import { levelAvailable, roundFamilies } from "@/lib/verb-games/rules";
import type { CrushLevel, FamilyId, GameId, PatternData, SourceFilter } from "@/lib/verb-games/types";
import type { VerbScreen } from "@/lib/verb-games/verb-route";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const EYEBROW = "font-mono text-[11px] uppercase tracking-[0.22em] text-gold-ink";
const CAPTION = "font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground dark:focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const GAME_TITLE: Record<GameId, string> = { bubble: "Bubble Pop", crush: "Verb Crush" };

type Settings = VerbDeviceState["settings"];
type Level = CrushLevel["level"];

const plural = (n: number) => `${n} ${n === 1 ? "verb" : "verbs"}`;

function familyVerbCount(data: PatternData, source: SourceFilter, family: FamilyId | "mix"): number {
  const pool = poolVerbs(data, source);
  return family === "mix" ? pool.length : pool.filter((v) => v.forms.some((f) => f.families.includes(family))).length;
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

function Choice(p: { selected: boolean; onClick(): void; children: React.ReactNode; testId?: string; wide?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={p.selected}
      data-testid={p.testId}
      onClick={p.onClick}
      className={`relative flex min-h-11 min-w-0 cursor-pointer items-center rounded-xl border py-2.5 pl-3.5 pr-9 text-left transition-colors duration-200 ${FOCUS} ${
        p.selected ? "border-gold bg-gold/10" : "border-border/60 bg-background/40 hover:border-gold/50 hover:bg-card/70"
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
  go(s: VerbScreen): void;
  onSettings(s: VerbDeviceState["settings"]): void;
}) {
  const reduced = useReducedMotion();
  const [pickedLevel, setPickedLevel] = useState<Level | null>(null);
  const settings = p.device.settings;
  const source = sourceFilterFor(settings, p.moduleId);
  const family: FamilyId | "mix" = p.family ?? suggestedFamily(p.device, p.data);
  const sourceKind = source.kind;

  const coreCount = poolVerbs(p.data, { kind: "core" }).length;
  const moduleCount = p.moduleId ? poolVerbs(p.data, { kind: "module", moduleId: p.moduleId }).length : 0;

  const setSource = (next: Settings["source"]) => p.onSettings({ ...settings, source: next });

  // Crush: levels that cannot be built for this pattern and source are listed but disabled.
  const levels = p.data.crushLevels.map((row) => ({ row, available: levelAvailable(p.data, row, family, source) }));
  const firstAvailable = levels.find((l) => l.available)?.row.level ?? null;
  const level: Level | null = pickedLevel !== null && levels.some((l) => l.row.level === pickedLevel && l.available) ? pickedLevel : firstAvailable;

  const canStart =
    p.game === "crush"
      ? level !== null
      : frameSlots(p.data, roundFamilies({ game: "bubble", family, level: null, source, seed: 0, listMode: false, reducedMotion: false }, p.data), "family", source).length > 0;

  const choose = (next: FamilyId | "mix") => p.go({ screen: "pick", game: p.game, family: next });
  const start = () => p.go({ screen: "play", game: p.game, family, level: p.game === "crush" ? level : null });

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
        <legend className={`${CAPTION} mb-2.5`}>Pattern</legend>
        <div className="grid grid-cols-2 gap-2">
          <Choice selected={family === "mix"} onClick={() => choose("mix")} testId="family-mix" wide>
            <span className="min-w-0">
              <span className="block font-display text-base font-semibold text-foreground">Mix</span>
              <span className="block font-mono text-xs text-muted-foreground">Every pattern · {plural(familyVerbCount(p.data, source, "mix"))}</span>
            </span>
          </Choice>
          {FAMILIES.map((f, i) => (
            <Choice key={f.id} selected={family === f.id} onClick={() => choose(f.id)} testId={`family-${f.id}`} wide={i === FAMILIES.length - 1 && i % 2 === 0}>
              <span className="min-w-0">
                <span className="block font-display text-base font-semibold text-foreground">
                  <NoBreak text={f.label} />
                </span>
                <span className="block font-mono text-xs text-muted-foreground">{plural(familyVerbCount(p.data, source, f.id))}</span>
              </span>
            </Choice>
          ))}
        </div>
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
                  {available ? `${row.goalCount} forms · ${row.moveBudget} moves` : "Needs more verbs"}
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
