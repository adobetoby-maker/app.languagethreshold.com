// Built by TAC — 2026-10-21
export type PieceKind = "stem" | "ending" | "whole" | "done";

/** Pinned palette. Color is never the only signal: shape and the hyphenated label carry the meaning too. */
export const PIECE_COLORS: Record<PieceKind, string> = {
  stem: "#c9d3e0",
  ending: "#e6c35c",
  whole: "#7fb2e5",
  done: "#8fd1a8",
};
