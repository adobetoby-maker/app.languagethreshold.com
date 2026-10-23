// Built by TAC — 2026-10-22
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { ArrowLeft, ArrowRight, Check, Lock, RotateCcw } from "lucide-react";
import { useOwnedSpeaker } from "@/hooks/use-owned-speaker";
import { recordSeriesStep, seriesMastered, seriesProgress, sourceFilterFor, stepUnlocked, type VerbDeviceState } from "@/lib/verb-games/device";
import { familyById } from "@/lib/verb-games/families";
import { MATCH_SIZE, SERIES_STEPS, seriesItems, seriesSlots, type SeriesStep } from "@/lib/verb-games/series";
import type { FamilyId, PatternData } from "@/lib/verb-games/types";
import { useSpeech } from "@/state/speech-state";
import { CardsStep } from "./CardsStep";
import { ChoiceStep } from "./ChoiceStep";
import { MatchStep } from "./MatchStep";
import { noVoiceFor } from "./speech-check";
import { CAPTION, EYEBROW, FOCUS, PRIMARY, SECONDARY, STEP_META, STEP_PANEL, type StepRun } from "./series-meta";
import { TypeStep } from "./TypeStep";

type View = { kind: "overview" } | { kind: "play"; step: SeriesStep; seed: number; run: number } | { kind: "result"; step: SeriesStep; result: StepRun };

function randomSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] as number;
}

const nextStep = (step: SeriesStep): SeriesStep | null => SERIES_STEPS[SERIES_STEPS.indexOf(step) + 1] ?? null;

function resultLine(step: SeriesStep, r: StepRun): string {
  if (step === "match") {
    const m = r.mistakes ?? 0;
    return `All ${r.total} pairs · ${m} mistake${m === 1 ? "" : "s"} · ${r.score} of ${r.total} clean`;
  }
  if (step === "cards") return `All ${r.total} cards rated Good or Easy`;
  return `${r.score} of ${r.total} ${step === "type" ? "exact" : "right"}`;
}

function bestLine(step: SeriesStep, best: number | undefined, pairs: number | undefined): string | null {
  if (best === undefined) return null;
  if (step === "match") return `Best: ${best} of ${pairs ?? MATCH_SIZE} clean`;
  if (step === "cards") return `Done: ${best} cards`;
  return `Best: ${best} of 10`;
}

/**
 * One family's practice series: Pick it, Match it, Cards, Listen, Type it. Built only from the signed
 * pattern data. Device state comes in from VerbsSection (the one place useVerbDevice is mounted).
 */
