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

export async function checkLearningGenerationBudget(
  request: Request,
): Promise<LearningGenerationDenial | null> {
  if (!isStrictSameOrigin(request)) {
    return { status: 403, error: "Open the app to create new practice content." };
  }
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
  const prefix = `learning-generation:v1:${stage}`;
  try {
    const minute = await consumeServerRequestBudget(
      `${prefix}:ip-minute`,
      ip,
      LEARNING_GENERATION_LIMITS.minute,
    );
    if (!minute)
      return {
        status: 429,
        error:
          "Too many new content requests. Wait a minute, then try again. Saved lessons still work.",
        retryAfter: 60,
      };
    const hour = await consumeServerRequestBudget(
      `${prefix}:ip-hour`,
      ip,
      LEARNING_GENERATION_LIMITS.ipHour,
      3600,
    );
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
      LEARNING_GENERATION_LIMITS.globalHour,
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
