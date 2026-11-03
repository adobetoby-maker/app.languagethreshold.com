/** Conservative reservation ceilings, USD millionths. Unknown paid models fail closed. */
export function providerReservation(url: string, body: unknown): number | null {
  const u = new URL(url);
  if (u.hostname === "api.anthropic.com" && u.pathname.endsWith("/messages")) {
    if (!body || typeof body !== "object") return null;
    const b = body as { model?: unknown; max_tokens?: unknown };
    const model = String(b.model ?? "");
    const rates = model.startsWith("claude-haiku-5-5")
      ? [1, 2.5]
      : model.startsWith("claude-sonnet-5-5")
        ? [4, 10]
        : model.startsWith("claude-sonnet-4-6")
          ? [12, 30]
          : model.startsWith("claude-opus-5-5")
            ? [8, 20]
            : null;
    if (
      !rates ||
      !Number.isSafeInteger(b.max_tokens) ||
      Number(b.max_tokens) < 1 ||
      Number(b.max_tokens) > 128000
    )
      return null;
    const text = JSON.stringify(body);
    // Native documents and provider-hosted tools have additional billing dimensions.
    if (/"type"\s*:\s*"document"/.test(text)) return null;
    const tools = (body as { tools?: { type?: string }[] }).tools;
    if (tools?.some((tool) => tool.type && tool.type !== "custom")) return null;
    const images = (text.match(/"type"\s*:\s*"image"/g) ?? []).length;
    const inputCeiling = new TextEncoder().encode(text).length + 16384 + images * 65536;
    return Math.ceil((inputCeiling * rates[0] + Number(b.max_tokens) * rates[1]) * 1.2);
  }
  if (u.hostname === "texttospeech.googleapis.com" && u.pathname.endsWith("text:synthesize")) {
    const b = body as { input?: { text?: unknown }; voice?: { name?: unknown } };
    if (typeof b?.input?.text !== "string") return null;
    const name = String(b.voice?.name ?? "");
    const rate =
      name.includes("Chirp3-HD") || name.includes("Chirp-HD")
        ? 30
        : name.includes("Studio")
          ? 160
          : name.includes("Neural2") || name.includes("Polyglot")
            ? 16
            : name.includes("Standard") || name.includes("Wavenet")
              ? 4
              : null;
    if (rate === null) return null;
    // UTF-8 bytes conservatively cover all billed characters, including non-Latin scripts.
    return Math.max(1, Math.ceil(new TextEncoder().encode(b.input.text).length * rate));
  }
  if (u.hostname === "api.elevenlabs.io" && u.pathname.includes("/text-to-speech/")) {
    const text = (body as { text?: unknown })?.text;
    return typeof text === "string"
      ? Math.max(1, new TextEncoder().encode(text).length * 500)
      : null;
  }
  if (u.hostname === "api.elevenlabs.io" && u.pathname.endsWith("/speech-to-text")) return 250000;
  return 0;
}
export function paidProvider(url: string) {
  const u = new URL(url);
  return (
    (u.hostname === "api.anthropic.com" && u.pathname.endsWith("/messages")) ||
    (u.hostname === "texttospeech.googleapis.com" && u.pathname.endsWith("text:synthesize")) ||
    (u.hostname === "api.elevenlabs.io" &&
      (u.pathname.includes("/text-to-speech/") || u.pathname.endsWith("/speech-to-text")))
  );
}