export function VerbSeries(p: {
  data: PatternData;
  device: VerbDeviceState;
  moduleId: string | null;
  family: FamilyId;
  /** Dev `?vseed=` (null in production): fixes every session's seed. */
  devSeed: number | null;
  update(fn: (s: VerbDeviceState) => VerbDeviceState): void;
  onBack(): void;
}) {
  const { data, device, family, devSeed, update } = p;
  const fam = familyById(family);
  const source = useMemo(() => sourceFilterFor(device.settings, p.moduleId), [device.settings, p.moduleId]);
  const slotCount = useMemo(() => seriesSlots(data, family, source).length, [data, family, source]);
  const progress = seriesProgress(device, family);
  const mastered = seriesMastered(device, family);
  const [view, setView] = useState<View>({ kind: "overview" });
  const runs = useRef(0);
  const rootRef = useRef<HTMLElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);

  const speech = useSpeech();
  const speakOwned = useOwnedSpeaker("verb-series");
  const { accent, voiceURI, rate } = speech;
  const speak = useCallback(
    (text: string, onFail?: () => void) => speakOwned(text, accent, voiceURI, Math.min(rate, 0.9), { onerror: onFail }),
    [speakOwned, accent, voiceURI, rate],
  );
  const audioMissing = useCallback(() => noVoiceFor(accent, voiceURI), [accent, voiceURI]);

  const examples = useMemo(() => {
    const seen = new Set<string>();
    for (const item of seriesItems(data, family, source, 1, 12)) seen.add(item.answer);
    return [...seen].slice(0, 3);
  }, [data, family, source]);

  const items = useMemo(() => (view.kind === "play" ? seriesItems(data, family, source, view.seed) : []), [view, data, family, source]);

  const scrollTop = () => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    rootRef.current?.scrollIntoView?.({ block: "start", behavior: reduce ? "auto" : "smooth" });
  };

  const start = (step: SeriesStep) => {
    if (!stepUnlocked(device, family, step)) return;
    runs.current += 1;
    setView({ kind: "play", step, seed: devSeed ?? randomSeed(), run: runs.current });
    scrollTop();
  };

  const finish = useCallback(
    (step: SeriesStep, result: StepRun) => {
      const at = new Date().toISOString();
      const match = step === "match" ? { pairs: result.total, mistakes: result.mistakes ?? 0 } : {};
      update((s) => recordSeriesStep(s, family, step, { score: result.score, passed: result.passed, at, ...match }));
      setView({ kind: "result", step, result });
    },
    [update, family],
  );
  // The step that is playing, read when a game reports its end (never inside a state updater).
  const viewRef = useRef<View>(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);
  const onFinish = useCallback(
    (result: StepRun) => {
      const v = viewRef.current;
      if (v.kind === "play") finish(v.step, result);
    },
    [finish],
  );

  useEffect(() => {
    if (view.kind === "result") resultRef.current?.focus({ preventScroll: true });
  }, [view]);

  const activeStep = view.kind === "overview" ? null : view.step;

  const stepBar = (
    <nav
      aria-label="Steps in this pattern series"
      data-testid="series-step-bar"
      className="grid grid-cols-5 gap-1 rounded-xl border border-border/50 bg-background/95 p-1"
    >
      {SERIES_STEPS.map((step) => {
        const meta = STEP_META[step];
        const open = stepUnlocked(device, family, step);
        const passed = progress.passed.includes(step);
        const active = activeStep === step;
        const Icon = open ? meta.Icon : Lock;
        return (
          <button
            key={step}
            type="button"
            data-testid={`series-step-${step}`}
            data-state={passed ? "passed" : open ? "open" : "locked"}
            aria-current={active ? "step" : undefined}
            aria-label={`${meta.label}${passed ? ", passed" : open ? "" : ", locked"}`}
            disabled={!open || slotCount === 0}
            onClick={() => start(step)}
            className={`relative flex min-h-12 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 text-[11px] font-bold transition-colors duration-200 disabled:cursor-not-allowed ${FOCUS} ${
              active ? "bg-gold text-[#0a1220]" : open ? "text-muted-foreground hover:bg-gold/10 hover:text-foreground" : "text-muted-foreground/60"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            {meta.short}
            {passed && <Check className={`absolute right-0.5 top-0.5 h-3 w-3 ${active ? "text-[#0a1220]" : "text-gold-ink"}`} strokeWidth={2.4} aria-hidden="true" />}
          </button>
        );
      })}
    </nav>
  );

  return (
    <section
      ref={rootRef}
      aria-labelledby="series-title"
      data-testid="verb-series"
      data-family={family}
      data-mastered={mastered ? "true" : undefined}
      className="scroll-mt-4 space-y-4 rounded-2xl border border-border/60 bg-card/30 p-4 sm:p-6"
    >
      <header className="space-y-2">
        <button type="button" onClick={p.onBack} className={`${SECONDARY} -ml-1`} data-testid="series-back">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          Verbs
        </button>
        <div className={EYEBROW}>VERBS · PATTERN SERIES</div>
        <h2 id="series-title" className="font-display text-3xl font-semibold leading-tight">
          {fam.label}
        </h2>
        <p className="max-w-xl text-sm leading-snug text-muted-foreground">{fam.rule}</p>
        {examples.length > 0 && <p className="font-mono text-sm text-foreground/80">{examples.join(" · ")}</p>}
        {mastered && (
          <p className="inline-flex items-center gap-1.5 rounded-full border border-gold/60 bg-gold/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-gold-ink" data-testid="series-mastered">
            <Check className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
            Mastered
          </p>
        )}
      </header>

      {slotCount === 0 ? (
        <div className={STEP_PANEL} data-testid="series-empty">
          <h3 className="font-display text-lg font-semibold">No verbs for this pattern yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Your word source has no verbs in this pattern. Switch the source to Core in a game picker to practice it.</p>
        </div>
      ) : (
        <>
          {stepBar}

          {view.kind === "overview" && (
            <ol className="space-y-2.5" data-testid="series-overview">
              {SERIES_STEPS.map((step, i) => {
                const meta = STEP_META[step];
                const open = stepUnlocked(device, family, step);
                const passed = progress.passed.includes(step);
                const best = bestLine(step, progress.best[step], progress.match?.pairs);
                const prev = i > 0 ? STEP_META[SERIES_STEPS[i - 1] as SeriesStep].label : "";
                return (
                  <li
                    key={step}
                    data-testid={`series-row-${step}`}
                    data-state={passed ? "passed" : open ? "open" : "locked"}
                    className={`flex flex-col gap-3 rounded-xl border p-3.5 sm:flex-row sm:items-center ${passed ? "border-gold/50 bg-gold/[0.05]" : "border-border/60 bg-background/40"} ${open ? "" : "opacity-70"}`}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span
                        aria-hidden="true"
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-mono text-sm ${passed ? "border-gold bg-gold text-[#0a1220]" : "border-border text-muted-foreground"}`}
                      >
                        {passed ? <Check className="h-4 w-4" strokeWidth={2.4} /> : i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className={CAPTION}>
                          Step {i + 1} of {SERIES_STEPS.length}
                          {step === "type" ? " · mastery" : ""}
                        </p>
                        <h3 className="font-display text-lg font-semibold leading-tight text-foreground">{meta.label}</h3>
                        <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{meta.why}</p>
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                          {meta.pass}
                          {best ? ` · ${best}` : ""}
                        </p>
                      </div>
                    </div>
                    {open ? (
                      <button type="button" onClick={() => start(step)} className={`${passed ? SECONDARY : PRIMARY} w-full shrink-0 sm:w-auto`} data-testid={`series-start-${step}`}>
                        {passed ? "Play again" : "Start"}
                        <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                      </button>
                    ) : (
                      <p className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                        <Lock className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                        Pass {prev} to unlock
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {view.kind !== "overview" && (
            <div className={STEP_PANEL} data-testid="series-step-panel" data-step={view.step}>
              <header className="mb-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-ink">
                  Step {SERIES_STEPS.indexOf(view.step) + 1} of {SERIES_STEPS.length}
                </p>
                <h3 className="mt-0.5 font-display text-lg font-semibold text-foreground">{STEP_META[view.step].label}</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {STEP_META[view.step].why} {STEP_META[view.step].pass}.
                </p>
              </header>
              {view.kind === "play" && (view.step === "pick" || view.step === "listen") && (
                <ChoiceStep
                  key={view.run}
                  kind={view.step}
                  data={data}
                  source={source}
                  items={items}
                  seed={view.seed}
                  speak={speak}
                  audioMissing={audioMissing}
                  onFinish={onFinish}
                />
              )}
              {view.kind === "play" && view.step === "match" && <MatchStep key={view.run} data={data} source={source} family={family} seed={view.seed} onFinish={onFinish} />}
              {view.kind === "play" && view.step === "cards" && <CardsStep key={view.run} items={items} speak={speak} onFinish={onFinish} />}
              {view.kind === "play" && view.step === "type" && <TypeStep key={view.run} items={items} onFinish={onFinish} />}
              {view.kind === "result" && (
                <ResultPanel
                  step={view.step}
                  result={view.result}
                  mastered={mastered}
                  headingRef={resultRef}
                  onNext={(s) => start(s)}
                  onAgain={() => start(view.step)}
                  onOverview={() => {
                    setView({ kind: "overview" });
                    scrollTop();
                  }}
                  onBack={p.onBack}
                />
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function ResultPanel(p: {
  step: SeriesStep;
  result: StepRun;
  mastered: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onNext(s: SeriesStep): void;
  onAgain(): void;
  onOverview(): void;
  onBack(): void;
}) {
  const next = nextStep(p.step);
  const { passed } = p.result;
  const finalPass = passed && p.step === "type";
  return (
    <div data-testid="series-result" data-passed={passed ? "true" : "false"} className="space-y-4">
      <div className={`rounded-xl border p-4 ${passed ? "border-gold/60 bg-gold/[0.08]" : "border-border/60 bg-background/40"}`}>
        <h4 ref={p.headingRef} tabIndex={-1} className="font-display text-2xl font-semibold text-foreground focus:outline-none" data-testid="series-result-title">
          {finalPass ? "Pattern mastered" : passed ? "Passed" : "Not yet"}
        </h4>
        <p className="mt-1 font-mono text-sm text-foreground" data-testid="series-result-score">
          {resultLine(p.step, p.result)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {finalPass
            ? "You typed the forms from memory. This family now reads Mastered on the Verbs ladder."
            : passed
              ? next
                ? `${STEP_META[next].label} is open.`
                : "Every step is passed."
              : `${STEP_META[p.step].pass}. Try again: each run uses a fresh set.`}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {passed && next && (
          <button type="button" onClick={() => p.onNext(next)} className={PRIMARY} data-testid="series-next">
            Next: {STEP_META[next].label}
            <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </button>
        )}
        {finalPass && (
          <button type="button" onClick={p.onBack} className={PRIMARY} data-testid="series-done">
            Back to Verbs
            <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </button>
        )}
        <button type="button" onClick={p.onAgain} className={passed ? SECONDARY : PRIMARY} data-testid="series-again">
          <RotateCcw className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          {passed ? "Play again" : "Try again"}
        </button>
        <button type="button" onClick={p.onOverview} className={SECONDARY} data-testid="series-overview-button">
          Series overview
        </button>
      </div>
    </div>
  );
}
