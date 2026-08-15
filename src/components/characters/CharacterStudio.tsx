import { useMemo, useState } from "react";
import { BookOpen, Shield, Sparkles, Layers } from "lucide-react";
import { useApp } from "@/state/app-state";
import {
  CHARACTER_CATEGORY_LABELS,
  CORE_RADICALS,
  getCharactersByCategory,
  type CharacterCategory,
  type CjkCharacter,
  type CjkLanguage,
} from "@/data/cjk";
import { CharacterDetail } from "./CharacterDetail";
import { RadicalMatch } from "./RadicalMatch";

type StudioMode = "characters" | "radicals" | "match";

const JA_FILTERS: Array<CharacterCategory | "all"> = [
  "all",
  "core",
  "street-safety",
  "jlpt-n5",
  "jlpt-n4",
  "radical-focus",
];

const ZH_FILTERS: Array<CharacterCategory | "all"> = [
  "all",
  "core",
  "street-safety",
  "hsk-1",
  "hsk-2",
  "radical-focus",
];

function asCjkLanguage(lang: string): CjkLanguage | null {
  if (lang === "Japanese" || lang === "Chinese") return lang;
  return null;
}

export function CharacterStudio() {
  const { state } = useApp();
  const cjk = asCjkLanguage(state.selectedLanguage);

  const [mode, setMode] = useState<StudioMode>("characters");
  const [filter, setFilter] = useState<CharacterCategory | "all">("all");
  const [selected, setSelected] = useState<CjkCharacter | null>(null);

  const filters = cjk === "Chinese" ? ZH_FILTERS : JA_FILTERS;

  const characters = useMemo(() => {
    if (!cjk) return [];
    return getCharactersByCategory(cjk, filter);
  }, [cjk, filter]);

  const handlePointerDown = (char: CjkCharacter) => {
    const id = window.setTimeout(() => setSelected(char), 400);
    const clear = () => window.clearTimeout(id);
    window.addEventListener("pointerup", clear, { once: true });
    window.addEventListener("pointercancel", clear, { once: true });
  };

  if (!cjk) {
    return (
      <div className="fade-in mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 py-24 text-center">
        <span className="text-4xl">漢</span>
        <h2 className="font-display text-2xl font-semibold">Character Studio</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Switch your study language to <strong>Japanese</strong> or <strong>Chinese</strong> to
          study kanji / hanzi with radical breakdown, writing order, and street & safety signs.
        </p>
      </div>
    );
  }

  const title = cjk === "Japanese" ? "Kanji Studio" : "Hanzi Studio";
  const subtitle =
    cjk === "Japanese"
      ? "Breakdown, radicals, writing order, and street signs — long-press any character to expand."
      : "Simplified characters with radicals, pinyin, writing order, and street & safety signs.";

  return (
    <>
      {selected && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[70] bg-black/50"
            aria-label="Dismiss character detail"
            onClick={() => setSelected(null)}
          />
          <CharacterDetail character={selected} onClose={() => setSelected(null)} />
        </>
      )}

      <div className="fade-in mx-auto max-w-3xl space-y-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <Sparkles className="mt-1 h-6 w-6 shrink-0 text-gold" strokeWidth={1.4} />
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "characters" as const, label: "Characters", Icon: BookOpen },
              { id: "radicals" as const, label: "Radicals", Icon: Layers },
              { id: "match" as const, label: "Radical match", Icon: Shield },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              data-active={mode === id}
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all data-[active=true]:border-gold data-[active=true]:bg-gold/10 data-[active=true]:text-gold data-[active=false]:border-border/60 data-[active=false]:text-muted-foreground hover:border-gold/50"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {mode === "characters" && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {filters.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  data-active={filter === f}
                  className="rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-all data-[active=true]:border-gold data-[active=true]:bg-gold/10 data-[active=true]:text-gold data-[active=false]:border-border/50 data-[active=false]:text-muted-foreground"
                >
                  {CHARACTER_CATEGORY_LABELS[f]}
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Tap to open · long-press to expand with radicals and story.
            </p>

            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {characters.map((c) => (
                <button
                  key={c.char}
                  type="button"
                  onClick={() => setSelected(c)}
                  onPointerDown={() => handlePointerDown(c)}
                  className="flex aspect-square flex-col items-center justify-center rounded-2xl border border-border/50 bg-card/40 transition-colors hover:border-gold/50 active:scale-[0.98]"
                >
                  <span className="font-display text-3xl leading-none">{c.char}</span>
                  <span className="mt-1 max-w-full truncate px-1 text-[10px] text-muted-foreground">
                    {c.meanings[0]}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {mode === "radicals" && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {CORE_RADICALS.map((r) => (
              <div
                key={r.glyph}
                className="rounded-2xl border border-border/50 bg-card/40 p-3 text-center"
              >
                <div className="font-display text-3xl">{r.glyph}</div>
                <div className="mt-1 text-xs text-foreground">{r.meaning}</div>
                <div className="mt-0.5 font-mono text-[10px] text-gold">
                  {cjk === "Japanese" ? r.japaneseName : r.pinyin}
                </div>
                <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                  {r.strokeCount} strokes
                </div>
              </div>
            ))}
          </div>
        )}

        {mode === "match" && <RadicalMatch language={cjk} />}
      </div>
    </>
  );
}
