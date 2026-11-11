/** Inspect Japanese 101 forms for a future exact-pair runtime connection. No route imports this. */
import { getLessonDefinition } from "../lib/lesson-definition.ts";
import { HIRAGANA_GROUPS, KATAKANA_GROUPS } from "../components/kana/writing/curriculum.ts";

export const JAPANESE_101_FORMS_RELEASE_ENABLED = false as const;
const STAGES = [
  ["foundation-japanese-basics", 10],
  ["japanese-basics", 30],
  ["master-japanese-basics", 20],
] as const;
const PINNED_FORM_SOURCES: Record<string, string> = {
  "content/japanese-basics/private-form-practice-foundation-1-10-ja-en.json": "a01a66641634c1d5a048d511837f6faee748c28d720f9d19f8711ebb2f551428",
  "content/japanese-basics/private-form-practice-core-1-10-ja-en.json": "c25bf31e6954ca50575fe9bd23152863fbb3fd355e393b6a461828c2687d8b6f",
  "content/japanese-basics/private-form-practice-core-11-20-ja-en.json": "c24de5cb74d9902f95df593ac526e5a7731aef82d3b4b50bbd0adf3247a99a43",
  "content/japanese-basics/private-form-practice-core-21-30-ja-en.json": "5c3a07230f23357d7dcbba053c1e998a3a034ecb976faafbc6e0f5ad31a0d5d4",
  "content/japanese-basics/private-form-practice-master-1-10-ja-en.json": "670680e5a2489d8c5037cc4949dac03e1210585336faae8cc90f52218f6171c8",
  "content/japanese-basics/private-form-practice-master-11-20-ja-en.json": "aa0d9653a46a0cde8c9b88f737246b2b6eaa36ebd1be551fce085bad6f1d9084",
};
type Pair = { target: string; native: string };
type Activity = {
  id: string;
  sourcePromptId: string;
  mode: string;
  cue: string;
  answer: string;
  sourceDialogueTurn: number;
  knownJapaneseVariants?: string[];
};
type Lesson = {
  lessonDefinitionId: string;
  sourceObjectiveId: string;
  moduleId: string;
  lessonNumber: number;
  contentVersion: string;
  readingId: string;
  targetLanguage: string;
  instructionLanguage: string;
  reviewed: boolean;
  activities: Activity[];
};
export type Japanese101PrivateFormPreview = {
  pairKey: string;
  registered: boolean;
  reviewed: boolean;
  lessonCount: number;
  promptCount: number;
  activityCount: number;
  sourceHashes: { path: string; sha256: string }[];
  lessons: Lesson[];
};
export type Japanese101FormPrompt = {
  id: string;
  pairKey: "Japanese:English";
  englishPrompt: string;
  japaneseAnswer: string;
  knownJapaneseVariants: readonly string[];
  sourceDialogueTurn: number;
  kanaGroupIds: readonly string[];
};

// Ordinary う/い does not imply a long vowel; keep that pattern for authored instruction.
const kanaGroups = [...HIRAGANA_GROUPS, ...KATAKANA_GROUPS]
  .filter(group => group.id !== "h-long-vowels");

function groupsFor(text: string): string[] {
  const chars = new Set([...text]);
  return kanaGroups.filter(group => group.chars.some(char => chars.has(char))).map(group => group.id);
}

export function inspectPrivateJapanese101Forms(preview: Japanese101PrivateFormPreview) {
  if (preview.pairKey !== "Japanese:English" || preview.registered || preview.reviewed ||
      preview.lessonCount !== 60 || preview.lessons.length !== 60 ||
      preview.promptCount !== 235 || preview.activityCount !== 470)
    throw new Error("Wrong pair, count, or private review gate");
  const sources = new Map(preview.sourceHashes?.map(source => [source.path, source.sha256]));
  if (preview.sourceHashes?.length !== 6 || sources.size !== 6 ||
      [...sources].some(([path, sha256]) => PINNED_FORM_SOURCES[path] !== sha256))
    throw new Error("Japanese 101 form source identity changed");

  const forms = new Map<string, readonly Japanese101FormPrompt[]>();
  const promptIds = new Set<string>();
  let promptCount = 0;
  let index = 0;
  for (const [moduleId, count] of STAGES) {
    for (let n = 1; n <= count; n++) {
      const lesson = preview.lessons[index++];
      const definition = getLessonDefinition({
        moduleId, lessonNumber: n, targetLanguage: "Japanese",
        instructionLanguage: "English", contentVersion: lesson.contentVersion,
      });
      if (lesson.moduleId !== moduleId || lesson.lessonNumber !== n || lesson.reviewed ||
          lesson.targetLanguage !== "Japanese" || lesson.instructionLanguage !== "English" ||
          lesson.readingId !== `${moduleId}-lesson-${n}` ||
          lesson.lessonDefinitionId !== definition?.id ||
          lesson.sourceObjectiveId !== definition?.objectiveId || !definition?.reading)
        throw new Error(`${moduleId}:${n}: unstable lesson or language identity`);
      if (lesson.activities.length < 6 || lesson.activities.length % 2)
        throw new Error(`${moduleId}:${n}: incomplete contextual form pairs`);

      const prompts: Japanese101FormPrompt[] = [];
      for (let offset = 0; offset < lesson.activities.length; offset += 2) {
        const recognize = lesson.activities[offset];
        const produce = lesson.activities[offset + 1];
        const line = definition.reading.sentences[recognize.sourceDialogueTurn - 1];
        if (recognize.mode !== "recognize-meaning" || produce.mode !== "produce-target" ||
            recognize.sourcePromptId !== produce.sourcePromptId ||
            recognize.id !== `${recognize.sourcePromptId}:recognize` ||
            produce.id !== `${produce.sourcePromptId}:produce` ||
            produce.sourceDialogueTurn !== recognize.sourceDialogueTurn ||
            !/^form-ja-en-[0-9a-f]{16}$/.test(recognize.sourcePromptId) ||
            !line || recognize.cue !== line.target || recognize.answer !== line.native ||
            produce.cue !== line.native || produce.answer !== line.target ||
            !produce.knownJapaneseVariants?.length ||
            produce.knownJapaneseVariants.some(variant => variant !== line.target) ||
            promptIds.has(recognize.sourcePromptId))
          throw new Error(`${moduleId}:${n}: form prompt diverges from its Reader turn`);
        promptIds.add(recognize.sourcePromptId);
        prompts.push({
          id: recognize.sourcePromptId, pairKey: "Japanese:English",
          englishPrompt: line.native, japaneseAnswer: line.target,
          knownJapaneseVariants: produce.knownJapaneseVariants,
          sourceDialogueTurn: recognize.sourceDialogueTurn,
          kanaGroupIds: groupsFor(line.target),
        });
      }
      promptCount += prompts.length;
      forms.set(`${moduleId}:${n}`, prompts);
    }
  }
  if (promptCount !== preview.promptCount || promptIds.size !== promptCount)
    throw new Error("Form prompt count or identity changed");
  return {
    releaseEnabled: JAPANESE_101_FORMS_RELEASE_ENABLED,
    lessonCount: forms.size,
    promptCount,
    forLesson: (moduleId: string, n: number, pair: Pair) =>
      pair.target === "Japanese" && pair.native === "English" && Number.isInteger(n)
        ? forms.get(`${moduleId}:${n}`) ?? null : null,
  };
}

export function releasedJapanese101Forms(): null {
  return null;
}
