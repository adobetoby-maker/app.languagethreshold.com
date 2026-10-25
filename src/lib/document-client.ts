import type { SentencePair } from "@/data/library";
export interface SavedDocument {
  id: string;
  title: string;
  source_language: string;
  target_language: string;
  sentences: SentencePair[];
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
