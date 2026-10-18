import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  CreditCard,
  FileDown,
  Mail,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import { AuthProvider, useAuth } from "@/state/auth-state";
import { AuthModal } from "@/components/auth/AuthModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ownedTeamRequest } from "@/lib/team-client";
import { assessmentCsv } from "@/lib/assessments/export";
import { usePracticeLifecycle } from "@/hooks/use-practice-lifecycle";
import { TEAM_MIN_SEATS, teamPeriodCents, type TeamTerm } from "@/lib/team-pricing";
import { MODULES, getModule } from "@/data/modules";
import { getCurriculum } from "@/data/curriculum";
import type { Core30Log } from "@/lib/core30-plan";
import { describeCore30, type Core30Display, type Core30TrackDisplay } from "@/lib/team-core30";

const TeamExamsPanel = lazy(() =>
  import("@/components/exams/TeamExamsPanel").then((module) => ({
    default: module.TeamExamsPanel,
  })),
);

export const Route = createFileRoute("/team")({
  component: () => (
    <AuthProvider>
      <TeamPage />
    </AuthProvider>
  ),
});

type OrgMembership = {
  organization_id: string;
  role: string;
  team_organizations: { id: string; name: string; billing_email: string; onboarding_step: number };
};
type Member = { id: string; user_id: string; display_name: string; role: string; status: string };
type Invite = {
  id: string;
  email: string;
  display_name: string;
  role: string;
  status: string;
  module_id: string | null;
  require_certificate: boolean;
  sent_at: string | null;
  last_email_error: string | null;
};
type Assignment = {
  id: string;
  user_id: string;
  module_id: string;
  require_certificate: boolean;
  due_at: string | null;
};
type Activity = { user_id: string; module_id: string; active_seconds: number; started_at: string };
type Lesson = { user_id: string; module_id: string; lesson_number: number };
type Attempt = {
  id: string;
  user_id: string;
  module_id: string;
  score: number | null;
  total: number;
  submitted_at: string;
};
type Certificate = {
  id: string;
  user_id: string;
  learner_name: string;
  module_id: string;
  score: number;
  issued_at: string;
  status: string;
};
type TeamData = {
  organization: { id: string; name: string; billing_email: string; onboarding_step: number };
  enrollmentEnabled: boolean;
  emailEnabled: boolean;
  entitlement: {
    seat_limit: number;
    term: string | null;
    status: string;
    period_end: string | null;
  };
  role: string;
  members: Member[];
  invitations: Invite[];
  assignments: Assignment[];
  activity: Activity[];
  activity7: Activity[];
  lessons: Lesson[];
  attempts: Attempt[];
  certificates: Certificate[];
  /** Per-user Core 30 log; absent on older servers. */
  core30?: Record<string, Core30Log>;
  core30Tracks?: Record<string, Core30TrackDisplay[]>;
};
type TeamActionIntent = { isCurrent: () => boolean; signal: AbortSignal };
type TeamAction = <T>(
  body: unknown,
  message: string,
  after?: (result: T) => void,
  intent?: TeamActionIntent,
) => Promise<void>;

type QuizQuestion = { id: string; area: string; prompt: string; options: string[] };
type InviteLink = { id: string; name: string; email: string; url: string };

const card = "rounded-2xl border border-border/60 bg-card/50 p-5";
const input = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground";
const button = "rounded-lg bg-gold px-4 py-2.5 font-semibold text-midnight disabled:opacity-50";
const secondary = "rounded-lg border border-border px-4 py-2.5 text-sm hover:border-gold/60";
const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const minutes = (seconds: number) => `${Math.round(seconds / 60)} min`;

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && quoted && line[i + 1] === '"') {
      cell += '"';
      i++;
    } else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else cell += char;
  }
  if (quoted) throw new Error("The CSV has an unfinished quoted field.");
  cells.push(cell.trim());
  return cells;
}

