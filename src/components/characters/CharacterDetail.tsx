import { X } from "lucide-react";
import type { CjkCharacter } from "@/data/cjk";
import { findRadical } from "@/data/cjk";

/**
 * Half-screen expansion of a single character.
 * Long-press / select target: huge glyph, radicals with meanings, confluence story,
 * readings, stroke hint, and example compounds.
 */
export function CharacterDetail({
  character,
  onClose,
  onSelectRadical,
}: {
  character: CjkCharacter;
  onClose: () => void;
  onSelectRadical?: (glyph: string) => void;
}) {
  const readings =
    character.language === "Japanese"
      ? [
          ...(character.onyomi?.length ? [`音: ${character.onyomi.join(" · ")}`] : []),
          ...(character.kunyomi?.length ? [`訓: ${character.kunyomi.join(" · ")}`] : []),
        ]
      : character.pinyin?.length
        ? [`拼音: ${character.pinyin.join(" · ")}`]
        : [];

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[80] flex max-h-[85dvh] flex-col rounded-t-3xl border border-border/60 bg-background/98 shadow-2xl backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      role="dialog"
      aria-label={`Character ${character.char}`}
    >
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">
          {character.language === "Japanese" ? "Kanji" : "Hanzi"} · Character study
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/50 text-muted-foreground hover:border-gold/40 hover:text-gold"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-y-auto overscroll-contain px-5 py-4 [-webkit-overflow-scrolling:touch]">
        <div className="mb-5 flex flex-col items-center justify-center rounded-2xl border border-gold/25 bg-gold/[0.06] py-8">
          <div className="font-display text-[7.5rem] leading-none tracking-tight text-foreground">
            {character.char}
          </div>
          <div className="mt-3 text-center text-sm text-muted-foreground">
            {character.meanings.join(" · ")}
          </div>
          {readings.length > 0 && (
            <div className="mt-2 space-y-0.5 text-center font-mono text-xs text-gold">
              {readings.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          )}
          <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {character.strokeCount} strokes
          </div>
        </div>

        <section className="mb-5">
          <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Radicals
          </h3>
          <div className="grid gap-2">
            {character.radicals.map((part, i) => {
              const catalog = findRadical(part.glyph);
              return (
                <button
                  key={`${part.glyph}-${i}`}
                  type="button"
                  onClick={() => onSelectRadical?.(part.glyph)}
                  className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/50 p-3 text-left transition-colors hover:border-gold/40"
                >
                  <span className="font-display text-3xl leading-none text-foreground">{part.glyph}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">
                      {part.meaning}
                      {catalog?.japaneseName || catalog?.pinyin ? (
                        <span className="ml-2 font-mono text-xs text-gold">
                          {character.language === "Japanese" ? catalog?.japaneseName : catalog?.pinyin}
                        </span>
                      ) : null}
                    </span>
                    {part.role && (
                      <span className="mt-0.5 block text-xs text-muted-foreground">{part.role}</span>
                    )}
                    {part.position && (
                      <span className="mt-1 inline-block rounded-full border border-border/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                        {part.position}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {character.mnemonic && (
          <section className="mb-5">
            <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Story · why it means this
            </h3>
            <p className="rounded-xl border border-border/40 bg-card/40 px-4 py-3 text-sm leading-relaxed text-foreground/90">
              {character.mnemonic}
            </p>
          </section>
        )}

        {character.strokeOrderHint && (
          <section className="mb-5">
            <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Writing order
            </h3>
            <p className="rounded-xl border border-border/40 bg-card/40 px-4 py-3 text-sm leading-relaxed text-foreground/90">
              {character.strokeOrderHint}
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Animated stroke diagrams can plug in later (e.g. KanjiVG). Practice with the writing pad
              using this order.
            </p>
          </section>
        )}

        {character.examples && character.examples.length > 0 && (
          <section className="mb-4">
            <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Examples
            </h3>
            <div className="space-y-2">
              {character.examples.map((ex) => (
                <div key={ex.text} className="rounded-xl border border-border/40 bg-card/40 px-4 py-3">
                  <div className="font-display text-lg text-foreground">{ex.text}</div>
                  {ex.reading && (
                    <div className="mt-0.5 font-mono text-xs text-gold">{ex.reading}</div>
                  )}
                  <div className="mt-0.5 text-xs text-muted-foreground">{ex.meaning}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
