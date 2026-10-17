/** Compact display without dropping isolated lesson numbers. */
export function lessonNumberRanges(numbers: readonly number[]) {
  const ordered = [...new Set(numbers)].sort((a, b) => a - b);
  const ranges: string[] = [];
  for (let index = 0; index < ordered.length; index++) {
    const first = ordered[index];
    let last = first;
    while (index + 1 < ordered.length && ordered[index + 1] === last + 1) last = ordered[++index];
    ranges.push(first === last ? String(first) : `${first}–${last}`);
  }
  return ranges.join(", ");
}
