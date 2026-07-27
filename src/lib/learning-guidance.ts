export function dismissLearningHint(storageKey: string) {
  try {
    localStorage.setItem(storageKey, "1");
  } catch {
    /* local guidance remains optional */
  }
  window.dispatchEvent(new CustomEvent("lt:dismiss-learning-hint", { detail: storageKey }));
}
