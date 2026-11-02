import type { SrsGrade } from "./srs";
export const SRS_RATINGS: { grade: SrsGrade; label: string; cls: string }[] = [
  { grade: "again", label: "Again", cls: "border-rose-400 bg-rose-300 text-rose-950" },
  { grade: "hard", label: "Hard", cls: "border-amber-400 bg-amber-300 text-amber-950" },
  { grade: "good", label: "Good", cls: "border-emerald-400 bg-emerald-300 text-emerald-950" },
  { grade: "easy", label: "Easy", cls: "border-sky-400 bg-sky-300 text-sky-950" },
];
