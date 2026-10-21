// Built by TAC — 2026-10-21
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export type PieceKind = "stem" | "ending" | "whole" | "done";

/** Pinned palette. Color is never the only signal: shape and the hyphenated label carry the meaning too. */
export const PIECE_COLORS: Record<PieceKind, string> = {
  stem: "#c9d3e0",
  ending: "#e6c35c",
  whole: "#7fb2e5",
  done: "#8fd1a8",
};

/** Dark ink on every piece color (contrast above 9:1), in both themes. */
const INK = "#0a1220";

const SHAPE: Record<PieceKind, "rounded" | "chevron" | "pill"> = {
  stem: "rounded",
  ending: "chevron",
  whole: "pill",
  done: "pill",
};

const SHAPE_CLASS = {
  rounded: "rounded-lg px-3",
  chevron: "pl-6 pr-3",
  pill: "rounded-full px-4",
} as const;

const CHEVRON_CLIP = "polygon(14px 0, 100% 0, 100% 100%, 14px 100%, 0 50%)";

function describe(kind: PieceKind, label: string): { text: string; aria: string } {
  if (kind === "stem") return { text: `${label}-`, aria: `stem ${label}` };
  if (kind === "ending") return { text: `-${label}`, aria: `ending ${label}` };
  if (kind === "done") return { text: label, aria: `completed form ${label}` };
  return { text: label, aria: `form ${label}` };
}

export function PieceTile(p: {
  kind: PieceKind;
  label: string;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  testId?: string;
}) {
  const reduced = useReducedMotion();
  const { text, aria } = describe(p.kind, p.label);
  const shape = SHAPE[p.kind];
  const interactive = typeof p.onClick === "function";
  const className = [
    "inline-flex min-h-11 select-none items-center justify-center whitespace-nowrap font-mono text-base font-semibold",
    SHAPE_CLASS[shape],
    p.dimmed ? "opacity-40" : "",
    // Dimming is a fade in place; the transitions below never move the tile when motion is reduced.
    reduced ? "" : "transition-[opacity,filter,transform] duration-200",
    interactive ? "cursor-pointer hover:brightness-110" : "",
    interactive && !reduced ? "active:scale-95" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const style = {
    backgroundColor: PIECE_COLORS[p.kind],
    color: INK,
    ...(shape === "chevron" ? { clipPath: CHEVRON_CLIP } : {}),
    // Inset (never an outer glow) so the selection survives the chevron clip-path.
    ...(p.selected ? { boxShadow: `inset 0 0 0 3px ${INK}` } : {}),
  };
  const common = {
    className,
    style,
    "aria-label": aria,
    "data-kind": p.kind,
    "data-shape": shape,
    "data-dimmed": p.dimmed ? "true" : undefined,
    "data-testid": p.testId,
  };
  if (!interactive) return <span {...common}>{text}</span>;
  return (
    <button type="button" {...common} aria-pressed={p.selected ? true : false} onClick={p.onClick}>
      {text}
    </button>
  );
}
