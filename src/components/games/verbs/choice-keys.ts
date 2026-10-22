// Built by TAC — 2026-10-21
export const MAX_CHOICES = 6;

/** The option a number key picks: keys 1-6 map to positions, and disabled or missing options map to null. */
export function choiceForKey(key: string, options: { id: number }[], disabled: number[]): number | null {
  if (!/^[1-6]$/.test(key)) return null;
  const option = options.slice(0, MAX_CHOICES)[Number(key) - 1];
  if (!option || disabled.includes(option.id)) return null;
  return option.id;
}
