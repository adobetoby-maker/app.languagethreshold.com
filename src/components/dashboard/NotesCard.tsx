import { useMemo, useState } from "react";
import { Check, NotebookPen, Pencil, PenLine, Plus, Trash2, X } from "lucide-react";
import { useNotes, type Annotation } from "@/state/notes-state";
import { useLibrary } from "@/state/library-state";
import { useApp } from "@/state/app-state";
import { MultilingualNoteInput } from "@/components/notes/MultilingualNoteInput";
import { HandwritingCanvas } from "@/components/kana/HandwritingCanvas";

// Standalone notes added from the Dashboard (not tied to a Reader passage)
// use this sentinel textId so they group separately from real library entries.
// pane/sentenceIndex are fixed placeholders — there is no passage position to record.
const DASHBOARD_TEXT_ID = "dashboard";

export function NotesCard() {
  const { annotations, add, update, remove } = useNotes();
  const {
    state: { entries },
  } = useLibrary();
  const { state } = useApp();

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [drawMode, setDrawMode] = useState(false);

  const titleForText = useMemo(() => {
    const map = new Map(entries.map((e) => [e.id, `${e.flag ?? ""} ${e.title}`.trim()]));
    return (textId: string) => {
      if (textId === DASHBOARD_TEXT_ID) return "Standalone notes";
      return map.get(textId) ?? "Untitled passage";
    };
  }, [entries]);

  const groups = useMemo(() => {
    const byText = new Map<string, Annotation[]>();
    for (const a of annotations) {
      const arr = byText.get(a.textId) ?? [];
      arr.push(a);
      byText.set(a.textId, arr);
    }
    return Array.from(byText.entries())
      .map(([textId, anns]) => {
        const sorted = [...anns].sort((a, b) => b.createdAt - a.createdAt);
        return { textId, anns: sorted, latest: sorted[0]?.createdAt ?? 0 };
      })
      .sort((a, b) => b.latest - a.latest);
  }, [annotations]);

  function handleAdd() {
    const text = draft.trim();
    if (!text) return;
    add({
      textId: DASHBOARD_TEXT_ID,
      pane: "left",
      sentenceIndex: 0,
      selectedText: "",
      noteText: text,
    });
    setDraft("");
    setDrawMode(false);
    setAdding(false);
  }

  function handleCancelAdding() {
    setAdding(false);
    setDrawMode(false);
    setDraft("");
  }

  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="flex items-center gap-2 font-display text-2xl italic text-foreground">
          <NotebookPen className="h-5 w-5 text-gold" strokeWidth={1.6} />
          Notes
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {annotations.length} saved
        </span>
      </div>

      {adding ? (
        <div className="mb-5 rounded-xl border border-gold/40 bg-gold/5 p-3">
          <MultilingualNoteInput
            language={state.selectedLanguage}
            value={draft}
            onChange={setDraft}
            onSave={handleAdd}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                handleCancelAdding();
              }
            }}
            autoFocus
            rows={3}
            className="border-gold/40 bg-background/80 font-mono text-[12px]"
          />
          {drawMode && (
            <div className="mt-3 overflow-hidden rounded-xl border border-gold/20">
              <HandwritingCanvas onRecognized={(text) => setDraft((prev) => prev + text)} insertLabel="Insert →" />
            </div>
          )}
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setDrawMode((v) => !v)}
              title="Draw a character to insert"
              className={`flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors duration-200 ${
                drawMode
                  ? "border-gold/60 bg-gold/10 text-gold"
                  : "border-border/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <PenLine className="h-3 w-3" /> Draw
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelAdding}
                className="flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                <X className="h-3 w-3" /> Cancel
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!draft.trim()}
                className="flex cursor-pointer items-center gap-1 rounded-full bg-gold px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-midnight transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Check className="h-3 w-3" /> Save note
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mb-5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2 text-xs font-semibold text-gold transition-colors duration-200 hover:bg-gold/15"
        >
          <Plus className="h-3.5 w-3.5" /> Add a note
        </button>
      )}

      {annotations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Highlight any sentence in the <span className="text-gold">Reader</span> to save it here
          as a note — or add a standalone thought above.
        </p>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.textId}>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {titleForText(g.textId)}
              </p>
              <ul className="space-y-3">
                {g.anns.map((a) => (
                  <NoteRow
                    key={a.id}
                    ann={a}
                    onSave={(text) => update(a.id, text)}
                    onRemove={() => remove(a.id)}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function NoteRow({
  ann,
  onSave,
  onRemove,
}: {
  ann: Annotation;
  onSave: (text: string) => void;
  onRemove: () => void;
}) {
  const { state } = useApp();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(ann.noteText ?? "");
  const [drawMode, setDrawMode] = useState(false);

  const startEdit = () => {
    setDraft(ann.noteText ?? "");
    setEditing(true);
  };
  const commit = () => {
    onSave(draft.trim());
    setDrawMode(false);
    setEditing(false);
  };
  const cancel = () => {
    setDraft(ann.noteText ?? "");
    setDrawMode(false);
    setEditing(false);
  };

  return (
    <li className="group rounded-xl border border-border/60 bg-background/40 p-3 transition-colors duration-200 hover:border-gold/40">
      {ann.selectedText && (
        <div className="mb-2 rounded-md bg-gold/20 px-2 py-1.5 font-display text-[13px] italic leading-snug text-foreground">
          "{ann.selectedText}"
        </div>
      )}

      {editing ? (
        <div>
          <MultilingualNoteInput
            language={state.selectedLanguage}
            value={draft}
            onChange={setDraft}
            onSave={commit}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
            }}
            autoFocus
            rows={3}
            className="border-gold/40 bg-background/80 font-mono text-[12px]"
          />
          {drawMode && (
            <div className="mt-3 overflow-hidden rounded-xl border border-gold/20">
              <HandwritingCanvas onRecognized={(text) => setDraft((prev) => prev + text)} insertLabel="Insert →" />
            </div>
          )}
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setDrawMode((v) => !v)}
              title="Draw a character to insert"
              className={`flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors duration-200 ${
                drawMode
                  ? "border-gold/60 bg-gold/10 text-gold"
                  : "border-border/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              <PenLine className="h-3 w-3" /> Draw
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancel}
                className="flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                <X className="h-3 w-3" /> Cancel
              </button>
              <button
                type="button"
                onClick={commit}
                className="flex cursor-pointer items-center gap-1 rounded-full bg-gold px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-midnight transition-opacity duration-200 hover:opacity-90"
              >
                <Check className="h-3 w-3" /> Save
              </button>
            </div>
          </div>
        </div>
      ) : ann.noteText ? (
        <button
          type="button"
          onClick={startEdit}
          className="block w-full cursor-text rounded-md px-1 py-0.5 text-left whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground/80 transition-colors duration-200 hover:bg-gold/5"
          title="Click to edit"
        >
          {ann.noteText}
        </button>
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className="flex w-full cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-border/60 px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors duration-200 hover:border-gold/50 hover:text-gold"
        >
          <Pencil className="h-3 w-3" />
          Add a note
        </button>
      )}

      {!editing && (
        <div className="mt-2 flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={startEdit}
            aria-label="Edit note"
            className="cursor-pointer rounded-full p-1.5 text-muted-foreground opacity-60 transition-colors duration-200 hover:bg-gold/15 hover:text-gold group-hover:opacity-100"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Delete note"
            className="cursor-pointer rounded-full p-1.5 text-muted-foreground opacity-60 transition-colors duration-200 hover:bg-destructive/15 hover:text-destructive group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </li>
  );
}
