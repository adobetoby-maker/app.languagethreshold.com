import { speakingTestPrincipal, isSpeakingTestActor } from "./speaking-test-access";
import { isIP } from "node:net";
import { readPrivateServiceJson } from "./private-service-json.ts";

export interface SpeakingPrincipal {
  userId: string;
}

export interface SpeakingLimitResult {
  allowed: boolean;
  misconfigured: boolean;
}

const USER_REQUESTS_PER_MINUTE = 12;
const IP_REQUESTS_PER_MINUTE = 40;

export function isStrictSameOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  return Boolean(origin) && origin === new URL(request.url).origin;
}

export function bearerToken(request: Request) {
  const value = request.headers.get("Authorization") ?? "";
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function isSpeakingMissionLanguageEnabled(
  language: string,
  environment: Record<string, string | undefined> = process.env,
) {
  return language !== "Japanese" || environment.JAPANESE_SPEAKING_REVIEWED === "true";
}

function supabaseUrl() {
  return (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
}

function supabasePublishableKey() {
  return process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
}

function supabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function serviceRoleHeaders(extra?: HeadersInit) {
  const key = supabaseServiceRoleKey();
  return new Headers({
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...Object.fromEntries(new Headers(extra).entries()),
  });
}

function requireSpeakingSignal(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Speaking request cancelled", "AbortError");
}

function requireSpeakingResponse(response: Response, signal?: AbortSignal) {
  if (signal && (signal.aborted || !response.ok)) {
    void response.body?.cancel().catch(() => {});
    requireSpeakingSignal(signal);
  }
}

export async function authenticateSpeakingRequest(
  request: Request,
  signal?: AbortSignal,
): Promise<SpeakingPrincipal | null> {
  requireSpeakingSignal(signal);
  const preview = speakingTestPrincipal(request);
  if (preview && !request.headers.has("authorization")) return preview;
  const token = bearerToken(request);
  const url = supabaseUrl();
  const publishableKey = supabasePublishableKey();
  if (!token || !url || !publishableKey) return null;

  const response = await fetch(`${url}/auth/v1/user`, {
    ...(signal ? { signal, cache: "no-store" as const } : {}),
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${token}`,
    },
  });
  requireSpeakingResponse(response, signal);
  if (!response.ok) return null;

  const user = (
    signal ? await readPrivateServiceJson(response, 256 * 1024, signal) : await response.json()
  ) as { id?: unknown };
  requireSpeakingSignal(signal);
  if (typeof user.id !== "string" || !user.id) return null;
  return { userId: user.id };
}

function trustedClientIp(request: Request) {
  // Vercel supplies this canonical header. Caller forwarding fallbacks cannot select buckets.
  const first = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (first && isIP(first)) return first;
  const host = new URL(request.url).hostname;
  return process.env.NODE_ENV === "development" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(host)
    ? "local-development"
    : null;
}

async function speakingBucketHash(namespace: string, value: string) {
  const secret = supabaseServiceRoleKey();
  if (!secret) throw new Error("Speaking budget secret is unavailable.");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`language-threshold:speaking:v1:${namespace}:${value}`),
  );
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

/** Shared server-only counter; namespaced hashes keep independent feature budgets separate. */
export async function consumeServerRequestBudget(
  namespace: string,
  value: string,
  limit: number,
  windowSeconds = 60,
  signal?: AbortSignal,
) {
  requireSpeakingSignal(signal);
  const url = supabaseUrl();
  const key = supabaseServiceRoleKey();
  if (!url || !key) throw new Error("Speaking budget storage is unavailable.");
  const bucketHash = await speakingBucketHash(namespace, value);
  requireSpeakingSignal(signal);
  const transportSignal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(8000)])
    : AbortSignal.timeout(8000);
  const response = await fetch(`${url}/rest/v1/rpc/consume_speaking_request`, {
    method: "POST",
    headers: serviceRoleHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      p_bucket_hash: bucketHash,
      p_request_limit: limit,
      p_window_seconds: windowSeconds,
    }),
    signal: transportSignal,
    cache: "no-store",
  });
  requireSpeakingResponse(response, signal);
  if (!response.ok) throw new Error("Speaking budget storage rejected the request.");
  const allowed =
    (signal
      ? await readPrivateServiceJson(response, 1024, transportSignal)
      : await response.json()) === true;
  requireSpeakingSignal(signal);
  return allowed;
}

export async function enforceSpeakingPreAuthRateLimit(
  request: Request,
  signal?: AbortSignal,
): Promise<SpeakingLimitResult> {
  const ip = trustedClientIp(request);
  if (!ip) return { allowed: false, misconfigured: true };
  const allowed = await consumeServerRequestBudget("ip", ip, IP_REQUESTS_PER_MINUTE, 60, signal);
  return { allowed, misconfigured: false };
}

export async function enforceSpeakingRateLimit(
  userId: string,
  purpose = "ai",
  limit = USER_REQUESTS_PER_MINUTE,
  signal?: AbortSignal,
): Promise<SpeakingLimitResult> {
  if (isSpeakingTestActor(userId)) {
    const guestBudget = await consumeServerRequestBudget(
      "speaking-test:hour",
      purpose,
      200,
      3600,
      signal,
    );
    if (!guestBudget) return { allowed: false, misconfigured: false };
  }
  const allowed = await consumeServerRequestBudget(`user:${purpose}`, userId, limit, 60, signal);
  return { allowed, misconfigured: false };
}

export async function hasSpeakingAgeAttestation(userId: string, signal?: AbortSignal) {
  if (isSpeakingTestActor(userId)) return true;
  requireSpeakingSignal(signal);
  const url = supabaseUrl();
  const key = supabaseServiceRoleKey();
  if (!url || !key) throw new Error("Speaking consent storage is unavailable.");
  const response = await fetch(
    `${url}/rest/v1/speaking_age_attestations?select=attested_at&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
    { headers: serviceRoleHeaders(), ...(signal ? { signal, cache: "no-store" as const } : {}) },
  );
  requireSpeakingResponse(response, signal);
  if (!response.ok) throw new Error("Speaking consent storage rejected the request.");
  const rows = (
    signal ? await readPrivateServiceJson(response, 16 * 1024, signal) : await response.json()
  ) as Array<{ attested_at?: unknown }>;
  requireSpeakingSignal(signal);
  const timestamp = rows[0]?.attested_at;
  return typeof timestamp === "string" && Number.isFinite(Date.parse(timestamp));
}

export async function setSpeakingAgeAttestation(userId: string, attested: boolean) {
  const url = supabaseUrl();
  const key = supabaseServiceRoleKey();
  if (!url || !key) throw new Error("Speaking consent storage is unavailable.");
  const endpoint = `${url}/rest/v1/speaking_age_attestations?user_id=eq.${encodeURIComponent(userId)}`;
  const response = attested
    ? await fetch(`${url}/rest/v1/speaking_age_attestations?on_conflict=user_id`, {
        method: "POST",
        headers: serviceRoleHeaders({
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        }),
        body: JSON.stringify({
          user_id: userId,
          attested_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      })
    : await fetch(endpoint, { method: "DELETE", headers: serviceRoleHeaders() });
  if (!response.ok) throw new Error("Speaking consent storage rejected the request.");
}
