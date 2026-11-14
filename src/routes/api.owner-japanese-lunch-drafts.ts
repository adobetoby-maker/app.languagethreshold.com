import { createFileRoute } from "@tanstack/react-router";
import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import { authenticatedTeamUser, json, requirePlatformOwner, scopedTeamError, teamAdminClient } from "@/lib/team-server";

const stages = [
  { draft: () => import("../../content/japanese-travel-lunch/core-1-3-draft.json"), modes: () => import("../../content/japanese-travel-lunch/private-mode-activities-core-1-3.json"), sourceSha256: "846d81b36fe1ffccadb8b4f269813dcb705f80f798a9a08320e4de3f2247d3bf" },
  { draft: () => import("../../content/japanese-travel-lunch/core-10-12-draft.json"), modes: () => import("../../content/japanese-travel-lunch/private-mode-activities-core-10-12.json"), sourceSha256: "94517a51fc2127e1dfeaea116650d203e087ce1d20de6aa217c25e4543e3419a" },
  { draft: () => import("../../content/japanese-travel-lunch/core-13-15-draft.json"), modes: () => import("../../content/japanese-travel-lunch/private-mode-activities-core-13-15.json"), sourceSha256: "3c4c9f965ae84dac2658c4d594a2731228967778e063d48fe5c99e25a3638deb" },
  { draft: () => import("../../content/japanese-travel-lunch/core-16-18-draft.json"), modes: () => import("../../content/japanese-travel-lunch/private-mode-activities-core-16-18.json"), sourceSha256: "238fac8b8b0cf20f1591d3c0e325ba873f0d46091e14872814d22ffed376b318" },
  { draft: () => import("../../content/japanese-travel-lunch/core-19-21-draft.json"), modes: () => import("../../content/japanese-travel-lunch/private-mode-activities-core-19-21.json"), sourceSha256: "8c0cfa225d6505a4c5017b2063a5a260acc69fc87579089804e6d00c3be450a3" },
  { draft: () => import("../../content/japanese-travel-lunch/core-22-24-draft.json"), modes: () => import("../../content/japanese-travel-lunch/private-mode-activities-core-22-24.json"), sourceSha256: "494ae6e3991e1527e8eb0ebc1d08be9c781eb5bf3aa79155b319b10d26224486" },
  { draft: () => import("../../content/japanese-travel-lunch/core-25-27-draft.json"), modes: () => import("../../content/japanese-travel-lunch/private-mode-activities-core-25-27.json"), sourceSha256: "fa180eb341d972eeb199f0a14c52c1d6c97ed68a8a5321ad7daed3bb7314f0ab" },
  { draft: () => import("../../content/japanese-travel-lunch/core-28-30-draft.json"), modes: () => import("../../content/japanese-travel-lunch/private-mode-activities-core-28-30.json"), sourceSha256: "b2f531effe6fe76e00cf2121e2aa4cc9995e7bfb8d336ae3ebb03bd3863e715a" },
  { draft: () => import("../../content/japanese-travel-lunch/core-4-6-draft.json"), modes: () => import("../../content/japanese-travel-lunch/private-mode-activities-core-4-6.json"), sourceSha256: "5443a0b8ee74446056c6550a39e4944288f3b5b0962a1063191587b68f436341" },
  { draft: () => import("../../content/japanese-travel-lunch/core-7-9-draft.json"), modes: () => import("../../content/japanese-travel-lunch/private-mode-activities-core-7-9.json"), sourceSha256: "4b9c3559c4a5b85129c76d1c7506fce9f6f7ea10b6df9f831ef6fb2505fc373c" },
  { draft: () => import("../../content/japanese-travel-lunch/foundation-1-3-draft.json"), modes: () => import("../../content/japanese-travel-lunch/private-mode-activities-foundation-1-3.json"), sourceSha256: "6b8577d0da33c2f84152cd8dac9724609c41df1f6d2de2fdd92a2d1837856017" },
  { draft: () => import("../../content/japanese-travel-lunch/foundation-4-6-draft.json"), modes: () => import("../../content/japanese-travel-lunch/private-mode-activities-foundation-4-6.json"), sourceSha256: "698f1004516b2fea5243c91ddc60aac9222b522c2b36189b8cf72446597818b5" },
  { draft: () => import("../../content/japanese-travel-lunch/foundation-7-10-draft.json"), modes: () => import("../../content/japanese-travel-lunch/private-mode-activities-foundation-7-10.json"), sourceSha256: "ba303cb272cf5d4b1073911e43eedeaed40dadf472d7800b579da21a5bd5c6bf" },
  { draft: () => import("../../content/japanese-travel-lunch/master-1-3-draft.json"), modes: () => import("../../content/japanese-travel-lunch/private-mode-activities-master-1-3.json"), sourceSha256: "f81098d09721cb44af38e0eb312c90bffdea55f955b494977247bff1334ff965" },
  { draft: () => import("../../content/japanese-travel-lunch/master-10-12-draft.json"), modes: () => import("../../content/japanese-travel-lunch/private-mode-activities-master-10-12.json"), sourceSha256: "162c76538b234c6a8929cab4cdab02fc234dfd4a553ee896a02b79734fd2d886" },
  { draft: () => import("../../content/japanese-travel-lunch/master-13-15-draft.json"), modes: () => import("../../content/japanese-travel-lunch/private-mode-activities-master-13-15.json"), sourceSha256: "4a954fa7e31d285a4c932c109dffe59ad91bf8053c02f3a6ce12e6cb0f35f0c7" },
  { draft: () => import("../../content/japanese-travel-lunch/master-16-18-draft.json"), modes: () => import("../../content/japanese-travel-lunch/private-mode-activities-master-16-18.json"), sourceSha256: "297bb8121ccf3f53a90207d8da1468bed338859877d5ca7f59339274e0752de8" },
  { draft: () => import("../../content/japanese-travel-lunch/master-19-20-draft.json"), modes: () => import("../../content/japanese-travel-lunch/private-mode-activities-master-19-20.json"), sourceSha256: "3ec86c2928fecce7d715f4a43a2e794b4b69b0cef66efd964a4a954a183cbb36" },
  { draft: () => import("../../content/japanese-travel-lunch/master-4-6-draft.json"), modes: () => import("../../content/japanese-travel-lunch/private-mode-activities-master-4-6.json"), sourceSha256: "10b1302db97fc838c5aa4c5ff7cf2fd4f3905473b6f3131573d61226da28da69" },
  { draft: () => import("../../content/japanese-travel-lunch/master-7-9-draft.json"), modes: () => import("../../content/japanese-travel-lunch/private-mode-activities-master-7-9.json"), sourceSha256: "ae8c909b55ed090563101827c632b4d679e31a7ba0d3ae56a0c74d9414a437f4" },
] as const;

