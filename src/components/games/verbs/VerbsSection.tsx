// Built by TAC — 2026-10-21
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Trophy } from "lucide-react";
import { useApp } from "@/state/app-state";
import { useVerbDevice } from "@/hooks/use-verb-device";
import { sourceFilterFor } from "@/lib/verb-games/device";
import { loadPatternData } from "@/lib/verb-games/load-patterns";
import { guardVerbRoute } from "@/lib/verb-games/route-guard";
import type { PatternData } from "@/lib/verb-games/types";
import { parseVerbRoute, verbRouteSearch, type VerbScreen } from "@/lib/verb-games/verb-route";
import { VerbPicker } from "./VerbPicker";
import { VerbsHome } from "./VerbsHome";

const EYEBROW = "font-mono text-[11px] uppercase tracking-[0.22em] text-gold-ink";
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const PANEL = "rounded-2xl border border-border/60 bg-card/30 p-4 sm:p-6";
const HOME: VerbScreen = { screen: "home" };

/** Dev only: `?vseed=<n>` fixes the round seed. Always null in production builds. */
function devSeedFrom(search: string, dev: boolean): number | null {
  if (!dev) return null;
  const raw = new URLSearchParams(search).get("vseed");
  const n = raw === null || raw.trim() === "" ? NaN : Number(raw);
  return Number.isSafeInteger(n) ? n : null;
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
  const device = useVerbDevice();
  const [route, setRoute] = useState<VerbScreen>(HOME);
  const [seed, setSeed] = useState<number | null>(null);
  const [data, setData] = useState<PatternData | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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
  if (!data) return <Loading />;

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
      {view.screen === "play" && (
        <Notice
          eyebrow={`GAME · ${view.game === "bubble" ? "BUBBLE POP" : "VERB CRUSH"}`}
          title="This round is not ready to play yet"
          body="Pick a pattern and come back soon."
          action={back({ screen: "pick", game: view.game, family: view.family })}
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
