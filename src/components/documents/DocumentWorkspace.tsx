import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { BookOpen, Plus, Upload, ArrowRight, Printer, FileText, Loader2 } from "lucide-react";
import { useNotes } from "@/state/notes-state";
import { useAuth } from "@/state/auth-state";
import { LANGUAGES, type Language } from "@/data/languages";
import { documentPassages, DOCUMENT_LIMIT } from "@/lib/document-translation";
import { extractFromFile } from "@/lib/extract-book";
import { ownedTeamRequest } from "@/lib/team-client";
import type { DocumentAllowance, SavedDocument } from "@/lib/document-client";
import { AuthModal } from "@/components/auth/AuthModal";
import "./documents.css";

export function DocumentWorkspace() {
  const notes = useNotes();
  const { user, isCurrentUser } = useAuth();
  const [allowance, setAllowance] = useState<DocumentAllowance | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [buying, setBuying] = useState(false);
  const userId = user?.id ?? "";
  const translationRequest = useRef<{ fingerprint: string; id: string } | null>(null);
  const owner = useMemo(() => {
    const controller = new AbortController();
    return {
      userId,
      isCurrent: () => !!userId && isCurrentUser(userId),
      signal: controller.signal,
      controller,
    };
  }, [userId, isCurrentUser]);
  const refresh = useCallback(async () => {
    if (!owner.userId) return;
    const result = await ownedTeamRequest<DocumentAllowance>(owner, "/api/documents");
    if (owner.isCurrent()) setAllowance(result);
  }, [owner]);
  useEffect(() => {
    setAllowance(null);
    setSelectedId("");
    setOpened(false);
    setError("");
    setBusy(false);
    setBuying(false);
    setText("");
    setTitle("");
    if (owner.userId)
      void refresh().catch((err) => {
        if (owner.isCurrent())
          setError(err instanceof Error ? err.message : "Could not load documents.");
      });
    let timer: ReturnType<typeof setInterval> | undefined;
    if (
      owner.userId &&
      new URL(window.location.href).searchParams.get("purchase") === "processing"
    ) {
      let attempts = 0;
      timer = setInterval(() => {
        void refresh().catch(() => {});
        if (++attempts >= 10 && timer) clearInterval(timer);
      }, 3000);
    }
    return () => {
      owner.controller.abort();
      if (timer) clearInterval(timer);
    };
  }, [owner, refresh]);
  async function cancelStorage() {
    if (
      !window.confirm(
        "Cancel the $5/month storage add-on at the end of its paid period? Existing documents remain readable. New documents will use the included 10-slot limit after that period.",
      )
    )
      return;
    setBuying(true);
    setError("");
    try {
      await ownedTeamRequest(owner, "/api/documents", { action: "cancel-storage" });
      if (owner.isCurrent())
        setError(
          "Storage renewal canceled. Your extra slots remain available through the paid period.",
        );
    } catch (err) {
      if (owner.isCurrent())
        setError(err instanceof Error ? err.message : "Could not cancel storage renewal.");
    } finally {
      if (owner.isCurrent()) setBuying(false);
    }
  }
  async function purchase(kind: "storage" | "translations" | "portal") {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setBuying(true);
    setError("");
    try {
      const result = await ownedTeamRequest<{ url: string }>(
        owner,
        "/api/documents",
        kind === "portal"
          ? { action: "portal" }
          : { action: "checkout", kind, id: crypto.randomUUID() },
      );
      if (owner.isCurrent()) window.location.assign(result.url);
    } catch (err) {
      if (owner.isCurrent())
        setError(err instanceof Error ? err.message : "Could not open checkout.");
    } finally {
      if (owner.isCurrent()) setBuying(false);
    }
  }
  const [opened, setOpened] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [source, setSource] = useState<Language>("English");
  const [target, setTarget] = useState<Language>("Spanish");
  const [quality, setQuality] = useState<"standard" | "detailed">("standard");
  const [busy, setBusy] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const documents = allowance?.documents ?? [];
  const active = opened ? documents.find((entry) => entry.id === selectedId) : undefined;
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
      if (owner.signal.aborted) return;
      setText(content);
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
    } catch (err) {
      if (!owner.signal.aborted)
        setError(err instanceof Error ? err.message : "Could not read the file.");
    } finally {
      if (!owner.signal.aborted) setExtracting(false);
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
    if (!user) {
      setAuthOpen(true);
      return;
    }
    const fingerprint = JSON.stringify({ userId, title, text, source, target, quality });
    if (translationRequest.current?.fingerprint !== fingerprint)
      translationRequest.current = { fingerprint, id: crypto.randomUUID() };
    setBusy(true);
    try {
      const result = await ownedTeamRequest<{ document: SavedDocument }>(owner, "/api/documents", {
        action: "translate",
        id: translationRequest.current.id,
        title: title.trim(),
        text,
        sourceLanguage: source,
        targetLanguage: target,
        quality,
      });
      if (!owner.isCurrent()) return;
      setAllowance((current) =>
        current ? { ...current, documents: [result.document, ...current.documents] } : current,
      );
      setSelectedId(result.document.id);
      await refresh();
      setOpened(true);
      translationRequest.current = null;
      setText("");
      setTitle("");
    } catch (err) {
      if (owner.isCurrent())
        setError(err instanceof Error ? err.message : "Could not save your document.");
      if (owner.isCurrent()) void refresh().catch(() => {});
    } finally {
      if (owner.isCurrent()) setBusy(false);
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
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
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
                  setSelectedId(doc.id);
                  setOpened(true);
                  setError("");
                }}
              >
                <FileText size={17} />
                <span>
                  {doc.title}
                  <small>{`${doc.source_language} → ${doc.target_language}`}</small>
                </span>
              </button>
            ))}
            <section className="document-allowance" aria-label="Document allowance">
              <h3>Your allowance</h3>
              {user ? (
                <>
                  <p>
                    {documents.length} / {allowance?.limit ?? "…"} documents
                  </p>
                  <p>
                    {allowance?.monthlyRemaining.toLocaleString() ?? "…"} monthly characters left
                  </p>
                  <p>
                    {allowance?.purchasedRemaining.toLocaleString() ?? "…"} purchased characters
                    left
                  </p>
                  <button
                    disabled={busy}
                    onClick={() => void refresh().catch((err) => setError(err.message))}
                  >
                    Refresh allowance
                  </button>
                </>
              ) : (
                <>
                  <p>10 saved documents · 50,000 translation characters per calendar month.</p>
                  <button onClick={() => setAuthOpen(true)}>Sign in to save documents</button>
                </>
              )}
              <p>
                Monthly characters reset on the first of each month (UTC). Purchased characters
                carry over until used.
              </p>
              <button disabled={buying || busy} onClick={() => void purchase("storage")}>
                100 extra slots · $5/month
              </button>
              <button disabled={buying || busy} onClick={() => void purchase("translations")}>
                50,000 extra characters · $5 once
              </button>
              {allowance?.hasBilling && (
                <button disabled={buying} onClick={() => void purchase("portal")}>
                  Manage billing / cancel storage
                </button>
              )}
              <p>
                Reading and notes use no translation allowance. Canceling storage keeps existing
                documents readable; adding new ones requires space within your current limit.
              </p>
            </section>
            {allowance?.storageSubscription && (
              <button disabled={buying} onClick={() => void cancelStorage()}>
                Cancel storage renewal
              </button>
            )}
            <p className="document-storage">
              Documents save to your account. Notes stay on this device. Up to 8,000 characters per
              document.
            </p>
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
                    <p>{`${active.source_language} → ${active.target_language}`}</p>
                  </div>
                  <button onClick={() => window.print()}>
                    <Printer size={17} /> Print / PDF
                  </button>
                  <button
                    disabled={busy}
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `Delete “${active.title}”? This frees one document slot. Translation characters already used are not refunded.`,
                        )
                      )
                        return;
                      setBusy(true);
                      try {
                        await ownedTeamRequest(owner, "/api/documents", {
                          action: "delete",
                          id: active.id,
                        });
                        if (owner.isCurrent()) {
                          setOpened(false);
                          await refresh();
                        }
                      } catch (err) {
                        if (owner.isCurrent())
                          setError(
                            err instanceof Error ? err.message : "Could not delete document.",
                          );
                      } finally {
                        if (owner.isCurrent()) setBusy(false);
                      }
                    }}
                  >
                    Delete document
                  </button>
                </div>
                <p className="document-muted">
                  Add a note beneath any passage. Notes save as you type on this device.
                </p>
                <div className="document-columns">
                  <strong>Original</strong>
                  <strong>{active.target_language}</strong>
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
                  disabled={busy || extracting || (!!user && !allowance)}
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
