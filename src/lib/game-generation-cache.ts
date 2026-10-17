import { LANGUAGES } from "../data/languages.ts";
import { MODULES } from "../data/modules.ts";

/** Match the exact authored topic strings used by the game callers. No free text. */
const publicTopics = new Set(
  MODULES.flatMap((module) => [
    module.name,
    `${module.name} (${module.vocabFocus.slice(0, 5).join(", ")})`,
  ]),
);

/** Only public generation context may enter the process-wide cache. */
export interface GameGenerationContext {
  language: string;
  level: number;
  axis?: string;
  cefr?: string;
  topic?: string;
  avoid?: string[];
  userWords?: string[];
}

export function publicGameGenerationKey(context: GameGenerationContext): string | null {
  // Recent generated text may itself contain personal vocabulary. Neither it nor
  // arbitrary topics/language labels can become a shared key or shared result.
  if (
    context.userWords?.length ||
    context.avoid?.length ||
    !LANGUAGES.some((language) => language === context.language) ||
    ![1, 2, 3].includes(context.level) ||
    (context.topic !== undefined && !publicTopics.has(context.topic)) ||
    (context.axis !== undefined &&
      !["tense", "person", "number", "mood", "mixed"].includes(context.axis)) ||
    (context.cefr !== undefined && !["A1", "A2", "B1", "B2", "C1", "C2"].includes(context.cefr))
  )
    return null;
  return JSON.stringify([
    context.language,
    context.level,
    context.axis ?? null,
    context.cefr ?? null,
    context.topic ?? null,
  ]);
}

export class PublicGameGenerationCache<T> {
  private readonly entries = new Map<string, { value: T; expires: number }>();
  private readonly capacity: number;
  private readonly now: () => number;
  private readonly ttlMs: number;
  constructor(capacity = 200, { now = Date.now, ttlMs = 10 * 60_000 } = {}) {
    if (
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      capacity > 1000 ||
      !Number.isFinite(ttlMs) ||
      ttlMs <= 0 ||
      ttlMs > 60 * 60_000
    )
      throw new RangeError("Invalid public game cache bounds");
    this.capacity = capacity;
    this.now = now;
    this.ttlMs = ttlMs;
  }

  get(context: GameGenerationContext): T | undefined {
    const key = publicGameGenerationKey(context);
    if (key === null) return undefined;
    const entry = this.entries.get(key);
    if (entry !== undefined) {
      this.entries.delete(key);
      if (entry.expires <= this.now()) return undefined;
      this.entries.set(key, entry);
    }
    return entry?.value;
  }

  set(context: GameGenerationContext, value: T): void {
    const key = publicGameGenerationKey(context);
    if (key === null) return;
    const now = this.now();
    for (const [oldKey, entry] of this.entries)
      if (entry.expires <= now) this.entries.delete(oldKey);
    this.entries.delete(key);
    if (this.entries.size >= this.capacity) {
      const first = this.entries.keys().next().value;
      if (first !== undefined) this.entries.delete(first);
    }
    this.entries.set(key, { value, expires: now + this.ttlMs });
  }
}