function TeamPage() {
  const { user } = useAuth();
  return <OwnedTeamPage key={user?.id ?? "guest"} />;
}
function OwnedTeamPage() {
  const { user, loading: authLoading, canUseReader } = useAuth();
  const userId = user?.id;
  const [organizations, setOrganizations] = useState<OrgMembership[]>([]);
  const [orgId, setOrgId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("org"),
  );
  const [rawData, setData] = useState<TeamData | null>(null);
  const data = rawData?.organization.id === orgId ? rawData : null;
  const [loading, setLoading] = useState(true);
  const [error, setErrorState] = useState("");
  const [notice, setNoticeState] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [busy, setBusyState] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const handledCheckout = useRef("");

  const { capture, cancel } = usePracticeLifecycle(
    JSON.stringify(["team-workspace", orgId, authLoading]),
  );
  const selected = useRef(orgId);
  const latestData = useRef(data);
  latestData.current = data;
  const readFlight = useRef<AbortController | null>(null);
  const mutation = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const currentPage = () =>
    !!userId &&
    !authLoading &&
    canUseReader(userId) &&
    selected.current === orgId &&
    capture().isCurrent();
  const setBusy = (value: boolean) => {
    const mountedCleanup =
      !value && !!userId && selected.current === orgId && capture().isCurrent();
    if (currentPage() || mountedCleanup) {
      busyRef.current = value;
      setBusyState(value);
    }
  };
  const setError = (value: string) => {
    if (currentPage()) setErrorState(value);
  };
  const setNotice = (value: string) => {
    if (currentPage()) setNoticeState(value);
  };
  const selectOrganization = useCallback(
    (next: string | null) => {
      if (
        !userId ||
        authLoading ||
        !canUseReader(userId) ||
        !capture().isCurrent() ||
        selected.current !== orgId ||
        selected.current === next
      )
        return;
      selected.current = next;
      latestData.current = null;
      cancel();
      setData(null);
      setErrorState("");
      setNoticeState("");
      setBusyState(false);
      busyRef.current = false;
      setOrgId(next);
    },
    [userId, authLoading, canUseReader, capture, cancel, orgId],
  );
  const refresh = useCallback(
    async (next?: string | null, parentCurrent?: () => boolean) => {
      const lease = capture();
      if (
        !userId ||
        authLoading ||
        !canUseReader(userId) ||
        !lease.isCurrent() ||
        selected.current !== orgId
      )
        return;
      if (next !== undefined && next !== orgId) {
        selectOrganization(next);
        return;
      }
      if (mutation.current && !parentCurrent) return;
      readFlight.current?.abort();
      const controller = new AbortController();
      readFlight.current = controller;
      const release = lease.own(() => controller.abort());
      const current = () =>
        lease.isCurrent() &&
        canUseReader(userId) &&
        selected.current === orgId &&
        readFlight.current === controller &&
        !controller.signal.aborted &&
        (!parentCurrent || parentCurrent());
      const owner = { userId, isCurrent: current, signal: controller.signal };
      // Keep the same company's mounted panel (including manual invite links) during refresh.
      // Selection/account changes and denied reads still remove its private data.
      latestData.current = null;
      setLoading(true);
      setErrorState("");
      try {
        const list = await ownedTeamRequest<{ organizations: OrgMembership[] }>(owner, "/api/team");
        if (!current()) return;
        setOrganizations(list.organizations);
        if (!orgId) {
          const first = list.organizations[0]?.organization_id ?? null;
          if (first) {
            selectOrganization(first);
            return;
          }
        } else {
          if (!list.organizations.some((item) => item.organization_id === orgId))
            throw new Error(
              "This account does not have access to the selected company. Choose one of your companies.",
            );
          const detail = await ownedTeamRequest<TeamData>(
            owner,
            `/api/team?org=${encodeURIComponent(orgId)}`,
          );
          if (!current()) return;
          if (detail.organization.id !== orgId)
            throw new Error(
              "The company response did not match the selected workspace. Refresh and retry.",
            );
          setData(detail);
        }
      } catch (cause) {
        if (current()) {
          setData(null);
          setErrorState(cause instanceof Error ? cause.message : "Could not load team.");
        }
      } finally {
        if (lease.isCurrent() && readFlight.current === controller) {
          setLoading(false);
          readFlight.current = null;
        }
        release();
        controller.abort();
      }
    },
    [userId, authLoading, canUseReader, orgId, capture, selectOrganization],
  );
  useEffect(() => {
    if (!authLoading && userId) void refresh();
    else if (!authLoading) setLoading(false);
    return () => readFlight.current?.abort();
  }, [authLoading, userId, refresh]);

  useEffect(() => {
    const lease = capture();
    if (!userId || authLoading || !canUseReader(userId) || !lease.isCurrent()) return;
    const url = new URL(window.location.href);
    const checkout = url.searchParams.get("checkout"),
      sessionId = url.searchParams.get("session_id"),
      checkoutOrg = url.searchParams.get("org");
    const mark = JSON.stringify([checkout, sessionId, orgId]);
    if (!checkout || (checkoutOrg && checkoutOrg !== orgId) || handledCheckout.current === mark)
      return;
    handledCheckout.current = mark;
    const controller = new AbortController();
    let finished = false;
    const release = lease.own(() => controller.abort());
    const current = () =>
      lease.isCurrent() &&
      canUseReader(userId) &&
      selected.current === orgId &&
      !controller.signal.aborted &&
      window.location.href === url.href;
    void (async () => {
      try {
        if (checkout === "cancel") {
          if (current()) setNoticeState("Checkout was canceled. No team plan was purchased.");
        } else if (checkout === "success" && sessionId && checkoutOrg) {
          const result = await ownedTeamRequest<{ status: string }>(
            { userId, isCurrent: current, signal: controller.signal },
            `/api/team-billing?orgId=${encodeURIComponent(checkoutOrg)}&sessionId=${encodeURIComponent(sessionId)}`,
          );
          if (!current()) return;
          setNoticeState(
            result.status === "active" || result.status === "trialing"
              ? "Payment confirmed. Your team seats are ready to assign."
              : "Stripe is still processing this payment. Refresh the team page to check your seats.",
          );
          await refresh(checkoutOrg, current);
          if (!current()) return;
        }
        if (!current()) return;
        const clean = new URL(url);
        clean.searchParams.delete("checkout");
        clean.searchParams.delete("session_id");
        window.history.replaceState(null, "", clean);
        finished = true;
      } catch (cause) {
        if (current())
          setErrorState(cause instanceof Error ? cause.message : "Could not verify checkout.");
      } finally {
        if (!finished && handledCheckout.current === mark) handledCheckout.current = "";
        release();
        controller.abort();
      }
    })();
    return () => {
      controller.abort();
      release();
      if (!finished && handledCheckout.current === mark) handledCheckout.current = "";
    };
  }, [userId, orgId, authLoading, canUseReader, capture, refresh]);

  async function act<T>(
    body: unknown,
    message: string,
    after?: (result: T) => void,
    intent?: TeamActionIntent,
  ) {
    const lease = capture();
    if (
      !userId ||
      !currentPage() ||
      (intent && (!intent.isCurrent() || intent.signal.aborted)) ||
      mutation.current ||
      busyRef.current ||
      (readFlight.current && !readFlight.current.signal.aborted) ||
      latestData.current !== data
    )
      return;
    if (body && typeof body === "object" && "orgId" in body && body.orgId !== orgId) return;
    const controller = new AbortController();
    const abortIntent = () => controller.abort();
    intent?.signal.addEventListener("abort", abortIntent, { once: true });
    mutation.current = controller;
    busyRef.current = true;
    const release = lease.own(() => {
      controller.abort();
      if (mutation.current === controller) mutation.current = null;
    });
    const current = () =>
      lease.isCurrent() &&
      canUseReader(userId) &&
      selected.current === orgId &&
      (!intent || (intent.isCurrent() && !intent.signal.aborted)) &&
      mutation.current === controller &&
      !controller.signal.aborted;
    readFlight.current?.abort();
    setBusyState(true);
    setErrorState("");
    setNoticeState("");
    try {
      const result = await ownedTeamRequest<T & { warning?: string }>(
        { userId, isCurrent: current, signal: controller.signal },
        "/api/team",
        body,
      );
      if (!current()) return;
      setNoticeState(result.warning ? `${message} ${result.warning}` : message);
      after?.(result);
      if (current()) await refresh(undefined, current);
    } catch (cause) {
      if (current()) setErrorState(cause instanceof Error ? cause.message : "Request failed.");
    } finally {
      if (lease.isCurrent() && mutation.current === controller) {
        busyRef.current = false;
        setBusyState(false);
      }
      if (mutation.current === controller) mutation.current = null;
      intent?.signal.removeEventListener("abort", abortIntent);
      release();
      controller.abort();
    }
  }

  if (authLoading || (loading && !data))
    return (
      <Page>
        <p className="text-muted-foreground">Loading team workspace…</p>
      </Page>
    );
  if (!user)
    return (
      <Page>
        <ThemeToggle className={secondary + " mb-5 flex items-center gap-2"} />
        <h1 className="text-3xl font-semibold">Team workspace</h1>
        <p className="mt-3 text-muted-foreground">Sign in to set up or join a company team.</p>
        <button onClick={() => setAuthOpen(true)} className={button + " mt-5"}>
          Sign in or create account
        </button>
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      </Page>
    );
  return (
    <Page>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[.22em] text-gold-ink dark:text-gold">
            Language Threshold for Teams
          </p>
          <h1 className="text-3xl font-semibold">
            {data?.organization.name ?? "Set up your company"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Seats, learning assignments, active practice, and certificates.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ThemeToggle className={secondary + " flex items-center gap-2"} />
          <Link to="/" className={secondary}>
            ← Learning app
          </Link>
          {data && (
            <a href={`/exams?org=${encodeURIComponent(data.organization.id)}`} className={button}>
              Exams and assessment progress
            </a>
          )}
          {data && (data.role === "owner" || data.role === "admin") && (
            <Link to="/module-request" className={secondary}>
              Custom module request · $20
            </Link>
          )}
          <button
            onClick={() => void refresh()}
            className={secondary}
            aria-label="Refresh team data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
      {organizations.length > 1 && (
        <label className="mb-6 block max-w-sm text-sm">
          Company
          <select
            className={input + " mt-1"}
            value={orgId ?? ""}
            onChange={(event) => void refresh(event.target.value)}
          >
            {organizations.map((o) => (
              <option key={o.organization_id} value={o.organization_id}>
                {o.team_organizations.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && (
        <p
          role="alert"
          className="mb-5 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-700 dark:text-red-300"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mb-5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-300"
        >
          {notice}
        </p>
      )}
      {!data && (
        <section className={card + " max-w-xl"}>
          <h2 className="mb-2 text-xl font-semibold">Create your company workspace</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Start with five learner seats. Admin-only accounts do not use a learner seat.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void act<{ orgId: string }>(
                { action: "create", name: companyName, billingEmail: billingEmail || user.email },
                "Company workspace created.",
                (result) => selectOrganization(result.orgId),
              );
            }}
            className="space-y-4"
          >
            <label className="block text-sm">
              Company name
              <input
                required
                minLength={2}
                maxLength={120}
                className={input + " mt-1"}
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
              />
            </label>
            <label className="block text-sm">
              Billing and admin email
              <input
                required
                type="email"
                className={input + " mt-1"}
                value={billingEmail || user.email || ""}
                onChange={(event) => setBillingEmail(event.target.value)}
              />
            </label>
            <button disabled={busy} className={button}>
              Create workspace
            </button>
          </form>
        </section>
      )}
      {data && (
        <Suspense fallback={<p role="status">Loading assessment tools…</p>}>
          <TeamExamsPanel key={data.organization.id} orgId={data.organization.id} />
        </Suspense>
      )}
      {data &&
        (data.role === "owner" || data.role === "admin" ? (
          <AdminWorkspace
            key={data.organization.id}
            data={data}
            busy={busy}
            setBusy={setBusy}
            isBusy={() =>
              busyRef.current ||
              mutation.current !== null ||
              !!(readFlight.current && !readFlight.current.signal.aborted)
            }
            isContextCurrent={currentPage}
            act={act}
            refresh={() => refresh()}
            setError={setError}
            setNotice={setNotice}
          />
        ) : (
          <LearnerWorkspace key={data.organization.id} data={data} />
        ))}
    </Page>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-7xl">{children}</div>
    </div>
  );
}

function memberModules(data: TeamData, userId: string): Assignment[] {
  const assigned = data.assignments.filter((item) => item.user_id === userId);
  const assignedIds = new Set(assigned.map((item) => item.module_id));
  const practiced = new Set(
    data.activity.filter((item) => item.user_id === userId).map((item) => item.module_id),
  );
  return [
    ...assigned,
    ...[...practiced]
      .filter((moduleId) => !assignedIds.has(moduleId))
      .map((moduleId) => ({
        id: `practice:${userId}:${moduleId}`,
        user_id: userId,
        module_id: moduleId,
        require_certificate: false,
        due_at: null,
      })),
  ];
}

function AdminWorkspace(props: Parameters<typeof OwnedAdminWorkspace>[0]) {
  const { user } = useAuth();
  return user ? (
    <OwnedAdminWorkspace key={JSON.stringify([user.id, props.data.organization.id])} {...props} />
  ) : null;
}
function OwnedAdminWorkspace({
  data,
  busy,
  setBusy,
  isBusy,
  isContextCurrent,
  act,
  refresh,
  setError,
  setNotice,
}: {
  data: TeamData;
  busy: boolean;
  setBusy: (value: boolean) => void;
  isBusy: () => boolean;
  isContextCurrent: () => boolean;
  act: TeamAction;
  refresh: () => Promise<void>;
  setError: (value: string) => void;
  setNotice: (value: string) => void;
}) {
  const { user, canUseReader } = useAuth();
  const userId = user?.id;
  const { capture } = usePracticeLifecycle(JSON.stringify(["team-admin", data.organization.id]));
  const operation = useRef<AbortController | null>(null);
  const orgId = data.organization.id;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [moduleId, setModuleId] = useState("roofing");
  const [certificate, setCertificate] = useState(true);
  const [inviteRole, setInviteRole] = useState<"learner" | "admin">("learner");
  const [delivery, setDelivery] = useState<"manual" | "email">("manual");
  const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([]);
  const [term, setTerm] = useState<TeamTerm>("monthly");
  const [initialSeats, setInitialSeats] = useState(
    Math.max(TEAM_MIN_SEATS, data.entitlement.seat_limit),
  );
  const [addSeats, setAddSeats] = useState(1);
  const [quote, setQuote] = useState<{
    estimateCents: number;
    newSeatLimit: number;
    note: string;
  } | null>(null);
  const [showTour, setShowTour] = useState(data.organization.onboarding_step < 6);
  const [tourStep, setTourStep] = useState(data.organization.onboarding_step);
  const activeLearners = data.members.filter((m) => m.role === "learner" && m.status === "active");
  const pending = data.invitations.filter((i) => i.status === "pending");
  const seatsUsed = activeLearners.length + pending.filter((i) => i.role === "learner").length;
  const active30 = new Set(data.activity.map((a) => a.user_id)).size;
  const totalMinutes = minutes(data.activity.reduce((sum, a) => sum + a.active_seconds, 0));
  const remaining = Math.max(0, data.entitlement.seat_limit - seatsUsed);
  const canStartPlan = ["pending", "manual", "canceled"].includes(data.entitlement.status);

  const settingsKey = JSON.stringify([
    moduleId,
    certificate,
    delivery,
    term,
    initialSeats,
    addSeats,
  ]);
  const live = useRef({ data, settingsKey, inviteLinks });
  live.current = { data, settingsKey, inviteLinks };
  const viewCurrent = () =>
    !!userId &&
    canUseReader(userId) &&
    isContextCurrent() &&
    live.current.data === data &&
    live.current.settingsKey === settingsKey;
  const inviteKey = JSON.stringify([name, email, inviteRole, moduleId, certificate, delivery]);
  const inviteRevision = useRef(0);
  const renderedInviteRevision = inviteRevision.current;
  const latestInvite = useRef(inviteKey);
  latestInvite.current = inviteKey;
  function editInvite(write: () => void) {
    if (
      !capture().isCurrent() ||
      !viewCurrent() ||
      isBusy() ||
      latestInvite.current !== inviteKey ||
      renderedInviteRevision !== inviteRevision.current
    )
      return;
    inviteRevision.current += 1;
    write();
  }
  function rememberInvite(id: string, url: string | null, displayName: string, address: string) {
    setInviteLinks((previous) => [
      ...previous.filter((link) => link.id !== id),
      ...(url ? [{ id, name: displayName, email: address, url }] : []),
    ]);
  }
  function adminAct<T>(
    body: unknown,
    message: string,
    after?: (result: T) => void,
    intent?: TeamActionIntent,
  ) {
    const lease = capture();
    if (
      !lease.isCurrent() ||
      !viewCurrent() ||
      isBusy() ||
      (intent && (!intent.isCurrent() || intent.signal.aborted))
    )
      return Promise.resolve();
    return act<T>(
      body,
      message,
      (result) => {
        if (lease.isCurrent() && viewCurrent() && (!intent || intent.isCurrent())) after?.(result);
      },
      intent,
    );
  }
  const tourRevision = useRef(0);
  const renderedTourRevision = tourRevision.current;
  const currentTour = () =>
    capture().isCurrent() &&
    viewCurrent() &&
    !isBusy() &&
    renderedTourRevision === tourRevision.current;
  function changeTour(step: number, show: boolean) {
    tourRevision.current += 1;
    setTourStep(step);
    setShowTour(show);
  }
  function openTour() {
    if (currentTour()) changeTour(1, true);
  }
  function closeTour() {
    if (currentTour()) changeTour(tourStep, false);
  }
  function backTour() {
    if (currentTour() && showTour && tourStep > 1) changeTour(tourStep - 1, true);
  }
  async function nextTour() {
    if (!currentTour() || !showTour || tourStep < 1 || tourStep > 6) return;
    const next = Math.min(6, tourStep + 1);
    const show = tourStep < 6;
    if (next <= data.organization.onboarding_step) {
      changeTour(next, show);
      return;
    }
    const lease = capture();
    await adminAct(
      { action: "onboarding", orgId, step: next },
      show ? "Setup progress saved." : "Setup complete.",
      () => {
        // Parent keeps its shared flight busy through acknowledgement and refresh.
        if (lease.isCurrent() && viewCurrent() && renderedTourRevision === tourRevision.current)
          changeTour(next, show);
      },
    );
  }
  function begin() {
    const lease = capture();
    if (!userId || !viewCurrent() || !lease.isCurrent() || operation.current || isBusy())
      return null;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    const release = lease.own(() => {
      controller.abort();
      if (operation.current === controller) {
        operation.current = null;
        setBusy(false);
      }
    });
    const current = () =>
      lease.isCurrent() &&
      viewCurrent() &&
      operation.current === controller &&
      !controller.signal.aborted;
    return {
      current,
      owner: { userId, isCurrent: current, signal: controller.signal },
      finish() {
        if (operation.current === controller) {
          operation.current = null;
          setBusy(false);
        }
        release();
        controller.abort();
      },
    };
  }
  async function copyText(value: string, success: string) {
    if (live.current.inviteLinks !== inviteLinks) return;
    const flight = begin();
    if (!flight) return;
    try {
      if (!flight.current()) return;
      await navigator.clipboard.writeText(value);
      if (flight.current()) setNotice(success);
    } catch {
      if (flight.current())
        setError("Copy was blocked by your browser. Select the text and copy it manually.");
    } finally {
      flight.finish();
    }
  }
  function downloadRows(rows: unknown[][], filename: string) {
    const lease = capture();
    if (
      !viewCurrent() ||
      !lease.isCurrent() ||
      operation.current ||
      isBusy() ||
      live.current.inviteLinks !== inviteLinks
    )
      return;
    const url = URL.createObjectURL(
      new Blob([assessmentCsv(rows)], { type: "text/csv;charset=utf-8" }),
    );
    let timer: ReturnType<typeof setTimeout> | undefined,
      cleaned = false;
    let release = () => {};
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      if (timer !== undefined) clearTimeout(timer);
      URL.revokeObjectURL(url);
      release();
    };
    release = lease.own(cleanup);
    try {
      if (!lease.isCurrent() || !viewCurrent()) return;
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      timer = setTimeout(cleanup, 1000);
    } catch {
      cleanup();
      if (lease.isCurrent() && viewCurrent())
        setError("The download could not start. Retry from the current workspace.");
    } finally {
      if (timer === undefined) cleanup();
    }
  }
  function downloadInviteLinks() {
    downloadRows(
      [
        ["Name", "Email", "Invitation link"],
        ...inviteLinks.map((link) => [link.name, link.email, link.url]),
      ],
      "team-invitation-links.csv",
    );
  }

  function adminSummary() {
    const modules = [
      ...new Set(data.assignments.map((a) => getModule(a.module_id)?.name ?? a.module_id)),
    ];
    return `${data.organization.name} · Language Threshold team setup\nLearner seats: ${data.entitlement.seat_limit}\nActive learners: ${activeLearners.length}\nPending invitations: ${pending.length}\nAssigned modules: ${modules.join(", ") || "None yet"}\nDashboard and walkthrough: ${window.location.origin}/team\nRoofing certificates require 30 lessons and at least 80% on the legacy completion test. This is not a calibrated proficiency assessment.`;
  }

  async function importRoster(file: File) {
    const flight = begin();
    if (!flight) return;
    setError("");
    setNotice("");
    let reserved = 0;
    const createdLinks: InviteLink[] = [];
    const failures: string[] = [];
    try {
      if (file.size > 65536) throw new Error("Use a CSV smaller than 64 KB.");
      const raw = await file.text();
      if (!flight.current()) return;
      const rows = raw
        .replace(/^\uFEFF/, "")
        .split(/\r?\n/)
        .filter(Boolean)
        .map(parseCsvLine);
      if (rows[0]?.[0]?.toLowerCase() === "name") rows.shift();
      if (!rows.length) throw new Error("The CSV has no employees.");
      if (rows.length > remaining)
        throw new Error(`Only ${remaining} learner seats are available. Add seats first.`);
      const seen = new Set<string>();
      for (const [name, email] of rows) {
        if (!name || !email || !email.includes("@"))
          throw new Error("Each row needs a name and email address.");
        const normalized = email.toLowerCase();
        if (seen.has(normalized)) throw new Error(`Duplicate email in CSV: ${email}`);
        seen.add(normalized);
      }
      for (const [name, email] of rows) {
        if (!flight.current()) return;
        try {
          const result = await ownedTeamRequest<{
            invitationId: string;
            inviteUrl: string | null;
            warning?: string;
          }>(flight.owner, "/api/team", {
            action: "invite",
            orgId,
            name,
            email,
            role: "learner",
            moduleId,
            requireCertificate: certificate && moduleId === "roofing",
            delivery,
          });
          if (!flight.current()) return;
          reserved++;
          if (result.inviteUrl) {
            createdLinks.push({ id: result.invitationId, name, email, url: result.inviteUrl });
            setInviteLinks((previous) => [
              ...new Map([...previous, ...createdLinks].map((link) => [link.id, link])).values(),
            ]);
          }
          if (result.warning) failures.push(`${email}: invitation confirmed; ${result.warning}`);
        } catch (cause) {
          if (!flight.current()) return;
          failures.push(
            `${email}: ${cause instanceof Error ? cause.message : "could not confirm"}. Import paused; refresh existing invitations before retrying because this request may have succeeded.`,
          );
          break;
        }
      }
      if (!flight.current()) return;
      setNotice(
        `${reserved} of ${rows.length} invitations confirmed in this import.${createdLinks.length ? " Download or copy the links below to send through your company email." : ""}`,
      );
      if (failures.length) setError(failures.join(" "));
      await refresh();
    } catch (cause) {
      if (flight.current())
        setError(cause instanceof Error ? cause.message : "Could not read CSV.");
    } finally {
      flight.finish();
    }
  }
  async function billing(action: string, extra: Record<string, unknown> = {}) {
    const flight = begin();
    if (!flight) return;
    setError("");
    setNotice("");
    try {
      const result = await ownedTeamRequest<{
        url?: string;
        estimateCents?: number;
        newSeatLimit?: number;
        note?: string;
        message?: string;
      }>(flight.owner, "/api/team-billing", { ...extra, action, orgId });
      if (!flight.current()) return;
      if (result.url) {
        window.location.href = result.url;
        return;
      }
      if (action === "quote")
        setQuote(
          result as typeof quote & { estimateCents: number; newSeatLimit: number; note: string },
        );
      else {
        setNotice(result.message ?? "Seat change submitted.");
        setQuote(null);
        await refresh();
      }
    } catch (cause) {
      if (flight.current())
        setError(cause instanceof Error ? cause.message : "Billing request failed.");
    } finally {
      flight.finish();
    }
  }

  const csv = () => {
    const rows = [
      [
        "Employee",
        "Status",
        "Module",
        "Active minutes (7d)",
        "Active minutes (30d)",
        "Lessons",
        "Earlier unlabeled Core 30 currently mastered",
        "Earlier unlabeled Core 30 status",
        "Team plan Core 30 progress",
        "Best test",
        "Certificate",
      ],
    ];
    for (const member of activeLearners) {
      const assignments = memberModules(data, member.user_id);
      for (const assignment of assignments) {
        const secs7 = data.activity7
          .filter((a) => a.user_id === member.user_id && a.module_id === assignment.module_id)
          .reduce((sum, a) => sum + a.active_seconds, 0);
        const secs = data.activity
          .filter((a) => a.user_id === member.user_id && a.module_id === assignment.module_id)
          .reduce((sum, a) => sum + a.active_seconds, 0);
        const lessons = data.lessons.filter(
          (l) => l.user_id === member.user_id && l.module_id === assignment.module_id,
        ).length;
        const best = Math.max(
          0,
          ...data.attempts
            .filter((a) => a.user_id === member.user_id && a.module_id === assignment.module_id)
            .map((a) => a.score ?? 0),
        );
        const cert = data.certificates.find(
          (c) =>
            c.user_id === member.user_id &&
            c.module_id === assignment.module_id &&
            c.status === "issued",
        );
        const core = describeCore30(
          data.core30,
          member.user_id,
          assignment.module_id,
          core30Total(assignment.module_id),
        );
        rows.push([
          member.display_name,
          member.status,
          getModule(assignment.module_id)?.name ??
            (assignment.module_id === "core" ? "General language" : assignment.module_id),
          String(Math.round(secs7 / 60)),
          String(Math.round(secs / 60)),
          String(lessons),
          `${core.mastered}/${core.total}`,
          core.statusLabel,
          (data.core30Tracks?.[member.user_id] ?? [])
            .filter((track) => track.moduleId === assignment.module_id)
            .map(
              (track) =>
                `${track.instructionLanguage} → ${track.targetLanguage}; ${track.startDate ?? ""}; ${track.mastered}/${track.total} currently self-marked mastered; ${track.opened} opened; ${track.statusLabel}`,
            )
            .join(" | "),
          best ? `${best}/25` : "",
          cert?.id ?? "",
        ]);
      }
    }
    downloadRows(rows, "team-progress.csv");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[
          ["Learner seats", data.entitlement.seat_limit],
          ["Assigned", activeLearners.length],
          ["Pending invites", pending.length],
          ["Available", remaining],
          [
            "Active practice · 7d",
            minutes(data.activity7.reduce((sum, a) => sum + a.active_seconds, 0)),
          ],
          ["Active practice · 30d", totalMinutes],
        ].map(([label, value]) => (
          <div key={String(label)} className={card}>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-gold-ink dark:text-gold">{value}</p>
          </div>
        ))}
      </div>
      {showTour && (
        <section className={card + " border-gold/30"}>
          <div className="flex flex-wrap justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-gold-ink dark:text-gold">
                Admin setup · step {tourStep} of 6
              </p>
              <h2 className="mt-2 text-xl font-semibold">
                {
                  [
                    "Welcome to your team workspace",
                    "Set up your company",
                    "Add seats and employees",
                    "Assign a module",
                    "Choose the completion goal",
                    "Review and launch",
                  ][tourStep - 1]
                }
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {
                  [
                    "Manage seats, assign Spanish modules, and review practice. Private AI conversations stay private.",
                    "Confirm the company and billing contact before inviting learners.",
                    "Each pending learner invitation reserves one paid seat.",
                    "Each learner can practice any published module; choose the first module for this team.",
                    "Legacy Roofing completion certificates require 30 recorded lessons and 20 of 25 test answers correct. This is separate from assessed proficiency.",
                    "Check your roster, copy the admin summary, and track progress here. Share invitation links through your company email when automatic email is unavailable.",
                  ][tourStep - 1]
                }
              </p>
            </div>
            <button disabled={busy} className={secondary + " h-fit"} onClick={closeTour}>
              Close walkthrough
            </button>
          </div>
          <div className="mt-5 flex gap-2">
            <button disabled={busy || tourStep === 1} onClick={backTour} className={secondary}>
              Back
            </button>
            <button disabled={busy} onClick={() => void nextTour()} className={button}>
              {tourStep === 6 ? "Finish setup" : "Next step"}
            </button>
          </div>
        </section>
      )}
      <section className={card}>
        <div className="mb-4 flex flex-wrap justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Learner progress</h2>
            <p className="text-sm text-muted-foreground">
              {active30} learners practiced in the last 30 days. Active minutes are app usage, not
              work hours or a proficiency score.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={secondary} onClick={csv}>
              <FileDown className="mr-1 inline h-4 w-4" /> Export CSV
            </button>
            <button className={secondary} disabled={busy} onClick={openTour}>
              Admin walkthrough
            </button>
            <button
              className={secondary}
              onClick={() => void copyText(adminSummary(), "Admin summary copied.")}
            >
              Copy admin summary
            </button>
            {data.emailEnabled && (
              <button
                disabled={busy}
                className={secondary}
                onClick={() =>
                  void adminAct({ action: "email_summary", orgId }, "Admin setup summary emailed.")
                }
              >
                <Mail className="mr-1 inline h-4 w-4" /> Email admin summary
              </button>
            )}
          </div>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Core 30 team plans show progress for their own language pair. Independent practice stays
          private; earlier records have no language or plan label. Recorded lessons track qualifying
          practice. Core 30 mastery is the learner’s own assessment; opening a step does not
          demonstrate mastery. The certificate test is a separate result.
        </p>
        <div className="space-y-4 lg:hidden">
          {activeLearners.map((member) => (
            <article key={member.id} className="rounded-xl border border-border p-4">
              <h3 className="mb-3 font-semibold">{member.display_name}</h3>
              {memberModules(data, member.user_id).map((assignment) => (
                <EmployeeRow
                  key={assignment.id}
                  member={member}
                  assignment={assignment}
                  data={data}
                  busy={busy}
                  act={adminAct}
                  isBusy={isBusy}
                  isContextCurrent={viewCurrent}
                  orgId={orgId}
                  asCard
                />
              ))}
              {!memberModules(data, member.user_id).length && (
                <p className="mb-3 text-sm text-muted-foreground">No module assigned.</p>
              )}
              <AssignModule
                member={member}
                orgId={orgId}
                busy={busy}
                act={adminAct}
                isBusy={isBusy}
                isContextCurrent={viewCurrent}
                assignments={data.assignments}
              />
              <ReleaseSeat member={member} orgId={orgId} busy={busy} act={adminAct} />
            </article>
          ))}
        </div>
        {!activeLearners.length && (
          <p className="py-4 text-sm text-muted-foreground">
            No active learners yet. Invite a learner below to get started.
          </p>
        )}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                {[
                  "Employee",
                  "Module",
                  "Practice · 7d",
                  "Practice · 30d",
                  "Recorded lessons",
                  "Self-reported Core 30",
                  "Best certificate test",
                  "Certificate",
                  "Action",
                ].map((h) => (
                  <th key={h} className="p-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeLearners.map((member) => {
                const memberAssignments = memberModules(data, member.user_id);
                return memberAssignments.length ? (
                  memberAssignments.map((a) => (
                    <EmployeeRow
                      key={a.id}
                      member={member}
                      assignment={a}
                      data={data}
                      busy={busy}
                      act={adminAct}
                      isBusy={isBusy}
                      isContextCurrent={viewCurrent}
                      orgId={orgId}
                    />
                  ))
                ) : (
                  <tr key={member.id} className="border-b border-border/40">
                    <td className="p-2">{member.display_name}</td>
                    <td className="p-2 text-muted-foreground" colSpan={7}>
                      No module assigned
                    </td>
                    <td className="p-2">
                      <AssignModule
                        member={member}
                        orgId={orgId}
                        busy={busy}
                        act={adminAct}
                        isBusy={isBusy}
                        isContextCurrent={viewCurrent}
                        assignments={data.assignments}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <details className={card}>
          <summary className="mb-2 cursor-pointer text-xl font-semibold">
            <CreditCard className="mr-2 inline h-5 w-5 text-gold-ink dark:text-gold" /> Team billing
          </summary>
          <p className="mb-4 text-sm text-muted-foreground">
            {data.entitlement.status} {data.entitlement.term ? `· ${data.entitlement.term}` : ""}{" "}
            {data.entitlement.period_end
              ? `· ${data.entitlement.status === "manual" ? "expires" : "renews"} ${new Date(data.entitlement.period_end).toLocaleDateString()}`
              : ""}
          </p>
          {canStartPlan ? (
            <div className="space-y-3">
              {data.entitlement.status === "manual" && (
                <p className="text-sm text-muted-foreground">
                  Your current pilot seats stay available while you check out. The paid plan takes
                  over after Stripe confirms payment.
                </p>
              )}
              <p className="text-sm">
                Start with <strong>five seats for $99/month</strong>. Ten seats cost{" "}
                <strong>$159/month</strong>. For 15 seats, pay <strong>$209/month</strong>,{" "}
                <strong>$627 for three months</strong>, or <strong>$2,090 for one year</strong>.
                Seats 6–10 add $12/month each and seats 11 and up add $10/month each. Annual billing
                equals ten months. Plans renew unless canceled.
              </p>
              <div className="flex flex-wrap gap-2">
                <select
                  className={input + " max-w-40"}
                  value={term}
                  disabled={busy}
                  onChange={(e) => editInvite(() => setTerm(e.target.value as typeof term))}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">3 months</option>
                  <option value="annual">1 year</option>
                </select>
                <input
                  aria-label="Initial learner seats"
                  type="number"
                  min={TEAM_MIN_SEATS}
                  max={1000}
                  className={input + " max-w-28"}
                  value={initialSeats}
                  disabled={busy}
                  onChange={(e) => editInvite(() => setInitialSeats(Number(e.target.value)))}
                />
              </div>
              <p className="text-sm text-gold-ink dark:text-gold">
                {initialSeats >= TEAM_MIN_SEATS
                  ? money(teamPeriodCents(initialSeats, term))
                  : "Select at least five seats"}{" "}
                / term
              </p>
              {!data.enrollmentEnabled && (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Team billing is temporarily unavailable. You can still review the workspace and
                  pricing.
                </p>
              )}
              <button
                disabled={
                  busy ||
                  initialSeats < Math.max(TEAM_MIN_SEATS, seatsUsed) ||
                  !data.enrollmentEnabled
                }
                onClick={() => void billing("checkout", { term, seats: initialSeats })}
                className={button}
              >
                {data.entitlement.status === "manual"
                  ? "Switch to a paid plan"
                  : data.entitlement.status === "canceled"
                    ? "Restart team plan"
                    : "Continue to secure checkout"}
              </button>
              <p className="text-xs text-muted-foreground">
                After payment, invite learners by secure link through your company email. Automatic
                invitation email is available when configured.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm">
                {remaining} seats are available. Add seats and assign them from this panel.
              </p>
              {data.entitlement.status === "active" && (
                <>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      aria-label="Seats to add"
                      value={addSeats}
                      disabled={busy}
                      onChange={(e) =>
                        editInvite(() => {
                          setAddSeats(Number(e.target.value));
                          setQuote(null);
                        })
                      }
                      className={input + " max-w-28"}
                    />
                    <button
                      disabled={busy}
                      onClick={() => void billing("quote", { addSeats })}
                      className={secondary}
                    >
                      Preview price
                    </button>
                  </div>
                  {quote && (
                    <div className="rounded-xl border border-gold/30 bg-gold/5 p-3 text-sm">
                      <strong>{money(quote.estimateCents)} estimated now</strong> ·{" "}
                      {quote.newSeatLimit} seats after payment
                      <p className="mt-1 text-xs text-muted-foreground">{quote.note}</p>
                      <button
                        disabled={busy}
                        onClick={() => void billing("add_seats", { addSeats })}
                        className={button + " mt-3"}
                      >
                        Confirm added seats
                      </button>
                    </div>
                  )}
                </>
              )}
              {data.entitlement.status !== "manual" && (
                <button
                  disabled={busy}
                  onClick={() => void billing("portal")}
                  className={secondary}
                >
                  Manage billing
                </button>
              )}
            </div>
          )}
        </details>
        <details className={card}>
          <summary className="mb-2 cursor-pointer text-xl font-semibold">
            <Users className="mr-2 inline h-5 w-5 text-gold-ink dark:text-gold" /> Invite and assign
            a seat
          </summary>
          <p className="mb-4 text-sm text-muted-foreground">
            One learner invitation reserves one seat and assigns the first module. Admin-only
            invitations do not use learner seats. Manual links expire in seven days and work only
            for the invited email address.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                latestInvite.current !== inviteKey ||
                renderedInviteRevision !== inviteRevision.current ||
                name.trim().length < 2 ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
                (inviteRole === "learner" && remaining < 1)
              )
                return;
              void adminAct<{ invitationId: string; inviteUrl: string | null; warning?: string }>(
                {
                  action: "invite",
                  orgId,
                  name,
                  email,
                  moduleId: inviteRole === "learner" ? moduleId : null,
                  requireCertificate: inviteRole === "learner" && certificate,
                  role: inviteRole,
                  delivery,
                },
                delivery === "manual"
                  ? "Invitation reserved. Share the link below."
                  : "Invitation reserved.",
                (result) => {
                  rememberInvite(result.invitationId, result.inviteUrl, name, email);
                  if (
                    latestInvite.current === inviteKey &&
                    renderedInviteRevision === inviteRevision.current
                  ) {
                    inviteRevision.current += 1;
                    setName("");
                    setEmail("");
                  }
                },
              );
            }}
            className="space-y-3"
          >
            <input
              required
              minLength={2}
              placeholder="Employee name"
              aria-label="Employee name"
              className={input}
              value={name}
              disabled={busy}
              onChange={(e) => editInvite(() => setName(e.target.value))}
            />
            <input
              required
              type="email"
              placeholder="employee@company.com"
              aria-label="Employee email"
              className={input}
              value={email}
              disabled={busy}
              onChange={(e) => editInvite(() => setEmail(e.target.value))}
            />
            <select
              aria-label="Invitation role"
              className={input}
              value={inviteRole}
              disabled={busy}
              onChange={(e) => editInvite(() => setInviteRole(e.target.value as typeof inviteRole))}
            >
              <option value="learner">Learner · uses one seat</option>
              <option value="admin">Company admin · no learner seat</option>
            </select>
            <label className="block text-sm">
              Delivery
              <select
                aria-label="Invitation delivery"
                className={input + " mt-1"}
                value={delivery}
                disabled={busy}
                onChange={(event) =>
                  editInvite(() => setDelivery(event.target.value as "manual" | "email"))
                }
              >
                <option value="manual">Copy link and send with your company email</option>
                {data.emailEnabled && (
                  <option value="email">Send with Language Threshold email</option>
                )}
              </select>
            </label>
            {inviteRole === "learner" && (
              <>
                <select
                  aria-label="First module"
                  className={input}
                  value={moduleId}
                  disabled={busy}
                  onChange={(e) =>
                    editInvite(() => {
                      setModuleId(e.target.value);
                      if (e.target.value !== "roofing") setCertificate(false);
                    })
                  }
                >
                  {MODULES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={certificate}
                    disabled={busy || moduleId !== "roofing"}
                    onChange={(e) => editInvite(() => setCertificate(e.target.checked))}
                  />
                  <span>
                    Require the legacy Roofing completion test (80%) for a completion certificate
                    {moduleId !== "roofing" &&
                      " (legacy completion test is only available for Roofing)"}
                  </span>
                </label>
              </>
            )}
            <button
              disabled={busy || (inviteRole === "learner" && remaining < 1)}
              className={button}
            >
              <Plus className="mr-1 inline h-4 w-4" />{" "}
              {inviteRole === "learner" ? "Assign seat and create invite" : "Invite company admin"}
            </button>
          </form>
          <div className="mt-5 border-t border-border/50 pt-4">
            <label className="block text-sm font-semibold">Import learner roster CSV</label>
            <p className="my-2 text-xs text-muted-foreground">
              Name,Email header and one employee per row. Each invitation uses one available seat
              and the selected module, certificate, and delivery setting above.
            </p>
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={busy || remaining < 1}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importRoster(file);
                event.target.value = "";
              }}
              className="text-xs"
            />
          </div>
          {inviteLinks.length > 0 && (
            <div id="team-invite-links" className="mt-5 border-t border-border/50 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Invitation links to share</h3>
                {inviteLinks.length > 1 && (
                  <button type="button" className={secondary} onClick={downloadInviteLinks}>
                    <FileDown className="mr-1 inline h-4 w-4" /> Download links CSV
                  </button>
                )}
              </div>
              <p className="my-2 text-xs text-muted-foreground">
                Send each link privately to the matching employee. Save these links now; for
                security, they disappear when this page closes. You can create a fresh link from
                Pending invitations.
              </p>
              <div className="space-y-3">
                {inviteLinks.map((link) => (
                  <div key={link.id} className="rounded-lg border border-border/50 p-3">
                    <p className="mb-2 text-sm">
                      {link.name} · {link.email}
                    </p>
                    <div className="flex gap-2">
                      <input
                        aria-label={`Invitation link for ${link.email}`}
                        className={input}
                        readOnly
                        value={link.url}
                        onFocus={(event) => event.target.select()}
                      />
                      <button
                        type="button"
                        className={secondary}
                        onClick={() => void copyText(link.url, `Link copied for ${link.email}.`)}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </details>
      </div>
      <section className={card}>
        <h2 className="mb-3 text-xl font-semibold">Pending invitations ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending invitations.</p>
        ) : (
          <div className="space-y-2">
            {pending.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 p-3 text-sm"
              >
                <span>
                  {invite.display_name} · {invite.email} · {invite.role} ·{" "}
                  {getModule(invite.module_id)?.name ?? "No module"}
                  {invite.last_email_error && (
                    <span className="ml-2 text-amber-700 dark:text-amber-300">
                      Email failed: {invite.last_email_error}
                    </span>
                  )}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={busy}
                    className={secondary}
                    onClick={() =>
                      void adminAct<{ inviteUrl: string | null }>(
                        { action: "resend", orgId, invitationId: invite.id, delivery: "manual" },
                        "Fresh invitation link ready in the invitation panel above. The previous link is no longer valid.",
                        (result) => {
                          rememberInvite(
                            invite.id,
                            result.inviteUrl,
                            invite.display_name,
                            invite.email,
                          );
                        },
                      )
                    }
                  >
                    New link
                  </button>
                  {data.emailEnabled && (
                    <button
                      disabled={busy}
                      className={secondary}
                      onClick={() =>
                        void adminAct<{ inviteUrl: string | null }>(
                          { action: "resend", orgId, invitationId: invite.id, delivery: "email" },
                          "Invitation email requested.",
                          (result) => {
                            rememberInvite(
                              invite.id,
                              result.inviteUrl,
                              invite.display_name,
                              invite.email,
                            );
                          },
                        )
                      }
                    >
                      Resend email
                    </button>
                  )}
                  <button
                    disabled={busy}
                    className={secondary}
                    onClick={() =>
                      void adminAct(
                        { action: "revoke", orgId, invitationId: invite.id },
                        "Invitation revoked.",
                        () => rememberInvite(invite.id, null, invite.display_name, invite.email),
                      )
                    }
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className={card}>
        <h2 className="mb-2 text-xl font-semibold">Certificates</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Issued after 30 recorded Roofing lessons and at least 20 of 25 test answers correct. This
          is language module completion, not trade or safety certification.
        </p>
        {data.certificates.length ? (
          <div className="space-y-2">
            {data.certificates.map((c) => (
              <a
                key={c.id}
                href={`/certificate?id=${c.id}`}
                className="block rounded-lg border border-border p-3 text-sm hover:border-gold/50"
              >
                {c.learner_name} · {getModule(c.module_id)?.name ?? c.module_id} · {c.score}% ·{" "}
                {c.status} · {new Date(c.issued_at).toLocaleDateString()}
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No certificates issued yet.</p>
        )}
      </section>
    </div>
  );
}

function core30Total(moduleId: string): number {
  return getCurriculum(moduleId)?.lessons.length || 30;
}

const CORE30_CHIP: Record<Core30Display["status"], string> = {
  ahead: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  "on-track": "bg-sky-500/15 text-sky-800 dark:text-sky-300",
  behind: "bg-red-500/15 text-red-800 dark:text-red-300",
  "not-started": "bg-muted text-muted-foreground",
};

function Core30Cell({
  core,
  tracks = [],
  showLinks = false,
}: {
  core: Core30Display;
  tracks?: Core30TrackDisplay[];
  showLinks?: boolean;
}) {
  const showLegacy =
    !tracks.length || core.mastered > 0 || core.opened > 0 || core.status !== "not-started";
  return (
    <div className="space-y-3">
      {tracks.map((track) => (
        <div key={track.enrollmentId} className="space-y-1">
          <p className="text-xs font-medium break-words">
            {track.instructionLanguage} → {track.targetLanguage} · Team plan
            {track.startDate ? ` · ${track.startDate}` : ""}
          </p>
          <Core30Summary core={track} />
          {showLinks && (
            <a
              className="text-xs underline"
              href={`/?${new URLSearchParams({ module: track.moduleId, tab: "core30", target: track.targetLanguage, native: track.instructionLanguage, plan: track.enrollmentId })}`}
            >
              Open this lesson plan
            </a>
          )}
        </div>
      ))}
      {showLegacy && (
        <div>
          <p className="text-xs text-muted-foreground">
            Earlier record · language and plan not recorded
          </p>
          <Core30Summary core={core} />
        </div>
      )}
    </div>
  );
}

function Core30Summary({ core }: { core: Core30Display }) {
  return (
    <div className="space-y-1">
      <div>
        {core.mastered}/{core.total} currently mastered · {core.opened} opened
      </div>
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CORE30_CHIP[core.status]}`}
      >
        {core.statusLabel}
      </span>
      {core.needsPractice > 0 && (
        <div className="text-xs text-amber-700 dark:text-amber-300">
          {core.needsPractice} need practice
        </div>
      )}
      {core.lastReview && (
        <div className="text-xs text-muted-foreground">Last review {core.lastReview}</div>
      )}
    </div>
  );
}

function EmployeeRow({
  member,
  assignment,
  data,
  busy,
  act,
  orgId,
  asCard = false,
  isBusy,
  isContextCurrent,
}: {
  member: Member;
  assignment: Assignment;
  data: TeamData;
  asCard?: boolean;
  busy: boolean;
  act: TeamAction;
  isBusy: () => boolean;
  isContextCurrent: () => boolean;
  orgId: string;
}) {
  const seconds7 = data.activity7
    .filter((a) => a.user_id === member.user_id && a.module_id === assignment.module_id)
    .reduce((sum, a) => sum + a.active_seconds, 0);
  const seconds = data.activity
    .filter((a) => a.user_id === member.user_id && a.module_id === assignment.module_id)
    .reduce((sum, a) => sum + a.active_seconds, 0);
  const lessons = data.lessons.filter(
    (l) => l.user_id === member.user_id && l.module_id === assignment.module_id,
  ).length;
  const attempts = data.attempts.filter(
    (a) => a.user_id === member.user_id && a.module_id === assignment.module_id,
  );
  const bestAttempt = attempts.reduce<Attempt | undefined>(
    (best, attempt) =>
      attempt.score !== null &&
      (!best || attempt.score / attempt.total > (best.score ?? 0) / best.total)
        ? attempt
        : best,
    undefined,
  );
  const testResult = bestAttempt ? `${bestAttempt.score}/${bestAttempt.total}` : "Not taken";
  const cert = data.certificates.find(
    (c) =>
      c.user_id === member.user_id && c.module_id === assignment.module_id && c.status === "issued",
  );
  if (asCard)
    return (
      <div className="mb-4 space-y-3 rounded-lg bg-muted/30 p-3 text-sm">
        <h4 className="font-medium">
          {getModule(assignment.module_id)?.name ??
            (assignment.module_id === "core" ? "General language" : assignment.module_id)}
        </h4>
        <Core30Cell
          tracks={data.core30Tracks?.[member.user_id]?.filter(
            (track) => track.moduleId === assignment.module_id,
          )}
          core={describeCore30(
            data.core30,
            member.user_id,
            assignment.module_id,
            core30Total(assignment.module_id),
          )}
        />
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-xs text-muted-foreground">Recorded lessons</dt>
            <dd>
              {lessons}/{core30Total(assignment.module_id)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Certificate test</dt>
            <dd>{testResult}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Practice · 7 days</dt>
            <dd>{minutes(seconds7)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Practice · 30 days</dt>
            <dd>{minutes(seconds)}</dd>
          </div>
        </dl>
        {assignment.require_certificate && (
          <p className="text-xs text-gold-ink dark:text-gold">Certificate required</p>
        )}
        {cert && (
          <a className="block underline" href={`/certificate?id=${cert.id}`}>
            View certificate
          </a>
        )}
        <AssignModule
          member={member}
          orgId={orgId}
          busy={busy}
          act={act}
          assignments={data.assignments}
          isBusy={isBusy}
          isContextCurrent={isContextCurrent}
          initialAssignment={assignment}
        />
      </div>
    );
  return (
    <tr className="border-b border-border/40">
      <td className="p-2">{member.display_name}</td>
      <td className="p-2">
        {getModule(assignment.module_id)?.name ??
          (assignment.module_id === "core" ? "General language" : assignment.module_id)}
        {assignment.require_certificate && (
          <span className="ml-1 text-xs text-gold-ink dark:text-gold">· test required</span>
        )}
      </td>
      <td className="p-2">{minutes(seconds7)}</td>
      <td className="p-2">{minutes(seconds)}</td>
      <td className="p-2">
        {lessons}
        {assignment.module_id === "roofing" ? "/30" : ""}
      </td>
      <td className="p-2">
        <Core30Cell
          tracks={data.core30Tracks?.[member.user_id]?.filter(
            (track) => track.moduleId === assignment.module_id,
          )}
          core={describeCore30(
            data.core30,
            member.user_id,
            assignment.module_id,
            core30Total(assignment.module_id),
          )}
        />
      </td>
      <td className="p-2">{testResult}</td>
      <td className="p-2">
        {cert ? (
          <a className="text-gold-ink dark:text-gold underline" href={`/certificate?id=${cert.id}`}>
            View
          </a>
        ) : (
          "—"
        )}
      </td>
      <td className="p-2">
        <AssignModule
          member={member}
          orgId={orgId}
          busy={busy}
          act={act}
          assignments={data.assignments}
          isBusy={isBusy}
          isContextCurrent={isContextCurrent}
          initialAssignment={assignment}
        />
        <ReleaseSeat member={member} orgId={orgId} busy={busy} act={act} />
      </td>
    </tr>
  );
}

function ReleaseSeat({
  member,
  orgId,
  busy,
  act,
}: {
  member: Member;
  orgId: string;
  busy: boolean;
  act: TeamAction;
}) {
  return (
    <button
      disabled={busy}
      className="mt-2 block text-xs text-red-700 dark:text-red-300 underline"
      onClick={() => {
        if (
          window.confirm(
            `Deactivate ${member.display_name}'s team seat? Their certificate record stays.`,
          )
        )
          void act({ action: "revoke", orgId, memberId: member.id }, "Seat released.");
      }}
    >
      Release seat
    </button>
  );
}

type AssignmentEditorProps = {
  member: Member;
  assignments: Assignment[];
  initialAssignment?: Assignment;
  orgId: string;
  busy: boolean;
  act: TeamAction;
  isBusy: () => boolean;
  isContextCurrent: () => boolean;
};
function AssignModule(props: AssignmentEditorProps) {
  const { user } = useAuth();
  const context = JSON.stringify([
    user?.id ?? null,
    props.orgId,
    props.member,
    props.initialAssignment ?? null,
    props.assignments.filter((a) => a.user_id === props.member.user_id),
  ]);
  return user ? <OwnedAssignModule key={context} {...props} /> : null;
}
function OwnedAssignModule({
  member,
  orgId,
  busy,
  act,
  assignments,
  initialAssignment,
  isBusy,
  isContextCurrent,
}: AssignmentEditorProps) {
  const { user, canUseReader } = useAuth();
  const actor = user?.id;
  const { capture } = usePracticeLifecycle(JSON.stringify(["team-assignment", orgId, member.id]));
  const revision = useRef(0);
  const renderedRevision = revision.current;
  const pending = useRef<AbortController | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const editableAssignment =
    initialAssignment && getModule(initialAssignment.module_id) ? initialAssignment : undefined;
  const [open, setOpen] = useState(false);
  const [moduleId, setModuleId] = useState(editableAssignment?.module_id ?? "roofing");
  const [requireCertificate, setRequireCertificate] = useState(
    editableAssignment?.require_certificate ?? false,
  );
  const current = () =>
    !!actor &&
    capture().isCurrent() &&
    canUseReader(actor) &&
    isContextCurrent() &&
    member.role === "learner" &&
    member.status === "active" &&
    renderedRevision === revision.current;
  const editable = () => current() && !isBusy() && !pending.current;
  function change(write: () => void) {
    if (!editable()) return;
    revision.current += 1;
    setError("");
    write();
  }
  function selectModule(next: string) {
    if (!getModule(next)) return;
    change(() => {
      setModuleId(next);
      const existing = assignments.find(
        (a) => a.user_id === member.user_id && a.module_id === next,
      );
      setRequireCertificate(next === "roofing" && (existing?.require_certificate ?? false));
    });
  }
  function start() {
    change(() => {
      const selected =
        editableAssignment ??
        assignments.find((a) => a.user_id === member.user_id && a.module_id === "roofing");
      setModuleId(selected?.module_id ?? "roofing");
      setRequireCertificate(
        selected?.module_id === "roofing" && (selected?.require_certificate ?? false),
      );
      setOpen(true);
    });
  }
  async function save() {
    if (!editable() || !open || !getModule(moduleId)) return;
    const selected = assignments.find(
      (a) => a.user_id === member.user_id && a.module_id === moduleId,
    );
    const due = selected?.due_at ? new Date(selected.due_at) : null;
    if (due && !Number.isFinite(due.getTime())) {
      setError("This assignment has an invalid due date. Refresh the workspace before saving.");
      return;
    }
    const lease = capture();
    const controller = new AbortController();
    pending.current = controller;
    const release = lease.own(() => {
      controller.abort();
      if (pending.current === controller) pending.current = null;
    });
    const owns = () =>
      lease.isCurrent() &&
      current() &&
      pending.current === controller &&
      !controller.signal.aborted;
    let acknowledged = false;
    setSaving(true);
    try {
      await act(
        {
          action: "assign",
          orgId,
          memberId: member.id,
          moduleId,
          requireCertificate: moduleId === "roofing" && requireCertificate,
          dueAt: due?.toISOString() ?? null,
        },
        "Assignment saved.",
        () => {
          if (owns()) {
            acknowledged = true;
            setOpen(false);
          }
        },
        { isCurrent: owns, signal: controller.signal },
      );
    } finally {
      if (lease.isCurrent() && pending.current === controller) {
        if (acknowledged) revision.current += 1;
        setSaving(false);
      }
      if (pending.current === controller) pending.current = null;
      release();
      controller.abort();
    }
  }
  return open ? (
    <div className="flex min-w-48 flex-col gap-2">
      {error && (
        <p role="alert" className="text-xs text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      <select
        aria-label={`Module for ${member.display_name}`}
        className={input}
        value={moduleId}
        disabled={busy || saving}
        onChange={(e) => selectModule(e.target.value)}
      >
        {MODULES.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <label className="text-xs">
        <input
          type="checkbox"
          disabled={busy || saving || moduleId !== "roofing"}
          checked={requireCertificate}
          onChange={(e) => {
            if (moduleId === "roofing") change(() => setRequireCertificate(e.target.checked));
          }}
        />{" "}
        Require legacy Roofing completion certificate
      </label>
      <button disabled={busy || saving} className={button} onClick={() => void save()}>
        {selectedModuleExists(assignments, member.user_id, moduleId)
          ? "Save assignment"
          : "Assign module"}
      </button>
      <button
        disabled={busy || saving}
        className={secondary}
        onClick={() => change(() => setOpen(false))}
      >
        Cancel
      </button>
    </div>
  ) : (
    <button
      disabled={busy || saving}
      className="text-xs text-gold-ink dark:text-gold underline"
      onClick={start}
    >
      {editableAssignment ? "Edit assignment" : "Assign module"}
    </button>
  );
}
function selectedModuleExists(assignments: Assignment[], userId: string, moduleId: string) {
  return assignments.some((a) => a.user_id === userId && a.module_id === moduleId);
}

function LearnerWorkspace({ data }: { data: TeamData }) {
  const { user } = useAuth();
  const assignments = data.assignments.filter((a) => a.user_id === user?.id);
  return (
    <div className="space-y-6">
      <section className={card}>
        <h2 className="text-xl font-semibold">Your learning assignments</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your company can see module progress and active practice time. Your private AI
          conversations are not shown.
        </p>
      </section>
      {assignments.map((a) => {
        const lessons = data.lessons.filter((l) => l.module_id === a.module_id).length;
        const seconds = data.activity
          .filter((x) => x.module_id === a.module_id)
          .reduce((sum, x) => sum + x.active_seconds, 0);
        const cert = data.certificates.find(
          (c) => c.module_id === a.module_id && c.status === "issued",
        );
        return (
          <section key={a.id} className={card}>
            <h3 className="text-xl font-semibold">
              {getModule(a.module_id)?.emoji} {getModule(a.module_id)?.name ?? a.module_id}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {minutes(seconds)} active practice in 30 days · {lessons}
              {a.module_id === "roofing" ? "/30" : ""} lessons recorded
            </p>
            {user?.id && (
              <div className="mt-2 text-sm">
                <Core30Cell
                  showLinks
                  tracks={data.core30Tracks?.[user.id]?.filter(
                    (track) => track.moduleId === a.module_id,
                  )}
                  core={describeCore30(data.core30, user.id, a.module_id, core30Total(a.module_id))}
                />
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={`/?module=${encodeURIComponent(a.module_id)}&tab=core30`} className={button}>
                Open {getModule(a.module_id)?.name ?? "assigned module"} lesson plan
              </a>
              <a
                href={`/?module=${encodeURIComponent(a.module_id)}&tab=flashcards`}
                className={secondary}
              >
                Study {getModule(a.module_id)?.name ?? "assigned module"} cards
              </a>
              {cert && (
                <a href={`/certificate?id=${cert.id}`} className={secondary}>
                  View certificate
                </a>
              )}
            </div>
            {a.require_certificate && a.module_id === "roofing" && (
              <RoofingAssessment
                orgId={data.organization.id}
                lessons={lessons}
                attempts={data.attempts.filter((t) => t.module_id === "roofing")}
                certificate={cert ?? null}
              />
            )}
          </section>
        );
      })}
      {!assignments.length && (
        <p className="text-muted-foreground">
          Your company has not set a module focus yet. You can still use every published module in
          the learning app.
        </p>
      )}
    </div>
  );
}

function RoofingAssessment(props: Parameters<typeof OwnedRoofingAssessment>[0]) {
  const { user } = useAuth();
  return user ? (
    <OwnedRoofingAssessment key={JSON.stringify([user.id, props.orgId])} {...props} />
  ) : null;
}
function OwnedRoofingAssessment({
  orgId,
  lessons,
  attempts,
  certificate,
}: {
  orgId: string;
  lessons: number;
  attempts: Attempt[];
  certificate: Certificate | null;
}) {
  const { user, canUseReader } = useAuth();
  const userId = user?.id;
  const { capture } = usePracticeLifecycle(JSON.stringify(["legacy-roofing-quiz", orgId]));
  const pending = useRef<AbortController | null>(null);
  const [quiz, setQuiz] = useState<{ attemptId: string; questions: QuizQuestion[] } | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    correct: number;
    total: number;
    passed: boolean;
    areaScores: Record<string, { correct: number; total: number }>;
    certificateId: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const best = Math.max(0, ...attempts.map((a) => a.score ?? 0));
  const latest = useRef({ quiz, answers });
  latest.current = { quiz, answers };
  async function run(kind: "start" | "submit") {
    const lease = capture();
    if (!userId || !canUseReader(userId) || !lease.isCurrent() || pending.current) return;
    const snapshot = latest.current;
    if (kind === "start" && snapshot.quiz) return;
    if (
      kind === "submit" &&
      (!quiz ||
        snapshot.quiz !== quiz ||
        snapshot.answers !== answers ||
        quiz.questions.length !== Object.keys(answers).length ||
        !quiz.questions.every((q) => q.options.includes(answers[q.id])))
    )
      return;
    const controller = new AbortController();
    pending.current = controller;
    const release = lease.own(() => {
      controller.abort();
      if (pending.current === controller) pending.current = null;
    });
    const current = () =>
      lease.isCurrent() &&
      canUseReader(userId) &&
      pending.current === controller &&
      !controller.signal.aborted;
    setBusy(true);
    setError("");
    try {
      const owner = { userId, isCurrent: current, signal: controller.signal };
      if (kind === "start") {
        const next = await ownedTeamRequest<NonNullable<typeof quiz>>(
          owner,
          "/api/team-assessment",
          { action: "start", orgId },
        );
        if (!current()) return;
        latest.current = { quiz: next, answers: {} };
        setQuiz(next);
        setAnswers({});
        setResult(null);
      } else {
        const next = await ownedTeamRequest<NonNullable<typeof result>>(
          owner,
          "/api/team-assessment",
          { action: "submit", attemptId: quiz!.attemptId, answers: { ...snapshot.answers } },
        );
        if (!current()) return;
        latest.current = { quiz: null, answers: {} };
        setResult(next);
        setQuiz(null);
        setAnswers({});
      }
    } catch (cause) {
      if (current())
        setError(
          cause instanceof Error
            ? cause.message
            : kind === "start"
              ? "Could not start test."
              : "Could not submit test.",
        );
    } finally {
      if (lease.isCurrent() && pending.current === controller) setBusy(false);
      if (pending.current === controller) pending.current = null;
      release();
      controller.abort();
    }
  }
  function answer(question: QuizQuestion, option: string) {
    const lease = capture();
    if (
      !userId ||
      !canUseReader(userId) ||
      !lease.isCurrent() ||
      pending.current ||
      !quiz ||
      latest.current.quiz !== quiz ||
      !quiz.questions.includes(question) ||
      !question.options.includes(option)
    )
      return;
    const next = { ...latest.current.answers, [question.id]: option };
    latest.current = { quiz, answers: next };
    setAnswers(next);
  }
  const start = () => run("start"),
    submit = () => run("submit");
  return (
    <div className="mt-5 border-t border-border pt-4">
      <h4 className="font-semibold">Roofing Spanish completion test</h4>
      <p className="mt-1 text-sm text-muted-foreground">
        25 questions · 20 correct to pass · all 30 lessons required for the certificate. Best score:{" "}
        {best ? `${best}/25` : "not taken"}.
      </p>
      {certificate && (
        <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="mr-1 inline h-4 w-4" /> Certificate issued
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      {result && (
        <div className="mt-3 rounded-xl border border-border p-4">
          <p className="font-semibold">
            {result.correct}/{result.total} · {result.passed ? "Passed" : "Keep practicing"}
          </p>
          {result.passed && lessons < 30 && (
            <p className="mt-1 text-sm">
              Finish the remaining {30 - lessons} lessons to receive your certificate.
            </p>
          )}
          <ul className="mt-2 text-sm text-muted-foreground">
            {Object.entries(result.areaScores).map(([area, score]) => (
              <li key={area}>
                {area}: {score.correct}/{score.total}
              </li>
            ))}
          </ul>
        </div>
      )}
      {quiz ? (
        <div className="mt-4 space-y-5">
          {quiz.questions.map((q, index) => (
            <fieldset key={q.id} className="rounded-xl border border-border p-4">
              <legend className="px-1 text-sm font-semibold">
                {index + 1}. {q.prompt}
              </legend>
              <div className="mt-2 space-y-2">
                {q.options.map((option) => (
                  <label key={option} className="flex gap-2 text-sm">
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === option}
                      disabled={busy || !userId || !canUseReader(userId)}
                      onChange={() => answer(q, option)}
                    />
                    {option}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <button
            disabled={
              busy ||
              !userId ||
              !canUseReader(userId) ||
              Object.keys(answers).length !== quiz.questions.length
            }
            onClick={() => void submit()}
            className={button}
          >
            Submit final test
          </button>
        </div>
      ) : (
        <button
          disabled={busy || !userId || !canUseReader(userId)}
          onClick={() => void start()}
          className={secondary + " mt-3"}
        >
          <BookOpen className="mr-1 inline h-4 w-4" /> {busy ? "Loading…" : "Start or retake test"}
        </button>
      )}
    </div>
  );
}
