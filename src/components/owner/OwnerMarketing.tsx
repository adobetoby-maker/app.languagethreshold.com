import { useRef, useState } from "react";
import { OwnerDownloadLeads } from "./OwnerDownloadLeads";
import { useOwnerResource } from "./use-owner-resource";
import { ownerButton, ownerField, ownerPanel, ownerPrimary } from "./owner-ui";
import type { LeadReport } from "@/lib/download-leads";
import type { CrmData } from "@/lib/owner-crm";

const products = [
  ["language-threshold", "Language Threshold", "https://languagethreshold.com"],
  ["medical-spanish", "Medical Spanish", "https://medicalspanish.app"],
  ["construction-spanish", "Construction Spanish", "https://constructionspanish.app"],
  ["junior-linguist", "Junior Linguist", "https://juniorlinguist.com"],
] as const;
type Lead = LeadReport["recent"][number];
export function OwnerMarketing({ onEmail }: { onEmail: () => void }) {
  const [lead, select] = useState<Lead | null>(null);
  return (
    <div className="grid min-w-0 grid-cols-1 gap-5">
      <section className={ownerPanel}>
        <h2 className="text-2xl font-semibold">My AI Marketing</h2>
        <p className="mt-2">
          Create campaigns, review posts and follow up with people who requested your resources.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {products.map(([id, name, url]) => (
            <div key={id} className="rounded-xl border border-border p-4">
              <h3 className="font-semibold">{name}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  className={ownerPrimary}
                  href={`https://myaimarketing.worker-bee.app/?project=${id}&view=posting`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open marketing ↗
                </a>
                <a className={ownerButton} href={url} target="_blank" rel="noopener noreferrer">
                  Product ↗
                </a>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm">
          The marketing workspace opens in its own tab and uses its existing owner sign-in.
        </p>
      </section>
      <section className={ownerPanel}>
        <h2 className="text-lg font-semibold">Email, CRM and social follow-ups</h2>
        <p className="mt-2">
          Download requests appear below. Prepare a draft and reminder here; check confirmed
          subscriptions and ongoing email sequences in Leader HQ.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={ownerButton} onClick={onEmail}>
            Email & contacts
          </button>
          <a
            className={ownerButton}
            href="https://toby.leaderhq.io"
            target="_blank"
            rel="noopener noreferrer"
          >
            Leader HQ ↗
          </a>
          <a
            className={ownerButton}
            href="https://myaimarketing.worker-bee.app/?view=connections"
            target="_blank"
            rel="noopener noreferrer"
          >
            Connect social accounts ↗
          </a>
        </div>
        <p className="mt-3 text-sm">
          Live social comments and messages are not connected yet. Each network needs account
          authorization and supported read/reply permissions. Posting access alone does not enable a
          live inbox.
        </p>
      </section>
      {lead && (
        <LeadDraft
          key={`${lead.email}:${lead.created_at}`}
          lead={lead}
          onClose={() => select(null)}
          onEmail={onEmail}
        />
      )}
      <OwnerDownloadLeads live onPrepare={select} />
    </div>
  );
}
function LeadDraft({
  lead,
  onClose,
  onEmail,
}: {
  lead: Lead;
  onClose: () => void;
  onEmail: () => void;
}) {
  const crm = useOwnerResource<CrmData>("/api/owner-crm");
  const [subject, setSubject] = useState(
    `Your ${lead.resource_title}`.replace(/[\r\n]+/g, " ").slice(0, 160),
  );
  const destination =
    products.find((p) => new URL(p[2]).hostname === lead.site)?.[2] ??
    "https://languagethreshold.com";
  const [body, setBody] = useState(
    `Hi,\n\nYou requested ${lead.resource_title} from ${lead.site}. What would you most like to practice next?\n\nYou can explore the lessons here:\n${destination}\n\nToby\nLanguage Threshold`,
  );
  const [date, setDate] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const contactId = useRef(crypto.randomUUID());
  const draftId = useRef(crypto.randomUUID());
  const saving = useRef(false);
  const [saved, setSaved] = useState(false);
  async function save() {
    if (!crm.data || saving.current || saved) return;
    saving.current = true;
    setError("");
    try {
      const existing = crm.data.contacts.find(
        (c) => c.email.toLowerCase() === lead.email.toLowerCase(),
      );
      const contact = existing ?? {
        id: contactId.current,
        name: lead.email.slice(0, 120),
        email: lead.email,
        expertise: lead.resource_title,
        notes: `Download request: ${lead.resource_title}\nSite: ${lead.site}\nRequested: ${lead.created_at}\nCampaign: ${lead.utm_campaign || "Untagged"}\nMarketing consent not verified here. Check Leader HQ before sending.`,
        status: "follow_up" as const,
        follow_up_on: date,
        user_id: null,
      };
      // Existing contact details and reminders are never overwritten by lead preparation.
      if (!existing && !(await crm.run({ action: "contact", contact }))) return;
      const result = await crm.run({
        action: "draft",
        draft: {
          id: draftId.current,
          contact_id: contact.id,
          subject,
          body,
          asset_ids: [],
          include_referral: false,
          referral_user_id: null,
        },
      });
      if (result) {
        setSaved(true);
        setNotice(
          "Saved an unsent email draft in Email & contacts. Existing contact details were preserved. No email sent.",
        );
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Save not confirmed. Check Email & contacts before retrying.",
      );
    } finally {
      saving.current = false;
    }
  }
  return (
    <section className={ownerPanel} aria-label="Download follow-up draft">
      <h2 className="text-lg font-semibold">Prepare follow-up · {lead.email}</h2>
      <p className="my-3 text-sm">
        A download request does not confirm permission for ongoing marketing. Check confirmation and
        suppression status in Leader HQ before sending. This saves a private owner CRM draft only.
      </p>
      <div className="grid gap-3">
        <label>
          Subject
          <input
            className={ownerField}
            value={subject}
            maxLength={160}
            onChange={(e) => setSubject(e.target.value)}
            disabled={saved}
          />
        </label>
        <label>
          Message
          <textarea
            className={ownerField}
            rows={8}
            maxLength={6000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={saved}
          />
        </label>
        <label>
          Reminder date for a new contact
          <input
            className={ownerField}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={saved}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            className={ownerPrimary}
            onClick={() => void save()}
            disabled={!crm.data || crm.busy || saved || !subject.trim() || !body.trim()}
          >
            Save draft & reminder
          </button>
          <button className={ownerButton} onClick={onEmail}>
            Open Email & contacts
          </button>
          <button className={ownerButton} onClick={onClose}>
            Close
          </button>
        </div>
        {(error || crm.error) && <p role="alert">{error || crm.error}</p>}
        {notice && <p role="status">{notice}</p>}
      </div>
    </section>
  );
}
