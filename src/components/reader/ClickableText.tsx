type Script = "kanji" | "kana" | "ascii" | "punct";

function scriptOf(ch: string): Script {
  const cp = ch.codePointAt(0) ?? 0;
  if (
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0xf900 && cp <= 0xfaff)
  )
    return "kanji";
  if (cp >= 0x3040 && cp <= 0x30ff) return "kana"; // hiragana + katakana
  if (
    (cp >= 0x0041 && cp <= 0x005a) ||
    (cp >= 0x0061 && cp <= 0x007a) ||
    (cp >= 0x0030 && cp <= 0x0039)
  )
    return "ascii";
  return "punct";
}

type JToken = { text: string; clickable: boolean };

function tokenizeJapanese(text: string): JToken[] {
  const result: JToken[] = [];
  let cur = "";
  let curScript: Script | null = null;

  const flush = () => {
    if (!cur) return;
    result.push({ text: cur, clickable: curScript !== "punct" });
    cur = "";
  };

  for (const ch of text) {
    if (/\s/u.test(ch)) {
      flush();
      result.push({ text: ch, clickable: false });
      curScript = null;
    } else {
      const s = scriptOf(ch);
      if (s !== curScript) {
        flush();
        curScript = s;
      }
      cur += ch;
    }
  }
  flush();
  return result;
}

/**
 * Shared word-affordance class. Defined in styles.css as `.lt-word` so the
 * hover-capable and touch variants can be expressed as real media queries —
 * Tailwind's `hover:` alone silently does nothing on touch, which is what hid
 * the signature Reader interaction on mobile. DUO-002 P0-2.
 *
 * Exported so AnnotatedSentence and FuriganaText share one definition instead
 * of each carrying a copy that can drift.
 */
export const CLICK_CLASS = "lt-word";

export function ClickableText({
  text,
  onWordClick,
}: {
  text: string;
  onWordClick: (word: string, sentence: string, x: number, y: number) => void;
}) {
  // Japanese text contains hiragana/katakana — tokenize by script boundary
  if (/[぀-ヿ]/u.test(text)) {
    const tokens = tokenizeJapanese(text);
    return (
      <>
        {tokens.map((tok, i) => {
          if (!tok.clickable) return <span key={i}>{tok.text}</span>;
          return (
            <span
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                onWordClick(tok.text, text, r.left + r.width / 2, r.bottom);
              }}
              className={CLICK_CLASS}
            >
              {tok.text}
            </span>
          );
        })}
      </>
    );
  }

  // Whitespace-based tokenization for all other languages
  const tokens = text.split(/(\s+)/);
  return (
    <>
      {tokens.map((tok, i) => {
        if (/^\s+$/.test(tok)) return <span key={i}>{tok}</span>;
        const clean = tok.replace(/^[¿¡«"'([]+|[.,;:!?»"')\]]+$/g, "");
        if (!clean) return <span key={i}>{tok}</span>;
        return (
          <span
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              onWordClick(clean, text, r.left + r.width / 2, r.bottom);
            }}
            className={CLICK_CLASS}
          >
            {tok}
          </span>
        );
      })}
    </>
  );
}
