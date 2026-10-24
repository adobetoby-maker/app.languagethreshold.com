// Server-only: GA4 Data API calls with a service account. Tokens and reports are cached in memory.
import {
  GA_DATA_URL,
  GA_REPORTS,
  GA_TOKEN_URL,
  gaErrorMessage,
  gaJwtClaims,
  gaRealtimeBody,
  gaReportBody,
  gaTokenRequestBody,
  mapGaReports,
  signGaJwt,
  type GaConfig,
  type GaReportName,
} from "./ga-data";
import type { AnalyticsRange, GaAnalytics } from "./owner-analytics";

export const GA_REPORT_CACHE_MS = 10 * 60 * 1000;
// Realtime is "users in the last 30 minutes"; a ten-minute cache would make it misleading.
export const GA_REALTIME_CACHE_MS = 60 * 1000;
const MAX_GA_RESPONSE_BYTES = 1024 * 1024;

export class GaRequestError extends Error {}

type Entry = { expires: number; at: number; value: unknown };
const reportCache = new Map<string, Entry>();
let tokenCache: { key: string; token: string; expires: number } | null = null;

/** Test hook: forget cached tokens and reports. */
export function resetGaCache() {
  reportCache.clear();
  tokenCache = null;
}

type Deps = { fetcher?: typeof fetch; now?: () => number };

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length > MAX_GA_RESPONSE_BYTES)
    throw new GaRequestError("Google Analytics response too large.");
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

async function post(fetcher: typeof fetch, url: string, init: RequestInit) {
  try {
    return await fetcher(url, {
      ...init,
      method: "POST",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new GaRequestError("Google Analytics could not be reached. Try again later.");
  }
}

export async function gaAccessToken(
  config: Extract<GaConfig, { configured: true }>,
  { fetcher = fetch, now = Date.now }: Deps = {},
): Promise<string> {
  const key = config.account.clientEmail;
  if (tokenCache && tokenCache.key === key && tokenCache.expires > now()) return tokenCache.token;
  const assertion = signGaJwt(
    gaJwtClaims(config.account.clientEmail, now() / 1000),
    config.account.privateKey,
  );
  const response = await post(fetcher, GA_TOKEN_URL, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: gaTokenRequestBody(assertion),
  });
  const body = (await readJson(response)) as {
    access_token?: unknown;
    expires_in?: unknown;
  } | null;
  if (!response.ok || typeof body?.access_token !== "string")
    throw new GaRequestError(gaErrorMessage(response.status, body));
  const lifetime = typeof body.expires_in === "number" ? body.expires_in : 3600;
  tokenCache = {
    key,
    token: body.access_token,
    expires: now() + Math.max(60, lifetime - 60) * 1000,
  };
  return body.access_token;
}

async function cached(key: string, ttl: number, now: () => number, load: () => Promise<unknown>) {
  const hit = reportCache.get(key);
  if (hit && hit.expires > now()) return hit;
  const value = await load();
  const entry = { value, at: now(), expires: now() + ttl };
  reportCache.set(key, entry);
  return entry;
}

async function callGa(fetcher: typeof fetch, token: string, url: string, body: unknown) {
  const response = await post(fetcher, url, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await readJson(response);
  if (!response.ok) throw new GaRequestError(gaErrorMessage(response.status, json));
  return json;
}

/** Runs every owner report (10-minute cache per report and range) plus realtime (1 minute). */
export async function loadGaAnalytics(
  config: Extract<GaConfig, { configured: true }>,
  range: AnalyticsRange,
  deps: Deps = {},
): Promise<GaAnalytics> {
  const fetcher = deps.fetcher ?? fetch;
  const now = deps.now ?? Date.now;
  const scope = `${config.propertyId}|${config.hostname}`;
  // One exchange per load even though the reports run in parallel.
  let token: Promise<string> | null = null;
  const getToken = () => (token ??= gaAccessToken(config, { fetcher, now }));
  const base = `${GA_DATA_URL}/properties/${encodeURIComponent(config.propertyId)}`;
  const raw: Partial<Record<GaReportName, unknown>> = {};
  let oldest = now();
  await Promise.all(
    GA_REPORTS.map(async (name) => {
      const entry = await cached(`${scope}|${name}|${range}`, GA_REPORT_CACHE_MS, now, async () =>
        callGa(
          fetcher,
          await getToken(),
          `${base}:runReport`,
          gaReportBody(name, range, config.hostname),
        ),
      );
      raw[name] = entry.value;
      oldest = Math.min(oldest, entry.at);
    }),
  );
  let realtime: unknown = null;
  try {
    realtime = (
      await cached(`${scope}|realtime`, GA_REALTIME_CACHE_MS, now, async () =>
        callGa(fetcher, await getToken(), `${base}:runRealtimeReport`, gaRealtimeBody()),
      )
    ).value;
  } catch {
    realtime = null; // Realtime is optional; the period reports are still useful without it.
  }
  return mapGaReports(raw, {
    range,
    hostname: config.hostname,
    realtime,
    fetchedAt: new Date(oldest).toISOString(),
    today: new Date(now()),
  });
}
