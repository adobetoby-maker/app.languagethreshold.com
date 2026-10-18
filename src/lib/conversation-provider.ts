// Conversation and Speaking share the same owned 45-second, 1 MiB SDK transport.
export {
  withSpeakingProvider as withConversationProvider,
  SpeakingProviderError as ConversationProviderError,
} from "./speaking-provider.ts";

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
