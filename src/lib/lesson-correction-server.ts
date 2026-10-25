import { createHash } from "node:crypto";
import { correctionText, type LessonCorrection } from "./lesson-correction";
import { ownerServiceFetch } from "./owner-service-fetch";
import { TeamOperationError } from "./team-server";

export async function deliverLessonCorrection(
  item: LessonCorrection,
  user: { id: string; email: string },
  signal: AbortSignal,
  fetcher = fetch,
) {
  if (!process.env.RESEND_API_KEY)
    throw new TeamOperationError(
      "Correction sending is unavailable. Please email support@languagethreshold.com.",
      503,
    );
  const key = createHash("sha256")
    .update(JSON.stringify([user.id, item]))
    .digest("hex");
  let response: Response;
  try {
    response = await ownerServiceFetch(signal, fetcher)("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `lt-correction-${key}`,
      },
      body: JSON.stringify({
        from: "Language Threshold <support@languagethreshold.com>",
        to: ["support@languagethreshold.com"],
        reply_to: user.email,
        subject: `Lesson correction: ${item.moduleId} / ${item.lessonNumber}`,
        text: `${correctionText(item)}\n\nSubmitted by: ${user.email}`,
      }),
    });
  } catch {
    throw new TeamOperationError(
      "Sending could not be confirmed. Your suggestion was saved for review; please avoid resending it.",
      503,
    );
  }
  if (!response.ok)
    throw new TeamOperationError(
      "Your suggestion was saved for review, but the email notification could not be sent.",
      503,
    );
  const receipt = await response.json();
  if (!receipt?.id)
    throw new TeamOperationError(
      "Sending could not be confirmed. Your suggestion was saved for review; please avoid resending it.",
      503,
    );
  return { accepted: true };
}
