import { createFileRoute } from "@tanstack/react-router";
import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import { authenticatedTeamUser, json, requirePlatformOwner, scopedTeamError, teamAdminClient } from "@/lib/team-server";

const sourceHashes = {
  "src/data/core60/es/master-spanish-basics.json": "27084a65c51ef96ab6b74dd969de1c4b38cd670be1c4b148e2b66f4d9bb15ede",
  "src/data/spanish-basics-practice.json": "04760ebadb52a4bf08fb87b670bb68169e9c90ca343ad5fc9a1c945eb1c331fe",
} as const;

type SourceWord = { es: string; en: string; kind: string };
type SourceLesson = { n: number; title: string; objective: string; words: SourceWord[] };
type SourceReading = { title: string; target: string[]; native: string[] };
type ConflictCard = { id: string; number: number; kind: string; sourceSpanish: string;
  sourceEnglish: string; frenchCandidate: string; semanticNote: string; status: string;
  scoringEnabled: false; normalCardProjectionAllowed: false };
type ConflictLesson = { n: number; stableId: string; sourceTitleEnglish: string;
  sourceObjectiveEnglish: string; sourceReaderTitleSpanish: string;
  sourceReaderSpanish: string[]; sourceReaderEnglish: string[]; cards: ConflictCard[];
  reviewGaps: string[]; reviewed: false; registered: false; audioRegistered: false;
  listeningReviewed: false; scoringEnabled: false; progressEnabled: false;
  normalCardProjectionAllowed: false };
type ConflictData = { schema: string; pairKey: string; courseId: string; stage: string;
  status: string; sourceHashes: Record<string, string>; lessons: ConflictLesson[];
  reviewed: false; registered: false; audioRegistered: false; listeningReviewed: false;
  scoringEnabled: false; progressEnabled: false };

const gates = ["reviewed", "registered", "audioRegistered", "listeningReviewed",
  "scoringEnabled", "progressEnabled"] as const;

async function ownerConflictDrafts() {
  // Only called after platform-owner authentication. This content never enters the
  // learner course registry, scoring, audio manifest, or progress store.
  const [dataModule, masterModule, practiceModule] = await Promise.all([
    import("../../content/french-basics/private-master-1-12-conflict-specs.json"),
    import("../data/core60/es/master-spanish-basics.json"),
    import("../data/spanish-basics-practice.json"),
  ]);
  const data = dataModule.default as ConflictData;
  const master = masterModule.default as { lessons: SourceLesson[] };
  const practice = practiceModule.default as { "master-spanish-basics": Record<string, { reading: SourceReading }> };
  if (data.schema !== "french101-master1-12-owner-conflicts-v1" ||
    data.pairKey !== "French:English" || data.courseId !== "french-basics" ||
    data.stage !== "master" || data.status !== "owner-conflict-review-draft" ||
    JSON.stringify(data.sourceHashes) !== JSON.stringify(sourceHashes) ||
    gates.some((gate) => data[gate] !== false) ||
    data.lessons.map((lesson) => lesson.n).join() !== "1,2,3,4,5,6,7,8,9,10,11,12")
    throw new Error("French 101 Master conflict spec source or release gate changed");
  for (const lesson of data.lessons) {
    const pinned = master.lessons.find((item) => item.n === lesson.n);
    const reading = practice["master-spanish-basics"][String(lesson.n)]?.reading;
    if (!pinned || !reading || lesson.stableId !== `master-french-basics:${lesson.n}:fr-en` ||
      lesson.sourceTitleEnglish !== pinned.title || lesson.sourceObjectiveEnglish !== pinned.objective ||
      lesson.sourceReaderTitleSpanish !== reading.title ||
      JSON.stringify(lesson.sourceReaderSpanish) !== JSON.stringify(reading.target) ||
      JSON.stringify(lesson.sourceReaderEnglish) !== JSON.stringify(reading.native) ||
      !lesson.cards.length || !lesson.reviewGaps.length ||
      gates.some((gate) => lesson[gate] !== false) || lesson.normalCardProjectionAllowed !== false)
      throw new Error(`French 101 Master ${lesson.n} conflict lesson changed`);
    const seen = new Set<number>();
    for (const card of lesson.cards) {
      const word = pinned.words[card.number - 1];
      if (seen.has(card.number) || !word ||
        card.id !== `master-french-basics:${lesson.n}:card:${card.number}` ||
        card.sourceSpanish !== word.es || card.sourceEnglish !== word.en || card.kind !== word.kind ||
        !card.frenchCandidate?.trim() || !card.semanticNote?.trim() || !card.status?.trim() ||
        card.scoringEnabled !== false || card.normalCardProjectionAllowed !== false)
        throw new Error(`French 101 Master ${lesson.n} conflict card changed`);
      seen.add(card.number);
    }
  }
  return data;
}

export const Route = createFileRoute("/api/owner-french101-master-conflicts")({
  server: { handlers: { GET: async ({ request }) => {
    try {
      const db = teamAdminClient(ownerServiceFetch(request.signal), request);
      const actor = await authenticatedTeamUser(request, db);
      await requirePlatformOwner(db, actor);
      return json(await ownerConflictDrafts());
    } catch (error) { return scopedTeamError(error); }
  } } },
});
