import { useState } from "react";
import { useOwnerResource } from "./use-owner-resource";
import { BarList, DailyColumns, OwnerMessage, ownerButton, ownerPanel, StatTile } from "./owner-ui";
import { ownerMoney, ownerNumber } from "@/lib/owner-format";
import {
  ANALYTICS_RANGES,
  type AnalyticsRange,
  type AppAnalytics,
  type GaResponse,
} from "@/lib/owner-analytics";

const minutes = (seconds: number) => `${ownerNumber(Math.round(seconds / 60))} min`;
type Resource<T> = ReturnType<typeof useOwnerResource<T>>;

export function OwnerAnalytics() {
  const [range, setRange] = useState<AnalyticsRange>(30);
  const ga = useOwnerResource<GaResponse>(`/api/owner-analytics?part=ga&range=${range}`);
  const app = useOwnerResource<AppAnalytics>(`/api/owner-analytics?part=app&range=${range}`);
  if (!ga.allowed) return null;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Google Analytics traffic for the app plus the app&apos;s own account, practice and
            payment records.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Date range"
            className="inline-flex rounded-lg border border-border p-0.5"
          >
            {ANALYTICS_RANGES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={range === value}
                className={
                  "cursor-pointer rounded-md px-3 py-1.5 text-sm transition-colors duration-150 " +
                  (range === value ? "bg-gold font-semibold text-midnight" : "hover:bg-muted")
                }
                onClick={() => setRange(value)}
              >
                {value} days
              </button>
            ))}
          </div>
          <button
            type="button"
            className={ownerButton}
            onClick={() => {
              ga.refresh();
              app.refresh();
            }}
          >
            Reload
          </button>
        </div>
      </div>
      <GaSection resource={ga} />
      <AppSection resource={app} />
    </div>
  );
}

function GaSection({ resource }: { resource: Resource<GaResponse> }) {
  const data = resource.data;
  return (
    <section className={ownerPanel} aria-labelledby="owner-ga-title">
      <h2 id="owner-ga-title" className="text-lg font-semibold">
        Website traffic · Google Analytics
      </h2>
      <OwnerMessage error={resource.error} />
      {resource.loading && <p role="status">Loading Google Analytics…</p>}
      {data && !data.configured && (
        <div className="mt-3 rounded-xl border border-amber-500/60 p-4" data-testid="ga-connect">
          <h3 className="font-semibold">Connect Google Analytics</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Traffic numbers appear here once a read-only service account is connected.
            {data.missing.length > 0 && ` Missing: ${data.missing.join(", ")}.`}
            {data.invalid.length > 0 && ` Could not read: ${data.invalid.join(", ")}.`}
          </p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">
            {data.setup.map((step) => (
              <li key={step} className="break-words">
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
      {data?.configured && data.error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-red-500/50 p-3 text-sm text-red-700 dark:text-red-300"
        >
          {data.error}
        </p>
      )}
      {data?.configured && "totals" in data && (
        <div className="mt-3 space-y-5">
          <p className="text-xs text-muted-foreground">
            Host {data.hostname} · last {data.range} days · as of{" "}
            {new Date(data.fetchedAt).toLocaleTimeString()} (cached up to 10 minutes)
          </p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatTile
              label="Active now"
              value={
                data.realtimeActiveUsers === null ? "—" : ownerNumber(data.realtimeActiveUsers)
              }
              hint="Last 30 minutes, whole GA property"
            />
            <StatTile label="Active users" value={ownerNumber(data.totals.activeUsers)} />
            <StatTile label="New users" value={ownerNumber(data.totals.newUsers)} />
            <StatTile label="Sessions" value={ownerNumber(data.totals.sessions)} />
            <StatTile label="Views" value={ownerNumber(data.totals.views)} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <DailyColumns
              title="Active users"
              points={data.daily.map((d) => ({ date: d.date, value: d.activeUsers }))}
            />
            <DailyColumns
              title="New users"
              points={data.daily.map((d) => ({ date: d.date, value: d.newUsers }))}
            />
            <DailyColumns
              title="Sessions"
              points={data.daily.map((d) => ({ date: d.date, value: d.sessions }))}
            />
            <DailyColumns
              title="Views"
              points={data.daily.map((d) => ({ date: d.date, value: d.views }))}
            />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <BarList
              title="Top pages (views)"
              rows={data.pages.map((p) => ({
                label: p.label,
                value: p.value,
                note: p.secondary !== undefined ? `${ownerNumber(p.secondary)} users` : undefined,
              }))}
            />
            <BarList title="Channels (sessions)" rows={data.channels} />
            <BarList title="Source / medium (sessions)" rows={data.sources} />
            <BarList title="Countries (active users)" rows={data.countries} />
            <BarList title="Devices (active users)" rows={data.devices} />
            <BarList title="Key events (count)" rows={data.events} />
          </div>
        </div>
      )}
    </section>
  );
}

function AppSection({ resource }: { resource: Resource<AppAnalytics> }) {
  const data = resource.data;
  return (
    <section className={ownerPanel} aria-labelledby="owner-app-analytics-title">
      <h2 id="owner-app-analytics-title" className="text-lg font-semibold">
        App records
      </h2>
      <p className="text-sm text-muted-foreground">
        From the app database, not Google. Practice time counts recorded active app time only.
      </p>
      <OwnerMessage error={resource.error} />
      {resource.loading && <p role="status">Loading app records…</p>}
      {data && (
        <div className="mt-3 space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label={`Sign-ups · ${data.range}d`}
              value={ownerNumber(data.signupTotal)}
              hint={`${ownerNumber(data.unconfirmedSignups)} not yet confirmed`}
            />
            <StatTile
              label="Active · 7d / 30d"
              value={`${ownerNumber(data.active7d)} / ${ownerNumber(data.active30d)}`}
            />
            <StatTile
              label={`Receipts · ${data.range}d`}
              value={ownerMoney(data.receiptsCents)}
              hint={`${ownerNumber(data.purchases)} Stripe payments · ${ownerMoney(data.outflowCents)} out`}
            />
            <StatTile
              label="Team seats · paid / assigned"
              value={`${ownerNumber(data.seats.paid)} / ${ownerNumber(data.seats.assigned)}`}
              hint={`${ownerNumber(data.seats.pilot)} pilot · ${ownerNumber(data.seats.enabled)} enabled`}
            />
          </div>
          {data.directoryTruncated && (
            <p className="text-xs text-muted-foreground">
              Sign-ups count the newest 5,000 accounts only.
            </p>
          )}
          <div className="grid gap-6 lg:grid-cols-2">
            <DailyColumns
              title="Sign-ups"
              points={data.signups.map((s) => ({ date: s.date, value: s.count }))}
            />
            <DailyColumns
              title="Receipts"
              format={ownerMoney}
              points={data.revenue.map((r) => ({ date: r.date, value: r.receiptsCents }))}
            />
          </div>
          <BarList
            title="Practice time by module"
            format={minutes}
            rows={data.modules.slice(0, 12).map((m) => ({
              label: m.module_id,
              value: m.active_seconds,
              note: `${ownerNumber(m.active_users)} learners`,
            }))}
            empty="No recorded practice in this period."
          />
        </div>
      )}
    </section>
  );
}
