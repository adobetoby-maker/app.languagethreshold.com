import { useState } from "react";
import { OwnerEmailAI } from "./OwnerEmailAI";
import { useOwnerResource } from "./use-owner-resource";
import { referralLink, type CustomerData } from "@/lib/customer-communications";
const field = "w-full rounded-lg border border-border bg-background p-3";
const button = "rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50";
export function OwnerCustomerTools({ userId, email }: { userId: string; email: string | null }) {
  const r = useOwnerResource<CustomerData>(`/api/owner-customers?userId=${userId}`);
  const [subject, setSubject] = useState(""),
    [body, setBody] = useState(""),
    [permission, setPermission] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  if (!r.allowed) return null;
  async function act(action: unknown) {
    setError("");
    setNotice("");
    try {
      const result = await r.run<{ notice: string }>(action);
      if (result) {
        setNotice(result.notice);
        setPermission(false);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not confirm action. Refresh before retrying.",
      );
    }
  }
  const link = r.data?.referral;
  return (
    <section
      className="mt-6 grid min-w-0 gap-3 border-t border-border pt-4"
      aria-label="Customer email and referrals"
    >
      <h4 className="font-semibold">Customer email and referrals</h4>
      {r.error && <p role="alert">{r.error}</p>}
      <button className={button} onClick={r.refresh} disabled={r.busy}>
        Refresh customer tools
      </button>
      {r.loading && <p>Loading customer tools…</p>}
      {r.data && (
        <>
          <p className="text-sm">
            Referral tracking: {r.data.referralCount} confirmed new accounts. These are
            registrations, not paid conversions. Automatic rewards are off.
          </p>
          {link ? (
            <>
              <label className="text-sm">
                Referral link
                <input
                  className={field}
                  readOnly
                  value={referralLink(link.code)}
                  onFocus={(e) => e.currentTarget.select()}
                />
              </label>
              <p>{link.active ? "Active" : "Disabled"}</p>
              {link.active && (
                <button
                  disabled={r.busy}
                  className={button}
                  onClick={() => void act({ action: "disable_referral", userId })}
                >
                  Disable referral link
                </button>
              )}
            </>
          ) : (
            <button
              disabled={r.busy}
              className={button}
              onClick={() => void act({ action: "referral", userId })}
            >
              Create referral link
            </button>
          )}
          {link?.active && (
            <button
              className={button}
              onClick={() => {
                setSubject("Share Language Threshold with a friend");
                setBody(
                  `Thanks for learning with Language Threshold. If you know someone who would enjoy practicing with us, share your referral link:\n\n${referralLink(link.code)}\n\nWe appreciate your feedback and support.`,
                );
                setPermission(false);
              }}
            >
              Use referral invitation template
            </button>
          )}
          <h5 className="font-semibold">Email {email}</h5>
          <p className="text-sm">
            Send one reviewed message to this customer. Use the discount tools to create an offer,
            then include its code or this customer’s referral link in your message.
          </p>
          {!r.data.ready && (
            <p className="text-sm">
              Drafts are available. Direct customer email needs a verified sender, sending key and
              business postal address.
            </p>
          )}
          {r.data.unsubscribed && (
            <p>This customer has stopped promotional emails. Sending is blocked.</p>
          )}
          <OwnerEmailAI
            onDraft={(draft) => {
              setSubject(draft.subject);
              setBody(draft.body);
              setPermission(false);
            }}
          />
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void act({ action: "draft", userId, id: crypto.randomUUID(), subject, body });
            }}
          >
            <label>
              Subject
              <input
                className={field}
                required
                maxLength={160}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>
            <label>
              Message
              <textarea
                className={field}
                rows={6}
                required
                maxLength={8000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </label>
            <p className="text-sm">
              A Language Threshold footer, business postal address and unsubscribe link are added
              when sending.
            </p>
            <button className={button} disabled={r.busy}>
              Save email draft
            </button>
          </form>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={permission}
              onChange={(e) => setPermission(e.target.checked)}
            />
            I have permission to email this customer about this offer and have reviewed the
            recipient and message below.
          </label>
          <ul className="grid gap-3">
            {r.data.messages.map((m) => (
              <li className="min-w-0 rounded-lg border border-border p-3" key={m.id}>
                <strong className="break-words">{m.subject}</strong>
                <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
                <p className="my-2 text-sm">
                  {new Date(m.created_at).toLocaleString()} ·{" "}
                  {m.status === "sending" ? "Attempt started; outcome not confirmed" : m.status}
                </p>
                {m.status === "draft" && (
                  <button
                    className={button}
                    disabled={r.busy || !permission || !r.data?.ready || r.data?.unsubscribed}
                    onClick={() =>
                      void act({
                        action: "send",
                        id: m.id,
                        permissionConfirmed: true,
                        recipient: email,
                      })
                    }
                  >
                    Send this email to {email}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
