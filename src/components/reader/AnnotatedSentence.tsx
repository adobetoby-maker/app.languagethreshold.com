import type { Annotation } from "@/state/notes-state";

/**
 * Renders a sentence with all annotations applied as overlapping spans.
 * Words remain clickable. Selection is captured at the parent paragraph level.
 *
 * Strategy: split sentence into [start, end) segments based on annotation ranges
 * computed from `selectedText` matches (first occurrence per annotation).
 * Within each segment we still tokenize for word-clicks.
 */
export function AnnotatedSentence({
  text,
  annotations,
  onWordClick,
}: {
  text: string;
  annotations: Annotation[];
  onWordClick: (word: string, sentence: string, x: number, y: number) => void;
}) {
  // Build ranges
  const ranges: { start: number; end: number; ann: Annotation; noteIndex: number }[] = [];
  const sortedByCreation = [...annotations].sort((a, b) => a.createdAt - b.createdAt);
  let noteCounter = 0;
  for (const ann of sortedByCreation) {
    const idx = text.indexOf(ann.selectedText);
    if (idx === -1) continue;
    const isNote = !!ann.noteText;
    if (isNote) noteCounter += 1;
    ranges.push({
      start: idx,
      end: idx + ann.selectedText.length,
      ann,
      noteIndex: isNote ? noteCounter : 0,
    });
  }
  ranges.sort((a, b) => a.start - b.start);

  // Build cut points
  const cuts = new Set<number>([0, text.length]);
  for (const r of ranges) {
    cuts.add(r.start);
    cuts.add(r.end);
  }
  const points = Array.from(cuts).sort((a, b) => a - b);

  const segments: { from: number; to: number; covering: typeof ranges }[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    if (from === to) continue;
    const covering = ranges.filter((r) => r.start <= from && r.end >= to);
    segments.push({ from, to, covering });
  }

  return (
    <>
      {segments.map((seg, i) => {
        const slice = text.slice(seg.from, seg.to);
        const hasNote = seg.covering.some((r) => !!r.ann.noteText);
        const hasHighlight = seg.covering.some((r) => !r.ann.noteText);
        const noteIdx = seg.covering.find((r) => !!r.ann.noteText)?.noteIndex;
        const isStartOfNote =
          hasNote && seg.covering.some((r) => !!r.ann.noteText && r.start === seg.from);

        // Show superscript only at the END of the noted range
        const isEndOfNote =
          hasNote && seg.covering.some((r) => !!r.ann.noteText && r.end === seg.to);

        const className = [
          hasHighlight ? "rounded-sm bg-gold/35 px-0.5" : "",
          hasNote
            ? "decoration-gold decoration-2 underline-offset-4 [text-decoration-line:underline]"
            : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <span key={i} className={className} data-note-start={isStartOfNote || undefined}>
            <Tokens text={slice} fullSentence={text} onWordClick={onWordClick} />
            {isEndOfNote && noteIdx ? (
              <sup className="ml-0.5 font-mono text-[9px] text-gold">{toSuperscript(noteIdx)}</sup>
            ) : null}
          </span>
        );
      })}
    </>
  );
}

function toSuperscript(n: number) {
  const map: Record<string, string> = {
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
  };
  return String(n)
    .split("")
    .map((c) => map[c] ?? c)
    .join("");
}

function Tokens({
  text,
  fullSentence,
  onWordClick,
}: {
  text: string;
  fullSentence: string;
  onWordClick: (w: string, sentence: string, x: number, y: number) => void;
}) {
  const tokens = text.split(/(\s+)/);
  return (
    <>
      {tokens.map((tok, i) => {
        if (/^\s+$/.test(tok) || tok === "") return <span key={i}>{tok}</span>;
        const clean = tok.replace(/^[¿¡«"'([]+|[.,;:!?»"')\]]+$/g, "");
        if (!clean) return <span key={i}>{tok}</span>;
        return (
          <span
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
              onWordClick(clean, fullSentence, r.left + r.width / 2, r.bottom);
            }}
            className="lt-word"
          >
            {tok}
          </span>
        );
      })}
    </>
  );
}
