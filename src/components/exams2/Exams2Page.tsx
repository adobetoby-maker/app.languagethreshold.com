// Built by TAC — 2026-10-23
// Exams v2 learner page. It asks /api/exam-check for the overview first: when the server's
// LT_EXAMS_V2 switch is off that answers "disabled" and the previous exams page is shown, exactly
// as before. When it is on, the learner picks a module, sees tests A / B / C, runs one and reads
// the result. The page holds no exam rules: windows, the 45-second clock and scoring are all
// decided and enforced by the server.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { LogIn } from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuth } from "@/state/auth-state";
import { MODULES, getModule, moduleSupportsLearningPair, type AppModule } from "@/data/modules";
import { getCurriculum } from "@/data/curriculum";
import { hasCore30Checkpoints } from "@/lib/core60-path";
import type { Language, NativeLanguage } from "@/data/languages";
import { ExamsApiError, examsRequest } from "./api";
import { FormCards, ModuleChooser } from "./Picker";
import { Results } from "./Results";
import { Runner } from "./Runner";
import type { FormKind, Overview, SessionData } from "./types";

type Gate =
  | { status: "loading" }
  | { status: "disabled" }
  | { status: "error"; message: string }
  | { status: "ready"; overview: Overview };

const FEATURED_ORDER = ["roofing", "gutters", "siding"];
const secondary =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm " +
  "hover:border-gold/60 focus-visible:ring-2 focus-visible:ring-gold/70";
const gold =
  "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gold px-5 py-3 font-semibold text-midnight " +
  "hover:opacity-90 focus-visible:ring-2 focus-visible:ring-gold/70";

/** Modules a learner can take Core 30 exams in for this language pair, tested modules first. */
function examModules(target: Language, native: NativeLanguage, bankIds: Set<string>): AppModule[] {
  const list = MODULES.filter(
    (module) =>
      bankIds.has(module.id) ||
      (hasCore30Checkpoints(module.id) &&
        Boolean(getCurriculum(module.id)) &&
        moduleSupportsLearningPair(module, target, native)),
  );
  const rank = (module: AppModule) =>
    bankIds.has(module.id) ? 0 : FEATURED_ORDER.includes(module.id) ? 1 : 2;
  return [...list].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (rank(a) === 1
        ? FEATURED_ORDER.indexOf(a.id) - FEATURED_ORDER.indexOf(b.id)
        : a.name.localeCompare(b.name)),
  );
}

