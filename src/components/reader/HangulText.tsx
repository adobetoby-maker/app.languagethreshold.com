import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { addRomaja, type RomajaSegment } from "@/fns/romaja.functions";

/**
 * Renders a Korean sentence with optional Revised Romanization (RR) above each
 * Hangul syllable block — the Korean mirror of <FuriganaText />. Readings are
 * fetched lazily, cached in localStorage, and rendered with native <ruby>/<rt>
 * tags so layout stays height-stable. "Inline" mode overlays the romaja
 * directly on top of the syllable so the original sentence rhythm is
 * preserved 1:1.
 *
 * Each syllable and punctuation chunk stays individually clickable so word
 * lookups continue to work in every mode.
 */

const CACHE_KEY = "lt.romaja.v1";
type Cache = Record<string, RomajaSegment[]>;

let memCache: Cache | null = null;
function loadCache(): Cache {
  if (memCache) return memCache;
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(CACHE_KEY) : null;
    memCache = raw ? (JSON.parse(raw) as Cache) : {};
  } catch {
    memCache = {};
  }
  return memCache;
}
function saveCache(cache: Cache) {
  memCache = cache;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* quota — ignore */
  }
}

const HANGUL_RE = /[\uAC00-\uD7AF]/;

export function HangulText({
  text,
  onWordClick,
  fullSentence,
  mode = "above",
}: {
  text: string;
  /** Click handler — receives the clean clicked word, the full sentence, and screen coords. */
  onWordClick?: (word: string, sentence: string, x: number, y: number) => void;
  /** The full sentence to pass to onWordClick (defaults to `text`). */
  fullSentence?: string;
  /**
   * "above"  : tiny romaja floats above each syllable (default).
   * "inline" : romaja sits directly ON the syllable as a faint overlay.
   */
  mode?: "above" | "inline";
}) {
  const fetchRomaja = useServerFn(addRomaja);
  const [segments, setSegments] = useState<RomajaSegment[] | null>(() => loadCache()[text] ?? null);
  const inFlight = useRef(false);
  const sentence = fullSentence ?? text;

  useEffect(() => {
    const cached = loadCache()[text];
    if (cached) {
      setSegments(cached);
      return;
    }
    if (!HANGUL_RE.test(text)) {
      setSegments([{ base: text }]);
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetchRomaja({ data: { text } });
        if (cancelled) return;
        const segs = res.data?.segments ?? [{ base: text }];
        const cache = { ...loadCache(), [text]: segs };
        saveCache(cache);
        setSegments(segs);
      } catch {
        if (!cancelled) setSegments([{ base: text }]); // graceful fallback
      } finally {
        inFlight.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [text, fetchRomaja]);

  const rendered = useMemo(() => segments, [segments]);

  // While loading, show plain text so layout doesn't jump.
  if (!rendered) {
    return <ClickableSpan text={text} sentence={sentence} onWordClick={onWordClick} />;
  }

  return (
    <>
      {rendered.map((seg, i) => {
        const reading = seg.romaja;
        if (reading) {
          if (mode === "inline") {
            return (
              <span
                key={i}
                data-reading={reading}
                className="furigana-inline lt-word"
                onClick={
                  onWordClick
                    ? (e) => {
                        e.stopPropagation();
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        onWordClick(seg.base, sentence, r.left + r.width / 2, r.bottom);
                      }
                    : undefined
                }
              >
                {seg.base}
              </span>
            );
          }
          return (
            <ruby key={i} className="furigana-ruby">
              <span
                className="lt-word"
                onClick={
                  onWordClick
                    ? (e) => {
                        e.stopPropagation();
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        onWordClick(seg.base, sentence, r.left + r.width / 2, r.bottom);
                      }
                    : undefined
                }
              >
                {seg.base}
              </span>
              <rt className="furigana-rt">{reading}</rt>
            </ruby>
          );
        }
        return (
          <ClickableSpan key={i} text={seg.base} sentence={sentence} onWordClick={onWordClick} />
        );
      })}
    </>
  );
}

/**
 * Tokenize a non-ruby chunk for clicking. Korean uses spaces between words,
 * so splitting on whitespace + punctuation gives natural word tokens.
 */
function ClickableSpan({
  text,
  sentence,
  onWordClick,
}: {
  text: string;
  sentence: string;
  onWordClick?: (w: string, s: string, x: number, y: number) => void;
}) {
  if (!onWordClick) return <>{text}</>;
  const parts = text.split(/([\s。、！？「」『』・，．,.!?:;()[\]<>"'])/);
  return (
    <>
      {parts.map((p, i) => {
        if (!p) return null;
        if (/^[\s。、！？「」『』・，．,.!?:;()[\]<>"']$/.test(p)) {
          return <span key={i}>{p}</span>;
        }
        return (
          <span
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              onWordClick(p, sentence, r.left + r.width / 2, r.bottom);
            }}
            className="lt-word"
          >
            {p}
          </span>
        );
      })}
    </>
  );
}
