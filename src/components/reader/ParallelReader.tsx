import { useMemo, useState } from "react";
import { useApp } from "@/state/app-state";
import { useLibrary } from "@/state/library-state";

/**
 * Temporary ParallelReader restore so the Reader tab is usable.
 * Full dual-pane + furigana + lined-paper dashed separators is ready locally
 * and will be pushed in a follow-up once large-file publish is unblocked.
 */
export function ParallelReader() {
  const { state } = useApp();
  const { selected } = useLibrary();
  const sentences = useMemo(() => {
    const chapters = selected?.chapters;
    if (chapters && chapters.length > 0) return chapters[0].sentences ?? [];
    return selected?.sentences ?? [];
  }, [selected]);

  return (
    <div className="fade-in mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
        Reader · {selected?.title ?? "Loading…"}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {state.nativeLanguage} · native
          </div>
          <div className="space-y-4 font-display text-[17px] leading-[1.85]">
            {sentences.map((s: { en?: string; target?: string }, i: number) => (
              <p key={i} className="lt-reader-sentence border-b border-dashed border-border/35 pb-4">
                {s.en ?? ""}
              </p>
            ))}
            {sentences.length === 0 && (
              <p className="text-muted-foreground">Open the library to choose a text.</p>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
            {selected?.language ?? state.selectedLanguage} · target
          </div>
          <div className="space-y-4 font-display text-[17px] leading-[1.85]">
            {sentences.map((s: { en?: string; target?: string }, i: number) => (
              <p key={i} className="lt-reader-sentence border-b border-dashed border-border/35 pb-4">
                {s.target ?? ""}
              </p>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        Full furigana · word-tap · speak · notes restoring next
      </p>
    </div>
  );
}
