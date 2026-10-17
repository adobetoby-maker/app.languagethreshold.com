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
