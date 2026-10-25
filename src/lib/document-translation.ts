export const DOCUMENT_LIMIT = 8000;
/** Keep the submitted wording as the source of truth; the model only supplies translations. */
export function documentPassages(text: string): string[] {
  const clean = text.replace(/\r\n?/g, "\n").trim();
  if (clean.length < 10 || clean.length > DOCUMENT_LIMIT)
    throw new Error("Add between 10 and 8,000 characters.");
  return clean.split(/\n+/).filter((line) => line.trim().length > 0);
}
export function validateDocumentTranslations(value: unknown, count: number): string[] {
  if (
    !Array.isArray(value) ||
    value.length !== count ||
    value.some((line) => typeof line !== "string" || !line.trim())
  ) {
    throw new Error("Translation was incomplete. Your original is still here; please try again.");
  }
  return value as string[];
}
