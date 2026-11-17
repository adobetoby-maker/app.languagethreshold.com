import { useState } from "react";
import { useOwnerResource } from "./use-owner-resource";
import { ownerButton, ownerPanel, ownerField } from "./owner-ui";
import type { MarketingStream } from "@/lib/owner-marketing";
export function OwnerMarketing() {
  const [cursor, setCursor] = useState<string | null>(null),
    [filter, setFilter] = useState("All");
  const resource = useOwnerResource<MarketingStream>(
    "/api/owner-marketing" + (cursor ? "?cursor=" + encodeURIComponent(cursor) : ""),
  );
  if (!resource.allowed) return null;
  const data = resource.data;
  return (
    <section aria-label="My AI Marketing" className="grid min-w-0 gap-5">
      <div className={ownerPanel}>
        <h2 className="text-2xl font-semibold">My AI Marketing</h2>
        <p className="mt-2 text-sm">
          Medical, Construction and Junior Linguist parent email activity, including homeschool
          opportunities. This is the provider delivery history; a delivered starter email does not
          establish weekly subscription permission.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            className={ownerButton}
            href="https://myaimarketing.worker-bee.app/?view=email-stream"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open marketing stream ↗
          </a>
          <a
            className={ownerButton}
            href="https://myaimarketing.worker-bee.app/?view=followups"
            target="_blank"
            rel="noopener noreferrer"
          >
            Bot actions & next sends ↗
          </a>
          <a
            className={ownerButton}
            href="https://myaimarketing.worker-bee.app/?view=map"
            target="_blank"
            rel="noopener noreferrer"
          >
            Implementation map ↗
          </a>
          <button className={ownerButton} disabled={resource.loading} onClick={resource.refresh}>
            Refresh emails
          </button>
        </div>
      </div>
      <div className={ownerPanel}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-lg font-semibold">Email deliveries</h3>
          <label>
            Show{" "}
            <select
              className={ownerField}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {["All", "Medical", "Construction", "Kids / parents", "Homeschool", "Tests"].map(
                (value) => (
                  <option key={value}>{value}</option>
                ),
              )}
            </select>
          </label>
        </div>
        {resource.loading && <p role="status">Loading delivery history…</p>}
        {resource.error && (
          <p role="alert" className="my-3">
            {resource.error}
          </p>
        )}
        {data && (
          <>
            <p className="my-3 text-sm">
              Checked {new Date(data.checkedAt).toLocaleString()}. Opens and clicks are engagement
              signals, not proof of a human reader or purchase.
            </p>
            <ul className="grid gap-3">
              {data.messages
                .filter(
                  (m) =>
                    filter === "All" ||
                    (filter === "Tests" ? m.isTest : m.category === filter && !m.isTest),
                )
                .map((m) => (
                  <li key={m.id} className="min-w-0 rounded-xl border border-border p-4">
                    <div className="flex flex-wrap justify-between gap-3">
                      <strong className="break-words">{m.subject}</strong>
                      <span>{m.status.replaceAll("_", " ")}</span>
                    </div>
                    <p className="mt-2 break-all">{m.to.join(", ")}</p>
                    <p className="mt-2 text-sm">
                      {m.category}
                      {m.isTest ? " · TEST / VALIDATION" : ""} ·{" "}
                      {m.createdAt ? new Date(m.createdAt).toLocaleString() : "Time unavailable"}
                    </p>
                    <a
                      className="mt-2 inline-block underline"
                      href={"https://resend.com/emails/" + m.id}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Provider receipt ↗
                    </a>
                  </li>
                ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-3">
              {cursor && (
                <button className={ownerButton} onClick={() => setCursor(null)}>
                  Newest emails
                </button>
              )}
              {data.nextCursor && (
                <button className={ownerButton} onClick={() => setCursor(data.nextCursor)}>
                  Older emails
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
