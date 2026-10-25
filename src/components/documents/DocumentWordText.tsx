import { useRef, useState } from "react";
import { ownedTeamRequest, type TeamRequestOwner } from "@/lib/team-client";
import {
  documentWordParts,
  isDocumentWord,
  documentWordKey,
  type DocumentWordCard,
  type InitialDocumentDefinition,
} from "@/lib/document-words";

export function DocumentWordText({
  text,
  documentId,
  passage,
  side,
  owner,
  definitions,
}: {
  text: string;
  documentId: string;
  passage: number;
  side: "en" | "target";
  owner: TeamRequestOwner;
  definitions?: InitialDocumentDefinition[];
}) {
  const [result, setResult] = useState<{
    word: string;
    card?: DocumentWordCard;
    error?: string;
    loading?: boolean;
  } | null>(null);
  const sequence = useRef(0);
  async function lookup(word: string) {
    const current = ++sequence.current;
    const initial = definitions?.find(
      (entry) => entry.side === side && entry.word === documentWordKey(word),
    );
    if (initial) {
      setResult({ word, card: initial.card });
      return;
    }
    setResult({ word, loading: true });
    try {
      const response = await ownedTeamRequest<{ card: DocumentWordCard }>(owner, "/api/documents", {
        action: "lookup",
        id: documentId,
        passage,
        side,
        word,
      });
      if (owner.isCurrent() && sequence.current === current)
        setResult({ word, card: response.card });
    } catch (error) {
      if (owner.isCurrent() && sequence.current === current)
        setResult({
          word,
          error: error instanceof Error ? error.message : "Could not look up this word.",
        });
    }
  }
  return (
    <div className="document-word-text">
      <p>
        {documentWordParts(text).map((part, i) =>
          isDocumentWord(part) ? (
            <button
              type="button"
              className="document-word"
              key={i}
              aria-label={`Define ${part}`}
              onClick={() => void lookup(part)}
            >
              {part}
            </button>
          ) : (
            part
          ),
        )}
      </p>
      {result && (
        <aside
          className="document-definition"
          aria-label={`Definition of ${result.word}`}
          aria-live="polite"
        >
          <button
            type="button"
            className="document-definition-close"
            aria-label="Close definition"
            onClick={() => {
              sequence.current++;
              setResult(null);
            }}
          >
            ×
          </button>
          <strong>{result.card?.headword ?? result.word}</strong>
          {result.loading && <p>Looking up this word…</p>}
          {result.error && (
            <p role="alert">
              {result.error}{" "}
              <button type="button" onClick={() => void lookup(result.word)}>
                Retry
              </button>
            </p>
          )}
          {result.card && (
            <>
              <p>{result.card.meaning}</p>
              {result.card.grammar && <p>{result.card.grammar}</p>}
              {result.card.context && <p>{result.card.context}</p>}
              <small>
                Saved privately with this document. Reopening uses no translation characters.
              </small>
            </>
          )}
        </aside>
      )}
    </div>
  );
}
