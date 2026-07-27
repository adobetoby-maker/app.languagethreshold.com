export function dismissLearningHint(storageKey: string) {
  try {
    localStorage.setItem(storageKey, "1");
  } catch {
    /* local guidance remains optional */
  }
  window.dispatchEvent(new CustomEvent("lt:dismiss-learning-hint", { detail: storageKey }));
}

/**
 * Per-pane tap counting for the Reader training demo.
 *
 * The demo block used to disappear on the very first word tap, which taught
 * only half the move: a learner could tap the target column three times and
 * never discover that the native column works the same way. It now persists
 * until BOTH sides have been used, so dismissal is evidence the learner has
 * actually exercised the whole interaction.
 */
const TAP_KEY = "lt.guide.reader.tapCounts";
export const TAPS_REQUIRED_PER_PANE = 3;

type TapCounts = { left: number; right: number };

export function readTapCounts(): TapCounts {
  try {
    const raw = localStorage.getItem(TAP_KEY);
    if (!raw) return { left: 0, right: 0 };
    const parsed = JSON.parse(raw) as Partial<TapCounts>;
    return { left: parsed.left ?? 0, right: parsed.right ?? 0 };
  } catch {
    return { left: 0, right: 0 };
  }
}

export function bothPanesPractised(counts: TapCounts = readTapCounts()): boolean {
  return counts.left >= TAPS_REQUIRED_PER_PANE && counts.right >= TAPS_REQUIRED_PER_PANE;
}

/**
 * Records a tap and dismisses `storageKey` once both panes have met the
 * threshold. Returns the updated counts so callers can drive progress UI.
 */
export function recordPaneTap(pane: "left" | "right", storageKey: string): TapCounts {
  const counts = readTapCounts();
  counts[pane] += 1;
  try {
    localStorage.setItem(TAP_KEY, JSON.stringify(counts));
  } catch {
    /* guidance is optional; a failed write just means it lingers */
  }
  if (bothPanesPractised(counts)) dismissLearningHint(storageKey);
  window.dispatchEvent(new CustomEvent("lt:pane-tap", { detail: counts }));
  return counts;
}

/**
 * Keyboard access for tappable Reader words. Synthesis correction 7.
 *
 * Words render as <span onClick>, which is unreachable by keyboard and invisible
 * to assistive tech. Spreading these props makes each word a real button stop
 * and activates it on Enter/Space by replaying the click the element already
 * carries — so no renderer needs its own handler duplicated.
 */
export function wordKeyActivation(event: React.KeyboardEvent<HTMLElement>) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  event.currentTarget.click();
}

export const wordA11yProps = {
  role: "button" as const,
  tabIndex: 0,
  onKeyDown: wordKeyActivation,
};
