export const DOCUMENT_PLANS = {
  includedDocuments: 10,
  monthlyCharacters: 50_000,
  storage: { cents: 500, documents: 100 },
  translations: { cents: 500, characters: 50_000 },
} as const;
export function documentCharacterCount(text: string) {
  return Array.from(text.trim()).length;
}
export function documentMonth(now = new Date()) {
  return now.toISOString().slice(0, 7) + "-01";
}
