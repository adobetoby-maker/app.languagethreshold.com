// Server-only: Google Analytics 4 Data API helpers (service-account JWT, report bodies, mapping).
// Pure functions only; network calls live in ga-data-server.ts. Secrets never leave this module.
import { createSign } from "node:crypto";
import {
  dayKeys,
  GA_DEFAULT_HOSTNAME,
  GA_KEY_EVENTS,
  type AnalyticsRange,
  type GaAnalytics,
  type GaBreakdown,
  type GaPoint,
} from "./owner-analytics";

export const GA_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
// The token audience is fixed. A token_uri inside the key file is ignored so a key cannot
// redirect the signed assertion elsewhere.
export const GA_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GA_DATA_URL = "https://analyticsdata.googleapis.com/v1beta";

export type GaServiceAccount = { clientEmail: string; privateKey: string };
export type GaConfig =
  | { configured: true; propertyId: string; hostname: string; account: GaServiceAccount }
  | { configured: false; missing: string[]; invalid: string[] };

function parseAccountJson(raw: string): GaServiceAccount | null {
  const text = raw.trim();
  const candidates = [text];
  if (!text.startsWith("{")) {
    try {
      candidates.push(Buffer.from(text, "base64").toString("utf8").trim());
    } catch {
      /* not base64 */
    }
  }
  for (const candidate of candidates) {
    try {
      const value = JSON.parse(candidate) as Record<string, unknown>;
      const clientEmail = typeof value.client_email === "string" ? value.client_email.trim() : "";
      const privateKey =
        typeof value.private_key === "string" ? value.private_key.replace(/\\n/g, "\n") : "";
      if (
        /^[^@\s]+@[^@\s]+$/.test(clientEmail) &&
        /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(privateKey)
      )
        return { clientEmail, privateKey };
    } catch {
      /* try next */
    }
  }
  return null;
}

/** Reads GA_PROPERTY_ID, GA_SERVICE_ACCOUNT_JSON (raw or base64) and GA_HOSTNAME. Never throws. */
export function readGaConfig(env: Record<string, string | undefined> = process.env): GaConfig {
  const missing: string[] = [];
  const invalid: string[] = [];
  const rawProperty = env.GA_PROPERTY_ID?.trim() ?? "";
  const propertyId = rawProperty.replace(/^properties\//, "");
  if (!rawProperty) missing.push("GA_PROPERTY_ID");
  else if (!/^\d{1,20}$/.test(propertyId)) invalid.push("GA_PROPERTY_ID");
  const rawAccount = env.GA_SERVICE_ACCOUNT_JSON?.trim() ?? "";
  const account = rawAccount ? parseAccountJson(rawAccount) : null;
  if (!rawAccount) missing.push("GA_SERVICE_ACCOUNT_JSON");
  else if (!account) invalid.push("GA_SERVICE_ACCOUNT_JSON");
  const hostname = (env.GA_HOSTNAME?.trim() || GA_DEFAULT_HOSTNAME).toLowerCase();
  if (!/^[a-z0-9.-]{1,253}$/.test(hostname)) invalid.push("GA_HOSTNAME");
  if (missing.length || invalid.length || !account) return { configured: false, missing, invalid };
  return { configured: true, propertyId, hostname, account };
}

export const base64url = (input: Buffer | string) =>
  (typeof input === "string" ? Buffer.from(input) : input).toString("base64url");

export type GaJwtClaims = { iss: string; scope: string; aud: string; iat: number; exp: number };
export function gaJwtClaims(clientEmail: string, nowSeconds: number): GaJwtClaims {
  const iat = Math.floor(nowSeconds);
  return { iss: clientEmail, scope: GA_SCOPE, aud: GA_TOKEN_URL, iat, exp: iat + 3600 };
}

/** RS256 compact JWT signed with node:crypto. */
export function signGaJwt(claims: GaJwtClaims, privateKey: string): string {
  const unsigned = `${base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64url(JSON.stringify(claims))}`;
  const signature = createSign("RSA-SHA256").update(unsigned).end().sign(privateKey);
  return `${unsigned}.${base64url(signature)}`;
}

export function gaTokenRequestBody(assertion: string) {
  return new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  }).toString();
}

export const GA_REPORTS = [
  "totals",
  "daily",
  "pages",
  "channels",
  "sources",
  "countries",
  "devices",
  "events",
] as const;
export type GaReportName = (typeof GA_REPORTS)[number];

type Filter = Record<string, unknown>;
export function gaHostFilter(hostname: string): Filter {
  return {
    filter: {
      fieldName: "hostName",
      stringFilter: { matchType: "EXACT", value: hostname, caseSensitive: false },
    },
  };
}
const TRAFFIC = ["activeUsers", "newUsers", "sessions", "screenPageViews"];
const metrics = (names: string[]) => names.map((name) => ({ name }));
const dims = (names: string[]) => names.map((name) => ({ name }));
const byMetric = (name: string) => [{ metric: { metricName: name }, desc: true }];

