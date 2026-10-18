import { useMemo } from "react";
import { useReadingHints } from "@/hooks/use-reading-hints";
import { wordA11yProps } from "@/lib/learning-guidance";
import { useServerFn } from "@tanstack/react-start";
import { addPinyin, type PinyinSegment } from "@/fns/pinyin.functions";

/**
 * Renders a Chinese sentence with pinyin above each hanzi — the Mandarin mirror
 * of <FuriganaText /> (and <HangulText /> for Korean). Readings are fetched
 * lazily from the server, cached for the current account, and rendered with native
 * <ruby>/<rt> tags so the reading tucks into the existing leading instead of
 * growing the line box.
 *
 * Each hanzi and each run of non-hanzi stays individually clickable so word
 * lookups keep working.
 */

/**
 * Fetch (and cache) pinyin segments for a string. Exported so surfaces that own
 * their own word interaction — the Core Speaking transcript — can reuse the same
 * request path and cache rather than duplicating them. Returns null while
 * loading; render plain text until then so layout does not jump.
 */
export function usePinyinSegments(text: string, enabled: boolean = true): PinyinSegment[] | null {
  const fetchReadings = useServerFn(addPinyin);
  return useReadingHints("pinyin", text, fetchReadings, enabled);
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
