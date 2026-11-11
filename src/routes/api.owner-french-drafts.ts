import { createFileRoute } from "@tanstack/react-router";
import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import {
  authenticatedTeamUser,
  json,
  requirePlatformOwner,
  scopedTeamError,
  teamAdminClient,
} from "@/lib/team-server";

type DraftLesson = {
  n: number;
  stableId: string;
  title: string;
  objective: string;
  focus: string;
  scene: string;
  reviewed: false;
  cards: { fr: string; en: string; kind: string; note?: string }[];
  reader: { speaker: string; fr: string; en: string }[];
  modes: Record<string, { cueEnglish: string; sourceCard: number; responseKind: string }>;
  speaking: {
    role: string;
    partnerRole: string;
    opening: string;
    goal: string;
    closure: string;
    wordBank: string[];
  };
};

type DraftBatch = {
  courseId: string;
  stageId: string;
  pairKey: string;
  locale: string;
  source: { path: string; sha256: string; revision: string };
  sourceContent?: { path: string; sha256: string };
  reviewed: false;
  registered: false;
  readyForLearner: false;
  lessons: DraftLesson[];
};

const stages = {
  "foundation-travel-lunch": { name: "foundation", count: 10, source: "src/data/core60/es/foundation-travel-lunch.json", sha256: "980cd2974e3c4e023a1da2258ed9e32dc1e8e39e8ef87c6913bc0ed094a37dbc" },
  "core-travel-lunch": { name: "core", count: 30, source: "src/data/travel-zone.ts", sha256: "8ca7cacc58a272d5e2c9d55b06e265ec8f6b5102d412bc0382d448942e455fe8" },
  "master-travel-lunch": { name: "master", count: 20, source: "src/data/core60/es/master-travel-lunch.json", sha256: "bce5c0799e9d8d038450599ab839a7d48d6f69533968c94f1d3f2ae3808f4bfa" },
} as const;
const modeNames = ["see", "recall", "hear", "type", "say", "write"] as const;

async function lunchDrafts() {
  // Server-only, post-auth imports. Keep draft JSON and internal review notes out of client chunks.
  const modules = await Promise.all([
    import("../../content/french-travel-lunch/foundation-1-3-draft.json"),
    import("../../content/french-travel-lunch/foundation-4-10-draft.json"),
    import("../../content/french-travel-lunch/core-1-5-draft.json"),
    import("../../content/french-travel-lunch/core-6-10-draft.json"),
    import("../../content/french-travel-lunch/core-11-15-draft.json"),
    import("../../content/french-travel-lunch/core-16-20-draft.json"),
    import("../../content/french-travel-lunch/core-21-25-draft.json"),
    import("../../content/french-travel-lunch/core-26-30-draft.json"),
    import("../../content/french-travel-lunch/master-1-5-draft.json"),
    import("../../content/french-travel-lunch/master-6-10-draft.json"),
    import("../../content/french-travel-lunch/master-11-15-draft.json"),
    import("../../content/french-travel-lunch/master-16-20-draft.json"),
  ]);
  const lessons = modules.flatMap((module) => {
    const batch = module.default as unknown as DraftBatch;
    const stage = stages[batch.stageId as keyof typeof stages];
    if (
      batch.courseId !== "travel-lunch" || batch.pairKey !== "French:English" ||
      batch.locale !== "fr-FR" || !stage || batch.reviewed !== false ||
      batch.registered !== false || batch.readyForLearner !== false ||
      batch.source.path !== stage.source || batch.source.sha256 !== stage.sha256 ||
      (stage.name === "core" && (
        batch.sourceContent?.path !== "public/lesson-content/es/travel-lunch.json" ||
        batch.sourceContent?.sha256 !== "9c6104911c7c3fc2d8f0e1914edb5bd8e490f0d3961babfcece22238f995580d"
      )) ||
      batch.source.revision !== "70cd3dd900b84e5052abe7a8f9e3a397f3000e8e"
    ) throw new Error("French Lunch draft identity, source, or review gate changed");

    return batch.lessons.map((lesson) => {
      if (
        lesson.reviewed !== false || !Number.isInteger(lesson.n) ||
        lesson.n < 1 || lesson.n > stage.count ||
        lesson.stableId !== `${batch.stageId}:${lesson.n}:fr-en` ||
        !Array.isArray(lesson.cards) || !lesson.cards.length ||
        !Array.isArray(lesson.reader) || !lesson.reader.length ||
        lesson.cards.some((card) => !card.fr?.trim() || !card.en?.trim() || !card.kind?.trim()) ||
        lesson.reader.some((turn) => !turn.speaker?.trim() || !turn.fr?.trim() || !turn.en?.trim()) ||
        !Array.isArray(lesson.speaking?.wordBank) ||
        !lesson.modes ||
        modeNames.some((name) => !lesson.modes[name] ||
          !Number.isInteger(lesson.modes[name].sourceCard) ||
          lesson.modes[name].sourceCard < 1 ||
          lesson.modes[name].sourceCard > lesson.cards.length)
      ) throw new Error("French Lunch draft lesson inventory changed");

      // Project only owner-review content. Internal editorial notes remain in the source ledger.
      return {
        stage: stage.name, n: lesson.n, stableId: lesson.stableId,
        title: lesson.title, objective: lesson.objective, focus: lesson.focus,
        scene: lesson.scene, reviewed: false as const,
        cards: lesson.cards.map(({ fr, en, kind, note }) => ({ fr, en, kind, ...(note ? { note } : {}) })),
        reader: lesson.reader.map(({ speaker, fr, en }) => ({ speaker, fr, en })),
        modes: Object.fromEntries(modeNames.map((name) => [name, {
          cueEnglish: lesson.modes[name].cueEnglish,
          sourceCard: lesson.modes[name].sourceCard,
          responseKind: lesson.modes[name].responseKind,
        }])),
        speaking: {
          role: lesson.speaking.role, partnerRole: lesson.speaking.partnerRole,
          opening: lesson.speaking.opening, goal: lesson.speaking.goal,
          closure: lesson.speaking.closure, wordBank: [...lesson.speaking.wordBank],
        },
      };
    });
  });
  if (
    lessons.length !== 60 || new Set(lessons.map((lesson) => lesson.stableId)).size !== 60 ||
    Object.entries(stages).some(([id, stage]) => {
      const numbers = lessons.filter((lesson) => lesson.stableId.startsWith(`${id}:`)).map((lesson) => lesson.n);
      return numbers.length !== stage.count || new Set(numbers).size !== stage.count;
    })
  ) throw new Error("French Lunch stage counts changed");
  return lessons;
}

export const Route = createFileRoute("/api/owner-french-drafts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request);
          const actor = await authenticatedTeamUser(request, db);
          await requirePlatformOwner(db, actor);
          return json({
            pairKey: "French:English", courseId: "travel-lunch",
            status: "owner-review-draft", reviewed: false,
            registered: false, audioRegistered: false,
            lessons: await lunchDrafts(),
          });
        } catch (error) {
          return scopedTeamError(error);
        }
      },
    },
  },
});
