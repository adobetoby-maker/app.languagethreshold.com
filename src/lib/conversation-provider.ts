// A conversation turn makes one provider attempt. The deadline also covers stream reads.
export const CONVERSATION_PROVIDER_TIMEOUT_MS = 45_000;
export function conversationProviderOptions(apiKey: string) {
  return { apiKey, timeout: CONVERSATION_PROVIDER_TIMEOUT_MS, maxRetries: 0 };
}
export function conversationCallOptions(request: Request) {
  return {
    signal: AbortSignal.any([
      request.signal,
      AbortSignal.timeout(CONVERSATION_PROVIDER_TIMEOUT_MS),
    ]),
  };
}

/** Conversation results remain private at the browser and CDN, including soft failures. */
export function conversationResponseHeaders(contentType: "application/json" | "text/event-stream") {
  const streaming = contentType === "text/event-stream";
  return {
    "Content-Type": contentType,
    "Cache-Control": streaming ? "private, no-store, no-transform" : "private, no-store",
    "CDN-Cache-Control": "no-store",
    "Vercel-CDN-Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...(streaming ? { Connection: "keep-alive" } : {}),
  };
}
