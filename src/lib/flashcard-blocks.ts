// Pools vocabulary into study "blocks" for the flashcards feature: one block
// per module category (Faith/Medical/Trades/Service/Education/Agriculture/
// Sports/Travel), sourced from each content file's `vocabSets`. My Vocab is
// NOT built here — it reads directly from `state.userVocab` in the
// FlashcardDecks screen, since it already carries translations.
import { MODULES, type AppModule } from "@/data/modules";
import { TRADES_CONTENT } from "@/data/trades-content";
import { TRANSPORT_TRADES_CONTENT } from "@/data/transport-trades-content";
import { AGRI_TRAVEL_FAITH_CONTENT } from "@/data/agri-travel-faith-content";
import { SERVICE_EDU_CONTENT } from "@/data/service-edu-content";
import { BALL_SPORTS_CONTENT } from "@/data/ball-sports-content";
import { TEAM_SPORTS_CONTENT } from "@/data/team-sports-content";
import { MEDICAL_SPECIALIST_CONTENT } from "@/data/medical-specialist-content";

export type BlockCategory = AppModule["category"];

interface VocabSet {
  category: string;
  emoji: string;
  words: string[];
}

interface ContentEntry {
  moduleId: string;
  vocabSets: VocabSet[];
}

// fmg-content (single getFmgContent(), no moduleId array) and or-evs-content
// (no vocabSets) don't follow the {moduleId, vocabSets}[] shape the other
// seven files share — their words are excluded from category decks for now.
const UNPOOLED_MODULE_IDS = new Set(["fmg", "or-evs"]);

const ALL_CONTENT: ContentEntry[] = [
  ...TRADES_CONTENT,
  ...TRANSPORT_TRADES_CONTENT,
  ...AGRI_TRAVEL_FAITH_CONTENT,
  ...SERVICE_EDU_CONTENT,
  ...BALL_SPORTS_CONTENT,
  ...TEAM_SPORTS_CONTENT,
  ...MEDICAL_SPECIALIST_CONTENT,
];

export interface FlashBlock {
  id: string; // category name, used as the SM2 key prefix
  label: string;
  words: string[]; // English headwords, deduped
}

const BLOCK_CATEGORIES: BlockCategory[] = [
  "Faith",
  "Medical",
  "Trades",
  "Service",
  "Education",
  "Agriculture",
  "Sports",
  "Travel",
];

export function getCategoryBlocks(): FlashBlock[] {
  return BLOCK_CATEGORIES.map((category) => {
    const moduleIds = new Set(
      MODULES.filter((m) => m.category === category && !UNPOOLED_MODULE_IDS.has(m.id)).map(
        (m) => m.id,
      ),
    );
    const words = new Set<string>();
    for (const entry of ALL_CONTENT) {
      if (!moduleIds.has(entry.moduleId)) continue;
      for (const set of entry.vocabSets) {
        for (const w of set.words) words.add(w);
      }
    }
    return { id: category, label: category, words: Array.from(words) };
  }).filter((b) => b.words.length > 0);
}
