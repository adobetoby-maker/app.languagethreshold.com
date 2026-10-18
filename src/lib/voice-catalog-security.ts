import { isIP } from "node:net";
import { consumeServerRequestBudget } from "./speaking-security.ts";

// Public voice metadata needs no account. Only cold provider lookups consume this pool.
// People on a shared connection share its IP allowance; cached responses consume none.
export const VOICE_CATALOG_LIMITS = { minute: 20, ipHour: 120, globalHour: 600 } as const;
export interface VoiceCatalogDenial {
  status: 403 | 429 | 503;
  retryAfter?: number;
}
export function voiceCatalogOriginDenied(request: Request) {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  return Boolean(
    (origin && origin !== new URL(request.url).origin) ||
    (site && site !== "same-origin" && site !== "none"),
  );
}
export async function checkVoiceCatalogBudget(
  request: Request,
  signal: AbortSignal,
): Promise<VoiceCatalogDenial | null> {
  signal.throwIfAborted();
  if (voiceCatalogOriginDenied(request)) return { status: 403 };
  const forwarded = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  const host = new URL(request.url).hostname;
  const local =
    process.env.NODE_ENV === "development" && ["localhost", "127.0.0.1", "[::1]"].includes(host);
  const ip = forwarded && isIP(forwarded) ? forwarded : local ? "local-development" : null;
  if (!ip) return { status: 503, retryAfter: 60 };
  const stage =
    process.env.VERCEL_ENV === "production"
      ? "production"
      : process.env.VERCEL_ENV === "preview"
        ? "preview"
        : "development";
  const prefix = `google-voice-catalog:v1:${stage}`;
  try {
    for (const [suffix, value, limit, window] of [
      ["ip-minute", ip, VOICE_CATALOG_LIMITS.minute, 60],
      ["ip-hour", ip, VOICE_CATALOG_LIMITS.ipHour, 3600],
      ["all-hour", "all", VOICE_CATALOG_LIMITS.globalHour, 3600],
    ] as const) {
      const allowed = await consumeServerRequestBudget(
        `${prefix}:${suffix}`,
        value,
        limit,
        window,
        signal,
      );
      signal.throwIfAborted();
      if (!allowed) return { status: 429, retryAfter: window };
    }
    return null;
  } catch {
    return { status: 503, retryAfter: 60 };
  }
}
