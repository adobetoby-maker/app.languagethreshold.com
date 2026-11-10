import { useState } from "react";
import { Pencil, Eye, Mail } from "lucide-react";
import { TraceMode } from "./TraceMode";
import { MissingHalfMode } from "./MissingHalfMode";
import { PenPalMode } from "./PenPalMode";
import { HIRAGANA_GROUPS, KATAKANA_GROUPS, PRACTICE_WORDS, PRACTICE_SENTENCES } from "./curriculum";

type Mode = "trace" | "complete" | "penpal";
type Script = "hiragana" | "katakana";

const MODES: { id: Mode; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    id: "trace",
    label: "Trace",
    icon: <Pencil className="h-4 w-4" />,
    desc: "Follow the dotted guide",
  },
  {
    id: "complete",
    label: "Complete",
    icon: <Eye className="h-4 w-4" />,
    desc: "Remember the missing half",
  },
  {
    id: "penpal",
    label: "Pen Pal",
    icon: <Mail className="h-4 w-4" />,
    desc: "Write a real letter",
  },
];

export function KanaWritingPad({ fullScreen = false }: { fullScreen?: boolean }) {
  const [mode, setMode] = useState<Mode>("trace");
  const [script, setScript] = useState<Script>("hiragana");
  const [groupIndex, setGroupIndex] = useState(0);

  const groups = script === "hiragana" ? HIRAGANA_GROUPS : KATAKANA_GROUPS;
  const group = groups[groupIndex];
  const words = PRACTICE_WORDS[group.id] ?? [];
  const sentence = PRACTICE_SENTENCES.find((s) =>
    s.kana.split("").some((c) => group.chars.includes(c)),
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">
            iPad Writing Practice
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Grab your iPad and practise writing characters — just like a Japanese primary school
            workbook.
          </p>
        </div>
        <span className="text-2xl">✏️</span>
      </div>

      {/* Mode tabs */}
      <div className="grid grid-cols-3 gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            data-active={mode === m.id}
            className="flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition-all data-[active=true]:border-gold data-[active=true]:bg-gold/10 data-[active=true]:text-gold data-[active=false]:border-border/60 data-[active=false]:text-muted-foreground hover:border-gold/40"
          >
            {m.icon}
            <span className="text-xs font-semibold">{m.label}</span>
            <span className="text-[10px] leading-tight opacity-70">{m.desc}</span>
          </button>
        ))}
      </div>

      {/* Script + group selectors (not shown for pen pal mode) */}
      {mode !== "penpal" && (
        <div className="flex flex-col gap-3">
          {/* Script toggle */}
          <div className="flex gap-2">
            {(["hiragana", "katakana"] as Script[]).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setScript(s);
                  setGroupIndex(0);
                }}
                data-active={script === s}
                className="rounded-full border px-4 py-1.5 font-mono text-xs transition-all data-[active=true]:border-gold data-[active=true]:bg-gold/10 data-[active=true]:text-gold data-[active=false]:border-border/60 data-[active=false]:text-muted-foreground hover:border-gold/40"
              >
                {s === "hiragana" ? "ひらがな Hiragana" : "カタカナ Katakana"}
              </button>
            ))}
          </div>

          {/* Group pills */}
          <div className="flex flex-wrap gap-1.5">
            {groups.map((g, i) => (
              <button
                key={g.id}
                onClick={() => setGroupIndex(i)}
                aria-label={g.name}
                data-active={groupIndex === i}
                className="rounded-full border px-2.5 py-1 font-mono text-[10px] transition-all data-[active=true]:border-gold data-[active=true]:bg-gold/10 data-[active=true]:text-gold data-[active=false]:border-border/50 data-[active=false]:text-muted-foreground/70 hover:border-gold/40"
              >
                {g.name.split(" ")[0]}
              </button>
            ))}
          </div>
          {script === "hiragana" && groupIndex >= 10 && (
            <p className="text-sm text-muted-foreground">
              {group.id === "h-p"
                ? "The small circle (゜) changes an H-row sound to P, as in ぷ in きっぷ."
                : `Two small marks (゛) voice the base row's sound. Practice the marked sign in ${words[0]?.kana}.`}
            </p>
          )}
        </div>
      )}

      {/* Mode content */}
      <div
        className={
          fullScreen
            ? "flex-1 rounded-2xl border border-border/40 bg-card/40 p-4"
            : "rounded-2xl border border-border/40 bg-card/40 p-5"
        }
      >
        {mode === "trace" && (
          <TraceMode key={group.id} group={group} words={words} sentence={sentence} fullScreen={fullScreen} />
        )}
        {mode === "complete" && <MissingHalfMode key={group.id} group={group} />}
        {mode === "penpal" && <PenPalMode />}
      </div>
    </div>
  );
}
