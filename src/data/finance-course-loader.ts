import { financeTrack } from "./finance-courses.ts";
import type { LessonWord, LessonGrammar, Lesson } from "./curriculum.ts";
export interface FinancePractice {
  stage: "foundation" | "core" | "master";
  target: string;
  native: string;
  reading: { title: string; target: string[]; native: string[] };
  speaking: string;
  openingLine: string;
  partnerRole: string;
  grammar: LessonGrammar;
}
export interface FinanceCoursePack {
  core: {
    module: string;
    language: string;
    nativeLanguage: string;
    headline: string;
    threshold: string;
    lessons: {
      n: number;
      title: string;
      objective: string;
      words: LessonWord[];
      readingTemplate: string;
      grammar: LessonGrammar;
      lessonType: Lesson["lessonType"];
      block: Lesson["block"];
      speaking: string;
    }[];
  };
  practice: Record<string, Record<string, FinancePractice>>;
}
let bundled: Record<string, () => Promise<unknown>> | null = null;
try {
  bundled = import.meta.glob("./finance-courses/*.json", { import: "default" });
} catch {
  /* Node source audits use the same generated pack synchronously. */
}
const loaded = new Map<string, FinanceCoursePack>();
const pending = new Map<string, Promise<void>>();
function accept(id: string, value: unknown) {
  const pack = value as FinanceCoursePack,
    track = financeTrack(id);
  if (
    pack?.core?.module !== id ||
    pack.core.language !== track?.authoredPair?.target ||
    pack.core.nativeLanguage !== track?.authoredPair?.native ||
    !pack.practice?.[id]
  )
    throw new Error("Invalid finance course pack");
  loaded.set(id, pack);
}
export function readFinanceCourse(moduleId: string): FinanceCoursePack | null {
  const id = financeTrack(moduleId)?.id;
  if (!id) return null;
  if (!loaded.has(id) && !bundled) {
    const process = (
      globalThis as {
        process?: { getBuiltinModule?: (name: string) => unknown; cwd: () => string };
      }
    ).process;
    const fs = process?.getBuiltinModule?.("node:fs") as
      | {
          existsSync: (path: string) => boolean;
          readFileSync: (path: string, encoding: string) => string;
        }
      | undefined;
    const path = `${process?.cwd()}/src/data/finance-courses/${id}.json`;
    if (fs?.existsSync(path)) accept(id, JSON.parse(fs.readFileSync(path, "utf8")));
  }
  return loaded.get(id) ?? null;
}
export function loadFinanceCourse(moduleId: string): Promise<void> {
  const id = financeTrack(moduleId)?.id;
  if (!id || readFinanceCourse(id)) return Promise.resolve();
  if (pending.has(id)) return pending.get(id)!;
  const loader = bundled?.[`./finance-courses/${id}.json`];
  const task = (async () => {
    if (!loader) throw new Error("Finance course is unavailable");
    accept(id, await loader());
  })().finally(() => pending.delete(id));
  pending.set(id, task);
  return task;
}
