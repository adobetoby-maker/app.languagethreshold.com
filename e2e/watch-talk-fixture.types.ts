export interface WatchHarness {
  emit(overrides?: Record<string, unknown>): void;
  failure(): void;
  status(): { context: null | { contextId: string }; stops: number; acks: number };
}
declare global {
  interface Window {
    watchHarness: WatchHarness;
  }
}
