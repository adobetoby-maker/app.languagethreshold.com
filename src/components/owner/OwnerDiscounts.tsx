import { useState } from "react";
import type { OwnerDiscount } from "@/lib/owner-discounts";
import { useOwnerResource } from "./use-owner-resource";
const field = "w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground";
const button = "rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50";
type Report = {
  ready: boolean;
  discounts: OwnerDiscount[];
  hasMore: boolean;
  nextCursor: string | null;
};
export function OwnerDiscounts() {
  const [cursor, setCursor] = useState("");
  const resource = useOwnerResource<Report>(
    `/api/owner-discounts${cursor ? `?after=${encodeURIComponent(cursor)}` : ""}`,
  );
  const [code, setCode] = useState(""),
    [kind, setKind] = useState<"percent" | "usd">("percent"),
    [value, setValue] = useState("20"),
    [duration, setDuration] = useState<"once" | "forever">("once"),
    [max, setMax] = useState("1"),
    [expires, setExpires] = useState(() =>
      new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    );
  const [requestId, setRequestId] = useState(() => crypto.randomUUID()),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false);
  if (!resource.allowed) return null;
  function edited() {
    setRequestId(crypto.randomUUID());
    setConfirm(false);
  }
  async function act(body: unknown) {
    setError("");
    setNotice("");
    try {
      const r = await resource.run<{ notice: string }>(body);
      if (r) {
        setNotice(r.notice);
        setRequestId(crypto.randomUUID());
        setConfirm(false);
        resource.refresh();
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not confirm discount. Refresh before retrying.",
      );
    }
  }
  return (
    <section
      className="rounded-2xl border border-border/60 bg-card/50 p-4 sm:p-5"
      aria-labelledby="owner-discounts-title"
    >
      <h2 id="owner-discounts-title" className="text-xl font-semibold">
        Discount codes
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Customers enter these codes at new individual or team subscription checkout. Creating a code
        does not charge anyone or change existing invoices. Codes can be used by anyone you share
        them with, up to the redemption limit. Amounts are USD.
      </p>
      {(error || resource.error) && (
        <p role="alert" className="mt-3 text-red-700 dark:text-red-300">
          {error || resource.error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-3">
          {notice}
        </p>
      )}
      {resource.loading ? (
        <p className="mt-3">Loading discounts…</p>
      ) : resource.data && !resource.data.ready ? (
        <p className="mt-3">Stripe is not configured. Discounts cannot be issued yet.</p>
      ) : (
        resource.data && (
          <>
            <form
              className="my-4 grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2 lg:grid-cols-3"
              onSubmit={(e) => {
                e.preventDefault();
                void act({
                  action: "create",
                  requestId,
                  code,
                  kind,
                  value: kind === "usd" ? Math.round(Number(value) * 100) : Number(value),
                  duration,
                  maxRedemptions: Number(max),
                  expiresAt: new Date(`${expires}T23:59:59`).toISOString(),
                });
              }}
            >
              <label className="text-sm">
                Code
                <input
                  required
                  pattern="[A-Za-z0-9-]{3,40}"
                  maxLength={40}
                  className={field}
                  value={code}
                  placeholder="WELCOME20"
                  onChange={(e) => {
                    setCode(e.target.value);
                    edited();
                  }}
                />
              </label>
              <label className="text-sm">
                Discount type
                <select
                  className={field}
                  value={kind}
                  onChange={(e) => {
                    setKind(e.target.value as "percent" | "usd");
                    edited();
                  }}
                >
                  <option value="percent">Percentage off</option>
                  <option value="usd">USD amount off</option>
                </select>
              </label>
              <label className="text-sm">
                {kind === "usd" ? "Amount in USD" : "Percent off"}
                <input
                  type="number"
                  required
                  min={kind === "usd" ? "0.01" : "1"}
                  max={kind === "usd" ? "1000" : "100"}
                  step={kind === "usd" ? "0.01" : "1"}
                  className={field}
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    edited();
                  }}
                />
              </label>
              <label className="text-sm">
                Applies to
                <select
                  className={field}
                  value={duration}
                  onChange={(e) => {
                    setDuration(e.target.value as "once" | "forever");
                    edited();
                  }}
                >
                  <option value="once">First invoice only</option>
                  <option value="forever">Every renewal</option>
                </select>
              </label>
              <label className="text-sm">
                Maximum redemptions
                <input
                  className={field}
                  type="number"
                  required
                  min={1}
                  max={10000}
                  step={1}
                  value={max}
                  onChange={(e) => {
                    setMax(e.target.value);
                    edited();
                  }}
                />
              </label>
              <label className="text-sm">
                Code expires after
                <input
                  className={field}
                  type="date"
                  required
                  value={expires}
                  onChange={(e) => {
                    setExpires(e.target.value);
                    edited();
                  }}
                />
              </label>
              <label className="flex items-start gap-2 text-sm sm:col-span-2 lg:col-span-3">
                <input
                  type="checkbox"
                  required
                  checked={confirm}
                  onChange={(e) => setConfirm(e.target.checked)}
                />
                <span>
                  Create <strong>{code || "this code"}</strong> for{" "}
                  {kind === "usd" ? `$${Number(value || 0).toFixed(2)}` : `${value}%`} off{" "}
                  {duration === "once" ? "the first invoice" : "every renewal"}, with at most {max}{" "}
                  redemptions. Code expiry stops new redemptions; it does not remove a discount
                  already applied to a subscription.
                </span>
              </label>
              <button
                className={button + " bg-gold font-semibold text-midnight"}
                disabled={resource.busy || !confirm}
              >
                {resource.busy ? "Saving…" : "Create discount code"}
              </button>
            </form>
            <div className="grid gap-3 lg:grid-cols-2">
              {resource.data.discounts.map((d) => (
                <div key={d.id} className="min-w-0 rounded-xl border border-border p-4">
                  <strong className="break-all">{d.code}</strong>
                  <p className="mt-1 text-sm">
                    {d.percentOff !== null
                      ? `${d.percentOff}%`
                      : `$${((d.amountOff ?? 0) / 100).toFixed(2)}`}{" "}
                    off ·{" "}
                    {d.duration === "once"
                      ? "First invoice"
                      : d.duration === "forever"
                        ? "Every renewal"
                        : "See Stripe"}
                  </p>
                  <p className="text-sm">
                    {d.active ? "Enabled" : "Disabled"} · Used {d.timesRedeemed} of{" "}
                    {d.maxRedemptions ?? "unlimited"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expires{" "}
                    {d.expiresAt ? new Date(d.expiresAt * 1000).toLocaleString() : "No expiry"}
                  </p>
                  {d.active && (
                    <button
                      className={button + " mt-2"}
                      disabled={resource.busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Disable ${d.code} for future redemptions? Existing subscription discounts will remain.`,
                          )
                        )
                          void act({ action: "disable", promotionId: d.id });
                      }}
                    >
                      Disable future redemptions
                    </button>
                  )}
                </div>
              ))}
            </div>
            {!resource.data.discounts.length && (
              <p className="text-sm">No dashboard-created codes on this page.</p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                className={button}
                disabled={resource.busy}
                onClick={() => {
                  setCursor("");
                  resource.refresh();
                }}
              >
                Refresh latest
              </button>
              {resource.data.hasMore && resource.data.nextCursor && (
                <button
                  className={button}
                  disabled={resource.busy}
                  onClick={() => setCursor(resource.data!.nextCursor!)}
                >
                  Older codes
                </button>
              )}
            </div>
          </>
        )
      )}
    </section>
  );
}
