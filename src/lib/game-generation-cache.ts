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
  // Do not store personal vocabulary in a key OR share its generated result.
  if (context.userWords?.length) return null;
  return JSON.stringify([
    context.language,
    context.level,
    context.axis ?? null,
    context.cefr ?? null,
    context.topic ?? null,
    context.avoid ?? [],
  ]);
}

export class PublicGameGenerationCache<T> {
  private readonly entries = new Map<string, T>();
  private readonly capacity: number;
  constructor(capacity = 200) {
    this.capacity = capacity;
  }

  get(context: GameGenerationContext): T | undefined {
    const key = publicGameGenerationKey(context);
    if (key === null) return undefined;
    const value = this.entries.get(key);
    if (value !== undefined) {
      this.entries.delete(key);
      this.entries.set(key, value);
    }
    return value;
  }

  set(context: GameGenerationContext, value: T): void {
    const key = publicGameGenerationKey(context);
    if (key === null) return;
    this.entries.delete(key);
    if (this.entries.size >= this.capacity) {
      const first = this.entries.keys().next().value;
      if (first !== undefined) this.entries.delete(first);
    }
    this.entries.set(key, value);
  }
}
