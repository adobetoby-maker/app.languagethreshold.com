import { useEffect, useRef, useState } from "react";
import { useOwnerResource } from "./use-owner-resource";
import { ownerButton, ownerField, ownerPanel } from "./owner-ui";
import type { LeadReport } from "@/lib/download-leads";

export function OwnerDownloadLeads({
  onPrepare,
  live = false,
}: {
  onPrepare?: (lead: LeadReport["recent"][number]) => void;
  live?: boolean;
}) {
  const [days, setDays] = useState("30");
  const [tests, setTests] = useState(false);
  const r = useOwnerResource<LeadReport>(
    `/api/owner-download-leads?days=${days}&tests=${tests ? "1" : "0"}`,
  );
  const refresh = useRef(r.refresh);
  refresh.current = r.refresh;
  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh.current();
    }, 60000);
    return () => window.clearInterval(timer);
  }, [live]);
  const d = r.data;
  if (!r.allowed) return null;
  return (
    <section aria-label="Download leads" className={ownerPanel}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Download leads</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Emails collected through the free resource forms on Medical Spanish, Construction
            Spanish and Language Threshold. Counts reflect requests accepted by Leader HQ; they do
            not prove a file was opened, an email delivered or a subscription confirmed.
          </p>
        </div>
        <button className={ownerButton} onClick={r.refresh} disabled={r.loading}>
          {r.loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {live && (
        <p className="mt-3 text-sm">
          Refreshes every minute while this page is visible. Source: accepted download requests;
          subscription status must be checked in Leader HQ.
        </p>
      )}
      <div className="my-5 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          Period{" "}
          <select className={ownerField} value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={tests} onChange={(e) => setTests(e.target.checked)} />
          Include owner setup tests
        </label>
        <a
          className="text-sm underline underline-offset-4"
          href="https://toby.leaderhq.io"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Leader HQ CRM ↗
        </a>
      </div>
      {r.error && (
        <p role="alert" className="mb-4 rounded-xl border border-destructive p-4 text-foreground">
          {r.error}
        </p>
      )}
      {r.loading && !d && <p role="status">Loading private lead report…</p>}
      {d && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Emails today", d.todayEmails],
              ["Unique emails in period", d.uniqueEmails],
              ["First seen in period", d.newEmails],
              ["Resource requests", d.requests],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border bg-background p-4">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>
          <p className="my-4 text-sm text-muted-foreground">
            Today uses Mountain Time. Other periods are rolling {days} days. First seen means first
            recorded by this report, not necessarily a new CRM contact. {d.testsExcluded} setup
            requests excluded. Repeat requests for the same resource within ten minutes count once.
          </p>
          <p className="mb-6 rounded-xl border border-border bg-background p-4 text-sm">
            {d.trackingStartedAt} Earlier contacts and subscription confirmations remain in Leader
            HQ. Historical page attribution cannot be reconstructed from this report.
          </p>
          <h3 className="mb-3 text-lg font-semibold">Pages, resources and campaigns</h3>
          {!d.sources.length ? (
            <p className="rounded-xl border border-border p-5">
              No recorded download requests in this period
              {tests ? "." : " after excluding setup tests."} New requests will appear here after
              refresh.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-muted">
                  <tr>
                    {[
                      "Site / signup page",
                      "First page visited",
                      "Resource",
                      "Campaign / source",
                      "Requests",
                      "Emails",
                    ].map((h) => (
                      <th key={h} className="p-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.sources.map((s, i) => (
                    <tr key={i} className="border-t border-border align-top">
                      <td className="p-3">
                        <strong>{s.site}</strong>
                        <br />
                        {s.signup_page}
                      </td>
                      <td className="p-3">
                        {s.landing_page}
                        <br />
                        <span className="text-muted-foreground">
                          {s.referrer_host || "No referring site recorded"}
                        </span>
                      </td>
                      <td className="p-3">{s.resource_title}</td>
                      <td className="p-3">
                        {s.utm_campaign || "No campaign tag"}
                        <br />
                        {s.utm_source || "No source tag"}
                        {s.utm_medium ? ` / ${s.utm_medium}` : ""}
                        {s.utm_content && (
                          <>
                            <br />
                            {s.utm_content}
                          </>
                        )}
                      </td>
                      <td className="p-3">{s.requests}</td>
                      <td className="p-3">{s.unique_emails}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            An email can appear in several resource or campaign rows; row totals should not be added
            to estimate unique people. Page and campaign attribution is supplied by the visitor’s
            browser.
          </p>
          <h3 className="mb-3 mt-7 text-lg font-semibold">Daily activity · Mountain Time</h3>
          <div className="flex flex-wrap gap-3">
            {d.daily.length ? (
              d.daily.map((day) => (
                <div key={day.day} className="rounded-xl border border-border p-3 text-sm">
                  <strong>{day.day}</strong>
                  <p>
                    {day.unique_emails} emails · {day.requests} requests
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            )}
          </div>
          <h3 className="mb-3 mt-7 text-lg font-semibold">Recent requests · latest 100</h3>
          {!!d.recent.length && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr>
                    {["Requested", "Email", "Site / resource", "Campaign"].map((h) => (
                      <th key={h} className="p-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.recent.map((lead, i) => (
                    <tr key={i} className="border-t border-border align-top">
                      <td className="p-3">
                        {new Date(lead.created_at).toLocaleString("en-US", {
                          timeZone: "America/Denver",
                        })}{" "}
                        MT
                      </td>
                      <td className="p-3 break-all">
                        {lead.email}
                        {onPrepare && (
                          <button
                            type="button"
                            className={`${ownerButton} mt-2 block`}
                            onClick={() => onPrepare(lead)}
                          >
                            Prepare follow-up
                          </button>
                        )}
                        {lead.is_test && <span className="block font-semibold">Setup test</span>}
                      </td>
                      <td className="p-3">
                        {lead.site}
                        <br />
                        {lead.resource_title}
                      </td>
                      <td className="p-3">{lead.utm_campaign || "Untagged"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
