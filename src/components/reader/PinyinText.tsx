import { useEffect, useMemo, useRef, useState } from "react";
import { wordA11yProps } from "@/lib/learning-guidance";
import { useServerFn } from "@tanstack/react-start";
import { addPinyin, type PinyinSegment } from "@/fns/pinyin.functions";

/**
 * Renders a Chinese sentence with pinyin above each hanzi — the Mandarin mirror
 * of <FuriganaText /> (and <HangulText /> for Korean). Readings are fetched
 * lazily from the server, cached in localStorage, and rendered with native
 * <ruby>/<rt> tags so the reading tucks into the existing leading instead of
 * growing the line box.
 *
 * Each hanzi and each run of non-hanzi stays individually clickable so word
 * lookups keep working.
 */

const CACHE_KEY = "lt.pinyin.v1";
type Cache = Record<string, PinyinSegment[]>;

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

const HANZI_RE = /[一-鿿]/;

/**
 * Fetch (and cache) pinyin segments for a string. Exported so surfaces that own
 * their own word interaction — the Core Speaking transcript — can reuse the same
 * request path and cache rather than duplicating them. Returns null while
 * loading; render plain text until then so layout does not jump.
 */
export function usePinyinSegments(text: string, enabled: boolean = true): PinyinSegment[] | null {
  const fetchPinyin = useServerFn(addPinyin);
  const [segments, setSegments] = useState<PinyinSegment[] | null>(
    () => loadCache()[text] ?? null,
  );
  const inFlight = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const cached = loadCache()[text];
    if (cached) {
      setSegments(cached);
      return;
    }
    if (!HANZI_RE.test(text)) {
      setSegments([{ base: text }]);
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetchPinyin({ data: { text } });
        if (cancelled) return;
        const segs = res.data?.segments ?? [{ base: text }];
        saveCache({ ...loadCache(), [text]: segs });
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
    // `enabled` must stay in the deps: the effect early-returns when pinyin is
    // off, so switching it back on has to re-run this to fetch the readings.
    // Without it, toggling off then on leaves the sentence permanently bare.
  }, [text, fetchPinyin, enabled]);

  return segments;
}

export function PinyinText({
  text,
  onWordClick,
  fullSentence,
  mode = "above",
}: {
  text: string;
  /** Receives the clicked hanzi/run, the full sentence, and screen coords. */
  onWordClick?: (word: string, sentence: string, x: number, y: number) => void;
  /** The full sentence to pass to onWordClick (defaults to `text`). */
  fullSentence?: string;
  /** "off" hides readings entirely and skips the reading fetch; "above" (default) shows pinyin over the hanzi. */
  mode?: "off" | "above";
}) {
  const sentence = fullSentence ?? text;
  const segments = usePinyinSegments(text, mode !== "off");
  const rendered = useMemo(() => segments, [segments]);

  if (mode === "off") {
    return <ClickableSpan text={text} sentence={sentence} onWordClick={onWordClick} />;
  }

  // While loading, show plain text so layout doesn't jump.
  if (!rendered) {
    return <ClickableSpan text={text} sentence={sentence} onWordClick={onWordClick} />;
  }

  return (
    <>
      {rendered.map((seg, i) => {
        if (!seg.pinyin) {
          return (
            <ClickableSpan key={i} text={seg.base} sentence={sentence} onWordClick={onWordClick} />
          );
        }
        return (
          <ruby key={i} className="furigana-ruby">
            <span
              className="lt-word"
              {...wordA11yProps}
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
            <rt className="furigana-rt">{seg.pinyin}</rt>
          </ruby>
        );
      })}
    </>
  );
}

/**
 * Tokenize a non-hanzi chunk for clicking. Chinese has no spaces, so split on
 * whitespace + punctuation and keep everything between separators as one token.
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
  const parts = text.split(/([\s。、！？；：「」『』（）·，．,.!?:;()[\]<>"'])/);
  return (
    <>
      {parts.map((p, i) => {
        if (!p) return null;
        if (/^[\s。、！？；：「」『』（）·，．,.!?:;()[\]<>"']$/.test(p)) {
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
            {...wordA11yProps}
          >
            {p}
          </span>
        );
      })}
    </>
  );
}
