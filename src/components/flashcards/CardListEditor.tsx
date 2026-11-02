import { useState } from "react";
import type { FlashcardEntry } from "@/state/flashcard-state";
import { useCardLists } from "./use-card-lists";

export function CardListEditor({
  lists,
  cards,
}: {
  lists: ReturnType<typeof useCardLists>;
  cards: FlashcardEntry[];
}) {
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const { data, current, ready, update } = lists;
  function setExcluded(excluded: string[]) {
    update({
      ...data,
      lists: data.lists.map((list) => (list.id === current.id ? { ...list, excluded } : list)),
    });
  }
  return (
    <details className="mb-4 rounded-xl border border-border bg-card p-4 text-foreground">
      <summary className="cursor-pointer font-semibold">My card lists · {current.name}</summary>
      <p className="my-3 text-sm">
        Choose the words you want to practice. Turning a word off keeps its review progress. Lists
        are saved for this account and language pair on this device.
      </p>
      <label className="block">
        Study list
        <select
          className="ml-2 max-w-full rounded border border-border bg-background p-2"
          disabled={!ready}
          value={data.active}
          onChange={(event) => update({ ...data, active: event.target.value })}
        >
          {data.lists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </select>
      </label>
      <form
        className="my-3 flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = name.trim();
          if (!trimmed) return;
          if (data.lists.some((list) => list.name.toLowerCase() === trimmed.toLowerCase())) {
            setMessage("Choose a different list name.");
            return;
          }
          const id = crypto.randomUUID();
          update({
            active: id,
            lists: [...data.lists, { id, name: trimmed, excluded: [...current.excluded] }],
          });
          setName("");
          setMessage("List created from your current selection.");
        }}
      >
        <input
          className="min-w-0 rounded border border-border bg-background p-2"
          aria-label="New card list name"
          placeholder="e.g. Week 1 verbs"
          maxLength={60}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button
          disabled={!ready || !name.trim()}
          className="rounded border border-border px-3 py-2"
        >
          Create list
        </button>
      </form>
      <p role="status" className="text-sm">
        {message}
      </p>
      <label className="block my-3">
        Find a word
        <input
          className="ml-2 max-w-full rounded border border-border bg-background p-2"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <div className="my-2 flex gap-3">
        <button
          disabled={!ready}
          onClick={() =>
            setExcluded(current.excluded.filter((id) => !cards.some((card) => card.id === id)))
          }
        >
          Include all shown decks
        </button>
        <button
          disabled={!ready}
          onClick={() =>
            setExcluded([...new Set([...current.excluded, ...cards.map((card) => card.id)])])
          }
        >
          Exclude all shown decks
        </button>
      </div>
      <p className="text-sm mb-2">
        {cards.filter(lists.includes).length} of {cards.length} cards included from the selected
        decks below.
      </p>
      <div className="max-h-80 overflow-y-auto">
        {cards
          .filter((card) =>
            `${card.word} ${card.translation}`.toLowerCase().includes(search.toLowerCase()),
          )
          .map((card) => (
            <label key={card.id} className="flex items-start gap-3 border-t border-border py-3">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0"
                disabled={!ready}
                checked={lists.includes(card)}
                onChange={(event) =>
                  setExcluded(
                    event.target.checked
                      ? current.excluded.filter((id) => id !== card.id)
                      : [...current.excluded, card.id],
                  )
                }
              />
              <span>
                <span className="font-semibold">{card.word}</span>
                <span className="block text-sm">{card.translation}</span>
              </span>
            </label>
          ))}
      </div>
    </details>
  );
}
