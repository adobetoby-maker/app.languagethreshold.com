import "@tanstack/react-start/server-only";
import { cleanLessonWords, hasEnoughWords, WORD_LIMITS } from "./lesson-words-core.ts";
import type { LessonWord } from "../data/curriculum.ts";

export async function lessonDraftKey(moduleId: string, lessonNumber: number, request: unknown) {
  const bytes = new TextEncoder().encode(
    JSON.stringify(["lesson-words-draft-v1", moduleId, lessonNumber, WORD_LIMITS, request]),
  );
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function environment() {
  return process.env.VERCEL_ENV === "production"
    ? "production"
    : process.env.VERCEL_ENV === "preview"
      ? "preview"
      : "development";
}
async function draftRpc(name: string, args: Record<string, unknown>): Promise<unknown> {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Draft storage unavailable");
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify({ p_environment: environment(), ...args }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Draft storage unavailable");
  return response.json();
}
export interface LessonDraftLease {
  key: string;
  lease: string;
}
export type LessonDraftClaim =
  | { status: "hit"; words: LessonWord[] }
  | { status: "pending" }
  | { status: "claimed"; lease: LessonDraftLease };
export async function claimLessonDraft(key: string): Promise<LessonDraftClaim> {
  const lease = crypto.randomUUID();
  const value = await draftRpc("claim_lesson_word_draft", { p_cache_key: key, p_lease: lease });
  if (!value || typeof value !== "object") throw new Error("Invalid draft storage result");
  const result = value as { status?: unknown; words?: unknown };
  if (result.status === "hit") {
    const words = cleanLessonWords(result.words);
    if (!hasEnoughWords(words)) throw new Error("Invalid stored lesson draft");
    return { status: "hit", words };
  }
  if (result.status === "pending") return { status: "pending" };
  if (result.status === "claimed") return { status: "claimed", lease: { key, lease } };
  throw new Error("Invalid draft storage result");
}
export async function completeLessonDraft(lease: LessonDraftLease, words: LessonWord[]) {
  return (
    (await draftRpc("complete_lesson_word_draft", {
      p_cache_key: lease.key,
      p_lease: lease.lease,
      p_words: words,
    })) === true
  );
}
export async function releaseLessonDraft(lease: LessonDraftLease) {
  await draftRpc("release_lesson_word_draft", { p_cache_key: lease.key, p_lease: lease.lease });
}
