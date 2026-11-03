import { useState } from "react";
import { useOwnerResource } from "./use-owner-resource";
import { ownerPanel, ownerField, ownerPrimary, ownerButton, OwnerMessage } from "./owner-ui";
import { STAFF_CODE, type StaffOffer } from "@/lib/staff-offer";
export function StaffCoupon() {
  const [after, setAfter] = useState("");
  const r = useOwnerResource<{
    recipients: StaffOffer[];
    hasMore: boolean;
    nextCursor: string | null;
  }>("/api/owner-staff-coupon" + (after ? `?after=${encodeURIComponent(after)}` : ""));
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  if (!r.allowed) return null;
  return (
    <section className={ownerPanel} aria-label="Cleaning staff coupon">
      <h2 className="text-lg font-semibold">Cleaning staff — {STAFF_CODE}</h2>
      <p className="my-2">
        Add an email to allow one claim for two free months with $10 total AI/audio use. Share{" "}
        <a className="underline" href="/staff">
          app.languagethreshold.com/staff
        </a>
        . No card or renewal. Adding an email does not send a message.
      </p>
      <form
        className="my-3 flex flex-wrap items-end gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setNotice("");
          try {
            const out = await r.run<{ notice: string }>({ email });
            if (out) {
              setNotice(out.notice);
              setEmail("");
            }
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Save not confirmed. Refresh before retrying.",
            );
          }
        }}
      >
        <label className="min-w-0 flex-1">
          Staff email
          <input
            className={ownerField}
            type="email"
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <button className={ownerPrimary} disabled={r.busy || !email}>
          Add staff email
        </button>
      </form>
      <OwnerMessage error={error || r.error} notice={notice} />
      <ul className="grid gap-3">
        {r.data?.recipients.map((p) => (
          <li className="break-words rounded-lg border p-3" key={p.email}>
            <strong>{p.email}</strong>
            <p>
              {p.claimed_at
                ? `Claimed; ends ${new Date(p.expires_at!).toLocaleDateString()}`
                : "Waiting for first claim"}{" "}
              · ${(p.budget_reserved_microusd / 1_000_000).toFixed(2)} / $10 reserved
            </p>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-3">
        <button className={ownerButton} disabled={r.busy} onClick={r.refresh}>
          Refresh staff list
        </button>
        {after && (
          <button className={ownerButton} onClick={() => setAfter("")}>
            First page
          </button>
        )}
        {r.data?.hasMore && (
          <button className={ownerButton} onClick={() => setAfter(r.data!.nextCursor!)}>
            Next page
          </button>
        )}
      </div>
    </section>
  );
}
