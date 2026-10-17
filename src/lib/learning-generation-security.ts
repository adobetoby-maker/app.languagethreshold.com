import { isIP } from "node:net";
import { consumeServerRequestBudget, isStrictSameOrigin } from "./speaking-security.ts";

export interface LearningGenerationDenial {
  status: 403 | 429 | 503;
  error: string;
  retryAfter?: number;
}

// Shared by lesson words, field decks and optional culture readings, across server instances.
// A team on one connection shares the IP allowance. Authored/downloaded content uses none.
export const LEARNING_GENERATION_LIMITS = { minute: 8, ipHour: 120, globalHour: 600 } as const;
// Short image checks are a repeated learning action; they must not consume the
// slower lesson/deck creation pool. Shared connections still have a bounded allowance.
export const HANDWRITING_CHECK_LIMITS = { minute: 30, ipHour: 600, globalHour: 1200 } as const;
export const CONVERSATION_LIMITS = { minute: 30, ipHour: 300, globalHour: 600 } as const;
export const WORD_LOOKUP_LIMITS = { minute: 40, ipHour: 600, globalHour: 1200 } as const;
export type LearningGenerationPurpose = "content" | "handwriting" | "conversation" | "lookup";
export function learningGenerationOriginError(request: Request): LearningGenerationDenial | null {
  return isStrictSameOrigin(request)
    ? null
    : { status: 403, error: "Open the app to create new practice content." };
}

export async function checkLearningGenerationBudget(
  request: Request,
  purpose: LearningGenerationPurpose = "content",
): Promise<LearningGenerationDenial | null> {
  const originError = learningGenerationOriginError(request);
  if (originError) return originError;
  // Only use the platform's canonical IP header; caller-provided forwarding fallbacks
  // must not let a client choose a fresh budget. Loopback development has one shared bucket.
  const forwarded = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  const host = new URL(request.url).hostname;
  const local =
    process.env.NODE_ENV === "development" && ["localhost", "127.0.0.1", "[::1]"].includes(host);
  const ip = forwarded && isIP(forwarded) ? forwarded : local ? "local-development" : null;
  if (!ip)
    return {
      status: 503,
      error: "New practice content is temporarily unavailable. Saved lessons still work.",
      retryAfter: 60,
    };

  const stage =
    process.env.VERCEL_ENV === "production"
      ? "production"
      : process.env.VERCEL_ENV === "preview"
        ? "preview"
        : "development";
  const prefix = `learning-generation:v1:${stage}${purpose === "content" ? "" : `:${purpose}`}`;
  const limits =
    purpose === "lookup"
      ? WORD_LOOKUP_LIMITS
      : purpose === "handwriting"
        ? HANDWRITING_CHECK_LIMITS
        : purpose === "conversation"
          ? CONVERSATION_LIMITS
          : LEARNING_GENERATION_LIMITS;
  try {
    const minute = await consumeServerRequestBudget(`${prefix}:ip-minute`, ip, limits.minute);
    if (!minute)
      return {
        status: 429,
        error:
          "Too many new content requests. Wait a minute, then try again. Saved lessons still work.",
        retryAfter: 60,
      };
    const hour = await consumeServerRequestBudget(`${prefix}:ip-hour`, ip, limits.ipHour, 3600);
    if (!hour)
      return {
        status: 429,
        error:
          "This connection has reached its hourly content limit. Try again next hour or use saved lessons.",
        retryAfter: 3600,
      };
    const global = await consumeServerRequestBudget(
      `${prefix}:all-hour`,
      "all",
      limits.globalHour,
      3600,
    );
    if (!global)
      return {
        status: 429,
        error: "New content is busy for this hour. Try again next hour or use saved lessons.",
        retryAfter: 3600,
      };
    return null;
  } catch {
    // No model call is allowed when the durable budget store is unavailable.
    return {
      status: 503,
      error: "New practice content is temporarily unavailable. Saved lessons still work.",
      retryAfter: 60,
    };
  }
}
