// Built by TAC — 2026-10-21
export const LONG_PRESS_MS = 500;

/**
 * Save-on-long-press for a completion, kept apart from React so it can be tested with fake timers.
 * - `start(value)` captures the value when the press begins, so a later completion never gets saved by mistake.
 * - `save(value)` is the immediate path (right-click, keyboard). Both paths share one dedupe: a value whose
 *   `t` was already saved is ignored, so a long-press plus the `contextmenu` event it triggers saves once.
 */
export function createLongPress<T extends { t: number }>(onSave: (value: T) => void, ms: number = LONG_PRESS_MS) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastSavedT: number | null = null;
  const cancel = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  const save = (value: T) => {
    if (lastSavedT === value.t) return;
    lastSavedT = value.t;
    onSave(value);
  };
  const start = (value: T) => {
    cancel();
    timer = setTimeout(() => {
      timer = null;
      save(value);
    }, ms);
  };
  return { start, cancel, save };
}

/** True for a bare "S" press that should save the showing card; false inside editable fields or with a modifier. */
export function isSaveKey(e: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  repeat?: boolean;
  target?: EventTarget | { tagName?: string; isContentEditable?: boolean } | null;
}): boolean {
  if (e.key.toLowerCase() !== "s" || e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return false;
  const t = e.target as { tagName?: string; isContentEditable?: boolean } | null | undefined;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName ?? ""))) return false;
  return true;
}
