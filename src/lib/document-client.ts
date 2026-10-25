import type { DocumentSentence } from "./document-words";
export interface SavedDocument {
  id: string;
  title: string;
  source_language: string;
  target_language: string;
  sentences: DocumentSentence[];
  created_at: string;
}
export interface DocumentAllowance {
  documents: SavedDocument[];
  limit: number;
  monthlyRemaining: number;
  purchasedRemaining: number;
  hasBilling: boolean;
  storageSubscription: boolean;
  storagePaidUntil: string | null;
}
