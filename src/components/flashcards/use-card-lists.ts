import { useCallback, useEffect, useState } from "react";
import { useLearnerDeviceStore } from "@/hooks/use-learner-device-store";
import type { FlashcardEntry } from "@/state/flashcard-state";

type CardList = { id: string; name: string; excluded: string[] };
type SavedLists = { active: string; lists: CardList[] };
const initial = (): SavedLists => ({
  active: "default",
  lists: [{ id: "default", name: "My study cards", excluded: [] }],
});
export function useCardLists(target: string, native: string) {
  const store = useLearnerDeviceStore(`card-lists:${target}:${native}`);
  const [loaded, setLoaded] = useState<{ store: typeof store; data: SavedLists } | null>(null);
  useEffect(() => {
    const raw = store.read() as SavedLists | null;
    const valid =
      raw &&
      Array.isArray(raw.lists) &&
      raw.lists.length > 0 &&
      raw.lists.every(
        (list) =>
          list !== null &&
          typeof list === "object" &&
          typeof list.id === "string" &&
          typeof list.name === "string" &&
          Array.isArray(list.excluded) &&
          list.excluded.every((id) => typeof id === "string"),
      ) &&
      raw.lists.some((list) => list.id === raw.active);
    setLoaded({ store, data: valid ? raw : initial() });
  }, [store]);
  const ready = loaded?.store === store;
  const data = ready ? loaded.data : initial();
  const current = data.lists.find((list) => list.id === data.active)!;
  function update(next: SavedLists) {
    if (!ready) return;
    store.write(next);
    setLoaded({ store, data: next });
  }
  const excluded = current.excluded;
  const includes = useCallback(
    (card: FlashcardEntry) => ready && !excluded.includes(card.id),
    [ready, excluded],
  );
  return { data, current, ready, includes, update };
}
