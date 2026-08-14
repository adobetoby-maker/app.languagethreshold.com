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

export async function authenticateSpeakingRequest(
  request: Request,
): Promise<SpeakingPrincipal | null> {
  const token = bearerToken(request);
  const url = supabaseUrl();
  const publishableKey = supabasePublishableKey();
  if (!token || !url || !publishableKey) return null;

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) return null;

  const user = (await response.json()) as { id?: unknown };
  if (typeof user.id !== "string" || !user.id) return null;
  return { userId: user.id };
}

function trustedClientIp(request: Request) {
  const forwarded =
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip");
  const first = forwarded?.split(",")[0]?.trim();
  return first && first.length <= 128 ? first : null;
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

async function consumeSpeakingBudget(namespace: string, value: string, limit: number) {
  const url = supabaseUrl();
  const key = supabaseServiceRoleKey();
  if (!url || !key) throw new Error("Speaking budget storage is unavailable.");
  const bucketHash = await speakingBucketHash(namespace, value);
  const response = await fetch(`${url}/rest/v1/rpc/consume_speaking_request`, {
    method: "POST",
    headers: serviceRoleHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      p_bucket_hash: bucketHash,
      p_request_limit: limit,
      p_window_seconds: 60,
    }),
  });
  if (!response.ok) throw new Error("Speaking budget storage rejected the request.");
  return (await response.json()) === true;
}

export async function enforceSpeakingPreAuthRateLimit(
  request: Request,
): Promise<SpeakingLimitResult> {
  const ip = trustedClientIp(request);
  if (!ip) return { allowed: false, misconfigured: true };
  const allowed = await consumeSpeakingBudget("ip", ip, IP_REQUESTS_PER_MINUTE);
  return { allowed, misconfigured: false };
}

export async function enforceSpeakingRateLimit(
  userId: string,
  purpose = "ai",
  limit = USER_REQUESTS_PER_MINUTE,
): Promise<SpeakingLimitResult> {
  const allowed = await consumeSpeakingBudget(`user:${purpose}`, userId, limit);
  return { allowed, misconfigured: false };
}

export async function hasSpeakingAgeAttestation(userId: string) {
  const url = supabaseUrl();
  const key = supabaseServiceRoleKey();
  if (!url || !key) throw new Error("Speaking consent storage is unavailable.");
  const response = await fetch(
    `${url}/rest/v1/speaking_age_attestations?select=attested_at&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
    { headers: serviceRoleHeaders() },
  );
  if (!response.ok) throw new Error("Speaking consent storage rejected the request.");
  const rows = (await response.json()) as Array<{ attested_at?: unknown }>;
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
