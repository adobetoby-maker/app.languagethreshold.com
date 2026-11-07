import { apiUsageTotals, type ApiUsageSummary } from "@/lib/api-usage";
import { useOwnerResource } from "@/components/owner/use-owner-resource";

const names: Record<string, string> = {
  anthropic: "AI text",
  google_tts: "Google speech",
  elevenlabs_tts: "ElevenLabs speech",
  elevenlabs_stt: "Speech recognition",
};

export function ApiUsageCard({ owner = false }: { owner?: boolean }) {
  const resource = useOwnerResource<ApiUsageSummary>(
    owner ? "/api/owner-api-usage" : "/api/api-usage",
  );
  if (!resource.allowed) return null;
  const totals = apiUsageTotals(resource.data?.rows ?? []);
  return (
    <section className="mb-4 rounded-2xl border border-border bg-card p-5" aria-label="API usage">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          {owner ? "Site API usage" : "Your API usage"} · last 30 days
        </h2>
        <button
          type="button"
          onClick={resource.refresh}
          className="text-xs text-gold underline underline-offset-2"
        >
          Refresh
        </button>
      </div>
      {resource.loading ? <p className="mt-3 text-sm">Loading usage…</p> : null}
      {resource.error ? (
        <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">
          Usage is unavailable right now.
        </p>
      ) : null}
      {resource.data ? (
        <>
          <p className="mt-3 text-2xl font-semibold text-foreground">
            {totals.accepted.toLocaleString()} successful provider calls
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {totals.calls.toLocaleString()} attempts recorded. {resource.data.coverage}
          </p>
          {owner && totals.costCeilingMicroUsd > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              Reserved cost ceiling: ${(totals.costCeilingMicroUsd / 1_000_000).toFixed(2)}. This is
              an upper estimate, not actual provider billing.
            </p>
          )}
          {resource.data.rows.length > 0 ? (
            <ul className="mt-3 grid gap-1 text-sm text-foreground">
              {resource.data.rows.map((row) => (
                <li key={`${row.provider}-${row.request_status}`}>
                  {names[row.provider] ?? row.provider}: {Number(row.calls).toLocaleString()}{" "}
                  {row.request_status}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No provider calls recorded yet.</p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            This counts app provider requests, not device voices or offline lessons. Cost ceilings
            are reserved estimates, not provider charges or a customer bill.
          </p>
        </>
      ) : null}
    </section>
  );
}
