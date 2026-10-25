import { useEffect, useRef, useState } from "react";
import { useOwnerResource } from "./use-owner-resource";
import { ownerButton, ownerField } from "./owner-ui";

export function OwnerEmailAI({
  onDraft,
}: {
  onDraft: (draft: { subject: string; body: string }) => void;
}) {
  const resource = useOwnerResource<never>("/api/owner-crm", false);
  const [brief, setBrief] = useState("");
  const [error, setError] = useState("");
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  async function generate() {
    setError("");
    try {
      const result = await resource.run<{ subject: string; body: string }>({
        action: "generate",
        brief,
      });
      if (result && live.current) onDraft(result);
    } catch {
      if (live.current)
        setError("Draft generation was not completed. Your current message is unchanged.");
    }
  }
  return (
    <fieldset className="grid gap-2 rounded-lg border border-border p-3">
      <legend className="px-1 font-medium">AI writing assistant</legend>
      <p className="text-sm">
        Only the brief below is sent to the existing AI provider. Contact notes, recipient details
        and ad links are not included automatically. Review every claim before use.
      </p>
      <label>
        Brief for AI
        <textarea
          className={ownerField}
          rows={3}
          maxLength={2000}
          value={brief}
          disabled={resource.busy}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="Write a friendly note asking a reviewer for feedback on our existing ads."
        />
      </label>
      <button
        type="button"
        className={ownerButton}
        disabled={resource.busy || brief.trim().length < 10}
        onClick={() => void generate()}
      >
        {resource.busy ? "Writing draft…" : "Generate editable draft"}
      </button>
      {error && <p role="alert">{error}</p>}
    </fieldset>
  );
}
