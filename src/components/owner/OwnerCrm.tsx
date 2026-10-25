import { useRef, useState } from "react";
import { z } from "zod";
import { useOwnerResource } from "./use-owner-resource";
import { OwnerEmailAI } from "./OwnerEmailAI";
import { OwnerMessage, ownerButton, ownerField, ownerPanel, ownerPrimary } from "./owner-ui";
import {
  crmContact,
  crmDraft,
  crmAsset,
  packetText,
  emailDraftFile,
  type CrmData,
  type CrmContact,
  type CrmDraft,
} from "@/lib/owner-crm";

const emptyContact = (): CrmContact => ({
  id: crypto.randomUUID(),
  name: "",
  email: "",
  expertise: "",
  notes: "",
  status: "new",
  follow_up_on: "",
  user_id: null,
});
const importSchema = z
  .object({
    contacts: z.array(crmContact).max(40).optional(),
    assets: z.array(crmAsset).max(40).optional(),
    drafts: z.array(crmDraft).max(10).optional(),
  })
  .strict();
export function OwnerCrm() {
  const r = useOwnerResource<CrmData>("/api/owner-crm");
  const [selected, select] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const importing = useRef(false);
  async function importFile(file?: File) {
    if (!file || importing.current) return;
    importing.current = true;
    setError("");
    setNotice("");
    try {
      if (file.size > 64_000) throw Error("Import is limited to 64 KB.");
      const data = importSchema.parse(JSON.parse(await file.text()));
      if (!data.contacts?.length && !data.assets?.length && !data.drafts?.length)
        throw Error("Choose a contact or ad catalog JSON file.");
      // Separate bounded idempotent saves. Never import messages, permissions or executable content.
      for (const contact of data.contacts ?? [])
        if (!(await r.run({ action: "contact", contact }))) return;
      if (data.assets?.length && !(await r.run({ action: "assets", assets: data.assets }))) return;
      for (const draft of data.drafts ?? []) if (!(await r.run({ action: "draft", draft }))) return;
      setNotice("Imported contacts, ad links and unsent drafts. No sharing permissions changed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import not confirmed. Refresh before retrying.");
    } finally {
      importing.current = false;
      r.refresh();
    }
  }
  if (!r.allowed) return null;
  const contacts =
    r.data?.contacts.filter((c) =>
      `${c.name} ${c.email} ${c.expertise} ${c.status}`.toLowerCase().includes(query.toLowerCase()),
    ) ?? [];
  return (
    <section className="grid min-w-0 gap-5" aria-label="Owner email CRM">
      <div className={ownerPanel}>
        <h2 className="text-lg font-semibold">Email & contacts</h2>
        <p className="text-sm">
          Keep notes and follow-ups, prepare customer email drafts and select existing ads for
          review. Drafts stay unsent. Customer delivery continues through the reviewed customer
          email tools in Users.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button className={ownerButton} disabled={r.busy} onClick={r.refresh}>
            Refresh CRM
          </button>
          <button className={ownerButton} disabled={r.busy} onClick={() => select("new")}>
            New contact
          </button>
          <label className={ownerButton}>
            Import contacts / existing ads JSON
            <input
              aria-label="Import contacts or ads"
              className="block max-w-full text-xs"
              type="file"
              accept="application/json,.json"
              disabled={r.busy}
              onChange={(e) => {
                void importFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <OwnerMessage error={error || r.error} notice={notice} />
        {r.loading && <p role="status">Loading CRM…</p>}
      </div>
      {r.data && (
        <div className="grid min-w-0 gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className={ownerPanel}>
            <label>
              Find contacts
              <input
                className={ownerField}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <ul className="mt-3 grid gap-2">
              {contacts.map((c) => (
                <li key={c.id}>
                  <button
                    className={`${ownerButton} w-full text-left`}
                    aria-pressed={selected === c.id}
                    onClick={() => select(c.id)}
                  >
                    <strong className="block break-words">{c.name}</strong>
                    <span className="block break-words text-xs">
                      {c.expertise || c.email || "Email not entered"}
                    </span>
                    <span className="text-xs">
                      {c.status.replaceAll("_", " ")}
                      {c.follow_up_on ? ` · ${c.follow_up_on}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {!contacts.length && (
              <p className="mt-3 text-sm">
                No contacts match. Add a contact or import the prepared catalog.
              </p>
            )}
            <p className="mt-3 text-xs">
              Showing up to 100 contacts and ads, and your 30 latest drafts. Follow-up dates are
              reminders here; no automatic outreach.
            </p>
          </div>
          {selected ? (
            <ContactWorkspace
              key={selected}
              contact={r.data.contacts.find((c) => c.id === selected) ?? emptyContact()}
              data={r.data}
              onSaved={(id) => {
                r.refresh();
                select(id);
              }}
              onClose={() => select(null)}
            />
          ) : (
            <div className={ownerPanel}>
              Choose a contact to prepare an email or ad review packet.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
function ContactWorkspace({
  contact,
  data,
  onSaved,
  onClose,
}: {
  contact: CrmContact;
  data: CrmData;
  onSaved: (id: string) => void;
  onClose: () => void;
}) {
  const r = useOwnerResource<never>("/api/owner-crm", false);
  const customer = useOwnerResource<never>(
    contact.user_id ? `/api/owner-customers?userId=${contact.user_id}` : null,
    false,
  );
  const [customerAttempted, setCustomerAttempted] = useState(false);
  const [entry, setEntry] = useState(contact);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [assetIds, setAssets] = useState<string[]>([]);
  const [referral, setReferral] = useState(false);
  const [referralUser, setReferralUser] = useState<string | null>(contact.user_id);
  const [reviewed, setReviewed] = useState(false);
  const [reviewSignature, setReviewSignature] = useState("");
  const [preview, setPreview] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiRevision, setAiRevision] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const draftId = useRef(crypto.randomUUID());
  const saved = data.contacts.some((c) => c.id === entry.id);
  const dirty = JSON.stringify(entry) !== JSON.stringify(contact);
  const selectedAssets = assetIds
    .map((id) => data.assets.find((a) => a.id === id))
    .filter((a): a is CrmData["assets"][number] => !!a);
  const ref = data.referrals.find((link) => link.user_id === referralUser && link.active);
  const assembled = packetText(body, selectedAssets, referral ? ref?.code : undefined);
  const signature = JSON.stringify([entry.name, entry.email, subject, assembled]);
  const reviewCurrent = reviewed && reviewSignature === signature;
  const valid =
    !!entry.email &&
    !!subject.trim() &&
    !!body.trim() &&
    saved &&
    !dirty &&
    (!referral || !!ref) &&
    selectedAssets.length === assetIds.length;
  function invalidate() {
    setReviewed(false);
    setCustomerAttempted(false);
    setPreview(false);
    draftId.current = crypto.randomUUID();
  }
  async function act(value: unknown) {
    setError("");
    setNotice("");
    try {
      const result = await r.run<{ notice: string }>(value);
      if (result) {
        setNotice(result.notice);
        onSaved(entry.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save not confirmed. Refresh before retrying.");
    }
  }
  async function saveCustomerDraft() {
    if (!entry.user_id || !reviewCurrent || customerAttempted || assembled.length > 8000) return;
    setCustomerAttempted(true);
    setError("");
    try {
      const result = await customer.run<{ notice: string }>({
        action: "draft",
        userId: entry.user_id,
        id: draftId.current,
        subject,
        body: assembled,
      });
      if (result)
        setNotice(
          "Saved in this customer's email tools in Users. Review and confirm sending there; no email sent.",
        );
    } catch {
      setError(
        "Customer draft save is uncertain. Inspect this customer's email history in Users before another attempt.",
      );
    }
  }
  function load(d: CrmDraft) {
    setSubject(d.subject);
    setBody(d.body);
    setAssets(d.asset_ids);
    setReferral(d.include_referral);
    setReferralUser(d.referral_user_id ?? contact.user_id);
    invalidate();
    setAiOpen(false);
  }
  return (
    <div className="grid min-w-0 gap-4">
      <form
        className={`${ownerPanel} grid gap-3`}
        onSubmit={(e) => {
          e.preventDefault();
          void act({ action: "contact", contact: entry });
        }}
      >
        <h3 className="font-semibold">Contact details</h3>
        <label>
          Name
          <input
            className={ownerField}
            required
            maxLength={120}
            value={entry.name}
            onChange={(e) => {
              setEntry({ ...entry, name: e.target.value });
              invalidate();
            }}
          />
        </label>
        <label>
          Email
          <input
            className={ownerField}
            type="email"
            maxLength={254}
            value={entry.email}
            onChange={(e) => {
              setEntry({ ...entry, email: e.target.value });
              invalidate();
            }}
          />
        </label>
        <label>
          Expertise
          <textarea
            className={ownerField}
            maxLength={1000}
            value={entry.expertise}
            onChange={(e) => setEntry({ ...entry, expertise: e.target.value })}
          />
        </label>
        <label>
          Private notes
          <textarea
            className={ownerField}
            maxLength={4000}
            value={entry.notes}
            onChange={(e) => setEntry({ ...entry, notes: e.target.value })}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            Follow-up status
            <select
              className={ownerField}
              value={entry.status}
              onChange={(e) =>
                setEntry({ ...entry, status: e.target.value as CrmContact["status"] })
              }
            >
              {["new", "follow_up", "waiting", "done"].map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label>
            Follow-up date
            <input
              type="date"
              className={ownerField}
              value={entry.follow_up_on}
              onChange={(e) => setEntry({ ...entry, follow_up_on: e.target.value })}
            />
          </label>
        </div>
        <details>
          <summary className="text-sm">Link an existing customer account</summary>
          <p className="text-xs">
            Optional account UUID from Users. Email must match. This reuses that customer’s existing
            referral link; no incentive is created.
          </p>
          <label>
            Customer account ID
            <input
              className={ownerField}
              value={entry.user_id ?? ""}
              onChange={(e) => {
                setEntry({ ...entry, user_id: e.target.value || null });
                invalidate();
              }}
            />
          </label>
        </details>
        <div className="flex flex-wrap gap-3">
          <button className={ownerPrimary} disabled={r.busy}>
            Save contact
          </button>
          <button type="button" className={ownerButton} onClick={onClose}>
            Close / discard unsaved edits
          </button>
        </div>
      </form>
      <section className={`${ownerPanel} grid gap-3`} aria-label="Review packet draft">
        <h3 className="font-semibold">Email / ad review packet</h3>
        <p className="text-sm">
          Select original ads below. Links stay on Drive; this does not copy files or change access.
          Internal campaign setup and budget files are excluded.
        </p>
        <fieldset className="grid max-h-72 gap-2 overflow-auto">
          <legend className="font-medium">Existing ads ({data.assets.length})</legend>
          {data.assets.map((a) => (
            <label key={a.id} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={assetIds.includes(a.id)}
                disabled={!assetIds.includes(a.id) && assetIds.length >= 24}
                onChange={(e) => {
                  setAssets(
                    e.target.checked ? [...assetIds, a.id] : assetIds.filter((id) => id !== a.id),
                  );
                  invalidate();
                }}
              />
              <span className="min-w-0 break-words">
                {a.title} <span className="text-xs">{a.category}</span> ·{" "}
                <a className="underline" href={a.url} target="_blank" rel="noreferrer">
                  Open original
                </a>
              </span>
            </label>
          ))}
          {!data.assets.length && (
            <p className="text-sm">
              Import the existing ad catalog to select images. No replacement ads will be generated.
            </p>
          )}
        </fieldset>
        <button
          type="button"
          className={ownerButton}
          onClick={() => {
            setAiOpen(!aiOpen);
            setAiRevision((n) => n + 1);
          }}
        >
          {aiOpen ? "Cancel AI draft" : "Write with AI"}
        </button>
        {aiOpen && (
          <OwnerEmailAI
            key={aiRevision}
            onDraft={(d) => {
              setSubject(d.subject);
              setBody(d.body);
              invalidate();
              setAiOpen(false);
            }}
          />
        )}
        <label>
          Subject
          <input
            className={ownerField}
            maxLength={160}
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              invalidate();
            }}
          />
        </label>
        <label>
          Editable cover note
          <textarea
            className={ownerField}
            rows={8}
            maxLength={6000}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              invalidate();
            }}
          />
        </label>
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={referral}
            disabled={!data.referrals.some((link) => link.active)}
            onChange={(e) => {
              setReferral(e.target.checked);
              invalidate();
            }}
          />
          Include existing referral link (tracking only; no automatic reward)
        </label>
        {referral && (
          <label>
            Referral attributed to
            <select
              className={ownerField}
              value={referralUser ?? ""}
              onChange={(e) => {
                setReferralUser(e.target.value || null);
                invalidate();
              }}
            >
              <option value="">Choose an existing referral owner</option>
              {data.referrals
                .filter((link) => link.active)
                .map((link) => (
                  <option key={link.user_id} value={link.user_id}>
                    {data.contacts.find((c) => c.user_id === link.user_id)?.name ??
                      `Customer ${link.user_id}`}
                  </option>
                ))}
            </select>
          </label>
        )}
        {!data.referrals.some((link) => link.active) && (
          <p className="text-xs">
            Create a referral link for its actual owner in Users first. This does not register the
            recipient or promise rewards.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            className={ownerButton}
            disabled={
              r.busy || !saved || dirty || !subject.trim() || !body.trim() || (referral && !ref)
            }
            onClick={() =>
              void act({
                action: "draft",
                draft: {
                  id: draftId.current,
                  contact_id: entry.id,
                  subject,
                  body,
                  asset_ids: assetIds,
                  include_referral: referral,
                  referral_user_id: referral ? referralUser : null,
                },
              })
            }
          >
            Save unsent draft
          </button>
          <button className={ownerButton} disabled={!valid} onClick={() => setPreview(true)}>
            Preview complete email
          </button>
        </div>
        {preview && (
          <div
            className="grid gap-3 rounded-lg border border-border p-4"
            aria-label="Complete email preview"
          >
            <p className="break-words">
              <strong>To:</strong> {entry.name} &lt;{entry.email}&gt;
            </p>
            <h4 className="break-words font-semibold">{subject}</h4>
            <pre className="whitespace-pre-wrap break-words font-sans text-sm">{assembled}</pre>
            <p className="text-xs">
              Private notes and expertise are excluded. Open each selected ad and check recipient
              access before sharing. Customer promotional email must use the existing customer tools
              for opt-out and footer checks.
            </p>
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={reviewCurrent}
                onChange={(e) => {
                  setReviewed(e.target.checked);
                  setReviewSignature(signature);
                }}
              />
              I reviewed the exact recipient, complete message and selected ad access.
            </label>
            <button
              className={ownerButton}
              disabled={!reviewCurrent || !valid || !!entry.user_id}
              onClick={() => {
                const blob = new Blob([emailDraftFile(entry.email, subject, assembled)], {
                  type: "message/rfc822",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "language-threshold-review-draft.eml";
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                setReviewed(false);
                setNotice(
                  "Unsent email file downloaded. Review and send deliberately in your email client.",
                );
              }}
            >
              Download reviewed unsent email (.eml)
            </button>
            {entry.user_id && (
              <>
                <button
                  className={ownerButton}
                  disabled={
                    !reviewCurrent ||
                    !valid ||
                    customer.busy ||
                    customerAttempted ||
                    assembled.length > 8000
                  }
                  onClick={() => void saveCustomerDraft()}
                >
                  Save reviewed packet to customer email drafts
                </button>
                <p className="text-sm">
                  Then open Users → Customer email and referrals to review and send with the
                  existing permission, opt-out and footer checks.{" "}
                  {assembled.length > 8000
                    ? "Shorten this packet to 8,000 characters before saving to customer email."
                    : ""}
                </p>
              </>
            )}
            <button
              className={ownerButton}
              onClick={() => {
                setPreview(false);
                setReviewed(false);
              }}
            >
              Cancel preview
            </button>
          </div>
        )}
        <h4 className="font-medium">Saved unsent drafts</h4>
        <ul className="grid gap-2">
          {data.drafts
            .filter((d) => d.contact_id === entry.id)
            .map((d) => (
              <li key={d.id}>
                <button className={`${ownerButton} w-full text-left`} onClick={() => load(d)}>
                  {d.subject} ·{" "}
                  {d.created_at ? new Date(d.created_at).toLocaleDateString() : "Draft"}
                </button>
              </li>
            ))}
        </ul>
      </section>
      <OwnerMessage error={error} notice={notice} />
    </div>
  );
}
