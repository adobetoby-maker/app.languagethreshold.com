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
  forms?: { infinitive: string; meaning: string; [key: string]: string }[];
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
  source: Record<string, string>;
  reviewed: false;
  registered: false;
  readyForLearner: false;
  audio: "none";
  lessons: DraftLesson[];
};

const modes = ["see", "recall", "hear", "type", "say", "write"] as const;
const revision = "70cd3dd900b84e5052abe7a8f9e3a397f3000e8e";

async function dinnerDrafts() {
  // Import after owner authorization; internal notes never enter the response.
  const modules = await Promise.all([
    import("../../content/french-travel-dinner/foundation-1-3-draft.json"),
    import("../../content/french-travel-dinner/foundation-4-6-draft.json"),
    import("../../content/french-travel-dinner/foundation-7-10-draft.json"),
    import("../../content/french-travel-dinner/core-1-3-draft.json"),
    import("../../content/french-travel-dinner/core-4-6-draft.json"),
    import("../../content/french-travel-dinner/core-7-9-draft.json"),
    import("../../content/french-travel-dinner/core-10-draft.json"),
    import("../../content/french-travel-dinner/core-11-12-draft.json"),
    import("../../content/french-travel-dinner/core-13-draft.json"),
    import("../../content/french-travel-dinner/core-14-draft.json"),
    import("../../content/french-travel-dinner/core-15-draft.json"),
    import("../../content/french-travel-dinner/core-16-draft.json"),
    import("../../content/french-travel-dinner/core-17-draft.json"),
    import("../../content/french-travel-dinner/core-18-draft.json"),
    import("../../content/french-travel-dinner/core-19-draft.json"),
    import("../../content/french-travel-dinner/core-20-draft.json"),
    import("../../content/french-travel-dinner/core-21-draft.json"),
    import("../../content/french-travel-dinner/core-22-draft.json"),
    import("../../content/french-travel-dinner/core-23-draft.json"),
    import("../../content/french-travel-dinner/core-24-draft.json"),
    import("../../content/french-travel-dinner/core-25-draft.json"),
    import("../../content/french-travel-dinner/core-26-draft.json"),
    import("../../content/french-travel-dinner/core-27-draft.json"),
    import("../../content/french-travel-dinner/core-28-draft.json"),
    import("../../content/french-travel-dinner/core-29-draft.json"),
    import("../../content/french-travel-dinner/core-30-draft.json"),
    import("../../content/french-travel-dinner/master-1-draft.json"),
    import("../../content/french-travel-dinner/master-2-draft.json"),
    import("../../content/french-travel-dinner/master-3-draft.json"),
    import("../../content/french-travel-dinner/master-4-draft.json"),
  ]);
  const batches = modules.map((module) => module.default as unknown as DraftBatch);
  const lessons = batches.flatMap((batch) => {
    if (
      batch.courseId !== "travel-dinner" || batch.pairKey !== "French:English" ||
      batch.locale !== "fr-FR" || batch.reviewed !== false ||
      batch.registered !== false || batch.readyForLearner !== false || batch.audio !== "none" ||
      batch.source.revision !== revision
    ) throw new Error("French Dinner draft identity or review gate changed");
    const stage = batch.stageId === "foundation-travel-dinner" ? "foundation" :
      batch.stageId === "travel-dinner" ? "core" :
      batch.stageId === "master-travel-dinner" ? "master" : null;
    if (!stage) throw new Error("Unexpected French Dinner stage");
    if (stage === "foundation" && (
      batch.source.path !== "src/data/core60/es/foundation-travel-dinner.json" ||
      batch.source.sha256 !== "1d51f84acdf62115f88e5f1bbadf7af8988725e0647ef4958962ce7abd8ea014"
    )) throw new Error("French Dinner Foundation source pin changed");
    if (stage === "core" && (
      batch.source.curriculumPath !== "src/data/travel-zone.ts" ||
      batch.source.curriculumSHA256 !== "8ca7cacc58a272d5e2c9d55b06e265ec8f6b5102d412bc0382d448942e455fe8" ||
      batch.source.passagePath !== "public/lesson-content/es/travel-dinner.json" ||
      batch.source.passageSHA256 !== "6ddc4c99484467b9923609db4ab46f8a1cb2b35812ec987ed0fb9aac86105895"
    )) throw new Error("French Dinner Core source pin changed");
    if (stage === "master" && (
      batch.source.curriculumPath !== "src/data/core60/es/master-travel-dinner.json" ||
      batch.source.curriculumSHA256 !== "fb455608407244337f08a93e1fd393c8966358f13945cf3760c8b85c2be602be" ||
      batch.source.passagePath !== "public/lesson-content/es/master-travel-dinner.json" ||
      batch.source.passageSHA256 !== "53f641f4fa66a2aa3b0adbdbbf4133fb7899858d1ea7737d2b52eee341fc0b80"
    )) throw new Error("French Dinner Master source pin changed");
    return batch.lessons.map((lesson) => {
      if (lesson.reviewed !== false || !Number.isInteger(lesson.n) ||
          lesson.stableId !== `${batch.stageId}:${lesson.n}:fr-en` ||
          !lesson.cards?.length || !lesson.reader?.length ||
          modes.some((mode) => !lesson.modes?.[mode] ||
            !Number.isInteger(lesson.modes[mode].sourceCard) ||
            lesson.modes[mode].sourceCard < 1 ||
            lesson.modes[mode].sourceCard > lesson.cards.length))
        throw new Error("French Dinner lesson inventory changed");
      return {
        stage, n: lesson.n, stableId: lesson.stableId,
        title: lesson.title, objective: lesson.objective,
        focus: lesson.focus, scene: lesson.scene, reviewed: false as const,
        cards: lesson.cards.map(({ fr, en, kind, note }) => ({ fr, en, kind, ...(note ? { note } : {}) })),
        reader: lesson.reader.map(({ speaker, fr, en }) => ({ speaker, fr, en })),
        forms: lesson.forms?.map((form) => Object.fromEntries(
          Object.entries(form).filter(([key]) =>
            ["infinitive", "meaning", "pastJe", "politeRequest", "politeWish",
             "presentElle", "presentIl", "presentJe", "presentNous", "presentOn", "presentVous",
             "futureProcheJe", "example"].includes(key)),
        )),
        modes: Object.fromEntries(modes.map((mode) => [mode, lesson.modes[mode]])),
        speaking: {
          role: lesson.speaking.role, partnerRole: lesson.speaking.partnerRole,
          opening: lesson.speaking.opening, goal: lesson.speaking.goal,
          closure: lesson.speaking.closure, wordBank: [...lesson.speaking.wordBank],
        },
      };
    });
  });
  const ids = new Set(lessons.map((lesson) => lesson.stableId));
  if (lessons.length !== 44 || ids.size !== 44 ||
      lessons.filter((lesson) => lesson.stage === "foundation").map((lesson) => lesson.n).join() !==
        Array.from({ length: 10 }, (_, index) => index + 1).join() ||
      lessons.filter((lesson) => lesson.stage === "core").map((lesson) => lesson.n).join() !==
        Array.from({ length: 30 }, (_, index) => index + 1).join() ||
      lessons.filter((lesson) => lesson.stage === "master").map((lesson) => lesson.n).join() !== "1,2,3,4")
    throw new Error("French Dinner stage counts or lesson order changed");
  return lessons;
}

export const Route = createFileRoute("/api/owner-french-dinner-drafts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = teamAdminClient(ownerServiceFetch(request.signal), request);
          const actor = await authenticatedTeamUser(request, db);
          await requirePlatformOwner(db, actor);
          return json({
            pairKey: "French:English", courseId: "travel-dinner",
            status: "owner-review-draft", reviewed: false,
            registered: false, audioRegistered: false,
            lessons: await dinnerDrafts(),
          });
        } catch (error) {
          return scopedTeamError(error);
        }
      },
    },
  },
});
