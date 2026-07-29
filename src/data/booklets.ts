import snapshot from "@/data/generated/hello-little-one.booklet.json";
import type { LibraryEntry } from "@/state/library-state";

export interface BookletSentence {
  sentenceId: string;
  order: number;
  en: string;
  target: string;
}

export interface BookletPage {
  pageId: string;
  sourceLabel: string;
  order: number;
  kind: "cover" | "content";
  image: {
    assetId: string;
    url: string;
    altText: { source: string; target: string };
    ownershipStatus: string;
    storageStatus: string;
    sha256: string;
  };
  sentences: BookletSentence[];
}

export interface BookletContent {
  bookId: string;
  editionId: string;
  editionVersion: number;
  sourceLanguage: "en";
  targetLanguage: "es";
  contentStatus: string;
  title: string;
  subtitle: string;
  targetLabel: string;
  level: string;
  pages: BookletPage[];
}

export const HELLO_LITTLE_ONE_SNAPSHOT = snapshot as {
  generatedAtSourceCommit: string;
  sourceRepository: string;
  sourceFixture: string;
  sourceFixtureSha256: string;
  content: BookletContent;
};

export const HELLO_LITTLE_ONE_ENTRY: LibraryEntry = {
  id: HELLO_LITTLE_ONE_SNAPSHOT.content.editionId,
  title: HELLO_LITTLE_ONE_SNAPSHOT.content.title,
  subtitle: HELLO_LITTLE_ONE_SNAPSHOT.content.subtitle,
  language: "Spanish",
  targetLabel: HELLO_LITTLE_ONE_SNAPSHOT.content.targetLabel,
  sentences: HELLO_LITTLE_ONE_SNAPSHOT.content.pages.flatMap((page) =>
    page.sentences.map(({ en, target }) => ({ en, target })),
  ),
  section: "readers",
  category: "Readers",
  flag: "📖",
  available: true,
  booklet: HELLO_LITTLE_ONE_SNAPSHOT.content,
};
