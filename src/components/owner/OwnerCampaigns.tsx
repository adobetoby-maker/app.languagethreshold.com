import { useRef, useState } from "react";
import { useOwnerResource } from "./use-owner-resource";
import { ownerButton, ownerField, ownerPanel, ownerPrimary } from "./owner-ui";
import type { CampaignData } from "@/lib/customer-campaigns";

export function OwnerCampaigns() {
  const r = useOwnerResource<CampaignData>("/api/owner-campaigns");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [permission, setPermission] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [confirmationId, setConfirmationId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const stop = useRef(false);
  if (!r.allowed) return null;
  const campaignData = r.data;
  async function prepare() {
    setError("");
    setNotice("");
    try {
      const result = await r.run<{ notice: string }>({
        action: "prepare",
        id: crypto.randomUUID(),
        subject,
        body,
        permissionConfirmed: permission,
      });
      if (result) {
        setNotice(result.notice);
        setPermission(false);
        setConfirmation("");
        r.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Campaign could not be prepared.");
    }
  }
  async function send(id: string, drafts: number, all: boolean) {
    setError("");
    setNotice("");
    setSending(true);
    stop.current = false;
    let processed = 0;
    try {
      for (let batch = 0; batch < (all ? Math.ceil(drafts / 3) : 1); batch++) {
        if (stop.current) break;
        const result = await r.run<{ notice: string; processed: number }>({
          action: "send_batch",
          id,
        });
        if (!result || result.processed === 0) break;
        processed += result.processed;
        setNotice(`${processed} of ${drafts} queued messages processed. ${result.notice}`);
      }
      r.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Sending stopped. Review campaign status before retrying.",
      );
      r.refresh();
    } finally {
      setSending(false);
      setConfirmation("");
    }
  }
  return (
    <section className={ownerPanel} aria-label="Customer email campaigns">
      <h2 className="text-lg font-semibold">Email all customers</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Send a reviewed message to confirmed adult accounts that have not unsubscribed. Junior
        accounts, platform staff and disabled accounts are excluded. Every message includes the
        business address and unsubscribe link. Provider acceptance does not prove inbox delivery.
      </p>
      {r.loading && <p className="mt-3 text-sm">Loading campaigns…</p>}
      {r.error && (
        <p role="alert" className="mt-3 text-sm">
          Campaigns are unavailable.
        </p>
      )}
      {campaignData && (
        <>
          <p className="mt-3 text-sm">{campaignData.eligible} currently eligible recipients.</p>
          {!campaignData.ready && (
            <p className="mt-2 text-sm">
              The verified sender, key or postal address is missing. Sending is disabled.
            </p>
          )}
          <form
            className="mt-4 grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void prepare();
            }}
          >
            <label className="text-sm">
              Subject
              <input
                className={ownerField}
                value={subject}
                maxLength={160}
                required
                onChange={(e) => {
                  setSubject(e.target.value);
                  setPermission(false);
                }}
              />
            </label>
            <label className="text-sm">
              Message
              <textarea
                className={ownerField}
                value={body}
                maxLength={8000}
                rows={5}
                required
                onChange={(e) => {
                  setBody(e.target.value);
                  setPermission(false);
                }}
              />
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={permission}
                onChange={(e) => setPermission(e.target.checked)}
              />
              I confirm I have permission to email this audience and have reviewed this message.
            </label>
            <button
              type="submit"
              className={ownerPrimary}
              disabled={!permission || r.busy || sending || campaignData.eligible === 0}
            >
              Prepare drafts for all eligible customers
            </button>
          </form>
          {campaignData.campaigns.map((campaign) => (
            <div key={campaign.id} className="mt-4 rounded-xl border border-border p-3">
              <strong className="break-words">{campaign.subject}</strong>
              <p className="mt-1 text-sm text-muted-foreground">
                {campaign.recipients} recipients · {campaign.draft} unsent · {campaign.accepted}{" "}
                provider accepted · {campaign.unconfirmed} unconfirmed · {campaign.skipped} skipped
              </p>
              {campaign.draft > 0 && (
                <div className="mt-3 grid gap-2">
                  <label className="text-sm">
                    Type SEND {campaign.draft} to approve delivery
                    <input
                      className={ownerField}
                      value={confirmationId === campaign.id ? confirmation : ""}
                      onChange={(e) => {
                        setConfirmationId(campaign.id);
                        setConfirmation(e.target.value);
                      }}
                      autoComplete="off"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={ownerButton}
                      disabled={
                        !campaignData.ready ||
                        sending ||
                        r.busy ||
                        confirmationId !== campaign.id ||
                        confirmation !== `SEND ${campaign.draft}`
                      }
                      onClick={() => void send(campaign.id, campaign.draft, false)}
                    >
                      Send next 3
                    </button>
                    <button
                      type="button"
                      className={ownerPrimary}
                      disabled={
                        !campaignData.ready ||
                        sending ||
                        r.busy ||
                        confirmationId !== campaign.id ||
                        confirmation !== `SEND ${campaign.draft}`
                      }
                      onClick={() => void send(campaign.id, campaign.draft, true)}
                    >
                      Send all remaining
                    </button>
                    {sending && (
                      <button
                        type="button"
                        className={ownerButton}
                        onClick={() => {
                          stop.current = true;
                        }}
                      >
                        Stop after this batch
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </>
      )}
      {notice && (
        <p role="status" className="mt-3 text-sm">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}
