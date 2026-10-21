// Built by TAC — 2026-10-21
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Trophy } from "lucide-react";
import { useApp } from "@/state/app-state";
import { useAuth } from "@/state/auth-state";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useVerbDevice } from "@/hooks/use-verb-device";
import { recordPicks, recordRound, sourceFilterFor, type VerbDeviceState } from "@/lib/verb-games/device";
import { loadPatternData } from "@/lib/verb-games/load-patterns";
import { guardVerbRoute } from "@/lib/verb-games/route-guard";
import { scopeKey } from "@/lib/verb-games/rules";
import type { PatternData, RoundConfig, RoundLog, RoundResult } from "@/lib/verb-games/types";
import { parseVerbRoute, verbRouteSearch, type VerbScreen } from "@/lib/verb-games/verb-route";
import { BubblePopGame } from "./BubblePopGame";
import { picksOf } from "./recap-groups";
import { RoundRecap } from "./RoundRecap";
import { VerbCrushGame } from "./VerbCrushGame";
import { VerbPicker } from "./VerbPicker";
import { VerbsHome } from "./VerbsHome";

const EYEBROW = "font-mono text-[11px] uppercase tracking-[0.22em] text-gold-ink";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-gold";
const PANEL = "rounded-2xl border border-border/60 bg-card/30 p-4 sm:p-6";
const HOME: VerbScreen = { screen: "home" };

/** Dev only: `?vseed=<n>` fixes the round seed. Always null in production builds. */
function devSeedFrom(search: string, dev: boolean): number | null {
  if (!dev) return null;
  const raw = new URLSearchParams(search).get("vseed");
  const n = raw === null || raw.trim() === "" ? NaN : Number(raw);
  return Number.isSafeInteger(n) ? n : null;
}

/** A fresh 32-bit round seed. */
function randomSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] as number;
}

/** The personal best stored for this round's scope before the round is recorded. */
function bestBefore(s: VerbDeviceState, config: RoundConfig): { score: number } | null {
  try {
    const best = s.bests[`${config.game}|${scopeKey(config)}`];
    return best ? { score: best.score } : null;
  } catch {
    return null; // a Crush round without a level has no board and no best
  }
}

interface EndedRound {
  result: RoundResult;
  config: RoundConfig;
  /** The personal best before this round. */
  previousBest: { score: number } | null;
}

function Notice(p: { eyebrow?: string; title: string; body: string; action?: { label: string; onClick(): void } }) {
  return (
    <section className={`${PANEL} space-y-2`} data-testid="verbs-notice">
      <div className={EYEBROW}>{p.eyebrow ?? "VERBS"}</div>
      <h2 className="font-display text-2xl font-semibold">{p.title}</h2>
      <p className="max-w-xl text-sm leading-snug text-muted-foreground">{p.body}</p>
      {p.action && (
        <button
          type="button"
          onClick={p.action.onClick}
          className={`mt-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-4 font-mono text-[11px] uppercase tracking-[0.18em] text-gold-ink transition-colors duration-200 hover:bg-gold/20 ${FOCUS}`}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          {p.action.label}
        </button>
      )}
    </section>
  );
}

function Loading() {
  return (
    <section className={`${PANEL} space-y-4`} aria-busy="true" data-testid="verbs-loading">
      <div className={EYEBROW}>VERBS</div>
      <h2 className="font-display text-3xl font-semibold">Practice by pattern</h2>
      <div className="grid grid-cols-2 gap-3" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-muted/60 motion-safe:animate-pulse" />
        ))}
      </div>
      <p className="sr-only" role="status">
        Loading verb patterns
      </p>
    </section>
  );
}

/**
 * The Verbs section of the Games hub. The only place `useVerbDevice` is mounted (children get the
 * state and `update` as props). The screen lives in the URL (`?verbs=…`) so refresh and Back work.
 */
