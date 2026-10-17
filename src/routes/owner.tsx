import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/state/auth-state";
import { AuthModal } from "@/components/auth/AuthModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { teamRequest } from "@/lib/team-client";
import { teamSeatMetrics } from "@/lib/team-seat-metrics";

export const Route = createFileRoute("/owner")({
  component: () => (
    <AuthProvider>
      <OwnerDashboard />
    </AuthProvider>
  ),
});

type Counts = {
  total_accounts: number;
  adult_accounts: number;
  junior_accounts: number;
  organizations: number;
  paid_seats: number;
  assigned_seats: number;
  certificates: number;
  pending_invites: number;
  email_failures: number;
  assessment_passes_30d: number;
  active_7d: number;
  active_30d: number;
};
type Month = { month: string; income_cents: number; expense_cents: number; net_cents: number };
type Ledger = {
  id: string;
  occurred_on: string;
  category: string;
  amount_cents: number;
  source: string;
  external_ref: string | null;
  organization_id: string | null;
  memo: string;
};
type Organization = { id: string; name: string; billing_email: string; created_at: string };
type Entitlement = {
  organization_id: string;
  seat_limit: number;
  term: string | null;
  status: string;
  period_end: string | null;
  stripe_subscription_id: string | null;
};
type Member = { organization_id: string; user_id: string; role: string; status: string };
type Activity = {
  organization_id: string;
  module_id: string;
  active_seconds: number;
  started_at: string;
  user_id: string;
};
type Attempt = {
  organization_id: string;
  module_id: string;
  score: number | null;
  total: number;
  submitted_at: string;
};
type Audit = {
  id: number;
  actor_user_id: string | null;
  action: string;
  organization_id: string | null;
  created_at: string;
};
type ModuleRequest = {
  id: string;
  requester_id: string;
  organization_id: string | null;
  title: string;
  audience: string;
  situations: string;
  vocabulary: string;
  status: string;
  fee_cents: number;
  paid_at: string | null;
  owner_note: string;
  created_at: string;
};
type PlatformData = {
  counts: Counts;
  financial: { income_cents: number; expense_cents: number; net_cents: number; months: Month[] };
  categories: {
    category: string;
    income_cents: number;
    expense_cents: number;
    net_cents: number;
  }[];
  siteUsage: { module_id: string; active_seconds: number; active_users: number }[];
  organizations: Organization[];
  entitlements: Entitlement[];
  members: Member[];
  activity: Activity[];
  attempts: Attempt[];
  ledger: Ledger[];
  auditEvents: Audit[];
  moduleRequests: ModuleRequest[];
};
const panel = "rounded-2xl border border-border/60 bg-card/50 p-5";
const input = "rounded-lg border border-border bg-background px-3 py-2.5 text-foreground";
const button = "rounded-lg bg-gold px-4 py-2.5 font-semibold text-midnight disabled:opacity-50";
const secondary = "rounded-lg border border-border px-3 py-2 text-sm hover:border-gold/50";
const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);

function OwnerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [authOpen, setAuthOpen] = useState(false);
  const [data, setData] = useState<PlatformData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("AI services");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [since, setSince] = useState(
    new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10),
  );

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      setData(await teamRequest<PlatformData>(`/api/platform?since=${since}`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [userId, since]);
  useEffect(() => {
    if (!authLoading && userId) void refresh();
    else if (!authLoading) setLoading(false);
  }, [authLoading, userId, refresh]);
  async function act(body: unknown, message: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await teamRequest("/api/platform", body);
      setNotice(message);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }
  const csv = () => {
    if (!data) return;
    const rows = [
      ["Date", "Category", "Amount USD", "Source", "Memo", "Reference"],
      ...data.ledger.map((e) => [
        e.occurred_on,
        e.category,
        (e.amount_cents / 100).toFixed(2),
        e.source,
        e.memo,
        e.external_ref ?? "",
      ]),
    ];
    const text = rows
      .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `language-threshold-ledger-${since}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const seatMetrics = teamSeatMetrics(data?.entitlements ?? []);

  return (
    <main className="min-h-screen bg-background p-4 text-foreground sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.22em] text-gold-ink dark:text-gold">
              Language Threshold · Owner only
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Platform dashboard</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Accounts, team use, and a site-wide cash activity ledger.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ThemeToggle className={secondary + " flex items-center gap-2"} />
            <a href="/exam-reviewers" className={secondary}>
              Reviewer access
            </a>
            <a href="/exam-content" className={secondary}>
              Private exam content
            </a>
            <Link to="/team" className={secondary}>
              Teams
            </Link>
            <Link to="/" className={secondary}>
              Learning app
            </Link>
            <button className={secondary} onClick={() => void refresh()}>
              Refresh
            </button>
          </div>
        </div>
        {authLoading || loading ? (
          <p>Loading owner dashboard…</p>
        ) : !user ? (
          <div className={panel}>
            <p>Sign in with the platform owner account.</p>
            <button className={button + " mt-4"} onClick={() => setAuthOpen(true)}>
              Sign in
            </button>
            <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
          </div>
        ) : error && !data ? (
          <p
            role="alert"
            className="rounded-xl border border-red-500/50 p-4 text-red-700 dark:text-red-300"
          >
            {error}
          </p>
        ) : (
          data && (
            <div className="space-y-6">
              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-500/50 p-3 text-red-700 dark:text-red-300"
                >
                  {error}
                </p>
              )}
              {notice && (
                <p
                  role="status"
                  className="rounded-lg border border-emerald-500/50 p-3 text-emerald-700 dark:text-emerald-300"
                >
                  {notice}
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Total accounts", data.counts.total_accounts],
                  ["Companies", data.counts.organizations],
                  ["Enabled learner seats", seatMetrics.enabled],
                  ["Paid learner seats", seatMetrics.paid],
                  ["Pilot learner seats", seatMetrics.pilot],
                  ["Assigned learner seats", data.counts.assigned_seats],
                  ["Adults", data.counts.adult_accounts],
                  ["Junior accounts", data.counts.junior_accounts],
                  ["Certificates", data.counts.certificates],
                  ["Pending invites", data.counts.pending_invites],
                  ["Email failures", data.counts.email_failures],
                  ["Test passes · 30d", data.counts.assessment_passes_30d],
                  [
                    "Active accounts · 7d / 30d",
                    `${data.counts.active_7d} / ${data.counts.active_30d}`,
                  ],
                ].map(([label, value]) => (
                  <div key={String(label)} className={panel}>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      {label}
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-gold-ink dark:text-gold">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              <section className={panel}>
                <h2 className="mb-3 text-xl font-semibold">
                  Practice across the site · last 30 days
                </h2>
                <p className="mb-3 text-sm text-muted-foreground">
                  Active app minutes by selected module, including individual and team learners. No
                  conversations or recordings are included.
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {data.siteUsage
                    .sort((a, b) => b.active_seconds - a.active_seconds)
                    .map((module) => (
                      <div key={module.module_id} className="rounded-xl border border-border p-3">
                        <strong>{module.module_id}</strong>
                        <p className="text-sm text-muted-foreground">
                          {Math.round(module.active_seconds / 60)} minutes · {module.active_users}{" "}
                          learners
                        </p>
                      </div>
                    ))}
                </div>
              </section>
              <section className={panel}>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">Site P/L ledger</h2>
                    <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                      Cash activity from Stripe receipts and manual entries. Record hosting, AI,
                      payroll, marketing, processing fees, taxes, and other expenses here. This is
                      an operational P/L view, not accrual financial statements.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={busy}
                      onClick={() =>
                        void act(
                          { action: "ledger_import_stripe" },
                          "Stripe payment history imported. Existing entries were kept once.",
                        )
                      }
                      className={secondary}
                    >
                      Import Stripe history
                    </button>
                    <label className="text-xs">
                      From{" "}
                      <input
                        type="date"
                        className={input + " ml-1"}
                        value={since}
                        onChange={(e) => setSince(e.target.value)}
                      />
                    </label>
                    <button onClick={csv} className={secondary}>
                      Export CSV
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    ["Receipts", data.financial.income_cents],
                    ["Expenses + refunds", data.financial.expense_cents],
                    ["Net", data.financial.net_cents],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-xl border border-border p-4">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-1 text-2xl font-semibold">{money(Number(value))}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="p-2">Month</th>
                        <th className="p-2">Receipts</th>
                        <th className="p-2">Expenses</th>
                        <th className="p-2">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.financial.months.map((m) => (
                        <tr key={m.month} className="border-b border-border/40">
                          <td className="p-2">{m.month}</td>
                          <td className="p-2">{money(m.income_cents)}</td>
                          <td className="p-2">{money(m.expense_cents)}</td>
                          <td className="p-2">{money(m.net_cents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className={panel}>
                <h2 className="mb-3 text-xl font-semibold">P/L by category</h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="p-2">Category</th>
                        <th className="p-2">Income</th>
                        <th className="p-2">Expenses / refunds</th>
                        <th className="p-2">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.categories.map((item) => (
                        <tr key={item.category} className="border-b border-border/40">
                          <td className="p-2">{item.category}</td>
                          <td className="p-2">{money(item.income_cents)}</td>
                          <td className="p-2">{money(item.expense_cents)}</td>
                          <td className="p-2">{money(item.net_cents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <div className="grid gap-6 lg:grid-cols-2">
                <section className={panel}>
                  <h2 className="mb-4 text-xl font-semibold">Enter a receipt or expense</h2>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const cents = Math.round(Number(amount) * 100);
                      if (cents > 0)
                        void act(
                          { action: "ledger_add", date, kind, category, amountCents: cents, memo },
                          "Ledger entry recorded.",
                        );
                    }}
                    className="grid gap-3"
                  >
                    <div className="flex flex-wrap gap-2">
                      <select
                        aria-label="Entry kind"
                        className={input}
                        value={kind}
                        onChange={(e) => setKind(e.target.value as typeof kind)}
                      >
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                      </select>
                      <input
                        aria-label="Date"
                        type="date"
                        className={input}
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                      <input
                        aria-label="Amount in dollars"
                        required
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="Amount $"
                        className={input + " max-w-36"}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>
                    <input
                      required
                      maxLength={80}
                      aria-label="Category"
                      placeholder="Category"
                      className={input}
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    />
                    <input
                      maxLength={500}
                      aria-label="Memo"
                      placeholder="Memo"
                      className={input}
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                    />
                    <button disabled={busy || !Number(amount)} className={button}>
                      Record entry
                    </button>
                  </form>
                </section>
                <section className={panel}>
                  <h2 className="mb-3 text-xl font-semibold">Recent ledger entries</h2>
                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {data.ledger.slice(0, 30).map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-border/50 p-2 text-sm"
                      >
                        <div>
                          <p>
                            {entry.occurred_on} · {entry.category} · {entry.source}
                          </p>
                          <p className="text-xs text-muted-foreground">{entry.memo}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <strong
                            className={
                              entry.amount_cents < 0
                                ? "text-red-700 dark:text-red-300"
                                : "text-emerald-700 dark:text-emerald-300"
                            }
                          >
                            {money(entry.amount_cents)}
                          </strong>
                          {entry.source === "manual" && !entry.external_ref && (
                            <button
                              disabled={busy}
                              className="ml-2 text-xs text-gold-ink dark:text-gold underline"
                              onClick={() => {
                                const reason = window.prompt("Reason for reversing this entry?");
                                if (reason?.trim())
                                  void act(
                                    { action: "ledger_reverse", entryId: entry.id, reason },
                                    "Reversing entry recorded.",
                                  );
                              }}
                            >
                              Reverse
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <section className={panel}>
                <h2 className="mb-2 text-xl font-semibold">Custom module requests</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  Paid $20 content briefs. Review the requested situations, then update the status
                  and a note visible to the requester. A complete module needs a separate proposal.
                </p>
                {data.moduleRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No paid requests yet.</p>
                ) : (
                  <div className="space-y-3">
                    {data.moduleRequests.map((item) => (
                      <ModuleRequestRow key={item.id} item={item} busy={busy} act={act} />
                    ))}
                  </div>
                )}
              </section>
              <section className={panel}>
                <h2 className="mb-4 text-xl font-semibold">Companies and seat use</h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                        {[
                          "Company",
                          "Plan",
                          "Seats",
                          "Assigned",
                          "Active · 30d",
                          "Minutes · 30d",
                          "Top module",
                          "Renewal",
                          "Manual grant",
                        ].map((h) => (
                          <th className="p-2" key={h}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.organizations.map((org) => (
                        <OrgRow key={org.id} org={org} data={data} busy={busy} act={act} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className={panel}>
                <h2 className="mb-2 text-xl font-semibold">Recent owner actions</h2>
                <p className="mb-3 text-sm text-muted-foreground">
                  Sensitive platform views and changes are logged without learner conversation
                  content.
                </p>
                <div className="max-h-56 overflow-y-auto text-xs">
                  {data.auditEvents.map((event) => (
                    <div key={event.id} className="border-b border-border/30 py-1.5">
                      {new Date(event.created_at).toLocaleString()} · {event.action}{" "}
                      {event.organization_id
                        ? `· ${data.organizations.find((o) => o.id === event.organization_id)?.name ?? event.organization_id}`
                        : ""}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )
        )}
      </div>
    </main>
  );
}

function ModuleRequestRow({
  item,
  busy,
  act,
}: {
  item: ModuleRequest;
  busy: boolean;
  act: (body: unknown, message: string) => Promise<void>;
}) {
  const [status, setStatus] = useState(item.status);
  const [ownerNote, setOwnerNote] = useState(item.owner_note);
  return (
    <div className="rounded-xl border border-border/60 p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <strong>{item.title}</strong>
          <p className="mt-1 text-xs text-muted-foreground">
            Paid {item.paid_at ? new Date(item.paid_at).toLocaleDateString() : "pending"} ·{" "}
            {money(item.fee_cents)} · {item.organization_id ?? "Individual"}
          </p>
        </div>
        <span className="rounded-full border border-gold/40 px-2 py-1 text-xs capitalize text-gold-ink dark:text-gold">
          {item.status}
        </span>
      </div>
      <p className="mt-3">
        <strong>Audience:</strong> {item.audience}
      </p>
      <p className="mt-1 whitespace-pre-wrap">
        <strong>Situations:</strong> {item.situations}
      </p>
      {item.vocabulary && (
        <p className="mt-1 whitespace-pre-wrap">
          <strong>Vocabulary:</strong> {item.vocabulary}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <select
          className={input}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          {["submitted", "reviewing", "delivered", "declined"].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <input
          className={input + " min-w-48 flex-1"}
          value={ownerNote}
          onChange={(event) => setOwnerNote(event.target.value)}
          maxLength={1000}
          placeholder="Content brief or update visible to requester"
          aria-label="Content brief or requester update"
        />
        <button
          className={secondary}
          disabled={busy || (status === item.status && ownerNote === item.owner_note)}
          onClick={() =>
            void act(
              { action: "module_request_update", requestId: item.id, status, ownerNote },
              "Custom module request updated.",
            )
          }
        >
          Save
        </button>
      </div>
    </div>
  );
}

function OrgRow({
  org,
  data,
  busy,
  act,
}: {
  org: Organization;
  data: PlatformData;
  busy: boolean;
  act: (body: unknown, message: string) => Promise<void>;
}) {
  const entitlement = data.entitlements.find((e) => e.organization_id === org.id);
  const members = data.members.filter(
    (m) => m.organization_id === org.id && m.role === "learner" && m.status === "active",
  );
  const activity = data.activity.filter((a) => a.organization_id === org.id);
  const moduleSeconds = new Map<string, number>();
  for (const event of activity)
    moduleSeconds.set(
      event.module_id,
      (moduleSeconds.get(event.module_id) ?? 0) + event.active_seconds,
    );
  const top = [...moduleSeconds.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const [seats, setSeats] = useState(entitlement?.seat_limit ?? 5);
  const [term, setTerm] = useState<"monthly" | "quarterly" | "annual">(
    entitlement?.term === "monthly" || entitlement?.term === "quarterly"
      ? entitlement.term
      : "annual",
  );
  return (
    <tr className="border-b border-border/40 align-top">
      <td className="p-2">
        <a
          href={`/team?org=${encodeURIComponent(org.id)}`}
          className="font-semibold text-gold-ink dark:text-gold underline"
        >
          {org.name}
        </a>
        <div className="text-xs text-muted-foreground">{org.billing_email}</div>
      </td>
      <td className="p-2">
        {entitlement?.status ?? "pending"} · {entitlement?.term ?? "—"}
      </td>
      <td className="p-2">{entitlement?.seat_limit ?? 0}</td>
      <td className="p-2">{members.length}</td>
      <td className="p-2">{new Set(activity.map((a) => a.user_id)).size}</td>
      <td className="p-2">
        {Math.round(activity.reduce((sum, a) => sum + a.active_seconds, 0) / 60)}
      </td>
      <td className="p-2">{top}</td>
      <td className="p-2">
        {entitlement?.period_end ? new Date(entitlement.period_end).toLocaleDateString() : "—"}
      </td>
      <td className="p-2">
        {!entitlement?.stripe_subscription_id && (
          <div className="flex flex-wrap gap-1">
            <input
              type="number"
              min={0}
              max={1000}
              aria-label={`Manual seat grant for ${org.name}`}
              className={input + " w-20"}
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
            />
            <select
              className={input}
              aria-label="Grant term"
              value={term}
              onChange={(e) => setTerm(e.target.value as typeof term)}
            >
              <option value="monthly">1 mo</option>
              <option value="quarterly">3 mo</option>
              <option value="annual">1 yr</option>
            </select>
            <button
              disabled={busy}
              className={secondary}
              onClick={() =>
                void act(
                  {
                    action: "manual_grant",
                    orgId: org.id,
                    seats,
                    term,
                    periodEnd: new Date(
                      Date.now() +
                        (term === "annual" ? 365 : term === "quarterly" ? 90 : 30) * 86400000,
                    ).toISOString(),
                  },
                  "Manual entitlement updated.",
                )
              }
            >
              Grant
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
