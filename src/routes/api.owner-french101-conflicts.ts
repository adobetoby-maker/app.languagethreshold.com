import { createFileRoute } from "@tanstack/react-router";
import { ownerServiceFetch } from "@/lib/owner-service-fetch";
import { authenticatedTeamUser, json, requirePlatformOwner, scopedTeamError, teamAdminClient } from "@/lib/team-server";

const sourceHashes = {
  "src/data/spanish-basics-core.json": "d50c3e52a846331e9c0bcec19a5c91605585f4e285c62138941425390d160e38",
  "src/data/spanish-basics-practice.json": "04760ebadb52a4bf08fb87b670bb68169e9c90ca343ad5fc9a1c945eb1c331fe",
} as const;

type SourceWord = { es: string; en: string; kind: string };
type SourceLesson = { n: number; title: string; objective: string; words: SourceWord[] };
type SourceReading = { title: string; target: string[]; native: string[] };
type ConflictSpec = { number: number; sourceSpanish: string; exactEnglish: string; kind: string;
  frenchCandidate: string; semanticNote: string; status: string };

// These are conflict annotations, never ordinary cards or scored exercises. Keep each
// English/source anchor byte-exact with the pinned Spanish lesson data below.
const specs: Record<number, { cards: ConflictSpec[]; reviewGaps: string[] }> = {
  22: {
    cards: [
      { number: 4, sourceSpanish: "es", exactEnglish: "is (identity)", kind: "term", frenchCandidate: "est",
        semanticNote: "Spanish es identifies identity here. French est also covers condition and location; this French face cannot distinguish the two Spanish source cards.", status: "duplicate-french-face" },
      { number: 5, sourceSpanish: "está", exactEnglish: "is (condition/location)", kind: "term", frenchCandidate: "est",
        semanticNote: "Spanish está identifies condition or location here. French est also covers identity; the source-English qualifier is not a restriction on French est.", status: "duplicate-french-face" },
    ],
    reviewGaps: ["The pinned Spanish objective is truncated; curriculum repair requires separate review.", "No unique French-to-English recall or scoring for these duplicate est faces."],
  },
  23: {
    cards: [
      { number: 8, sourceSpanish: "los", exactEnglish: "the / them (masculine plural)", kind: "term", frenchCandidate: "les",
        semanticNote: "Spanish los is masculine plural. French les is plural for both genders as article or object pronoun; the masculine qualifier belongs to the Spanish source.", status: "source-versus-french-gender" },
      { number: 14, sourceSpanish: "¿La tienes tú?", exactEnglish: "Do you have it?", kind: "phrase", frenchCandidate: "Tu l’as, toi ?",
        semanticNote: "Spanish la marks a feminine object. French l’ and English it do not reveal gender. A backpack appears earlier, but the final question does not identify a unique referent; toi adds optional emphasis.", status: "referent-unresolved" },
    ],
    reviewGaps: ["Do not score gender or a unique referent for the final question.", "French les needs a visible source-versus-French note before any owner projection."],
  },
  24: {
    cards: [
      { number: 6, sourceSpanish: "los", exactEnglish: "the / them (masculine plural)", kind: "term", frenchCandidate: "les",
        semanticNote: "Spanish los is masculine plural; French les covers both genders and is an article/direct object here, not a recipient clitic. Spanish indirect le/les typically map to French lui/leur; the Reader uses full recipients à/aux and clitics me/t’/nous.", status: "source-versus-french-grammar" },
    ],
    reviewGaps: ["The six Reader-linked mode mappings are private proposals; Hear has no recording.", "Supplemental clitic contrasts are separate from the six source Reader turns and remain unscored."],
  },
};

const core24Modes = [
  { name: "see", turn: 1, frenchCandidate: "Je donne un livre à Ana." },
  { name: "recall", turn: 2, frenchCandidate: "Luis me prête un crayon." },
  { name: "hear", turn: 3, frenchCandidate: "Je t’écris un message." },
  { name: "type", turn: 4, frenchCandidate: "La professeure nous explique la question." },
  { name: "say", turn: 5, frenchCandidate: "Nous donnons les cahiers aux élèves." },
  { name: "write", turn: 6, frenchCandidate: "Tu peux me prêter ton livre ?" },
] as const;

async function conflictDrafts() {
  const [coreModule, practiceModule] = await Promise.all([
    import("../data/spanish-basics-core.json"),
    import("../data/spanish-basics-practice.json"),
  ]);
  const core = coreModule.default as { lessons: SourceLesson[] };
  const practice = practiceModule.default as { "spanish-basics": Record<string, { reading: SourceReading }> };
  return [22, 23, 24].map((n) => {
    const source = core.lessons.find((lesson) => lesson.n === n);
    const reading = practice["spanish-basics"][String(n)]?.reading;
    if (!source || !reading || reading.target.length !== 6 || reading.native.length !== 6)
      throw new Error(`French 101 Core ${n} conflict source missing`);
    const cards = specs[n].cards.map((spec) => {
      const pinned = source.words[spec.number - 1];
      if (!pinned || pinned.es !== spec.sourceSpanish || pinned.en !== spec.exactEnglish || pinned.kind !== spec.kind)
        throw new Error(`French 101 Core ${n} conflict card source changed`);
      return { id: `french-basics:${n}:card:${spec.number}`, ...spec,
        sourceEnglish: pinned.en, normalCardProjectionAllowed: false, scoringEnabled: false };
    });
    if (n === 22 && source.objective !== "Comparisons: Use más .")
      throw new Error("French 101 Core 22 objective changed; reassess truncation");
    if (n === 23 && (reading.target[1] !== "Tengo la mochila y la abro." ||
      reading.target[5] !== "¿La tienes tú?" || reading.native[5] !== "Do you have it?"))
      throw new Error("French 101 Core 23 referent context changed");
    const modes = n === 24 ? core24Modes.map(({ name, turn, frenchCandidate }) => ({
      id: `french-basics:24:mode:${name}`, name, sourceReaderTurn: turn,
      sourceSpanish: reading.target[turn - 1], sourceEnglish: reading.native[turn - 1],
      frenchCandidate, status: name === "hear" ? "script-only-audio-pending" : "private-text-preview-candidate",
      recordedAudio: false, readyForLearner: false, scoringEnabled: false,
    })) : [];
    return { n, stableId: `french-basics:${n}:fr-en`, sourceTitleEnglish: source.title,
      sourceObjectiveEnglish: source.objective, sourceReaderTitleSpanish: reading.title,
      cards, modes, reviewGaps: specs[n].reviewGaps,
      reviewed: false, registered: false, audioRegistered: false, listeningReviewed: false,
      scoringEnabled: false, progressEnabled: false, normalCardProjectionAllowed: false };
  });
}

export const Route = createFileRoute("/api/owner-french101-conflicts")({
  server: { handlers: { GET: async ({ request }) => {
    try {
      const db = teamAdminClient(ownerServiceFetch(request.signal), request);
      const actor = await authenticatedTeamUser(request, db);
      await requirePlatformOwner(db, actor);
      return json({ pairKey: "French:English", courseId: "french-basics", stage: "core",
        status: "owner-conflict-review-draft", sourceHashes, reviewed: false,
        registered: false, audioRegistered: false, listeningReviewed: false,
        scoringEnabled: false, progressEnabled: false, lessons: await conflictDrafts() });
    } catch (error) { return scopedTeamError(error); }
  } } },
});
