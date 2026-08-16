import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFuriganaSegments } from "@/components/reader/FuriganaText";

const LONG_PRESS_MS = 475;
const MOVE_TOLERANCE_PX = 10;

type WordToken = {
  text: string;
  word: string | null;
};

function scriptOf(character: string): "kanji" | "kana" | "ascii" | "punctuation" {
  const codePoint = character.codePointAt(0) ?? 0;
  if (
    (codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
    (codePoint >= 0x3400 && codePoint <= 0x4dbf) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff)
  ) {
    return "kanji";
  }
  if (codePoint >= 0x3040 && codePoint <= 0x30ff) return "kana";
  if (
    (codePoint >= 0x0041 && codePoint <= 0x005a) ||
    (codePoint >= 0x0061 && codePoint <= 0x007a) ||
    (codePoint >= 0x0030 && codePoint <= 0x0039)
  ) {
    return "ascii";
  }
  return "punctuation";
}

function tokenizeJapanese(text: string): WordToken[] {
  const tokens: WordToken[] = [];
  let current = "";
  let currentScript: ReturnType<typeof scriptOf> | null = null;

  const flush = () => {
    if (!current) return;
    tokens.push({
      text: current,
      word: currentScript === "punctuation" ? null : current,
    });
    current = "";
  };

  for (const character of text) {
    if (/\s/u.test(character)) {
      flush();
      tokens.push({ text: character, word: null });
      currentScript = null;
      continue;
    }

    const nextScript = scriptOf(character);
    if (nextScript !== currentScript) {
      flush();
      currentScript = nextScript;
    }
    current += character;
  }

  flush();
  return tokens;
}

function tokenizeWords(text: string): WordToken[] {
  if (/[぀-ヿ]/u.test(text)) return tokenizeJapanese(text);

  return text.split(/(\s+)/).map((token) => {
    if (!token || /^\s+$/u.test(token)) return { text: token, word: null };
    const word = token.replace(/^[¿¡«"'([]+|[.,;:!?»"')\]]+$/g, "");
    return { text: token, word: word || null };
  });
}

function LongPressWord({
  display,
  word,
  sentence,
  onWordLookup,
}: {
  display: string;
  word: string;
  sentence: string;
  onWordLookup: (word: string, sentence: string, x: number, y: number) => void;
}) {
  const timerRef = useRef<number | null>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const activatedRef = useRef(false);

  const cancelTimer = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    originRef.current = null;
  }, []);

  useEffect(() => cancelTimer, [cancelTimer]);

  const activate = useCallback(
    (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      onWordLookup(word, sentence, rect.left + rect.width / 2, rect.bottom);
    },
    [onWordLookup, sentence, word],
  );

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={`Define ${word}`}
      className="lt-speak-word"
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        cancelTimer();
        activatedRef.current = false;
        originRef.current = { x: event.clientX, y: event.clientY };
        const element = event.currentTarget;
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          activatedRef.current = true;
          activate(element);
        }, LONG_PRESS_MS);
      }}
      onPointerMove={(event) => {
        const origin = originRef.current;
        if (!origin) return;
        if (
          Math.abs(event.clientX - origin.x) > MOVE_TOLERANCE_PX ||
          Math.abs(event.clientY - origin.y) > MOVE_TOLERANCE_PX
        ) {
          cancelTimer();
        }
      }}
      onPointerUp={cancelTimer}
      onPointerCancel={cancelTimer}
      onPointerLeave={cancelTimer}
      onClick={(event) => {
        if (!activatedRef.current && event.detail === 0) {
          activate(event.currentTarget);
          return;
        }
        if (!activatedRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        activatedRef.current = false;
      }}
      onContextMenu={(event) => {
        if (activatedRef.current) event.preventDefault();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        activate(event.currentTarget);
      }}
    >
      {display}
    </span>
  );
}

export function LongPressWordText({
  text,
  onWordLookup,
  furigana = false,
}: {
  text: string;
  onWordLookup: (word: string, sentence: string, x: number, y: number) => void;
  /**
   * Render kanji with their readings above (Japanese only). Off by default so
   * every other language keeps the plain tokenized output.
   */
  furigana?: boolean;
}) {
  if (furigana) {
    return <FuriganaLongPressText text={text} onWordLookup={onWordLookup} />;
  }
  return <PlainLongPressText text={text} onWordLookup={onWordLookup} />;
}

function PlainLongPressText({
  text,
  onWordLookup,
}: {
  text: string;
  onWordLookup: (word: string, sentence: string, x: number, y: number) => void;
}) {
  const tokens = useMemo(() => tokenizeWords(text), [text]);

  return (
    <>
      {tokens.map((token, index) =>
        token.word ? (
          <LongPressWord
            key={`${index}-${token.text}`}
            display={token.text}
            word={token.word}
            sentence={text}
            onWordLookup={onWordLookup}
          />
        ) : (
          <span key={`${index}-${token.text}`}>{token.text}</span>
        ),
      )}
    </>
  );
}

/**
 * Japanese with readings. Segments come from the same server call and cache the
 * Reader uses, so a sentence already annotated elsewhere costs nothing here.
 * Each segment stays individually long-pressable — the ruby wraps the same
 * <LongPressWord>, so adding readings never costs the lookup gesture.
 */
function FuriganaLongPressText({
  text,
  onWordLookup,
}: {
  text: string;
  onWordLookup: (word: string, sentence: string, x: number, y: number) => void;
}) {
  const segments = useFuriganaSegments(text);

  // Until readings arrive, render the normal tokenized text so nothing jumps
  // and long-press keeps working.
  if (!segments) return <PlainLongPressText text={text} onWordLookup={onWordLookup} />;

  return (
    <>
      {segments.map((segment, index) => {
        if (!segment.hiragana) {
          return (
            <PlainLongPressText
              key={`${index}-${segment.base}`}
              text={segment.base}
              onWordLookup={onWordLookup}
            />
          );
        }
        return (
          <ruby key={`${index}-${segment.base}`} className="furigana-ruby">
            <LongPressWord
              display={segment.base}
              word={segment.base}
              sentence={text}
              onWordLookup={onWordLookup}
            />
            <rt className="furigana-rt">{segment.hiragana}</rt>
          </ruby>
        );
      })}
    </>
  );
}