export function Exams2Page({
  legacy,
  target,
  native,
  moduleId,
  sessionId,
  onModuleChange,
  onSessionChange,
}: {
  /** The previous exams page, shown when the v2 switch is off. */
  legacy: ReactNode;
  target: Language;
  native: NativeLanguage;
  moduleId?: string;
  sessionId?: string;
  onModuleChange: (moduleId: string) => void;
  onSessionChange: (sessionId: string | undefined) => void;
}) {
  const { user, loading: authLoading } = useAuth();
  const [gate, setGate] = useState<Gate>({ status: "loading" });
  const [epoch, setEpoch] = useState(0);
  const [authOpen, setAuthOpen] = useState(false);
  const [started, setStarted] = useState<SessionData | null>(null);
  const [busy, setBusy] = useState<FormKind | null>(null);
  const [startError, setStartError] = useState<{ kind: FormKind; message: string } | null>(null);
  const refresh = useCallback(() => setEpoch((value) => value + 1), []);
  const userId = user?.id;

  useEffect(() => {
    if (authLoading) return;
    const controller = new AbortController();
    examsRequest<Overview>({ action: "overview", target, native }, controller.signal)
      .then((overview) => setGate({ status: "ready", overview }))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        if (cause instanceof ExamsApiError && cause.code === "disabled")
          setGate({ status: "disabled" });
        else
          setGate({
            status: "error",
            message: cause instanceof Error ? cause.message : "We couldn't load the exams.",
          });
      });
    return () => controller.abort();
  }, [authLoading, userId, target, native, epoch]);

  const overview = gate.status === "ready" ? gate.overview : null;
  const bankIds = useMemo(
    () => new Set(overview?.modules.map((entry) => entry.moduleId) ?? []),
    [overview],
  );
  const modules = useMemo(() => examModules(target, native, bankIds), [target, native, bankIds]);
  const selected =
    modules.find((module) => module.id === moduleId) ??
    modules.find((module) => bankIds.has(module.id)) ??
    modules[0];

  if (gate.status === "disabled") return <>{legacy}</>;
  if (gate.status === "loading")
    return (
      <p role="status" className="mx-auto max-w-5xl text-muted-foreground">
        Loading exams…
      </p>
    );
  if (gate.status === "error")
    return (
      <div className="mx-auto max-w-5xl">
        <p
          role="alert"
          className="rounded-xl border border-red-600/50 p-4 text-red-800 dark:text-red-300"
        >
          {gate.message}
        </p>
        <button type="button" className={secondary + " mt-4"} onClick={refresh}>
          Try again
        </button>
      </div>
    );
  const ready = gate.overview;

  async function start(kind: FormKind) {
    if (!selected) return;
    setBusy(kind);
    setStartError(null);
    try {
      const view = await examsRequest<SessionData>({
        action: "start",
        moduleId: selected.id,
        kind,
        target,
        native,
      });
      setStarted(view);
      onSessionChange(view.sessionId);
    } catch (cause) {
      if (cause instanceof ExamsApiError && cause.code === "sign_in") setAuthOpen(true);
      setStartError({
        kind,
        message: cause instanceof Error ? cause.message : "We couldn't start the test.",
      });
      refresh();
    } finally {
      setBusy(null);
    }
  }

  if (sessionId) {
    if (!user)
      return (
        <div className="mx-auto max-w-2xl">
          <p className="text-lg">Sign in to continue your test.</p>
          <button type="button" className={gold + " mt-4"} onClick={() => setAuthOpen(true)}>
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Sign in
          </button>
          <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
        </div>
      );
    return (
      <SessionHost
        key={sessionId}
        sessionId={sessionId}
        initial={started?.sessionId === sessionId ? started : null}
        overview={ready}
        onExit={() => {
          setStarted(null);
          onSessionChange(undefined);
          refresh();
        }}
        onFinished={refresh}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="font-display text-3xl sm:text-4xl">Exams</h1>
      <p className="mt-3 max-w-2xl text-base text-muted-foreground">
        Three checkpoints for each module: where you start, how you are doing at the halfway point,
        and your final test. Every question has 45 seconds, so every learner sits the same test.
      </p>
      {!ready.signedIn ? (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card/50 p-4">
          <p className="min-w-0 flex-1 text-base">Sign in to take a test and save your results.</p>
          <button type="button" className={gold} onClick={() => setAuthOpen(true)}>
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Sign in
          </button>
        </div>
      ) : null}
      {ready.staff ? (
        <p className="mt-5 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold-ink dark:text-gold">
          Staff preview: you can open any test, even one that is locked for learners.
        </p>
      ) : null}
      {selected ? (
        <>
          <div className="mt-8">
            <ModuleChooser
              modules={modules}
              bankIds={bankIds}
              selected={selected.id}
              onSelect={(id) => {
                setStartError(null);
                onModuleChange(id);
              }}
            />
          </div>
          <h2 className="mt-10 font-display text-2xl sm:text-3xl">{selected.name}</h2>
          <FormCards
            module={selected}
            overview={ready.modules.find((entry) => entry.moduleId === selected.id) ?? null}
            ready={bankIds.has(selected.id)}
            signedIn={ready.signedIn}
            busy={busy}
            error={startError}
            onStart={start}
            onContinue={onSessionChange}
            onSignIn={() => setAuthOpen(true)}
          />
        </>
      ) : (
        <p className="mt-8 text-muted-foreground">There are no exams for this language pair yet.</p>
      )}
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}

/** One session: the runner while it is open, the result once it is finished. */
function SessionHost({
  sessionId,
  initial,
  overview,
  onExit,
  onFinished,
}: {
  sessionId: string;
  initial: SessionData | null;
  overview: Overview;
  onExit: () => void;
  onFinished: () => void;
}) {
  const [view, setView] = useState<SessionData | null>(initial);
  const [error, setError] = useState("");
  const status = view?.status;

  useEffect(() => {
    if (view) return;
    const controller = new AbortController();
    examsRequest<SessionData>({ action: "resume", sessionId }, controller.signal)
      .then(setView)
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "We couldn't open that test.");
      });
    return () => controller.abort();
  }, [sessionId, view]);

  useEffect(() => {
    if (status === "completed") onFinished();
  }, [status, onFinished]);

  if (error)
    return (
      <div className="mx-auto max-w-2xl">
        <p
          role="alert"
          className="rounded-xl border border-red-600/50 p-4 text-red-800 dark:text-red-300"
        >
          {error}
        </p>
        <button type="button" className={secondary + " mt-4"} onClick={onExit}>
          Back to exams
        </button>
      </div>
    );
  if (!view)
    return (
      <p role="status" className="mx-auto max-w-2xl text-muted-foreground">
        Opening your test…
      </p>
    );
  const moduleName = getModule(view.moduleId)?.name ?? view.moduleId;
  if (view.status === "completed") {
    const baseline = overview.modules.find((entry) => entry.moduleId === view.moduleId)?.forms?.A
      ?.best;
    return (
      <Results
        sessionId={view.sessionId}
        moduleName={moduleName}
        baselinePct={view.kind === "C" && baseline ? baseline.pct : null}
        onBack={onExit}
      />
    );
  }
  if (view.status === "abandoned")
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-lg">
          This test was closed because the exam was updated. Start it again.
        </p>
        <button type="button" className={secondary + " mt-4"} onClick={onExit}>
          Back to exams
        </button>
      </div>
    );
  return (
    <Runner
      view={view}
      moduleName={moduleName}
      spanish={view.target === "Spanish"}
      onView={setView}
      onLeave={onExit}
    />
  );
}
