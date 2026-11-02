import type { LibraryEntry } from "@/state/library-state";

/**
 * Per-language LDS scripture packs — loaded on-demand when the user's selected
 * language changes. Each loader returns a Promise so Vite can split each
 * language group into its own chunk (~50–65 kB each).
 */
export const LDS_PACK_LOADERS: Record<string, () => Promise<LibraryEntry[]>> = {
  Spanish: () =>
    import("@/data/lds-scriptures").then(({ LDS_SCRIPTURES }) =>
      LDS_SCRIPTURES.map((book) => ({
        id: book.id,
        title: book.title,
        subtitle: book.subtitle,
        language: "Spanish" as const,
        targetLabel: "Español",
        level: "C1" as const,
        section: "missionary" as const,
        flag: book.flag,
        available: true,
        sentences: book.chapters[0]?.sentences ?? [],
        chapters: book.chapters,
        category: "Faith",
      })),
    ),
  French: () =>
    import("@/data/library-seeds/lds-scriptures-fr-pt").then(({ LDS_SCRIPTURES_FR }) =>
      LDS_SCRIPTURES_FR.map((e) => ({ ...e, category: "Faith" })),
    ),
  Portuguese: () =>
    import("@/data/library-seeds/lds-scriptures-fr-pt").then(({ LDS_SCRIPTURES_PT }) =>
      LDS_SCRIPTURES_PT.map((e) => ({ ...e, category: "Faith" })),
    ),
  German: () =>
    import("@/data/library-seeds/lds-scriptures-de-it").then(({ LDS_SCRIPTURES_DE }) =>
      LDS_SCRIPTURES_DE.map((e) => ({ ...e, category: "Faith" })),
    ),
  Italian: () =>
    import("@/data/library-seeds/lds-scriptures-de-it").then(({ LDS_SCRIPTURES_IT }) =>
      LDS_SCRIPTURES_IT.map((e) => ({ ...e, category: "Faith" })),
    ),
  Japanese: () =>
    import("@/data/library-seeds/lds-scriptures-ja-ko").then(({ LDS_SCRIPTURES_JA }) =>
      LDS_SCRIPTURES_JA.map((e) => ({ ...e, category: "Faith" })),
    ),
  Korean: () =>
    import("@/data/library-seeds/lds-scriptures-ja-ko").then(({ LDS_SCRIPTURES_KO }) =>
      LDS_SCRIPTURES_KO.map((e) => ({ ...e, category: "Faith" })),
    ),
};