/** runReport bodies. Every report is restricted to the configured hostname. */
export function gaReportBody(name: GaReportName, range: AnalyticsRange, hostname: string) {
  const base = {
    dateRanges: [{ startDate: `${range - 1}daysAgo`, endDate: "today" }],
    dimensionFilter: gaHostFilter(hostname),
  };
  switch (name) {
    case "totals":
      return { ...base, metrics: metrics(TRAFFIC) };
    case "daily":
      return {
        ...base,
        dimensions: dims(["date"]),
        metrics: metrics(TRAFFIC),
        orderBys: [{ dimension: { dimensionName: "date" } }],
        limit: 120,
      };
    case "pages":
      return {
        ...base,
        dimensions: dims(["pagePath"]),
        metrics: metrics(["screenPageViews", "activeUsers"]),
        orderBys: byMetric("screenPageViews"),
        limit: 10,
      };
    case "channels":
      return {
        ...base,
        dimensions: dims(["sessionDefaultChannelGroup"]),
        metrics: metrics(["sessions"]),
        orderBys: byMetric("sessions"),
        limit: 10,
      };
    case "sources":
      return {
        ...base,
        dimensions: dims(["sessionSourceMedium"]),
        metrics: metrics(["sessions"]),
        orderBys: byMetric("sessions"),
        limit: 10,
      };
    case "countries":
      return {
        ...base,
        dimensions: dims(["country"]),
        metrics: metrics(["activeUsers"]),
        orderBys: byMetric("activeUsers"),
        limit: 10,
      };
    case "devices":
      return {
        ...base,
        dimensions: dims(["deviceCategory"]),
        metrics: metrics(["activeUsers"]),
        orderBys: byMetric("activeUsers"),
        limit: 6,
      };
    case "events":
      return {
        ...base,
        dimensionFilter: {
          andGroup: {
            expressions: [
              gaHostFilter(hostname),
              {
                filter: {
                  fieldName: "eventName",
                  inListFilter: { values: [...GA_KEY_EVENTS], caseSensitive: true },
                },
              },
            ],
          },
        },
        dimensions: dims(["eventName"]),
        metrics: metrics(["eventCount"]),
        limit: 20,
      };
  }
}
/** The Realtime API has no hostName dimension, so this figure covers the whole property. */
export function gaRealtimeBody() {
  return { metrics: metrics(["activeUsers"]) };
}

type GaRaw = {
  rows?: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[];
};
export type GaRow = { dimensions: string[]; metrics: number[] };
export function gaRows(response: unknown): GaRow[] {
  const rows = (response as GaRaw | null)?.rows;
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    dimensions: (row.dimensionValues ?? []).map((d) => String(d?.value ?? "")),
    metrics: (row.metricValues ?? []).map((m) => {
      const n = Number(m?.value ?? 0);
      return Number.isFinite(n) ? n : 0;
    }),
  }));
}
const gaDate = (value: string) =>
  /^\d{8}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : value;

const breakdown = (response: unknown, label = (v: string) => v): GaBreakdown[] =>
  gaRows(response).map((row) => ({
    label: label(row.dimensions[0] || "(not set)"),
    value: row.metrics[0] ?? 0,
    ...(row.metrics.length > 1 ? { secondary: row.metrics[1] } : {}),
  }));

/** Maps raw runReport responses to the dashboard shape; daily gaps are filled with zeros. */
export function mapGaReports(
  raw: Partial<Record<GaReportName, unknown>>,
  input: {
    range: AnalyticsRange;
    hostname: string;
    realtime: unknown;
    fetchedAt: string;
    today?: Date;
  },
): GaAnalytics {
  const total = gaRows(raw.totals)[0]?.metrics ?? [];
  const byDate = new Map<string, GaPoint>();
  for (const key of dayKeys(input.range, input.today))
    byDate.set(key, { date: key, activeUsers: 0, newUsers: 0, sessions: 0, views: 0 });
  for (const row of gaRows(raw.daily)) {
    const date = gaDate(row.dimensions[0] ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const [activeUsers = 0, newUsers = 0, sessions = 0, views = 0] = row.metrics;
    byDate.set(date, { date, activeUsers, newUsers, sessions, views });
  }
  const counts = new Map(breakdown(raw.events).map((e) => [e.label, e.value]));
  const realtimeRows = gaRows(input.realtime);
  return {
    hostname: input.hostname,
    range: input.range,
    fetchedAt: input.fetchedAt,
    totals: {
      activeUsers: total[0] ?? 0,
      newUsers: total[1] ?? 0,
      sessions: total[2] ?? 0,
      views: total[3] ?? 0,
    },
    daily: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
    pages: breakdown(raw.pages),
    channels: breakdown(raw.channels),
    sources: breakdown(raw.sources),
    countries: breakdown(raw.countries),
    devices: breakdown(raw.devices, (v) => v.charAt(0).toUpperCase() + v.slice(1)),
    events: GA_KEY_EVENTS.map((name) => ({ label: name, value: counts.get(name) ?? 0 })),
    realtimeActiveUsers: input.realtime == null ? null : (realtimeRows[0]?.metrics[0] ?? 0),
  };
}

/** Fixed guidance for Google failures; raw provider messages are never shown. */
export function gaErrorMessage(status: number, body: unknown): string {
  const error = (body as { error?: unknown } | null)?.error;
  const code =
    typeof error === "string"
      ? error
      : typeof (error as { status?: unknown })?.status === "string"
        ? String((error as { status: string }).status)
        : "";
  const text = JSON.stringify(body ?? "").toLowerCase();
  if (
    code === "invalid_grant" ||
    code === "invalid_client" ||
    code === "UNAUTHENTICATED" ||
    status === 401
  )
    return "Google rejected the service account key. Create a new JSON key and update GA_SERVICE_ACCOUNT_JSON.";
  if (text.includes("service_disabled") || text.includes("has not been used"))
    return 'Enable the "Google Analytics Data API" in the Google Cloud project, wait a few minutes, then refresh.';
  if (code === "PERMISSION_DENIED" || status === 403)
    return "The service account needs Viewer access on the GA4 property (Admin → Property access management).";
  if (code === "NOT_FOUND" || status === 404)
    return "GA_PROPERTY_ID does not match a GA4 property this service account can read.";
  if (code === "RESOURCE_EXHAUSTED" || status === 429)
    return "Google Analytics quota is used up for now. Try again later.";
  if (code === "INVALID_ARGUMENT" || status === 400)
    return "Google Analytics rejected the report request.";
  return "Google Analytics could not be reached. Try again later.";
}
