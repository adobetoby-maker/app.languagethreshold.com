/** Published list rates, USD per million tokens; verified 2026-10-14. */
export const RATE_DATE = "2026-10-14";
export const RATE_SOURCE = "https://platform.claude.com/docs/en/about-claude/pricing";
const rates: Record<string, readonly [number, number, number, number, number]> = {
  "claude-haiku-5-5": [0.1, 0.5, 0.125, 0.2, 0.01],
  "claude-sonnet-5-5": [2, 10, 2.5, 4, 0.1],
  "claude-sonnet-4-6": [3, 15, 3.75, 6, 0.3],
};
export interface UsageReceipt {
  provider: "anthropic";
  model: string;
  providerCalls: number;
  inputTokens: number;
  outputTokens: number;
  cacheWrite5mTokens: number;
  cacheWrite1hTokens: number;
  cacheReadTokens: number;
}
type ProviderUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation?: {
    ephemeral_5m_input_tokens?: number;
    ephemeral_1h_input_tokens?: number;
  } | null;
};
export function usageReceipt(message: { model: string; usage: ProviderUsage }): UsageReceipt {
  const u = message.usage;
  const hour = u.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  return {
    provider: "anthropic",
    model: message.model,
    providerCalls: 1,
    inputTokens: u.input_tokens,
    outputTokens: u.output_tokens,
    cacheWrite5mTokens:
      u.cache_creation?.ephemeral_5m_input_tokens ??
      Math.max(0, (u.cache_creation_input_tokens ?? 0) - hour),
    cacheWrite1hTokens: hour,
    cacheReadTokens: u.cache_read_input_tokens ?? 0,
  };
}
export function cacheReceipt(): UsageReceipt {
  return {
    provider: "anthropic",
    model: "application-cache",
    providerCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheWrite5mTokens: 0,
    cacheWrite1hTokens: 0,
    cacheReadTokens: 0,
  };
}
/** Unknown models/invalid units are unpriced, never silently treated as free. */
export function receiptCostUsd(receipt: UsageReceipt, modelOverride?: string): number | null {
  const units = [
    receipt.inputTokens,
    receipt.outputTokens,
    receipt.cacheWrite5mTokens,
    receipt.cacheWrite1hTokens,
    receipt.cacheReadTokens,
  ];
  if (!units.every((n) => Number.isSafeInteger(n) && n >= 0)) return null;
  if (receipt.providerCalls === 0) return units.every((n) => n === 0) ? 0 : null;
  const model = modelOverride ?? receipt.model;
  let rate = rates[model];
  if (!rate) return null;
  const promptLength =
    receipt.inputTokens +
    receipt.cacheWrite5mTokens +
    receipt.cacheWrite1hTokens +
    receipt.cacheReadTokens;
  if (model === "claude-haiku-5-5" && promptLength > 100000) rate = [0.5, 2.5, 0.625, 1, 0.05];
  return units.reduce((sum, n, i) => sum + n * rate[i], 0) / 1000000;
}
export function monthlySessionCost(sessionUsd: number, sessionsPerWeek: number): number {
  return (sessionUsd * sessionsPerWeek * 52) / 12;
}

/** Google gross list rates per character; no free-tier subsidy assumed. */
export function ttsCostUsd(voiceName: string, characters: number): number | null {
  if (!Number.isSafeInteger(characters) || characters < 0) return null;
  const perMillion = /Chirp3-HD/i.test(voiceName)
    ? 30
    : /Neural2|Polyglot/i.test(voiceName)
      ? 16
      : /Standard|Wavenet/i.test(voiceName)
        ? 4
        : /Studio/i.test(voiceName)
          ? 160
          : null;
  return perMillion == null ? null : (characters * perMillion) / 1000000;
}
