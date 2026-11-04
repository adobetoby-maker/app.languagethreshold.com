import { getCurriculum } from "@/data/curriculum";
import { getModule, moduleSupportsLearningPair } from "@/data/modules";
import { ensureStageForModule } from "@/data/core60-stages";
import { spanishBasicsLesson } from "@/data/spanish-basics";
import { core60PathOf } from "./core60-path";
import { loadLessonContent } from "./lesson-content";
import { loadLessonDeck } from "./lesson-words";
import { authoredWordsPairForModule, pickAuthoredWords, pickDeckWords } from "./lesson-words-core";
import { pickContentWords, pickContentPassage } from "./lesson-content-core";
import { authoredLessonReading } from "./lesson-reading";
import { placementBlocks, placementCloze, type PlacementLesson } from "./module-placement";
import type { Language, NativeLanguage } from "@/data/languages";

export async function loadModulePlacement(
  moduleId: string,
  target: Language,
  native: NativeLanguage,
  seed: string,
) {
  const module = getModule(moduleId);
  if (!module || !moduleSupportsLearningPair(module, target, native))
    throw new Error("Placement is not available for this module and language pair.");
  const path = core60PathOf(moduleId);
  const stages = path
    ? path.steps.filter((s) => s.available).map((s) => ({ id: s.moduleId, label: s.stage }))
    : [{ id: moduleId, label: "course" }];
  const loaded = await Promise.all(
    stages.map(async (stage) => {
      const stageModule = getModule(stage.id);
      if (!stageModule || !moduleSupportsLearningPair(stageModule, target, native))
        throw new Error("A course stage is not available for this language pair.");
      await ensureStageForModule(stage.id);
      const curriculum = getCurriculum(stage.id);
      if (!curriculum) throw new Error("A course stage could not load. Please try again.");
      const authored = authoredWordsPairForModule(stageModule);
      const needsFiles = curriculum.lessons.some(
        (lesson) => !pickAuthoredWords(lesson.words, target, native, authored),
      );
      const [content, deck] = await Promise.all([
        loadLessonContent(stage.id, target),
        needsFiles ? loadLessonDeck(stage.id, target) : Promise.resolve(null),
      ]);
      return curriculum.lessons.map((lesson): PlacementLesson => {
        const words =
          pickAuthoredWords(lesson.words, target, native, authored) ??
          pickContentWords(content, lesson.n, native) ??
          pickDeckWords(deck, lesson.n, native) ??
          [];
        const basics = spanishBasicsLesson(stage.id, lesson.n, target, native);
        const authoredReading = authoredLessonReading(stage.id, lesson.n, target, native);
        const passage = pickContentPassage(content, lesson.n, native);
        const examples =
          authoredReading?.sentences.map((s) => ({ target: s.target, native: s.en })) ??
          passage?.target.map((s, i) => ({ target: s, native: passage.native[i] })) ??
          words.filter((w) => w.kind === "phrase").map((w) => ({ target: w.es, native: w.en }));
        return {
          moduleId: stage.id,
          n: lesson.n,
          title: lesson.title,
          stage: stage.label,
          words,
          checks: basics?.checks ?? placementCloze(words, examples),
        };
      });
    }),
  );
  const lessons = loaded.flat();
  const blocks = placementBlocks(lessons, seed);
  const covered = blocks.reduce((sum, b) => sum + b.lessons.length, 0);
  return {
    blocks,
    totalLessons: lessons.length,
    gap: lessons[covered] ?? null,
    name: path?.tradeLabel ?? module.name,
  };
}
