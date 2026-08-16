import { useState } from "react";
import { ChevronRight, Trash2, NotebookPen, Pencil, PenLine, Check, X } from "lucide-react";
import { useNotes, type Annotation } from "@/state/notes-state";
import { useApp } from "@/state/app-state";
import { MultilingualNoteInput } from "@/components/notes/MultilingualNoteInput";
import { HandwritingCanvas } from "@/components/kana/HandwritingCanvas";

export function NotesPanel({
  textId,
  onGoTo,
}: {
  textId: string;
  onGoTo: (pane: "left" | "right", sentenceIndex: number) => void;
}) {
  const { forText, remove, update } = useNotes();
  const [open, setOpen] = useState(false);
  const list = forText(textId).sort((a, b) => b.createdAt - a.createdAt);
  const noteCount = list.filter((a) => a.noteText).length;

  return (
    <>
      {/* Tab handle */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle notes panel"
        className="fixed right-0 top-1/2 z-30 -translate-y-1/2 rounded-l-2xl border border-r-0 border-gold/40 bg-card/90 px-2 py-4 shadow-luxe backdrop-blur transition-colors hover:bg-gold/10"
      >
        <div className="flex flex-col items-center gap-2">
          <NotebookPen className="h-4 w-4 text-gold" />
          <span className="rounded-full bg-gold px-1.5 py-0.5 font-mono text-[9px] font-semibold text-midnight">
            {list.length}
          </span>
          <ChevronRight
            className={`h-3 w-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Drawer */}
      <aside
        aria-hidden={!open}
        className={`fixed right-0 top-0 z-40 h-screen w-[360px] max-w-[88vw] transform border-l border-gold/30 bg-card/95 shadow-luxe backdrop-blur-xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-gold">✦</span>
            <h3 className="font-display text-lg italic text-foreground">Margin Notes</h3>
          </div>
          <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
            {noteCount} note{noteCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="custom-scroll h-[calc(100vh-66px)] overflow-y-auto px-4 py-4">
          {list.length === 0 ? (
            <div className="mt-16 px-6 text-center">
              <div className="mx-auto mb-3 text-3xl text-gold">✦</div>
              <p className="font-display text-sm italic text-muted-foreground">
                Select any text to add your first note
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {list.map((a) => (
                <NoteCard
                  key={a.id}
                  ann={a}
                  onGoTo={onGoTo}
                  onRemove={() => remove(a.id)}
                  onSave={(text) => update(a.id, text)}
                />
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}

function NoteCard({
  ann,
  onGoTo,
  onRemove,
  onSave,
}: {
  ann: Annotation;
  onGoTo: (pane: "left" | "right", sentenceIndex: number) => void;
  onRemove: () => void;
  onSave: (text: string) => void;
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
    <li className="group rounded-xl border border-border/60 bg-background/40 p-3 transition-colors hover:border-gold/40">
      <div className="mb-2 rounded-md bg-gold/20 px-2 py-1.5 font-display text-[13px] italic leading-snug text-foreground">
        "{ann.selectedText}"
      </div>

      {editing ? (
        <div className="mb-2">
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
              <HandwritingCanvas onRecognized={(text) => setDraft((prev) => prev + text)} />
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
                onClick={cancel}
                className="flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" /> Cancel
              </button>
              <button
                onClick={commit}
                className="flex items-center gap-1 rounded-full bg-gold px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-midnight hover:opacity-90"
              >
                <Check className="h-3 w-3" /> Save
              </button>
            </div>
          </div>
        </div>
      ) : ann.noteText ? (
        <button
          onClick={startEdit}
          className="mb-2 block w-full cursor-text rounded-md px-1 py-0.5 text-left whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground/80 transition-colors hover:bg-gold/5"
          title="Click to edit"
        >
          {ann.noteText}
        </button>
      ) : (
        <button
          onClick={startEdit}
          className="mb-2 flex w-full items-center gap-1.5 rounded-md border border-dashed border-border/60 px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-gold/50 hover:text-gold"
        >
          <Pencil className="h-3 w-3" />
          Add a note
        </button>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => onGoTo(ann.pane, ann.sentenceIndex)}
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold hover:underline"
        >
          ↳ Go to {ann.pane === "left" ? "English" : "target"}
        </button>
        <div className="flex items-center gap-1">
          {!editing && (
            <button
              onClick={startEdit}
              aria-label="Edit note"
              className="rounded-full p-1.5 text-muted-foreground opacity-60 transition-colors hover:bg-gold/15 hover:text-gold group-hover:opacity-100"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={onRemove}
            aria-label="Delete note"
            className="rounded-full p-1.5 text-muted-foreground opacity-60 transition-colors hover:bg-destructive/15 hover:text-destructive group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </li>
  );
}
