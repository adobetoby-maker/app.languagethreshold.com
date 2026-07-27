import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { addFurigana, type FuriganaSegment } from "@/fns/furigana.functions";

/**
 * Renders a Japanese sentence with furigana (small reading hints above kanji)
 * using native <ruby>/<rt> tags. Readings are fetched lazily from the server,
 * cached in localStorage, and can be displayed as either hiragana or romaji
 * (Hepburn). Layout is height-stable: the small <rt> labels tuck into the
 * paragraph's existing line-height (≥1.7), so sentence height does not grow.
 *
 * Each kana run, kanji compound, and punctuation chunk stays individually
 * clickable so word lookups continue to work in every mode.
 */

// v3 cache: prompt now emits one segment per kanji (so the reading sits
// directly above each character). Bump key to invalidate v2 compound entries.
const CACHE_KEY = "lt.furigana.v3";
type Cache = Record<string, FuriganaSegment[]>;

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

const KANJI_RE = /[\u4E00-\u9FFF]/;

export type FuriganaScript = "hiragana" | "romaji";

export function FuriganaText({
  text,
  onWordClick,
  fullSentence,
  mode = "above",
  script = "hiragana",
}: {
  text: string;
  /** Click handler — receives the clean clicked word, the full sentence, and screen coords. */
  onWordClick?: (word: string, sentence: string, x: number, y: number) => void;
  /** The full sentence to pass to onWordClick (defaults to `text`). */
  fullSentence?: string;
  /**
   * "above"  : tiny reading floats above the kanji (default).
   * "inline" : reading sits directly ON the kanji as a faint overlay (no extra leading).
   */
  mode?: "above" | "inline";
  /** Which reading to show: hiragana (default) or Hepburn romaji. */
  script?: FuriganaScript;
}) {
  const fetchFurigana = useServerFn(addFurigana);
  const [segments, setSegments] = useState<FuriganaSegment[] | null>(
    () => loadCache()[text] ?? null,
  );
  const inFlight = useRef(false);
  const sentence = fullSentence ?? text;

  useEffect(() => {
    const cached = loadCache()[text];
    if (cached) {
      setSegments(cached);
      return;
    }
    if (!KANJI_RE.test(text)) {
      setSegments([{ base: text }]);
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetchFurigana({ data: { text } });
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
      inFlight.current = false;
    };
  }, [text, fetchFurigana]);

  const rendered = useMemo(() => segments, [segments]);

  // While loading, show plain text so layout doesn't jump.
  if (!rendered) {
    return <ClickableSpan text={text} sentence={sentence} onWordClick={onWordClick} />;
  }

  return (
    <>
      {rendered.map((seg, i) => {
        const reading = script === "romaji" ? seg.romaji : seg.hiragana;
        if (reading) {
          if (mode === "inline") {
            // "Inline" mode: the reading sits directly ON TOP of the kanji as
            // a faint overlay via CSS ::after. Sentence height/width remain
            // identical to the un-annotated text.
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
 * Tokenize a non-ruby chunk for clicking. Japanese has no spaces, so we
 * fall back to splitting on whitespace + punctuation; everything between
 * separators stays one clickable token.
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
