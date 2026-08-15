import { useEffect, useMemo, useRef, useState } from "react";
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
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FURIGANA_KEY);
      if (raw === "off" || raw === "above") setFuriganaMode(raw);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(FURIGANA_KEY, furiganaMode); } catch { /* ignore */ }
  }, [furiganaMode]);

  const sentences = useMemo(() => {
    const chapters = selected?.chapters;
    if (chapters && chapters.length > 0) return chapters[0].sentences ?? [];
    return selected?.sentences ?? [];
  }, [selected]);

  function handleWord(w: string, sentence: string, pane: "left" | "right", idx: number, x: number, y: number) {
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

  const isJapanese = selected?.language === "Japanese" || state.selectedLanguage === "Japanese";
  const showFuri = isJapanese && furiganaMode === "above";

  return (
    <div className="fade-in mx-auto w-full max-w-6xl">
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
          Reader · {selected?.title ?? "Loading…"}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-full border border-border/70">
            {(["S", "M", "L"] as TextSize[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                data-active={size === s}
                className="px-3 py-1 font-mono text-[11px] tracking-widest text-muted-foreground transition-colors data-[active=true]:bg-gold data-[active=true]:text-midnight"
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
                  className="px-3 py-1 font-mono text-[11px] tracking-widest text-muted-foreground transition-colors data-[active=true]:bg-gold data-[active=true]:text-midnight"
                >
                  {m === "off" ? "Off" : "Furigana"}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={playing ? stop : handleSpeak}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/50 bg-background/40 text-muted-foreground hover:border-gold/50 hover:text-gold"
          >
            <Volume2 className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => setFullscreen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold hover:bg-gold/15"
          >
            {fullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            {fullscreen ? "Exit" : "Focus"}
          </button>
        </div>
      </div>

      {/* Dual panes */}
      <div
        className={`relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-luxe backdrop-blur ${
          fullscreen ? "fixed inset-2 z-40 md:inset-6" : ""
        }`}
      >
        <div className={fullscreen ? "grid grid-cols-1" : "grid grid-cols-1 md:grid-cols-2"}>
          {!fullscreen && (
            <div className="relative border-b border-border/50 md:border-b-0 md:border-r">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/50 bg-card/80 px-5 py-3 backdrop-blur">
                <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                  {state.nativeLanguage}
                </span>
                <span className="font-display text-xs italic text-muted-foreground">native</span>
              </div>
              <div className="lt-scroll-safe custom-scroll max-h-[62vh] overflow-y-auto px-5 py-6">
                <div className={`font-display ${SIZE_CLASS[size]} text-foreground/90`}>
                  {sentences.map((s: { en?: string; target?: string }, i: number) => (
                    <p
                      key={i}
                      data-sentence-index={i}
                      className={`lt-reader-sentence mb-0 border-b border-dashed border-border/35 pb-5 pt-1 transition-colors ${
                        activeSentenceIndex === i ? "bg-gold/10" : ""
                      }`}
                      onClick={(e) => {
                        const t = (e.target as HTMLElement).textContent?.trim();
                        if (t) handleWord(t, s.en ?? "", "left", i, e.clientX, e.clientY);
                      }}
                    >
                      {s.en ?? ""}
                    </p>
                  ))}
                  {sentences.length === 0 && (
                    <p className="text-muted-foreground">Open the library to choose a text.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="relative">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/50 bg-card/80 px-5 py-3 backdrop-blur">
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold">
                {selected?.language ?? state.selectedLanguage}
              </span>
              <span className="font-display text-xs italic text-muted-foreground">target</span>
            </div>
            <div
              ref={rightRef}
              className={`lt-scroll-safe custom-scroll overflow-y-auto px-5 py-6 ${
                fullscreen ? "max-h-[calc(100dvh-120px)]" : "max-h-[62vh]"
              }`}
            >
              <div className={`font-display ${SIZE_CLASS[size]} text-foreground`}>
                {sentences.map((s: { en?: string; target?: string }, i: number) => (
                  <p
                    key={i}
                    data-sentence-index={i}
                    className={`lt-reader-sentence mb-0 border-b border-dashed border-border/35 pb-5 pt-1 transition-colors ${
                      activeSentenceIndex === i ? "bg-gold/10" : ""
                    } ${showFuri ? "furigana-line" : ""}`}
                  >
                    {showFuri && s.target ? (
                      <FuriganaText
                        text={s.target}
                        fullSentence={s.target}
                        mode="above"
                        script="hiragana"
                        onWordClick={(w, sent, x, y) => handleWord(w, sent, "right", i, x, y)}
                      />
                    ) : (
                      <span
                        onClick={(e) => {
                          const t = (e.target as HTMLElement).textContent?.trim();
                          if (t) handleWord(t, s.target ?? "", "right", i, e.clientX, e.clientY);
                        }}
                      >
                        {s.target ?? ""}
                      </span>
                    )}
                  </p>
                ))}
              </div>
            </div>
          </div>
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
