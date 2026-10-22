// Built by TAC — 2026-10-21
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/** Always rendered at a fixed height so a miss never shifts the board. Screen readers hear it through LiveRegion. */
export function ReasonBand(p: { text: string | null }) {
  const reduced = useReducedMotion();
  const shown = p.text !== null && p.text !== "";
  return (
    <div
      data-testid="reason-band"
      data-state={shown ? "shown" : "idle"}
      className={`flex h-14 items-center rounded-lg border px-3 text-sm leading-snug sm:h-12 ${
        reduced ? "" : "transition-opacity duration-150"
      } ${shown ? "opacity-100" : "opacity-0"}`}
      style={{
        backgroundColor: shown ? "#2a1414" : "transparent",
        borderColor: shown ? "#7a3b3b" : "transparent",
        color: "#f4f1e8",
      }}
    >
      <span className="line-clamp-2">{p.text ?? ""}</span>
    </div>
  );
}
