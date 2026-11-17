import { z } from "zod";
import { ownerServiceFetch } from "./owner-service-fetch";
import { TeamOperationError } from "./team-server";
import type { MarketingStream } from "./owner-marketing";
const cursorSchema = z.string().uuid();
const providerPage = z.object({
  has_more: z.boolean(),
  data: z
    .array(
      z.object({
        id: z.string().uuid(),
        to: z.array(z.string().email()).max(50),
        from: z.string().max(500),
        subject: z.string().max(1000),
        created_at: z.string(),
        last_event: z.string().optional(),
      }),
    )
    .max(50),
});
export async function ownerMarketingStream(
  cursor: string | null,
  signal: AbortSignal,
  request = fetch,
): Promise<MarketingStream> {
  if (cursor && !cursorSchema.safeParse(cursor).success)
    throw new TeamOperationError("Invalid email history cursor.", 400);
  if (!process.env.RESEND_API_KEY)
    throw new TeamOperationError("The sending connection is not configured.", 503);
  const url = new URL("https://api.resend.com/emails");
  url.searchParams.set("limit", "50");
  if (cursor) url.searchParams.set("after", cursor);
  const response = await ownerServiceFetch(signal, request)(url, {
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
  });
  if (!response.ok)
    throw new TeamOperationError(
      "Delivery history could not be loaded. Check Resend or the saved key permissions.",
      503,
    );
  const result = providerPage.safeParse(await response.json());
  if (!result.success)
    throw new TeamOperationError("The provider returned an unexpected email history format.", 503);
  const page = result.data;
  return {
    messages: page.data
      .filter((m) =>
        /^[^<>\r\n]*<[^<>\s@]+@(?:languagethreshold\.com|medicalspanish\.app|constructionspanish\.app|juniorlinguist\.com)>$|^[^<>\s@]+@(?:languagethreshold\.com|medicalspanish\.app|constructionspanish\.app|juniorlinguist\.com)$/i.test(
          m.from.trim(),
        ),
      )
      .map((m) => ({
        id: m.id,
        to: m.to,
        from: m.from,
        subject: m.subject,
        createdAt: Number.isFinite(Date.parse(m.created_at))
          ? new Date(m.created_at).toISOString()
          : null,
        status: [
          "delivered",
          "opened",
          "clicked",
          "sent",
          "bounced",
          "complained",
          "failed",
          "suppressed",
          "delivery_delayed",
          "scheduled",
          "canceled",
          "queued",
        ].includes(m.last_event || "")
          ? m.last_event!
          : "unknown",
        isTest:
          m.to.some((to) => /@resend\.dev$/i.test(to)) ||
          /delivery test|validation|test message/i.test(m.subject),
        category:
          /Junior Linguist/i.test(m.from) ||
          /child.s first Spanish|family words|junior/i.test(m.subject)
            ? "Kids / parents"
            : /construction|jobsite|trade|worksite/i.test(m.subject)
              ? "Construction"
              : /medical|clinical|nursing|orthoped|patient/i.test(m.subject)
                ? "Medical"
                : /homeschool/i.test(m.subject)
                  ? "Homeschool"
                  : "Language Threshold",
      })),
    nextCursor: page.has_more ? page.data.at(-1)?.id || null : null,
    checkedAt: new Date().toISOString(),
  };
}
