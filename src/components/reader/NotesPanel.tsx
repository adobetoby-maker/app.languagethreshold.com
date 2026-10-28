import { useState } from "react";
import { ChevronRight, Trash2, NotebookPen, Pencil, PenLine, Check, Plus, X } from "lucide-react";
import { useNotes, type Annotation } from "@/state/notes-state";
import { useApp } from "@/state/app-state";
import { MultilingualNoteInput } from "@/components/notes/MultilingualNoteInput";
import { HandwritingCanvas } from "@/components/kana/HandwritingCanvas";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function NotesPanel({
  textId,
  onGoTo,
  inlineOnPhone = false,
}: {
  textId: string;
  inlineOnPhone?: boolean;
  onGoTo: (pane: "left" | "right", sentenceIndex: number) => void;
}) {
  const { forText, add, remove, update } = useNotes();
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [drawMode, setDrawMode] = useState(false);
  const list = forText(textId).sort((a, b) => b.createdAt - a.createdAt);
  const noteCount = list.filter((a) => a.noteText).length;

  function saveNote() {
    const noteText = draft.trim();
    if (!noteText) return;
    add({ textId, pane: "left", sentenceIndex: 0, selectedText: "", noteText });
    setDraft("");
    setDrawMode(false);
    setAdding(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open margin notes"
          className={`${inlineOnPhone ? "reader-notes-trigger desktop:fixed desktop:right-0 desktop:top-1/2 desktop:-translate-y-1/2" : "fixed right-0 top-1/2 -translate-y-1/2"} z-30 rounded-l-2xl border border-r-0 border-gold/40 bg-card/90 px-2 py-4 shadow-luxe backdrop-blur transition-colors hover:bg-gold/10`}
        >
          <span className="flex flex-col items-center gap-2">
            <NotebookPen className="h-4 w-4 text-gold" />
            <span className="rounded-full bg-gold px-1.5 py-0.5 font-mono text-[9px] font-semibold text-midnight">
              {list.length}
            </span>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          </span>
        </button>
      </SheetTrigger>

      <SheetContent
        scrollBody
        side="right"
        className="h-dvh w-[360px] max-w-[88vw] border-l border-gold/30 bg-card/95 p-0 shadow-luxe backdrop-blur-xl sm:max-w-[360px]"
      >
        <SheetDescription className="sr-only">
          Review highlights and notes for this reading passage.
        </SheetDescription>
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-5 py-4 pr-12">
          <div className="flex items-center gap-2">
            <span className="text-gold">✦</span>
            <SheetTitle className="font-display text-lg text-foreground">Margin Notes</SheetTitle>
          </div>
          <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gold">
            {noteCount} note{noteCount === 1 ? "" : "s"}
          </span>
        </div>

        <SheetClose className="mx-4 mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-gold/35 bg-gold/10 px-3 text-xs font-semibold text-gold transition-colors hover:bg-gold/15">
          <ChevronRight className="h-4 w-4 rotate-180" /> Back to reading
        </SheetClose>

        <div className="px-4 py-4">
          {adding ? (
            <div className="mb-4 rounded-xl border border-gold/40 bg-gold/5 p-3">
              <MultilingualNoteInput
                language={state.selectedLanguage}
                value={draft}
                onChange={setDraft}
                onSave={saveNote}
                rows={3}
                autoFocus
              />
              {drawMode && (
                <div className="mt-3 overflow-hidden rounded-xl border border-gold/20">
                  <HandwritingCanvas
                    onRecognized={(text) => setDraft((previous) => previous + text)}
                    insertLabel="Insert →"
                  />
                </div>
              )}
              <div className="mt-2 flex items-center justify-between gap-2">
                {(state.selectedLanguage === "Japanese" ||
                  state.selectedLanguage === "Chinese") && (
                  <button
                    type="button"
                    onClick={() => setDrawMode((value) => !value)}
                    className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-gold/30 px-2 text-xs text-gold"
                  >
                    <PenLine className="h-3.5 w-3.5" /> Draw
                  </button>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(false);
                      setDraft("");
                      setDrawMode(false);
                    }}
                    className="min-h-11 rounded-lg px-2 text-xs text-muted-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveNote}
                    disabled={!draft.trim()}
                    className="min-h-11 rounded-lg bg-gold px-3 text-xs font-semibold text-midnight disabled:opacity-40"
                  >
                    Save note
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-3 text-xs font-semibold text-gold"
            >
              <Plus className="h-3.5 w-3.5" /> Add a note
            </button>
          )}
          {list.length === 0 ? (
            <div className="mt-16 px-6 text-center">
              <div className="mx-auto mb-3 text-3xl text-gold">✦</div>
              <p className="font-display text-sm italic text-muted-foreground">
                Select text to mark a word or phrase, or add a thought above.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {list.map((a) => (
                <NoteCard
                  key={a.id}
                  ann={a}
                  onGoTo={(pane, sentenceIndex) => {
                    onGoTo(pane, sentenceIndex);
                    setOpen(false);
                  }}
                  onRemove={() => remove(a.id)}
                  onSave={(text) => update(a.id, text)}
                />
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
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
      {ann.selectedText && (
        <div className="mb-2 rounded-md bg-gold/20 px-2 py-1.5 font-display text-[13px] italic leading-snug text-foreground">
          "{ann.selectedText}"
        </div>
      )}

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
              <HandwritingCanvas
                onRecognized={(text) => setDraft((prev) => prev + text)}
                insertLabel="Insert →"
              />
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
        {ann.selectedText ? (
          <button
            onClick={() => onGoTo(ann.pane, ann.sentenceIndex)}
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold hover:underline"
          >
            ↳ Go to {ann.pane === "left" ? "English" : "target"}
          </button>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Reading note
          </span>
        )}
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
