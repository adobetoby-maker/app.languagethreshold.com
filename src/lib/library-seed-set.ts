import type { LibraryEntry } from "@/state/library-state";

/** Keep visited modules in this language; preserve learner-owned custom books. */
export function appendLanguageSeeds(
  current: LibraryEntry[],
  incoming: LibraryEntry[],
  language: string,
): LibraryEntry[] {
  const entries = current.filter(
    (entry) => entry.section === "custom" || entry.language === language,
  );
  const ids = new Set(entries.map((entry) => entry.id));
  for (const entry of incoming) {
    if (entry.language !== language || ids.has(entry.id)) continue;
    entries.push(entry);
    ids.add(entry.id);
  }
  return entries;
}
