import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Plus, Upload, ArrowRight, Printer, FileText, Loader2 } from "lucide-react";
import { translateDocument } from "@/fns/library.functions";
import { useLibrary } from "@/state/library-state";
import { useNotes } from "@/state/notes-state";
import { useAuth } from "@/state/auth-state";
import { LANGUAGES, type Language } from "@/data/languages";
import { documentPassages, DOCUMENT_LIMIT } from "@/lib/document-translation";
import { extractFromFile } from "@/lib/extract-book";
import "./documents.css";

export function DocumentWorkspace() {
  const library = useLibrary();
  const notes = useNotes();
  const { user } = useAuth();
  const translate = useServerFn(translateDocument);
  const [opened, setOpened] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [source, setSource] = useState<Language>("English");
  const [target, setTarget] = useState<Language>("Spanish");
  const [quality, setQuality] = useState<"standard" | "detailed">("standard");
  const [busy, setBusy] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const documents = library.state.entries.filter(
    (entry) => entry.section === "custom" && entry.subtitle.startsWith("Document · "),
  );
  const active = opened
    ? documents.find((entry) => entry.id === library.state.selectedId)
    : undefined;
  const annotations = active ? notes.forText(active.id) : [];
  const activeNotes = annotations.filter((note) => note.pane === "left");

  async function importFile(file: File) {
    setError("");
    setExtracting(true);
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("Choose a file under 10 MB.");
      const content = /\.(txt|md)$/i.test(file.name)
        ? await file.text()
        : (await extractFromFile(file)).chunks.map((chunk) => chunk.text).join("\n\n");
      if (content.length > DOCUMENT_LIMIT)
        throw new Error(
          "This document is longer than 8,000 characters. Paste the section you want to study; nothing has been truncated.",
        );
      if (content.trim().length < 10)
        throw new Error(
          "No readable text found. For scanned documents, copy the text using your device’s text recognition, then paste it here.",
        );
      setText(content);
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the file.");
    } finally {
      setExtracting(false);
    }
  }
  async function createDocument(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      documentPassages(text);
    } catch (err) {
      setError((err as Error).message);
      return;
    }
    if (source === target) {
      setError("Choose two different languages.");
      return;
    }
    setBusy(true);
    try {
      const result = await translate({
        data: {
          title: title.trim(),
          text,
          sourceLanguage: source,
          targetLanguage: target,
          quality,
        },
      });
      if (!result.data) throw new Error(result.error || "Translation could not be completed.");
      await library.addCustomEntry({
        id: "",
        title: title.trim(),
        subtitle: `Document · ${source} → ${target}`,
        language: target,
        targetLabel: target,
        sentences: result.data.sentences,
        section: "custom",
        flag: "📄",
        available: true,
        createdAt: Date.now(),
      });
      setOpened(true);
      setText("");
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your document.");
    } finally {
      setBusy(false);
    }
  }
  function updateNote(index: number, value: string) {
    if (!active) return;
    const note = activeNotes.find((note) => note.sentenceIndex === index);
    if (note) notes.update(note.id, value);
    else if (value.trim())
      notes.add({
        textId: active.id,
        pane: "left",
        sentenceIndex: index,
        selectedText: active.sentences[index].en,
        noteText: value,
      });
  }
  return (
    <div className="document-workspace">
      <header className="document-header">
        <a href="/" className="document-brand">
          Language<span>Threshold</span>
          <small>STEP INTO CONVERSATION.</small>
        </a>
        <a href="/">
          Back to learning <ArrowRight size={16} />
        </a>
      </header>
      <main className="document-main">
        <section className="document-intro">
          <p className="document-eyebrow">YOUR WORK. YOUR WORDS. TWO LANGUAGES.</p>
          <h1>
            Read the document.
            <br />
            <em>Carry the confidence.</em>
          </h1>
          <p>
            A safety sheet. An intake form. A care plan. Bring the words you need to understand—and
            keep both languages within reach.
          </p>
          <div className="document-steps">
            <span>01 Add your text</span>
            <span>02 Read side by side</span>
            <span>03 Make it yours</span>
          </div>
        </section>
        <div className="document-layout">
          <aside className="document-library">
            <h2>
              <BookOpen size={19} /> My Documents
            </h2>
            <button
              disabled={busy}
              onClick={() => {
                setOpened(false);
                setError("");
              }}
            >
              <Plus size={17} /> New document
            </button>
            <p className="document-muted">
              {documents.length
                ? `${documents.length} saved reading${documents.length === 1 ? "" : "s"}`
                : "Your next useful reading starts here."}
            </p>
            {documents.map((doc) => (
              <button
                key={doc.id}
                aria-pressed={active?.id === doc.id}
                className="document-saved"
                disabled={busy}
                onClick={() => {
                  library.dispatch({ type: "SELECT", payload: doc.id });
                  setOpened(true);
                  setError("");
                }}
              >
                <FileText size={17} />
                <span>
                  {doc.title}
                  <small>{doc.subtitle.replace("Document · ", "")}</small>
                </span>
              </button>
            ))}
            <p className="document-storage">
              Readings save on this device
              {user
                ? " and use your library’s account sync"
                : ". Sign in from the learning app to sync your library"}
              . Notes stay on this device.
            </p>
            {library.syncError && (
              <p role="status">Saved locally. Account sync needs attention: {library.syncError}</p>
            )}
          </aside>
          <section className="document-paper">
            {error && (
              <p className="document-error" role="alert">
                {error}
              </p>
            )}
            {active ? (
              <>
                <div className="document-reading-heading">
                  <div>
                    <p className="document-eyebrow">SAVED READING</p>
                    <h2>{active.title}</h2>
                    <p>{active.subtitle.replace("Document · ", "")}</p>
                  </div>
                  <button onClick={() => window.print()}>
                    <Printer size={17} /> Print / PDF
                  </button>
                </div>
                <p className="document-muted">
                  Add a note beneath any passage. Notes save as you type on this device.
                </p>
                <div className="document-columns">
                  <strong>Original</strong>
                  <strong>{active.targetLabel}</strong>
                </div>
                {active.sentences.map((pair, index) => (
                  <div key={index} className="document-passage">
                    <div className="document-pair">
                      <p>{pair.en}</p>
                      <p>{pair.target}</p>
                    </div>
                    <label className="document-note">
                      Note {index + 1}
                      <textarea
                        aria-label={`Note for passage ${index + 1}`}
                        value={
                          activeNotes.find((note) => note.sentenceIndex === index)?.noteText ?? ""
                        }
                        onChange={(event) => updateNote(index, event.target.value)}
                        placeholder="A useful phrase, a question, something to remember…"
                        rows={2}
                      />
                      <span className="document-print-note">
                        {activeNotes.find((note) => note.sentenceIndex === index)?.noteText}
                      </span>
                    </label>
                  </div>
                ))}
                <p className="document-caution">
                  AI translation for language study. Check critical medical and safety instructions
                  with a qualified professional.
                </p>
              </>
            ) : (
              <form onSubmit={createDocument}>
                <div className="document-paper-heading">
                  <div className="document-icon">
                    <FileText size={26} />
                  </div>
                  <div>
                    <p className="document-eyebrow">A FRESH PAGE</p>
                    <h2>Bring something worth understanding.</h2>
                  </div>
                </div>
                <label>
                  Document title
                  <input
                    required
                    maxLength={120}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="e.g. Morning safety briefing"
                    disabled={busy}
                  />
                </label>
                <div className="document-controls">
                  <label>
                    Original language
                    <select
                      value={source}
                      onChange={(event) => setSource(event.target.value as Language)}
                      disabled={busy}
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang}>{lang}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Translate into
                    <select
                      value={target}
                      onChange={(event) => setTarget(event.target.value as Language)}
                      disabled={busy}
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang}>{lang}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  Your document
                  <textarea
                    required
                    minLength={10}
                    maxLength={DOCUMENT_LIMIT}
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    rows={10}
                    placeholder="Paste your document here. The original stays beside its translation."
                    disabled={busy || extracting}
                  />
                </label>
                <div className="document-import">
                  <label className="document-upload">
                    <Upload size={16} />
                    {extracting ? "Reading file…" : "Choose a PDF, EPUB or text file"}
                    <input
                      type="file"
                      accept=".pdf,.epub,.txt,.md"
                      disabled={busy || extracting}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) void importFile(file);
                      }}
                    />
                  </label>
                  <small>{text.length.toLocaleString()} / 8,000 characters</small>
                </div>
                <label>
                  Translation style
                  <select
                    value={quality}
                    onChange={(event) => setQuality(event.target.value as "standard" | "detailed")}
                    disabled={busy}
                  >
                    <option value="standard">Everyday documents · Haiku</option>
                    <option value="detailed">Complex wording · Sonnet</option>
                  </select>
                </label>
                <p className="document-muted">
                  Only the text you submit is sent for AI translation. Remove patient details,
                  personal identifiers, and confidential information first.
                </p>
                <button
                  className="document-primary"
                  type="submit"
                  disabled={busy || extracting || !library.readyToSelect}
                >
                  {busy ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}{" "}
                  {busy ? "Translating and saving…" : "Translate & save to My Documents"}
                </button>
                <p className="document-muted">
                  Read the document. Learn the phrasing. Then use it on shift.
                </p>
              </form>
            )}
          </section>
        </div>
      </main>
      <footer className="document-footer">
        LANGUAGE THRESHOLD · REAL WORDS FOR THE WORK YOU DO.
      </footer>
    </div>
  );
}
