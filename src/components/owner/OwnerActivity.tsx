import { useState } from "react";
import { useOwnerResource } from "./use-owner-resource";
import { OwnerMessage, ownerButton, ownerField, ownerPanel } from "./owner-ui";
import { downloadCsv, ownerDate } from "@/lib/owner-format";
import type { ActivityPage } from "@/lib/owner-activity";

type Filters = { action: string; org: string; from: string; to: string; hideViews: boolean };
const EMPTY: Filters = { action: "", org: "", from: "", to: "", hideViews: true };
const PREFIXES = [
  ["", "All actions"],
  ["user.", "Accounts (user.*)"],
  ["owner_team.", "Owner team changes"],
  ["team.", "Company admin actions"],
  ["ledger.", "Ledger"],
  ["certificate.", "Certificates"],
  ["custom_module.", "Module requests"],
  ["activity.", "Activity exports"],
] as const;

/** Full audit log: actor email, action, company, detail summary; filters, paging and CSV. */
export function OwnerActivity({
  organizations,
}: {
  organizations: { id: string; name: string }[];
}) {
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const query = new URLSearchParams({
    page: String(page),
    hideViews: String(applied.hideViews),
    ...(applied.action ? { action: applied.action } : {}),
    ...(applied.org ? { org: applied.org } : {}),
    ...(applied.from ? { from: applied.from } : {}),
    ...(applied.to ? { to: applied.to } : {}),
  });
  const log = useOwnerResource<ActivityPage>(`/api/owner-activity?${query}`);
  const exporter = useOwnerResource<ActivityPage>("/api/owner-activity", false);
  if (!log.allowed) return null;
  const filters = {
    action: applied.action,
    hideViews: applied.hideViews,
    ...(applied.org ? { org: applied.org } : {}),
    ...(applied.from ? { from: applied.from } : {}),
    ...(applied.to ? { to: applied.to } : {}),
  };
  async function exportCsv() {
    setNotice("");
    setError("");
    try {
      const result = await exporter.run<{ csv: string; filename: string; notice: string }>({
        action: "export",
        filters,
      });
      if (result) {
        downloadCsv(result.csv, result.filename);
        setNotice(result.notice);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not export activity.");
    }
  }
  const data = log.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return (
    <section className={ownerPanel} aria-labelledby="owner-activity-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="owner-activity-title" className="text-xl font-semibold">
          Activity log
        </h2>
        <div className="flex gap-2">
          <button type="button" className={ownerButton} onClick={log.refresh} disabled={log.busy}>
            Reload log
          </button>
          <button
            type="button"
            className={ownerButton}
            onClick={() => void exportCsv()}
            disabled={exporter.busy || log.loading}
          >
            {exporter.busy ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Every owner and company-admin change, newest first. Learner conversations are never logged.
      </p>
      <form
        className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-6"
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(draft);
          setPage(0);
        }}
      >
        <label className="text-sm lg:col-span-2">
          Action
          <select
            className={ownerField}
            value={draft.action}
            onChange={(e) => setDraft({ ...draft, action: e.target.value })}
          >
            {PREFIXES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm lg:col-span-2">
          Company
          <select
            className={ownerField}
            value={draft.org}
            onChange={(e) => setDraft({ ...draft, org: e.target.value })}
          >
            <option value="">All companies</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          From
          <input
            type="date"
            className={ownerField}
            value={draft.from}
            onChange={(e) => setDraft({ ...draft, from: e.target.value })}
          />
        </label>
        <label className="text-sm">
          To
          <input
            type="date"
            className={ownerField}
            value={draft.to}
            onChange={(e) => setDraft({ ...draft, to: e.target.value })}
          />
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-4">
          <input
            type="checkbox"
            checked={draft.hideViews}
            onChange={(e) => setDraft({ ...draft, hideViews: e.target.checked })}
          />
          Hide page views (dashboard opened, directory viewed)
        </label>
        <div className="flex gap-2 sm:col-span-2">
          <button className={ownerButton + " flex-1"}>Apply filters</button>
          <button
            type="button"
            className={ownerButton}
            onClick={() => {
              setDraft(EMPTY);
              setApplied(EMPTY);
              setPage(0);
            }}
          >
            Clear
          </button>
        </div>
      </form>
      <OwnerMessage error={error || log.error} notice={notice} />
      {log.loading && <p role="status">Loading activity…</p>}
      {data && (
        <>
          <p className="mt-3 text-sm text-muted-foreground">
            {data.total} events · page {page + 1} of {pages}
          </p>
          <ol className="mt-2 divide-y divide-border/50">
            {data.events.map((event) => (
              <li key={event.id} className="py-2 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-mono text-xs font-semibold">{event.action}</span>
                  <time className="text-xs text-muted-foreground" dateTime={event.created_at}>
                    {ownerDate(event.created_at)}
                  </time>
                </div>
                <p className="break-all text-xs text-muted-foreground">
                  {event.actor_email ?? (event.actor_user_id ? "Unknown account" : "System")}
                  {event.organization_name || event.organization_id
                    ? ` · ${event.organization_name ?? event.organization_id}`
                    : ""}
                </p>
                {event.summary && <p className="mt-0.5 break-words text-xs">{event.summary}</p>}
              </li>
            ))}
          </ol>
          {data.events.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">No events match these filters.</p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className={ownerButton}
              disabled={page === 0 || log.busy}
              onClick={() => setPage((p) => p - 1)}
            >
              Newer
            </button>
            <button
              type="button"
              className={ownerButton}
              disabled={page + 1 >= pages || log.busy}
              onClick={() => setPage((p) => p + 1)}
            >
              Older
            </button>
          </div>
        </>
      )}
    </section>
  );
}