export function VerbsSection() {
  const { state } = useApp();
  const { user } = useAuth();
  const device = useVerbDevice();
  const [route, setRoute] = useState<VerbScreen>(HOME);
  const [seed, setSeed] = useState<number | null>(null);
  const [data, setData] = useState<PatternData | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  /** Bumped by Play again so the game remounts with a fresh round. */
  const [roundKey, setRoundKey] = useState(0);
  const [ended, setEnded] = useState<EndedRound | null>(null);
  /** The last round recorded, so a repeated end call never counts a round twice. */
  const recordedRef = useRef<string | null>(null);

  const spanish = state.selectedLanguage === "Spanish";
  const moduleId = state.activeModuleId ?? null;

  useEffect(() => {
    const read = () => {
      setRoute(parseVerbRoute(window.location.search));
      setSeed(devSeedFrom(window.location.search, Boolean(import.meta.env?.DEV)));
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);

  useEffect(() => {
    if (!spanish) return;
    let live = true;
    setFailed(false);
    loadPatternData().then(
      (loaded) => live && setData(loaded),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [spanish, attempt]);

  const go = useCallback((next: VerbScreen) => {
    const url = window.location.pathname + verbRouteSearch(window.location.search, next) + window.location.hash;
    // Choosing within one screen (pattern chips) replaces; moving between screens adds a Back step.
    if (parseVerbRoute(window.location.search).screen === next.screen) window.history.replaceState(window.history.state, "", url);
    else {
      window.history.pushState(window.history.state, "", url);
      rootRef.current?.scrollIntoView?.({ block: "start" });
    }
    setRoute(next);
  }, []);

  const { update } = device;
  /** A round ended: update bests and mastery on this device, then show the recap. */
  const finishRound = useCallback(
    (log: RoundLog, result: RoundResult) => {
      if (recordedRef.current === log.clientRoundId) return;
      recordedRef.current = log.clientRoundId;
      const seen: { best: { score: number } | null } = { best: null };
      update((s) => {
        seen.best = bestBefore(s, log.config);
        // A round that scored nothing has no best to remember; its picks still count toward mastery.
        // Nothing reads the unsent queue until the board submits (Task 22+), so rounds are not queued yet.
        const recorded = result.score > 0 ? recordRound(s, log, result, { queue: false }) : s;
        return recordPicks(recorded, picksOf(result));
      });
      setEnded({ result, config: log.config, previousBest: seen.best });
    },
    [update],
  );

  // Leaving or re-entering the play screen always starts clean (no stale "Round over").
  useEffect(() => {
    setEnded(null);
  }, [route]);

  const settings = device.state.settings;
  const playing = route.screen === "play" ? route : null;
  // A round starts only once the pattern data and the saved settings are both in, so a deep-linked
  // round never starts on default list mode or source and then changes under the player.
  const ready = data !== null && device.hydrated;
  // Frozen per round: the config is built once when ready and kept until the round identity changes
  // (game, family, level, Play again, dev seed), so later settings changes never reach a live round.
  const roundId = playing ? `${playing.game}|${playing.family}|${String(playing.level)}|${roundKey}|${String(seed)}` : null;
  const frozen = useRef<{ id: string; config: RoundConfig } | null>(null);
  if (roundId === null) frozen.current = null;
  else if (ready && playing && frozen.current?.id !== roundId) {
    frozen.current = {
      id: roundId,
      config: {
        game: playing.game,
        family: playing.family,
        level: playing.game === "crush" ? playing.level : null,
        source: sourceFilterFor(settings, moduleId),
        seed: seed ?? randomSeed(),
        // Crush has no list screen; its board is keyboard-playable as is.
        listMode: playing.game === "bubble" ? settings.listMode : false,
        reducedMotion,
      },
    };
  }
  const roundConfig = ready && roundId !== null && frozen.current?.id === roundId ? frozen.current.config : null;

  if (!spanish) {
    return <Notice title="Verb Games are Spanish-only for now" body="Switch your target language to Spanish to practice verbs by pattern." />;
  }
  if (failed) {
    return (
      <Notice
        title="Verb patterns did not load"
        body="Check your connection and try again."
        action={{ label: "Try again", onClick: () => setAttempt((n) => n + 1) }}
      />
    );
  }
  if (!data || (route.screen === "play" && !device.hydrated)) return <Loading />;

  const source = sourceFilterFor(device.state.settings, moduleId);
  const view = guardVerbRoute(route, data, source);
  const back = (screen: VerbScreen) => ({ label: "Back", onClick: () => go(screen) });

  return (
    <div ref={rootRef} data-verbs-root="" data-verbs-open={view.screen === "home" ? undefined : ""} data-dev-seed={seed ?? undefined} className="scroll-mt-4">
      {view.screen === "home" && <VerbsHome data={data} device={device.state} moduleId={moduleId} go={go} />}
      {view.screen === "pick" && (
        <VerbPicker
          data={data}
          device={device.state}
          moduleId={moduleId}
          game={view.game}
          family={view.family}
          go={go}
          onSettings={(settings) => device.update((s) => ({ ...s, settings }))}
        />
      )}
      {view.screen === "play" && view.game === "bubble" && roundConfig?.game === "bubble" && !ended && (
        <BubblePopGame
          key={roundKey}
          data={data}
          config={roundConfig}
          onEnd={finishRound}
          onSaveCard={() => {
            // Verb Cards land in Tasks 22/23.
          }}
        />
      )}
      {view.screen === "play" && view.game === "crush" && roundConfig?.game === "crush" && !ended && (
        <VerbCrushGame
          key={roundKey}
          data={data}
          config={roundConfig}
          onEnd={finishRound}
          onSaveCard={() => {
            // Verb Cards land in Tasks 22/23.
          }}
        />
      )}
      {view.screen === "play" && ended && (
        <RoundRecap
          eyebrow={view.game === "crush" ? "GAME · VERB CRUSH" : "GAME · BUBBLE POP"}
          result={ended.result}
          best={ended.previousBest}
          countsForBest={!ended.config.listMode}
          // Public boards are closed until the leaderboard server lands (Task 21+).
          placement={null}
          boardsOpen={false}
          signedIn={Boolean(user)}
          savedKeys={[]}
          // Send to Flashcards and Verb Cards land in Tasks 22/23; until then the send controls stay hidden.
          showSend={false}
          onSendCards={() => {}}
          onPlayAgain={() => {
            setEnded(null);
            setRoundKey((k) => k + 1);
          }}
          onPractice={(family) => go({ screen: "unit", family })}
          onBack={() => go(HOME)}
        />
      )}
      {view.screen === "unit" && (
        <Notice title="Pattern lessons are on the way" body="The step-by-step page for this pattern is not ready yet." action={back(HOME)} />
      )}
      {view.screen === "board" && (
        <section className={`${PANEL} space-y-2`} data-testid="verbs-board-soon">
          <div className={EYEBROW}>VERBS</div>
          <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
            <Trophy className="h-5 w-5 text-gold-ink" strokeWidth={1.8} aria-hidden="true" />
            Leaderboards coming soon
          </h2>
          <p className="max-w-xl text-sm leading-snug text-muted-foreground">Your personal bests are saved on this device in the meantime.</p>
          <button
            type="button"
            onClick={() => go(HOME)}
            className={`mt-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-4 font-mono text-[11px] uppercase tracking-[0.18em] text-gold-ink transition-colors duration-200 hover:bg-gold/20 ${FOCUS}`}
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            Back
          </button>
        </section>
      )}
    </div>
  );
}
