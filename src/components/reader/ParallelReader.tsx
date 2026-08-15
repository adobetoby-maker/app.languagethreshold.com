import { useEffect, useMemo, useState } from "react";
import { Volume2, Maximize2, Minimize2 } from "lucide-react";
import { useApp } from "@/state/app-state";
import { useLibrary } from "@/state/library-state";
import { useSpeech } from "@/state/speech-state";
import { FuriganaText } from "./FuriganaText";
import { WordCard, type WordCardRequest } from "./WordCard";

type TextSize = "S" | "M" | "L";
type FuriganaMode = "off" | "above";

const SIZE_CLASS: Record<TextSize, string> = {
  S: "text-[15px] leading-[1.85]",
  M: "text-[17px] leading-[1.85]",
  L: "text-[20px] leading-[1.9]",
};

const FURIGANA_KEY = "lt.reader.furigana.v1";

export function ParallelReader() {
  const { state, dispatch } = useApp();
  const { selected } = useLibrary();
  const { speakSentence, stop, playing, activeSentenceIndex } = useSpeech();
  const [size, setSize] = useState<TextSize>("M");
  const [fullscreen, setFullscreen] = useState(false);
  const [furiganaMode, setFuriganaMode] = useState<FuriganaMode>("above");
  const [wordReq, setWordReq] = useState<WordCardRequest | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FURIGANA_KEY);
      if (raw === "off" || raw === "above") setFuriganaMode(raw);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(FURIGANA_KEY, furiganaMode);
    } catch {
      /* ignore */
    }
  }, [furiganaMode]);

  const sentences = useMemo(() => {
    const chapters = selected?.chapters;
    if (chapters && chapters.length > 0) return chapters[0].sentences ?? [];
    return selected?.sentences ?? [];
  }, [selected]);

  function handleWord(
    w: string,
    sentence: string,
    _pane: "left" | "right",
    idx: number,
    x: number,
    y: number,
  ) {
    setWordReq({
      word: w,
      sentence,
      language: state.selectedLanguage,
      textId: selected?.id,
      textTitle: selected?.title,
      sentenceIndex: idx,
      x,
      y,
    });
  }

  function handleSpeak() {
    const idx = activeSentenceIndex >= 0 ? activeSentenceIndex : 0;
    const s = sentences[idx];
    if (s?.target) speakSentence(s.target, idx);
  }

  const isJapanese =
    selected?.language === "Japanese" || state.selectedLanguage === "Japanese";
  const showFuri = isJapanese && furiganaMode === "above";

  return (
    <div className="fade-in mx-auto w-full max-w-6xl">
      {/* Toolbar — compact, no extra Japanese-only height */}
      <div className="mb-3 flex flex-wrap items-center gap-2 px-1">
        <div className="mr-auto font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
          Reader · {selected?.title ?? "Loading…"}
        </div>

        <div className="flex overflow-hidden rounded-full border border-border/70">
          {(["S", "M", "L"] as TextSize[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              data-active={size === s}
              className="px-2.5 py-1 font-mono text-[11px] tracking-widest text-muted-foreground transition-colors data-[active=true]:bg-gold data-[active=true]:text-midnight"
            >
              {s}
            </button>
          ))}
        </div>

        {isJapanese && (
          <div className="flex overflow-hidden rounded-full border border-border/70">
            {(["off", "above"] as FuriganaMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setFuriganaMode(m)}
                data-active={furiganaMode === m}
                className="px-2.5 py-1 font-mono text-[11px] tracking-widest text-muted-foreground transition-colors data-[active=true]:bg-gold data-[active=true]:text-midnight"
              >
                {m === "off" ? "Off" : "Above"}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={playing ? stop : handleSpeak}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/50 bg-background/40 text-muted-foreground hover:border-gold/50 hover:text-gold"
          title="Read sentence aloud"
        >
          <Volume2 className="h-3 w-3" />
        </button>

        <button
          type="button"
          onClick={() => setFullscreen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-gold hover:bg-gold/15"
        >
          {fullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          {fullscreen ? "Exit" : "Focus"}
        </button>
      </div>

      {/* Reader card */}
      <div
        className={`relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-luxe backdrop-blur ${
          fullscreen ? "fixed inset-2 z-40 md:inset-6" : ""
        }`}
      >
        {/* Sticky dual headers — fixed height so they never push content unevenly */}
        <div
          className={`sticky top-0 z-10 grid border-b border-border/50 bg-card/90 backdrop-blur ${
            fullscreen ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {!fullscreen && (
            <div className="flex h-10 items-center justify-between border-r border-border/40 px-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                {state.nativeLanguage}
              </span>
              <span className="font-display text-xs italic text-muted-foreground">native</span>
            </div>
          )}
          <div className="flex h-10 items-center justify-between px-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold">
              {selected?.language ?? state.selectedLanguage}
            </span>
            <span className="font-display text-xs italic text-muted-foreground">target</span>
          </div>
        </div>

        {/*
          PAIRED ROWS — each English + Japanese sentence share one horizontal band.
          Row height = max(left, right), so furigana on the Japanese side never
          causes cumulative vertical drift. Dashed border between pairs = lined paper.
        */}
        <div
          className={`lt-scroll-safe custom-scroll overflow-y-auto ${
            fullscreen ? "max-h-[calc(100dvh-100px)]" : "max-h-[62vh]"
          }`}
        >
          {sentences.length === 0 && (
            <p className="px-5 py-8 text-center text-muted-foreground">
              Open the library to choose a text.
            </p>
          )}

          {sentences.map((s: { en?: string; target?: string }, i: number) => {
            const isActive = activeSentenceIndex === i;
            return (
              <div
                key={i}
                data-sentence-index={i}
                className={`grid border-b border-dashed border-border/40 last:border-b-0 transition-colors ${
                  fullscreen ? "grid-cols-1" : "grid-cols-2"
                } ${
                  isActive ? "bg-gold/10" : "hover:bg-muted/20"
                }`}
              >
                {/* Native (English) cell */}
                {!fullscreen && (
                  <div
                    className={`border-r border-border/30 px-4 py-4 font-display ${SIZE_CLASS[size]} text-foreground/90`}
                    onClick={(e) => {
                      const t = (e.target as HTMLElement).textContent?.trim();
                      if (t) handleWord(t, s.en ?? "", "left", i, e.clientX, e.clientY);
                    }}
                  >
                    {s.en ?? ""}
                  </div>
                )}

                {/* Target (Japanese) cell — furigana sits inside this cell only */}
                <div
                  className={`px-4 py-4 font-display ${SIZE_CLASS[size]} text-foreground ${
                    showFuri ? "furigana-line" : ""
                  }`}
                >
                  {showFuri && s.target ? (
                    <FuriganaText
                      text={s.target}
                      fullSentence={s.target}
                      mode="above"
                      script="hiragana"
                      onWordClick={(w, sent, x, y) =>
                        handleWord(w, sent, "right", i, x, y)
                      }
                    />
                  ) : (
                    <span
                      onClick={(e) => {
                        const t = (e.target as HTMLElement).textContent?.trim();
                        if (t)
                          handleWord(
                            t,
                            s.target ?? "",
                            "right",
                            i,
                            e.clientX,
                            e.clientY,
                          );
                      }}
                    >
                      {s.target ?? ""}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {wordReq && (
        <WordCard
          request={wordReq}
          onClose={() => setWordReq(null)}
          onXp={(n) => dispatch({ type: "ADD_XP", payload: n })}
        />
      )}
    </div>
  );
}
