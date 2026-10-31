import type { LibraryEntry } from "@/state/library-state";

/** Share in-flight requests, retain successful packs, and allow failed imports to retry. */
export function createLibraryPackCache(loaders: Record<string, () => Promise<LibraryEntry[]>>) {
  const requests = new Map<string, Promise<LibraryEntry[]>>();
  return (language: string): Promise<LibraryEntry[]> => {
    const existing = requests.get(language);
    if (existing) return existing;
    const loader = loaders[language];
    if (!loader) return Promise.resolve([]);
    const request = Promise.resolve()
      .then(loader)
      .catch((error: unknown) => {
        requests.delete(language);
        throw error;
      });
    requests.set(language, request);
    return request;
  };
}
