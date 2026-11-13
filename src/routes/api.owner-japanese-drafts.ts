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
  locale: string;
  source: Record<string, string>;
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
    import("../../content/japanese-travel-dinner/core-10-12-draft.json"),
    import("../../content/japanese-travel-dinner/core-13-15-draft.json"),
    import("../../content/japanese-travel-dinner/core-16-18-draft.json"),
    import("../../content/japanese-travel-dinner/core-19-draft.json"),
    import("../../content/japanese-travel-dinner/core-20-draft.json"),
    import("../../content/japanese-travel-dinner/core-21-draft.json"),
    import("../../content/japanese-travel-dinner/core-22-draft.json"),
    import("../../content/japanese-travel-dinner/core-23-draft.json"),
    import("../../content/japanese-travel-dinner/core-24-draft.json"),
    import("../../content/japanese-travel-dinner/core-25-draft.json"),
    import("../../content/japanese-travel-dinner/core-26-draft.json"),
    import("../../content/japanese-travel-dinner/core-27-draft.json"),
    import("../../content/japanese-travel-dinner/core-28-draft.json"),
    import("../../content/japanese-travel-dinner/core-29-draft.json"),
    import("../../content/japanese-travel-dinner/core-30-draft.json"),
    import("../../content/japanese-travel-dinner/master-1-draft.json"),
    import("../../content/japanese-travel-dinner/master-2-draft.json"),
    import("../../content/japanese-travel-dinner/master-3-draft.json"),
    import("../../content/japanese-travel-dinner/master-4-draft.json"),
    import("../../content/japanese-travel-dinner/master-5-draft.json"),
    import("../../content/japanese-travel-dinner/master-6-draft.json"),
    import("../../content/japanese-travel-dinner/master-7-draft.json"),
    import("../../content/japanese-travel-dinner/master-8-draft.json"),
    import("../../content/japanese-travel-dinner/master-9-draft.json"),
    import("../../content/japanese-travel-dinner/master-10-draft.json"),
    import("../../content/japanese-travel-dinner/master-11-draft.json"),
    import("../../content/japanese-travel-dinner/master-12-private-draft.json"),
    import("../../content/japanese-travel-dinner/master-13-private-draft.json"),
    import("../../content/japanese-travel-dinner/master-14-private-draft.json"),
    import("../../content/japanese-travel-dinner/master-15-private-draft.json"),
    import("../../content/japanese-travel-dinner/master-16-private-draft.json"),
    import("../../content/japanese-travel-dinner/master-17-private-draft.json"),
    import("../../content/japanese-travel-dinner/master-18-private-draft.json"),
    import("../../content/japanese-travel-dinner/master-19-private-draft.json"),
  ]);
  const batches = modules.map((module) => module.default as unknown as DraftBatch);
  const lessons = batches.flatMap((batch) => {
    if (
      batch.courseId !== "travel-dinner" ||
      batch.pairKey !== "Japanese:English" ||
      batch.locale !== "ja-JP" ||
      batch.reviewed !== false ||
      batch.registered !== false ||
      batch.readyForLearner !== false ||
      batch.source.revision !== "70cd3dd900b84e5052abe7a8f9e3a397f3000e8e"
    ) throw new Error("Japanese Dinner draft identity or review gate changed");
    const stage = batch.stageId === "foundation-travel-dinner" ? "foundation" :
      batch.stageId === "travel-dinner" ? "core" :
      batch.stageId === "master-travel-dinner" ? "master" : null;
    if (!stage) throw new Error("Unexpected Japanese Dinner stage");
    if (stage === "foundation" && (
      batch.source.path !== "src/data/core60/es/foundation-travel-dinner.json" ||
      batch.source.sha256 !== "1d51f84acdf62115f88e5f1bbadf7af8988725e0647ef4958962ce7abd8ea014"
    )) throw new Error("Japanese Dinner foundation source pin changed");
    if (stage === "core" && (
      batch.source.planPath !== "src/data/travel-zone.ts" ||
      batch.source.planSHA256 !== "8ca7cacc58a272d5e2c9d55b06e265ec8f6b5102d412bc0382d448942e455fe8" ||
      batch.source.contentPath !== "public/lesson-content/es/travel-dinner.json" ||
      batch.source.contentSHA256 !== "6ddc4c99484467b9923609db4ab46f8a1cb2b35812ec987ed0fb9aac86105895"
    )) throw new Error("Japanese Dinner source pin changed");
    if (stage === "master" && (
      batch.source.masterPath !== "src/data/core60/es/master-travel-dinner.json" ||
      batch.source.masterSHA256 !== "fb455608407244337f08a93e1fd393c8966358f13945cf3760c8b85c2be602be" ||
      batch.source.contentPath !== "public/lesson-content/es/master-travel-dinner.json" ||
      batch.source.contentSHA256 !== "53f641f4fa66a2aa3b0adbdbbf4133fb7899858d1ea7737d2b52eee341fc0b80"
    )) throw new Error("Japanese Dinner master source pin changed");
    return batch.lessons.map((lesson) => {
      if (lesson.reviewed !== false || !Number.isInteger(lesson.n) ||
          lesson.stableId !== `${batch.stageId}:${lesson.n}:ja-en` ||
          !lesson.cards?.length || !lesson.reader?.length ||
          ["see", "recall", "hear", "type", "say", "write"].some((name) =>
            !lesson.modes?.[name] || lesson.modes[name].sourceCard < 1 ||
            lesson.modes[name].sourceCard > lesson.cards.length))
        throw new Error("Japanese Dinner lesson inventory changed");
      return {
        stage, n: lesson.n, stableId: lesson.stableId, title: lesson.title,
        objective: lesson.objective, focus: lesson.focus, scene: lesson.scene,
        reviewed: false as const, cards: lesson.cards, reader: lesson.reader,
        forms: lesson.forms, modes: lesson.modes, speaking: lesson.speaking,
      };
    });
  });
  const ids = new Set(lessons.map((lesson) => lesson.stableId));
  const expectedIds = [
    ...Array.from({ length: 10 }, (_, index) => `foundation-travel-dinner:${index + 1}:ja-en`),
    ...Array.from({ length: 30 }, (_, index) => `travel-dinner:${index + 1}:ja-en`),
    "master-travel-dinner:1:ja-en",
    "master-travel-dinner:2:ja-en",
    "master-travel-dinner:3:ja-en",
    "master-travel-dinner:4:ja-en",
    "master-travel-dinner:5:ja-en",
    "master-travel-dinner:6:ja-en",
    "master-travel-dinner:7:ja-en",
    "master-travel-dinner:8:ja-en",
    "master-travel-dinner:9:ja-en",
    "master-travel-dinner:10:ja-en",
    "master-travel-dinner:11:ja-en",
    "master-travel-dinner:12:ja-en",
    "master-travel-dinner:13:ja-en",
    "master-travel-dinner:14:ja-en",
    "master-travel-dinner:15:ja-en",
    "master-travel-dinner:16:ja-en",
    "master-travel-dinner:17:ja-en",
    "master-travel-dinner:18:ja-en",
    "master-travel-dinner:19:ja-en",
  ];
  if (ids.size !== lessons.length || lessons.length !== 59 || lessons.some((lesson) => lesson.reviewed !== false) ||
      lessons.filter((lesson) => lesson.stage === "foundation").length !== 10 ||
      lessons.filter((lesson) => lesson.stage === "core").length !== 30 ||
      lessons.filter((lesson) => lesson.stage === "master").length !== 19 ||
      lessons.some((lesson, index) => lesson.stableId !== expectedIds[index]))
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
