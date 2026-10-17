import "@tanstack/react-start/server-only";
import { cleanModuleDeck, MODULE_DECK_LIMITS, type ModuleDeckPair } from "./module-deck-core.ts";

export async function moduleDeckDraftKey(moduleId: string, request: unknown) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      JSON.stringify(["module-deck-draft-v1", moduleId, MODULE_DECK_LIMITS, request]),
    ),
  );
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function rpc(name: string, args: Record<string, unknown>): Promise<unknown> {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, ""),
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Deck draft storage unavailable");
  const environment =
    process.env.VERCEL_ENV === "production"
      ? "production"
      : process.env.VERCEL_ENV === "preview"
        ? "preview"
        : "development";
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify({ p_environment: environment, ...args }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Deck draft storage unavailable");
  return response.json();
}
interface DeckLease {
  key: string;
  lease: string;
}
export type ModuleDeckClaim =
  | { status: "hit"; pairs: ModuleDeckPair[] }
  | { status: "pending" }
  | { status: "claimed"; lease: DeckLease };
export async function claimModuleDeck(key: string): Promise<ModuleDeckClaim> {
  const lease = crypto.randomUUID(),
    value = await rpc("claim_module_deck_draft", { p_cache_key: key, p_lease: lease });
  if (!value || typeof value !== "object") throw new Error("Invalid deck draft storage result");
  const result = value as { status?: unknown; pairs?: unknown };
  if (result.status === "hit") {
    const pairs = cleanModuleDeck(result.pairs);
    if (
      !pairs ||
      !Array.isArray(result.pairs) ||
      pairs.length !== result.pairs.length ||
      !pairs.every((pair, index) => {
        const stored = (result.pairs as Record<string, unknown>[])[index];
        return (
          Object.keys(stored).length === 3 &&
          pair.english === stored.english &&
          pair.translation === stored.translation &&
          pair.kind === stored.kind
        );
      })
    )
      throw new Error("Invalid stored deck draft");
    return { status: "hit", pairs };
  }
  if (result.status === "pending") return { status: "pending" };
  if (result.status === "claimed") return { status: "claimed", lease: { key, lease } };
  throw new Error("Invalid deck draft storage result");
}
export async function completeModuleDeck(lease: DeckLease, pairs: ModuleDeckPair[]) {
  return (
    (await rpc("complete_module_deck_draft", {
      p_cache_key: lease.key,
      p_lease: lease.lease,
      p_pairs: pairs,
    })) === true
  );
}
export async function releaseModuleDeck(lease: DeckLease) {
  await rpc("release_module_deck_draft", { p_cache_key: lease.key, p_lease: lease.lease });
}
