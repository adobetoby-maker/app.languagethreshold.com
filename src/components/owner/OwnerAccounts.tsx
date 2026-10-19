import { OwnerCustomerTools } from "./OwnerCustomerTools";
import { ownerDateInput } from "@/lib/owner-users";
import { useState } from "react";
import type { OwnerDirectory, OwnerUser, OwnerUserResult, OwnerUsage } from "@/lib/owner-users";
import { useOwnerResource } from "./use-owner-resource";
const field = "w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground";
const button =
  "rounded-lg border border-border px-3 py-2 text-sm hover:border-gold disabled:opacity-50";
const primary = button + " bg-gold text-midnight font-semibold";
const date = (v: string | null) => (v ? new Date(v).toLocaleString() : "—");
function initialUntil() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const untilIso = (s: string) => new Date(`${s}T23:59:59`).toISOString();

export function OwnerAccounts() {
  const [search, setSearch] = useState(""),
    [applied, setApplied] = useState(""),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState<OwnerUser | null>(null);
  const resource = useOwnerResource<OwnerDirectory>(
    `/api/owner-users?search=${encodeURIComponent(applied)}&page=${page}`,
  );
  const [adding, setAdding] = useState(false),
    [email, setEmail] = useState(""),
    [name, setName] = useState(""),
    [until, setUntil] = useState(initialUntil),
    [reason, setReason] = useState("Complimentary testing access");
  const [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  if (!resource.allowed) return null;
  async function add() {
    setError("");
    setNotice("");
    try {
      const result = await resource.run<OwnerUserResult>({
        action: "add_tester",
        requestId: crypto.randomUUID(),
        email,
        name,
        until: untilIso(until),
        reason,
      });
      if (result) {
        setNotice(result.notice);
        setAdding(false);
        setEmail("");
        setName("");
        resource.refresh();
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not add tester. Refresh and search for the email before retrying.",
      );
    }
  }
  return (
    <section
      className="rounded-2xl border border-border/60 bg-card/50 p-4 sm:p-5"
      aria-labelledby="owner-users-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="owner-users-title" className="text-xl font-semibold">
          Users and usage
        </h2>
        <button className={primary} disabled={resource.busy} onClick={() => setAdding((v) => !v)}>
          {adding ? "Close new tester form" : "Add tester"}
        </button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        All registered accounts, including people who have not signed in yet. Usage shows recorded
        active practice over the last 30 days; offline and unsynced device activity may be missing.
        Time does not establish proficiency.
      </p>
      {resource.data && !resource.data.emailReady && (
        <p className="mt-3 rounded-lg border border-amber-500/50 p-3 text-sm">
          Direct invitation email needs email service configuration. You can create a private
          password link and open an email draft to send it yourself.
        </p>
      )}
      {adding && (
        <form
          className="mt-4 grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <label className="text-sm">
            Tester name
            <input
              required
              maxLength={120}
              className={field}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Tester email
            <input
              type="email"
              required
              maxLength={254}
              className={field}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Free through
            <input
              type="date"
              required
              className={field}
              value={until}
              onChange={(e) => setUntil(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Reason
            <input
              required
              minLength={3}
              maxLength={500}
              className={field}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <p className="text-sm text-muted-foreground sm:col-span-2">
            Creates an account and expiring free access with no charge, card or automatic renewal.
            Then select the account to send its password invitation. Existing accounts are
            preserved.
          </p>
          <button className={primary} disabled={resource.busy}>
            {resource.busy ? "Creating…" : "Create free tester account"}
          </button>
        </form>
      )}
      <form
        className="my-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(search.trim());
          setPage(0);
          setSelected(null);
          setNotice("");
          setError("");
        }}
      >
        <label className="min-w-0 flex-1 text-sm">
          Find a user
          <input
            className={field}
            maxLength={160}
            placeholder="Name or email"
            value={search}
            disabled={resource.busy}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button className={button + " self-end"} disabled={resource.busy}>
          Search
        </button>
        <button
          type="button"
          className={button + " self-end"}
          disabled={resource.busy}
          onClick={() => resource.refresh()}
        >
          Refresh
        </button>
      </form>
      {(error || resource.error) && (
        <p role="alert" className="my-3 text-red-700 dark:text-red-300">
          {error || resource.error}
        </p>
      )}
      {notice && (
        <p role="status" className="my-3">
          {notice}
        </p>
      )}
      {resource.loading ? (
        <p role="status">Loading users…</p>
      ) : (
        resource.data && (
          <>
            <p className="mb-3 text-sm">
              {resource.data.total} matching accounts · Page {page + 1} of{" "}
              {Math.max(1, Math.ceil(resource.data.total / resource.data.pageSize))}
            </p>
            <div className="grid gap-3 lg:grid-cols-2">
              {resource.data.users.map((account) => (
                <button
                  key={account.id}
                  className={
                    "min-w-0 rounded-xl border p-4 text-left hover:border-gold " +
                    (selected?.id === account.id ? "border-gold" : "border-border")
                  }
                  disabled={resource.busy}
                  onClick={() => {
                    setSelected(account);
                    setNotice("");
                    setError("");
                  }}
                >
                  <strong className="block break-words">
                    {account.displayName || account.email || "Account without email"}
                  </strong>
                  <span className="block break-all text-sm text-muted-foreground">
                    {account.email}
                  </span>
                  <span className="mt-2 block text-sm">
                    {Math.round(account.activeSeconds30d / 60)} recorded minutes ·{" "}
                    {account.activeDays30d} active days
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {account.confirmed
                      ? "Email confirmed"
                      : "Invitation / email confirmation pending"}
                    {account.freeActive
                      ? ` · Free through ${new Date(account.freeUntil!).toLocaleDateString()}`
                      : ""}
                  </span>
                </button>
              ))}
            </div>
            {resource.data.users.length === 0 && <p>No matching users.</p>}
            <div className="mt-3 flex gap-3">
              <button
                className={button}
                disabled={page === 0 || resource.busy}
                onClick={() => {
                  setPage((p) => p - 1);
                  setSelected(null);
                }}
              >
                Previous page
              </button>
              <button
                className={button}
                disabled={(page + 1) * 50 >= resource.data.total || resource.busy}
                onClick={() => {
                  setPage((p) => p + 1);
                  setSelected(null);
                }}
              >
                Next page
              </button>
            </div>
          </>
        )
      )}
      {selected && (
        <UserDetails
          key={selected.id}
          account={resource.data?.users.find((u) => u.id === selected.id) ?? selected}
          emailReady={resource.data?.emailReady ?? false}
          onClose={() => setSelected(null)}
          onChanged={() => resource.refresh()}
        />
      )}
    </section>
  );
}

type Detail = {
  usage: OwnerUsage[];
  memberships: {
    organization_id: string;
    role: string;
    status: string;
    team_organizations: {
      name: string;
      team_entitlements: { status: string; period_end: string | null } | null;
    } | null;
  }[];
  grant: { reason: string; updated_at: string } | null;
  invitation: { status: string; created_at: string } | null;
};
function UserDetails({
  account,
  emailReady,
  onClose,
  onChanged,
}: {
  account: OwnerUser;
  emailReady: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const details = useOwnerResource<Detail>(`/api/owner-users?userId=${account.id}`),
    actions = useOwnerResource<OwnerDirectory>("/api/owner-users", false);
  const [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [link, setLink] = useState(""),
    [until, setUntil] = useState(
      account.freeUntil ? ownerDateInput(account.freeUntil) : initialUntil(),
    ),
    [reason, setReason] = useState("Complimentary access");
  if (!details.allowed) return null;
  async function act(body: unknown) {
    setNotice("");
    setError("");
    setLink("");
    try {
      const r = await actions.run<OwnerUserResult>(body);
      if (r) {
        setNotice(r.notice);
        setLink(r.link ?? "");
        details.refresh();
        onChanged();
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not confirm this action. Refresh before retrying.",
      );
    }
  }
  return (
    <div className="mt-5 rounded-xl border border-gold/50 p-4" aria-labelledby="owner-user-detail">
      <div className="flex items-start justify-between gap-3">
        <h3 id="owner-user-detail" className="min-w-0 break-all text-lg font-semibold">
          {account.email}
        </h3>
        <button className={button} onClick={onClose}>
          Close
        </button>
      </div>
      <dl className="my-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Account created</dt>
          <dd>{date(account.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Last sign-in</dt>
          <dd>{date(account.lastSignInAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Last recorded practice</dt>
          <dd>{date(account.lastPracticeAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Personal subscription</dt>
          <dd>{account.subscriptionStatus}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Complimentary access</dt>
          <dd>
            {account.freeUntil
              ? `${account.freeActive ? "Active" : "Ended"} · ${date(account.freeUntil)}`
              : "No individual grant recorded"}
          </dd>
        </div>
      </dl>
      {details.data?.invitation && (
        <p className="my-3 text-sm">
          Last password invitation:{" "}
          {(
            {
              sent: "Email accepted by provider",
              link_created: "Private link created",
              delivery_unconfirmed:
                "Delivery unconfirmed — check with the recipient before sending again",
              started: "Started; outcome unconfirmed",
            } as Record<string, string>
          )[details.data.invitation.status] ?? "Outcome unconfirmed"}{" "}
          · {date(details.data.invitation.created_at)}
        </p>
      )}
      {(error || details.error) && (
        <p role="alert" className="my-2 text-red-700 dark:text-red-300">
          {error || details.error}
        </p>
      )}
      {notice && (
        <p role="status" className="my-2">
          {notice}
        </p>
      )}
      <div className="my-4 flex flex-wrap gap-2">
        <button
          className={primary}
          disabled={actions.busy || !emailReady}
          onClick={() =>
            void act({
              action: "password_invite",
              userId: account.id,
              delivery: "email",
              requestId: crypto.randomUUID(),
            })
          }
        >
          Send password invitation
        </button>
        <button
          className={button}
          disabled={actions.busy}
          onClick={() =>
            void act({
              action: "password_invite",
              userId: account.id,
              delivery: "copy",
              requestId: crypto.randomUUID(),
            })
          }
        >
          Create private password link
        </button>
      </div>
      {link && (
        <div className="my-3 rounded-lg border border-amber-500/50 p-3">
          <label className="block text-sm">
            Private link for {account.email}
            <textarea readOnly className={field + " mt-1 break-all"} rows={3} value={link} />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              className={button}
              onClick={() => {
                void navigator.clipboard.writeText(link).then(
                  () => setNotice("Private link copied."),
                  () => setError("Copy is unavailable. Select and copy the private link above."),
                );
              }}
            >
              Copy private link
            </button>
            <a
              className={button}
              href={`mailto:${encodeURIComponent(account.email ?? "")}?subject=${encodeURIComponent("Create your Language Threshold password")}&body=${encodeURIComponent(`Create your password with this private, time-limited link. Please do not forward it.\n\n${link}\n\nLanguage Threshold`)}`}
            >
              Open email draft
            </a>
            <button className={button} onClick={() => setLink("")}>
              Hide link
            </button>
          </div>
        </div>
      )}
      <form
        className="my-4 grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void act({ action: "free_access", userId: account.id, until: untilIso(until), reason });
        }}
      >
        <label className="text-sm">
          Free through
          <input
            className={field}
            type="date"
            required
            value={until}
            onChange={(e) => setUntil(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Reason
          <input
            className={field}
            required
            minLength={3}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <p className="text-sm text-muted-foreground sm:col-span-2">
          Sets the complimentary access end date. This does not cancel or change an existing paid
          subscription.
        </p>
        <button className={primary} disabled={actions.busy}>
          Save free access
        </button>
      </form>
      <h4 className="font-semibold">Recorded practice · last 30 days</h4>
      {details.loading ? (
        <p>Loading activity…</p>
      ) : (
        details.data && (
          <>
            <ul className="my-2 space-y-2">
              {details.data.usage.map((row) => (
                <li
                  key={`${row.module_id}:${row.activity}`}
                  className="rounded-lg bg-background p-3 text-sm"
                >
                  <strong>{row.module_id}</strong> · {row.activity}
                  <span className="block">
                    {Math.round(row.active_seconds / 60)} minutes · {row.active_days} active days ·
                    Last {date(row.last_practice_at)}
                  </span>
                </li>
              ))}
            </ul>
            {!details.data.usage.length && (
              <p className="my-2 text-sm text-muted-foreground">
                No recorded practice in this period. This does not establish that the person has not
                used the app.
              </p>
            )}
            <h4 className="mt-4 font-semibold">Teams and access</h4>
            <ul className="mt-2 space-y-2">
              {details.data.memberships.map((m) => (
                <li className="text-sm" key={m.organization_id}>
                  {m.team_organizations?.name ?? "Team"} · {m.role} · {m.status} ·{" "}
                  {m.team_organizations?.team_entitlements?.status ?? "No plan"}
                  {m.team_organizations?.team_entitlements?.period_end
                    ? ` through ${date(m.team_organizations.team_entitlements.period_end)}`
                    : ""}
                </li>
              ))}
            </ul>
            {details.data.grant && (
              <p className="mt-3 text-sm">Grant reason: {details.data.grant.reason}</p>
            )}
          </>
        )
      )}
      <OwnerCustomerTools key={account.id} userId={account.id} email={account.email} />
    </div>
  );
}
