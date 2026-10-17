import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createWordCardCache } from "@/lib/word-card-cache";
const Context = createContext<ReturnType<typeof createWordCardCache> | null>(null);
/** Mounted inside AccountAppProvider, whose key changes on account/guest transitions. */
export function WordCardCacheProvider({ children }: { children: ReactNode }) {
  const [cache] = useState(createWordCardCache);
  useEffect(() => () => cache.clear(), [cache]);
  return <Context.Provider value={cache}>{children}</Context.Provider>;
}
export function useWordCardCache() {
  const cache = useContext(Context);
  if (!cache) throw new Error("WordCardCacheProvider is required");
  return cache;
}
