import { useEffect, useMemo, useState } from "react";
import { BookOpen, Shield, Sparkles, Layers, PenLine } from "lucide-react";
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
import { CharacterCanvas } from "@/components/kana/writing/CharacterCanvas";

type StudioMode = "characters" | "radicals" | "match" | "writing";

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
  const [practiceGlyph, setPracticeGlyph] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("lt.characterStudio.startWriting") === "1") {
        sessionStorage.removeItem("lt.characterStudio.startWriting");
        setMode("writing");
      }
    } catch {
      /* regular Character Studio navigation still works without storage */
    }
  }, []);

  const filters = cjk === "Chinese" ? ZH_FILTERS : JA_FILTERS;

  const characters = useMemo(() => {
    if (!cjk) return [];
    return getCharactersByCategory(cjk, filter);
  }, [cjk, filter]);
  const practiceTargets = useMemo(() => {
    const targets = [
      ...characters.slice(0, 12).map((character) => ({
        glyph: character.char,
        meaning: character.meanings[0],
        strokeCount: character.strokeCount,
        hint: character.strokeOrderHint,
      })),
      ...CORE_RADICALS.slice(0, 12).map((radical) => ({
        glyph: radical.glyph,
        meaning: radical.meaning,
        strokeCount: radical.strokeCount,
        hint: undefined as string | undefined,
      })),
    ];
    const unique = new Map<string, (typeof targets)[number]>();
    for (const target of targets) {
      if (!unique.has(target.glyph)) unique.set(target.glyph, target);
    }
    return [...unique.values()];
  }, [characters]);
  const activePractice =
    practiceTargets.find((target) => target.glyph === practiceGlyph) ?? practiceTargets[0];

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
              { id: "writing" as const, label: "Writing practice", Icon: PenLine },
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

        {mode === "writing" && activePractice && (
          <section className="space-y-5 rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-6">
            <div>
              <h2 className="font-display text-xl text-foreground">
                Write characters and radicals
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a symbol, trace the guide with a finger or pen, then clear it and write from
                memory. The canvas clears when you leave this page.
              </p>
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Choose a writing target">
              {practiceTargets.map((target) => (
                <button
                  key={`${target.glyph}-${target.meaning}`}
                  type="button"
                  onClick={() => setPracticeGlyph(target.glyph)}
                  aria-pressed={activePractice.glyph === target.glyph}
                  title={target.meaning}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border/60 bg-background/50 px-2 text-xl text-foreground aria-pressed:border-gold aria-pressed:bg-gold/10"
                >
                  {target.glyph}
                </button>
              ))}
            </div>
            <div className="rounded-xl border border-gold/25 bg-background/40 p-3">
              <p className="text-sm font-semibold text-foreground">
                {activePractice.glyph} · {activePractice.meaning} · {activePractice.strokeCount}{" "}
                strokes
              </p>
              {activePractice.hint && (
                <p className="mt-1 text-xs text-muted-foreground">{activePractice.hint}</p>
              )}
            </div>
            <CharacterCanvas key={activePractice.glyph} guideChar={activePractice.glyph} />
          </section>
        )}
      </div>
    </>
  );
}
