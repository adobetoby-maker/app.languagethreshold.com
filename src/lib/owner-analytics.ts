// Client-safe shapes and constants for the owner Analytics tab. No secrets, no network code.
export const ANALYTICS_RANGES = [7, 30, 90] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];
export function analyticsRange(value: unknown): AnalyticsRange {
  const n = Number(value);
  return (ANALYTICS_RANGES as readonly number[]).includes(n) ? (n as AnalyticsRange) : 30;
}

export const GA_DEFAULT_HOSTNAME = "app.languagethreshold.com";
export const GA_KEY_EVENTS = [
  "sign_up",
  "begin_checkout",
  "purchase",
  "lesson_mastered",
  "team_seat_assigned",
] as const;

/** Shown when GA_PROPERTY_ID / GA_SERVICE_ACCOUNT_JSON are missing or unreadable. */
export const GA_SETUP_STEPS = [
  'In Google Cloud project "My First Project" (project-91661021-fb2d-4524-b9f), enable the "Google Analytics Data API".',
  'Use the service account workerbee@project-91661021-fb2d-4524-b9f.iam.gserviceaccount.com (or create "lt-analytics-reader") and create a JSON key. Keep the key private.',
  "In Google Analytics, open Admin → Property access management and add the service account email as Viewer on property 538705307.",
  "In Vercel → language-threshold-app → Settings → Environment Variables (Production), set GA_PROPERTY_ID=538705307 and GA_SERVICE_ACCOUNT_JSON to the JSON key contents (raw or base64). Optional: GA_HOSTNAME (default app.languagethreshold.com).",
  "Redeploy, then open this tab again.",
] as const;

export type GaPoint = {
  date: string;
  activeUsers: number;
  newUsers: number;
  sessions: number;
  views: number;
};
export type GaBreakdown = { label: string; value: number; secondary?: number };
export type GaAnalytics = {
  hostname: string;
  range: AnalyticsRange;
  fetchedAt: string;
  totals: Omit<GaPoint, "date">;
  daily: GaPoint[];
  pages: GaBreakdown[];
  channels: GaBreakdown[];
  sources: GaBreakdown[];
  countries: GaBreakdown[];
  devices: GaBreakdown[];
  events: GaBreakdown[];
  realtimeActiveUsers: number | null;
};
export type GaResponse =
  | { configured: false; missing: string[]; invalid: string[]; setup: readonly string[] }
  | { configured: true; error: string; hostname: string }
  | ({ configured: true; error?: undefined } & GaAnalytics);

export type AppAnalytics = {
  range: AnalyticsRange;
  signups: { date: string; count: number }[];
  signupTotal: number;
  unconfirmedSignups: number;
  directoryTruncated: boolean;
  active7d: number;
  active30d: number;
  totalAccounts: number;
  modules: { module_id: string; active_seconds: number; active_users: number }[];
  revenue: { date: string; receiptsCents: number; outflowCents: number; purchases: number }[];
  receiptsCents: number;
  outflowCents: number;
  purchases: number;
  seats: { paid: number; pilot: number; enabled: number; assigned: number };
};

/** Every calendar day (UTC, YYYY-MM-DD) ending at `today`, oldest first. */
export function dayKeys(range: number, today: Date = new Date()): string[] {
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Array.from({ length: range }, (_, i) =>
    new Date(end - (range - 1 - i) * 86400000).toISOString().slice(0, 10),
  );
}
