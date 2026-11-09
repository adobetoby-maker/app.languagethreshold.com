import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import { downloadLead, isSetupLead, leadSites } from "@/lib/download-leads";
import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import { teamAdminClient, json } from "@/lib/team-server";

export async function recordDownloadLead(request: Request) {
  // Separate per-site write-only credentials; never a CRM admin or Supabase key in funnels.
  const site = request.headers.get("x-lead-site");
  const stamp = request.headers.get("x-lead-time") ?? "";
  const signature = request.headers.get("x-lead-signature") ?? "";
  if (
    !site ||
    !leadSites.includes(site as (typeof leadSites)[number]) ||
    !/^\d{13}$/.test(stamp) ||
    Math.abs(Date.now() - Number(stamp)) > 300_000 ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    return json({ error: "Invalid reporting request." }, 403);
  let secret: string | undefined;
  try {
    secret = JSON.parse(process.env.DOWNLOAD_LEAD_KEYS ?? "{}")[site];
  } catch {
    /* fail closed */
  }
  if (!secret || secret.length < 32) return json({ error: "Reporting unavailable." }, 503);
  const reader = request.body?.getReader();
  if (!reader) return json({ error: "Invalid reporting request." }, 400);
  let raw = "";
  const decoder = new TextDecoder();
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 4096) {
        await reader.cancel();
        return json({ error: "Request too large." }, 413);
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
    const expected = createHmac("sha256", secret).update(`${stamp}.${raw}`).digest();
    if (!timingSafeEqual(expected, Buffer.from(signature, "hex")))
      return json({ error: "Invalid reporting request." }, 403);
    const lead = downloadLead.parse(JSON.parse(raw));
    if (lead.site !== site) return json({ error: "Invalid reporting request." }, 403);
    const db = teamAdminClient(ownerServiceFetch(request.signal));
    const { error } = await db
      .from("free_download_leads")
      .upsert(
        { ...lead, is_test: isSetupLead(lead.email) },
        { onConflict: "event_id", ignoreDuplicates: true },
      );
    if (error) return json({ error: "Reporting unavailable." }, 503);
    return json({ ok: true });
  } catch {
    return json({ error: "Reporting request could not be saved." }, 503);
  } finally {
    reader.releaseLock();
  }
}
export const Route = createFileRoute("/api/download-lead")({
  server: { handlers: { POST: ({ request }) => recordDownloadLead(request) } },
});
