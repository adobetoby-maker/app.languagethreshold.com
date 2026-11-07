import type { z } from "zod";
import type { feedbackInput } from "./reddit-offer";

/** Keep ratings and permission with the original private feedback record and its retry id. */
export function productFeedbackMessage(input: z.infer<typeof feedbackInput>) {
  const details = [
    input.rating ? `Overall rating: ${input.rating}/5` : "",
    input.easeRating ? `Ease of use: ${input.easeRating}/5` : "",
    input.usefulnessRating ? `Usefulness: ${input.usefulnessRating}/5` : "",
    input.improvement ? `Requested improvement: ${input.improvement}` : "",
    input.testimonialConsent === undefined
      ? ""
      : input.testimonialConsent
        ? "Testimonial permission: customer agrees this feedback may be considered for public use after owner review."
        : "Testimonial permission: private feedback only; no public use approved.",
  ].filter(Boolean);
  return details.length
    ? `${input.message}\n\n--- Feedback details ---\n${details.join("\n")}`
    : input.message;
}
