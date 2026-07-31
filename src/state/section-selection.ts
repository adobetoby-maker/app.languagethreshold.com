/**
 * Study-section selection semantics for the Flashcards studio.
 *
 * The defect this exists to fix: selection defaults to EVERY available section,
 * and the chip handler was a plain add/remove toggle. So a learner who tapped
 * "Vocab (your words) 1/1" — intending to focus on the word they had just saved
 * — hit the branch that REMOVES it. The deck went 95 -> 94, their saved word
 * disappeared, and every unrelated card stayed. The code was doing exactly what
 * it said; the gesture just meant the opposite of the intent.
 *
 * Focus-then-mix: from the default "everything" state the first tap means
 * "show me only this". After that, taps add and remove as before, so mixing
 * still works. Deselecting the last remaining section returns to everything
 * rather than leaving an empty deck.
 */
export function nextSectionSelection(
  previous: readonly string[],
  section: string,
  available: readonly string[],
): string[] {
  const hasEverything =
    available.length > 0 && available.every((candidate) => previous.includes(candidate));

  // First tap out of the default state focuses rather than subtracts.
  if (hasEverything) return [section];

  if (previous.includes(section)) {
    const remaining = previous.filter((candidate) => candidate !== section);
    // An empty deck is never a useful answer to "which sections?".
    return remaining.length > 0 ? remaining : [...available];
  }

  return [...previous, section];
}
