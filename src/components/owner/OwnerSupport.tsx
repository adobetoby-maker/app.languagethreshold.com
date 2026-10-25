import { useRef, useState } from "react";
import { useOwnerResource } from "./use-owner-resource";
import { ConfirmAction, OwnerMessage, ownerButton, ownerField, ownerPanel } from "./owner-ui";
import type { SupportPage, SupportTicket } from "@/lib/owner-support";

type Inbox = SupportPage & { configured: boolean };
export function OwnerSupport() {
  const [cursors, setCursors] = useState<string[]>([]);
  const cursor = cursors.at(-1);
  const inbox = useOwnerResource<Inbox>(
    "/api/owner-support" + (cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""),
  );
  const [selected, select] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  if (!inbox.allowed) return null;
  return (
    <section className={ownerPanel} aria-labelledby="owner-support-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="owner-support-title" className="text-xl font-semibold">
          Support inbox
        </h2>
        <button className={ownerButton} onClick={inbox.refresh}>
          Refresh support
        </button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Requests sent to Language Threshold are also forwarded to your Gmail. You choose when to
        reply.
      </p>
      <a
        className="mt-2 inline-block underline"
        href="https://mail.google.com/mail/u/?authuser=adobetoby%40gmail.com#search/to%3A%40languagethreshold.com"
        target="_blank"
        rel="noreferrer"
      >
        Open support mail in Gmail
      </a>
      <OwnerMessage error={inbox.error} />
      {inbox.loading && <p role="status">Loading support requests…</p>}
      {inbox.data?.configured === false && (
        <p className="mt-4" role="status">
          Dashboard inbox setup is pending. Use Gmail while the connection is configured.
        </p>
      )}
      {inbox.data?.configured && (
        <>
          <p className="mt-3 text-xs text-muted-foreground">
            Dashboard previews cover requests received after activation and are kept for 90 days.
            Gmail retains the full message and attachments. Duplicate deliveries can appear
            separately.
          </p>
          <label className="my-3 block max-w-xs text-sm">
            Show on this page
            <select
              className={ownerField}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All requests</option>
              <option value="needs_reply">Needs reply</option>
              <option value="resolved">Resolved</option>
            </select>
          </label>
          <ul className="space-y-2">
            {inbox.data.tickets
              .filter((t) => filter === "all" || t.status === filter)
              .map((t) => (
                <li key={t.id}>
                  <button
                    className="w-full rounded-xl border border-border p-3 text-left hover:border-gold"
                    onClick={() => select(t.id)}
                  >
                    <span className="block font-semibold break-words">{t.subject}</span>
                    <span className="block break-all text-sm text-muted-foreground">
                      {t.from || "Reply address needs review"} → {t.to}
                    </span>
                    <span className="text-xs">
                      {new Date(t.receivedAt).toLocaleString()} ·{" "}
                      {t.status === "needs_reply" ? "Needs reply" : "Resolved"}
                    </span>
                    {t.forwarding === "failed" && (
                      <span className="ml-2 text-sm text-red-700 dark:text-red-300">
                        Gmail forwarding failed
                      </span>
                    )}
                  </button>
                </li>
              ))}
          </ul>
          {!inbox.data.tickets.length && <p>No requests on this page.</p>}
          <div className="my-3 flex gap-2">
            <button
              className={ownerButton}
              disabled={!cursors.length}
              onClick={() => {
                setCursors((p) => p.slice(0, -1));
                select(null);
              }}
            >
              Previous page
            </button>
            <button
              className={ownerButton}
              disabled={!inbox.data.nextCursor}
              onClick={() => {
                setCursors((p) => [...p, inbox.data!.nextCursor!]);
                select(null);
              }}
            >
              Next page
            </button>
          </div>
        </>
      )}
      {selected && (
        <SupportConversation
          key={selected}
          id={selected}
          onChanged={inbox.refresh}
          onClose={() => select(null)}
        />
      )}
    </section>
  );
}

function SupportConversation({
  id,
  onChanged,
  onClose,
}: {
  id: string;
  onChanged: () => void;
  onClose: () => void;
}) {
  const resource = useOwnerResource<{ ticket: SupportTicket }>(
    `/api/owner-support?id=${encodeURIComponent(id)}`,
  );
  const [text, setText] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [attempted, setAttempted] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  const ticket = resource.data?.ticket;
  if (!resource.allowed) return null;
  async function changeStatus() {
    if (!ticket) return;
    setError("");
    try {
      await resource.run({
        action: "status",
        id,
        status: ticket.status === "resolved" ? "needs_reply" : "resolved",
      });
      onChanged();
    } catch {
      setError("Could not confirm the status change. Refresh before trying again.");
    }
  }
  async function reply() {
    setAttempted(true);
    setError("");
    try {
      const result = await resource.run<{ notice: string }>({
        action: "reply",
        id,
        text,
        requestId: requestId.current,
      });
      if (result) setNotice(result.notice);
    } catch {
      setError(
        "Reply outcome is unconfirmed. Check sending logs and the recipient before another attempt.",
      );
    }
  }
  return (
    <div className="mt-5 rounded-xl border border-gold/50 p-4" aria-label="Support conversation">
      <button className={ownerButton} onClick={onClose}>
        Close request
      </button>
      <OwnerMessage error={resource.error || error} notice={notice} />
      {resource.loading && <p role="status">Loading request…</p>}
      {ticket && (
        <>
          <h3 className="mt-3 text-lg font-semibold break-words">{ticket.subject}</h3>
          <p className="text-sm break-all">
            From {ticket.from} · To {ticket.to}
          </p>
          <p className="my-2 text-sm text-muted-foreground">
            {ticket.forwarding === "request_completed"
              ? "Gmail forwarding request completed; inbox delivery is not confirmed here."
              : ticket.forwarding === "failed"
                ? "Gmail forwarding failed. This dashboard copy was retained."
                : "Gmail forwarding has not completed."}
          </p>
          <pre className="my-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 font-sans text-sm">
            {ticket.preview || "No text preview. Open the full message in Gmail."}
          </pre>
          {ticket.previewUnavailable && (
            <p className="text-sm">
              This message needs to be read in Gmail; attachments and HTML are not shown here.
            </p>
          )}
          <button
            className={ownerButton}
            onClick={() => void changeStatus()}
            disabled={resource.busy}
          >
            {ticket.status === "resolved" ? "Reopen request" : "Mark resolved"}
          </button>
          <label className="mt-4 block text-sm">
            Reply to {ticket.from}
            <textarea
              className={ownerField + " mt-1 min-h-36"}
              maxLength={8000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={attempted}
            />
          </label>
          <p className="my-2 text-xs text-muted-foreground">
            From support@languagethreshold.com. Replies return to this inbox. Mark resolved
            separately after helping the customer.
          </p>
          <ConfirmAction
            label="Send support reply"
            confirmLabel="Send this reply"
            disabled={attempted || resource.busy || !text.trim() || !ticket.from}
            description={
              <>
                <p>
                  Send this message to <strong className="break-all">{ticket.from}</strong>?
                </p>
                <pre className="mt-2 whitespace-pre-wrap font-sans">{text}</pre>
              </>
            }
            onConfirm={reply}
          />
          {attempted && (
            <p className="mt-2 text-sm">
              Sending is disabled for this open request after an attempt. Check the outcome before
              starting another reply.
            </p>
          )}
        </>
      )}
    </div>
  );
}
