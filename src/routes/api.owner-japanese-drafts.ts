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
  cards: { ja: string; en: string; kind: string; readingKana?: string }[];
  reader: { speaker: string; ja: string; en: string }[];
  forms?: { base: string; polite: string; meaning: string; [key: string]: string }[];
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
  reviewed: false;
  registered: false;
  readyForLearner: false;
  lessons: DraftLesson[];
};

async function dinnerDrafts() {
  const modules = await Promise.all([
    import("../../content/japanese-travel-dinner/foundation-1-3-draft.json"),
    import("../../content/japanese-travel-dinner/foundation-4-6-draft.json"),
    import("../../content/japanese-travel-dinner/foundation-7-10-draft.json"),
    import("../../content/japanese-travel-dinner/core-1-draft.json"),
    import("../../content/japanese-travel-dinner/core-2-3-draft.json"),
    import("../../content/japanese-travel-dinner/core-4-draft.json"),
    import("../../content/japanese-travel-dinner/core-5-6-draft.json"),
    import("../../content/japanese-travel-dinner/core-7-9-draft.json"),
  ]);
  const batches = modules.map((module) => module.default as unknown as DraftBatch);
  const lessons = batches.flatMap((batch) => {
    if (
      batch.courseId !== "travel-dinner" ||
      batch.pairKey !== "Japanese:English" ||
      batch.reviewed !== false ||
      batch.registered !== false ||
      batch.readyForLearner !== false
    ) throw new Error("Japanese Dinner draft identity or review gate changed");
    const stage = batch.stageId === "foundation-travel-dinner" ? "foundation" :
      batch.stageId === "travel-dinner" ? "core" : null;
    if (!stage) throw new Error("Unexpected Japanese Dinner stage");
    return batch.lessons.map((lesson) => ({ ...lesson, stage }));
  });
  const ids = new Set(lessons.map((lesson) => lesson.stableId));
  if (ids.size !== lessons.length || lessons.length !== 19 || lessons.some((lesson) => lesson.reviewed !== false))
    throw new Error("Japanese Dinner draft lesson inventory changed");
  return lessons;
}

export const Route = createFileRoute("/api/owner-japanese-drafts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request);
          const actor = await authenticatedTeamUser(request, db);
          await requirePlatformOwner(db, actor);
          return json({
            pairKey: "Japanese:English",
            courseId: "travel-dinner",
            status: "owner-review-draft",
            reviewed: false,
            registered: false,
            audioRegistered: false,
            lessons: await dinnerDrafts(),
          });
        } catch (error) {
          return scopedTeamError(error);
        }
      },
    },
  },
});
