export type ApiUsageRow = {
  provider: "anthropic" | "google_tts" | "elevenlabs_tts" | "elevenlabs_stt";
  request_status: "accepted" | "rejected" | "transport_error";
  calls: number;
  cost_ceiling_micro_usd: number | null;
};

export type ApiUsageSummary = { since: string; coverage: string; rows: ApiUsageRow[] };

export function apiUsageTotals(rows: ApiUsageRow[]) {
  return rows.reduce(
    (total, row) => ({
      calls: total.calls + Number(row.calls),
      accepted: total.accepted + (row.request_status === "accepted" ? Number(row.calls) : 0),
      costCeilingMicroUsd: total.costCeilingMicroUsd + Number(row.cost_ceiling_micro_usd ?? 0),
    }),
    { calls: 0, accepted: 0, costCeilingMicroUsd: 0 },
  );
}