const sourcePins = {
  foundation: { curriculumPath: "src/data/core60/es/foundation-travel-lunch.json", curriculumSha256: "980cd2974e3c4e023a1da2258ed9e32dc1e8e39e8ef87c6913bc0ed094a37dbc" },
  core: { mapPath: "src/data/travel-zone.ts", mapSha256: "8ca7cacc58a272d5e2c9d55b06e265ec8f6b5102d412bc0382d448942e455fe8", readerPath: "public/lesson-content/es/travel-lunch.json", readerSha256: "9c6104911c7c3fc2d8f0e1914edb5bd8e490f0d3961babfcece22238f995580d" },
  master: { curriculumPath: "src/data/core60/es/master-travel-lunch.json", curriculumSha256: "bce5c0799e9d8d038450599ab839a7d48d6f69533968c94f1d3f2ae3808f4bfa", readerPath: "public/lesson-content/es/master-travel-lunch.json", readerSha256: "602b0a9b0c29ae6942275ad44734c36267364af6ebe5685e48dabe5da7f94539" },
} as const;
const modeNames = ["see", "recall", "hear", "type", "say", "write"] as const;
type Draft = {
  moduleId: string; stageId: string; target: string; native: string; reviewed: boolean; registered: boolean; audio: string;
  source: Record<string, unknown>;
  lessons: { n: number; stableId: string; title: string; objective: string; focus: string; scene: string;
    cards: { ja: string; en: string; kind: string; readingKana?: string }[];
    reader: { speaker: string; ja: string; en: string }[];
    speaking: { role: string; partnerRole: string; opening: string; goal: string; closure: string };
  }[];
};
type Sidecar = { pairKey: string; reviewed: boolean; registered: boolean; audioListeningReviewed: boolean; source: string; sourceSha256: string;
  activities: { lessonId: string; mode: string; cueEnglish: string; sourceRef: string; modelJapanese: string; modelEnglish: string; responseKind: string; readyForLearner: boolean }[];
};
type Enrichment = { pairKey: string; sourcePath: string; sourceSha256: string; reviewed: boolean; registered: boolean; readyForLearner: boolean;
  lessons: { stableId: string; forms: { label: string; japanese: string; english: string; explanation: string }[];
    speakingObjectives: string[]; wordBank: string[] }[];
};
function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
async function lunchDrafts() {
  const enrichment = (await import("../../content/japanese-travel-lunch/private-foundation-1-3-enrichment.json")).default as Enrichment;
  check(enrichment.pairKey === "Japanese:English" && enrichment.sourcePath === "content/japanese-travel-lunch/foundation-1-3-draft.json" &&
    enrichment.sourceSha256 === "6b8577d0da33c2f84152cd8dac9724609c41df1f6d2de2fdd92a2d1837856017" &&
    enrichment.reviewed === false && enrichment.registered === false && enrichment.readyForLearner === false &&
    enrichment.lessons.map((lesson) => lesson.stableId).join() ===
      "foundation-travel-lunch:1:ja-en,foundation-travel-lunch:2:ja-en,foundation-travel-lunch:3:ja-en",
    "Japanese Lunch enrichment source or release gate changed");
  const nextEnrichment = (await import("../../content/japanese-travel-lunch/private-foundation-4-6-enrichment.json")).default as Enrichment;
  check(nextEnrichment.pairKey === "Japanese:English" && nextEnrichment.sourcePath === "content/japanese-travel-lunch/foundation-4-6-draft.json" &&
    nextEnrichment.sourceSha256 === "698f1004516b2fea5243c91ddc60aac9222b522c2b36189b8cf72446597818b5" &&
    nextEnrichment.reviewed === false && nextEnrichment.registered === false && nextEnrichment.readyForLearner === false &&
    nextEnrichment.lessons.map((lesson) => lesson.stableId).join() ===
      "foundation-travel-lunch:4:ja-en,foundation-travel-lunch:5:ja-en,foundation-travel-lunch:6:ja-en",
    "Japanese Lunch Foundation 4–6 enrichment source or release gate changed");
  const finalFoundationEnrichment = (await import("../../content/japanese-travel-lunch/private-foundation-7-10-enrichment.json")).default as Enrichment;
  check(finalFoundationEnrichment.pairKey === "Japanese:English" &&
    finalFoundationEnrichment.sourcePath === "content/japanese-travel-lunch/foundation-7-10-draft.json" &&
    finalFoundationEnrichment.sourceSha256 === "ba303cb272cf5d4b1073911e43eedeaed40dadf472d7800b579da21a5bd5c6bf" &&
    finalFoundationEnrichment.reviewed === false && finalFoundationEnrichment.registered === false &&
    finalFoundationEnrichment.readyForLearner === false &&
    finalFoundationEnrichment.lessons.map((lesson) => lesson.stableId).join() ===
      "foundation-travel-lunch:7:ja-en,foundation-travel-lunch:8:ja-en,foundation-travel-lunch:9:ja-en,foundation-travel-lunch:10:ja-en",
    "Japanese Lunch Foundation 7–10 enrichment source or release gate changed");
  const authoredLessons = [...enrichment.lessons, ...nextEnrichment.lessons, ...finalFoundationEnrichment.lessons];
  const coreEnrichment = (await import("../../content/japanese-travel-lunch/private-core-1-3-enrichment.json")).default as Enrichment;
  check(coreEnrichment.pairKey === "Japanese:English" &&
    coreEnrichment.sourcePath === "content/japanese-travel-lunch/core-1-3-draft.json" &&
    coreEnrichment.sourceSha256 === "846d81b36fe1ffccadb8b4f269813dcb705f80f798a9a08320e4de3f2247d3bf" &&
    coreEnrichment.reviewed === false && coreEnrichment.registered === false &&
    coreEnrichment.readyForLearner === false &&
    coreEnrichment.lessons.map((lesson) => lesson.stableId).join() ===
      "travel-lunch:1:ja-en,travel-lunch:2:ja-en,travel-lunch:3:ja-en",
    "Japanese Lunch Core 1–3 enrichment source or release gate changed");
  authoredLessons.push(...coreEnrichment.lessons);
  const nextCoreEnrichment = (await import("../../content/japanese-travel-lunch/private-core-4-6-enrichment.json")).default as Enrichment;
  check(nextCoreEnrichment.pairKey === "Japanese:English" &&
    nextCoreEnrichment.sourcePath === "content/japanese-travel-lunch/core-4-6-draft.json" &&
    nextCoreEnrichment.sourceSha256 === "5443a0b8ee74446056c6550a39e4944288f3b5b0962a1063191587b68f436341" &&
    nextCoreEnrichment.reviewed === false && nextCoreEnrichment.registered === false &&
    nextCoreEnrichment.readyForLearner === false &&
    nextCoreEnrichment.lessons.map((lesson) => lesson.stableId).join() ===
      "travel-lunch:4:ja-en,travel-lunch:5:ja-en,travel-lunch:6:ja-en",
    "Japanese Lunch Core 4–6 enrichment source or release gate changed");
  authoredLessons.push(...nextCoreEnrichment.lessons);
  const finalCoreEnrichment = (await import("../../content/japanese-travel-lunch/private-core-7-9-enrichment.json")).default as Enrichment;
  check(finalCoreEnrichment.pairKey === "Japanese:English" &&
    finalCoreEnrichment.sourcePath === "content/japanese-travel-lunch/core-7-9-draft.json" &&
    finalCoreEnrichment.sourceSha256 === "4b9c3559c4a5b85129c76d1c7506fce9f6f7ea10b6df9f831ef6fb2505fc373c" &&
    finalCoreEnrichment.reviewed === false && finalCoreEnrichment.registered === false &&
    finalCoreEnrichment.readyForLearner === false &&
    finalCoreEnrichment.lessons.map((lesson) => lesson.stableId).join() ===
      "travel-lunch:7:ja-en,travel-lunch:8:ja-en,travel-lunch:9:ja-en",
    "Japanese Lunch Core 7–9 enrichment source or release gate changed");
  authoredLessons.push(...finalCoreEnrichment.lessons);
  const packets = await Promise.all(stages.map(async ({ draft, modes, sourceSha256 }) => ({
    batch: (await draft()).default as Draft, sidecar: (await modes()).default as Sidecar, sourceSha256,
  })));
  const stageRank: Record<string, number> = { foundation: 0, core: 1, master: 2 };
  const lessons = packets.flatMap(({ batch, sidecar, sourceSha256 }) => {
    check(batch.moduleId === "travel-lunch" && batch.target === "Japanese" && batch.native === "English" &&
      batch.reviewed === false && batch.registered === false && batch.audio === "none", "Japanese Lunch draft identity or release gate changed");
    const stage = batch.stageId === "foundation-travel-lunch" ? "foundation" : batch.stageId === "travel-lunch" ? "core" : batch.stageId === "master-travel-lunch" ? "master" : null;
    check(stage, "Unexpected Japanese Lunch stage");
    const pins: Record<string, string> = sourcePins[stage];
    check(Object.entries(pins).every(([key, value]) => batch.source[key] === value), "Japanese Lunch source pin changed");
    check(sidecar.pairKey === "Japanese:English" && sidecar.reviewed === false && sidecar.registered === false &&
      sidecar.audioListeningReviewed === false && sidecar.sourceSha256 === sourceSha256,
      "Japanese Lunch activity review gate or source changed");
    return batch.lessons.map((lesson) => {
      check(Number.isInteger(lesson.n) && lesson.stableId === `${batch.stageId}:${lesson.n}:ja-en` &&
        lesson.cards.length > 0 && lesson.reader.length > 0, "Japanese Lunch lesson identity changed");
      const activities = sidecar.activities.filter((activity) => activity.lessonId === lesson.stableId);
      const authored = authoredLessons.find((entry) => entry.stableId === lesson.stableId);
      if (authored) check(((stage === "foundation" && lesson.n <= 10) || (stage === "core" && lesson.n <= 9)) && authored.forms.length === 3 &&
        authored.speakingObjectives.length >= 3 && authored.wordBank.length >= 4 &&
        authored.wordBank.every((word) => lesson.cards.some((card) => card.ja === word)),
        "Japanese Lunch authored enrichment scope changed");
      const modes = Object.fromEntries(modeNames.map((name) => {
        const activity = activities.find((entry) => entry.mode === name);
        check(activity && activity.readyForLearner === false, `Japanese Lunch ${name} activity missing or released`);
        const match = activity.sourceRef.match(/:card:(\d+)$/);
        const sourceCard = match ? Number(match[1]) : 0;
        const card = lesson.cards[sourceCard - 1];
        check(activity.sourceRef === `${lesson.stableId}:card:${sourceCard}` && card &&
          card.ja === activity.modelJapanese && card.en === activity.modelEnglish,
          "Japanese Lunch activity source card changed");
        return [name, { cueEnglish: activity.cueEnglish, sourceCard, responseKind: activity.responseKind }];
      }));
      return { stage, n: lesson.n, stableId: lesson.stableId, title: lesson.title, objective: lesson.objective,
        focus: lesson.focus, scene: lesson.scene, reviewed: false, cards: lesson.cards.map(({ ja, en, kind, readingKana }) => ({ ja, en, kind, readingKana })),
        reader: lesson.reader, forms: authored?.forms ?? [], modes,
        speaking: { ...lesson.speaking, objectives: authored?.speakingObjectives ?? [],
          wordBank: authored?.wordBank ?? lesson.cards.map(({ ja }) => ja), wordBankAuthored: !!authored },
        reviewGaps: authored ? ["Qualified Japanese and domain review pending"] :
          ["Japanese forms pending", "Speaking objectives and authored word bank pending"] };
    });
  }).sort((a, b) => (stageRank[a.stage] ?? 9) - (stageRank[b.stage] ?? 9) || a.n - b.n);
  const expected = [
    ...Array.from({ length: 10 }, (_, i) => `foundation-travel-lunch:${i + 1}:ja-en`),
    ...Array.from({ length: 30 }, (_, i) => `travel-lunch:${i + 1}:ja-en`),
    ...Array.from({ length: 20 }, (_, i) => `master-travel-lunch:${i + 1}:ja-en`),
  ];
  check(lessons.length === 60 && lessons.every((lesson, index) => lesson.stableId === expected[index]), "Japanese Lunch inventory changed");
  return lessons;
}
export const Route = createFileRoute("/api/owner-japanese-lunch-drafts")({
  server: { handlers: { GET: async ({ request }) => {
    try {
      const db = teamAdminClient(ownerServiceFetch(request.signal), request);
      const actor = await authenticatedTeamUser(request, db);
      await requirePlatformOwner(db, actor);
      return json({ pairKey: "Japanese:English", courseId: "travel-lunch", status: "owner-review-draft",
        reviewed: false, registered: false, audioRegistered: false, lessons: await lunchDrafts() });
    } catch (error) { return scopedTeamError(error); }
  } } },
});
