/**
 * Japanese conjugation panel.
 *
 * Four-way navigation (not Romance person rows):
 *   ← past          present →
 *   ↑ honorific     plain ↓
 * Center = polite -masu form (default).
 *
 * Bases strip (a/i/u/e/te) sits above the swipe stage so learners see the stem
 * system that generates every form. Full grid lives in the More drawer.
 */

import { useEffect, useRef, useState } from "react";
import { Volume2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import {
  type JapaneseConjugationSet,
  type JapaneseRegister,
  type JapaneseTense,
} from "@/data/japanese-conjugations";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

interface Props {
  set: JapaneseConjugationSet;
  onSpeak: (text: string) => void;
}

const REGISTER_ORDER: JapaneseRegister[] = ["plain", "polite", "honorific"];
const TENSE_ORDER: JapaneseTense[] = ["present", "past"];

export function JapaneseConjugationCard({ set, onSpeak }: Props) {
  const [register, setRegister] = useState<JapaneseRegister>("polite");
  const [tense, setTense] = useState<JapaneseTense>("present");
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const form = set.forms[register][tense];

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (Math.max(absX, absY) < 40) return;

    if (absX > absY) {
      // horizontal → tense
      if (dx < 0) {
        // left = past
        setTense("past");
      } else {
        setTense("present");
      }
    } else {
      // vertical → register
      if (dy < 0) {
        // up = more honorific
        setRegister((r) => {
          const i = REGISTER_ORDER.indexOf(r);
          return REGISTER_ORDER[Math.min(i + 1, REGISTER_ORDER.length - 1)];
        });
      } else {
        // down = more plain
        setRegister((r) => {
          const i = REGISTER_ORDER.indexOf(r);
          return REGISTER_ORDER[Math.max(i - 1, 0)];
        });
      }
    }
  }

  return (
    <div className="space-y-3">
      {/* Bases strip */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {(["a", "i", "u", "e", "te"] as const).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => onSpeak(set.bases[b])}
            className="px-2.5 py-1 rounded-md bg-muted/60 text-xs font-mono text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <span className="text-[10px] uppercase tracking-wider opacity-60">{b}</span>{" "}
            <span className="font-medium text-foreground">{set.bases[b]}</span>
          </button>
        ))}
      </div>

      {/* Swipe stage */}
      <div
        className="relative rounded-xl border border-border/60 bg-card/50 p-4 select-none touch-manipulation"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          <span className={tense === "past" ? "text-primary font-semibold" : ""}>← past</span>
          <span className="font-medium text-foreground/80">
            {register} · {tense}
          </span>
          <span className={tense === "present" ? "text-primary font-semibold" : ""}>present →</span>
        </div>

        <div className="flex flex-col items-center gap-1 py-3">
          <button
            type="button"
            onClick={() => onSpeak(form)}
            className="font-display text-2xl text-foreground hover:text-primary transition-colors"
          >
            {form}
          </button>
          <span className="text-xs text-muted-foreground">{set.english}</span>
        </div>

        <div className="flex items-center justify-center gap-6 text-muted-foreground/50">
          <ChevronUp className="h-4 w-4" />
          <div className="flex gap-8">
            <ChevronLeft className="h-4 w-4" />
            <ChevronRight className="h-4 w-4" />
          </div>
          <ChevronDown className="h-4 w-4" />
        </div>
        <p className="text-center text-[10px] text-muted-foreground/60 mt-1">
          swipe · ↑ honorific · ↓ plain
        </p>
      </div>

      {/* More drawer — full grid */}
      <Drawer>
        <DrawerTrigger asChild>
          <button
            type="button"
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1"
          >
            More conjugations
          </button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle className="font-display">
              {set.infinitive} · full forms
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8 space-y-4 overflow-y-auto">
            {REGISTER_ORDER.map((reg) => (
              <div key={reg}>
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  {reg}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {TENSE_ORDER.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onSpeak(set.forms[reg][t])}
                      className="flex flex-col items-start rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-left hover:bg-muted/60 transition-colors"
                    >
                      <span className="text-[10px] uppercase text-muted-foreground">{t}</span>
                      <span className="font-medium text-sm">{set.forms[reg][t]}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {set.teForm && (
              <div>
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">te / ta</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onSpeak(set.teForm!)}
                    className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-left"
                  >
                    <span className="text-[10px] uppercase text-muted-foreground">te</span>
                    <div className="font-medium text-sm">{set.teForm}</div>
                  </button>
                  {set.taForm && (
                    <button
                      type="button"
                      onClick={() => onSpeak(set.taForm!)}
                      className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-left"
                    >
                      <span className="text-[10px] uppercase text-muted-foreground">ta</span>
                      <div className="font-medium text-sm">{set.taForm}</div>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
