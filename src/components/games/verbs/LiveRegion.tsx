// Built by TAC — 2026-10-21
/** Screen-reader announcements for the target, each completion with its English, and each miss with its reason. */
export function LiveRegion(p: { message: string }) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" data-testid="live-region">
      {p.message}
    </div>
  );
}
