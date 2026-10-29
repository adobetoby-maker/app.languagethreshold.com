import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/state/app-state";
import { useFlashcards } from "@/state/flashcard-state";
import { getCurriculum } from "@/data/curriculum";
import { getModule } from "@/data/modules";
import { core60PathOf } from "@/lib/core60-path";
import { core30ScopeKey, type Core30ProgressContext } from "@/lib/core30-scope";
import {
  authoredWordsPair,
  pickAuthoredWords,
  readCachedLessonWords,
} from "@/lib/lesson-words-core";
import { useLearnerDeviceStore } from "@/hooks/use-learner-device-store";
import {
  checkpointBoundaries,
  emptyReviewRecord,
  pendingCheckpoint,
  rateReviewRound,
  readReviewRecord,
  reviewPair,
  startReviewRound,
  type LessonReviewRecord,
} from "@/lib/lesson-review-rounds";
import type { SrsGrade } from "@/lib/srs";

/** Checkpoint metadata uses an account/pair/plan store; ratings reuse the existing Cards store. */
export function useLessonReview(moduleId: string, context: Core30ProgressContext) {
  const { state } = useApp();
  const flashcards = useFlashcards();
  const path = core60PathOf(moduleId);
  const pathId = path?.tradeModuleId ?? moduleId;
  const scope = core30ScopeKey(pathId, context);
  const device = useLearnerDeviceStore(`lesson-review:${scope}`);
  const [saved, setSaved] = useState<{ scope: string; record: LessonReviewRecord } | null>(null);
  const record = saved?.scope === scope ? saved.record : emptyReviewRecord();
  const latest = useRef(record);
  latest.current = record;
  const ready = saved?.scope === scope && state.hydrated && flashcards.state.hydrated;
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    setSaved({ scope, record: readReviewRecord(device.read()) });
    setStorageError(false);
  }, [device, scope]);
  function save(next: LessonReviewRecord) {
    if (!ready) return;
    latest.current = next;
    setSaved({ scope, record: next });
    setStorageError(!device.write(next));
  }

  const steps = path?.steps.filter((s) => s.available).map((s) => s.moduleId) ?? [moduleId];
  const stepKey = JSON.stringify(steps);
  const lessons = useMemo(() => {
    const ids = JSON.parse(stepKey) as string[];
    return ids.flatMap((id) =>
      (getCurriculum(id)?.lessons ?? []).map((lesson) => ({ moduleId: id, lesson })),
    );
  }, [stepKey]);
  const completed = lessons.map(({ moduleId: id, lesson }) => {
    const key = core30ScopeKey(id, context);
    return (
      (state.lessonProgress[key] ?? 0) >= lesson.n ||
      Boolean(state.core30Log[key]?.lessons[String(lesson.n)]?.masteredAt)
    );
  });
  const pending = pendingCheckpoint(completed, record.completed);
  const encountered = lessons.flatMap(({ moduleId: id, lesson }, index) => {
    const key = core30ScopeKey(id, context);
    const log = state.core30Log[key]?.lessons[String(lesson.n)];
    const visited =
      completed[index] ||
      Object.keys(log?.visits ?? {}).length > 0 ||
      Object.keys(log?.wayVisits ?? {}).length > 0;
    if (!visited) return [];
    const words =
      pickAuthoredWords(
        lesson.words,
        context.targetLanguage,
        context.instructionLanguage,
        authoredWordsPair(getModule(id)?.learnDirection),
      ) ??
      readCachedLessonWords(id, lesson.n, context.targetLanguage, context.instructionLanguage) ??
      [];
    return words.map((word) => ({
      moduleId: id,
      index: index + 1,
      english: word.en,
      translation: word.es,
      kind: word.kind,
    }));
  });
  const pairsKey = JSON.stringify(encountered);
  const { addModuleCards } = flashcards;
  useEffect(() => {
    if (!ready) return;
    const pairs = JSON.parse(pairsKey) as typeof encountered;
    for (const id of JSON.parse(stepKey) as string[]) {
      const items = pairs.filter((p) => p.moduleId === id);
      if (items.length) addModuleCards(state.selectedLanguage, id, "lesson", items);
    }
  }, [ready, pairsKey, stepKey, state.selectedLanguage, addModuleCards]);

  function candidates(boundary: number | null) {
    const allowed = new Map<string, Set<string>>();
    for (const p of encountered) {
      if (boundary !== null && p.index > boundary) continue;
      const set = allowed.get(p.moduleId) ?? new Set<string>();
      set.add(reviewPair(p.translation, p.english));
      allowed.set(p.moduleId, set);
    }
    // If older history contains duplicate cards, reuse the most recently reviewed ID; never reset/delete either.
    const unique = new Map<string, (typeof flashcards.state.cards)[string]>();
    for (const card of Object.values(flashcards.state.cards)) {
      if (
        card.language !== state.selectedLanguage ||
        !card.moduleId ||
        !allowed.get(card.moduleId)?.has(reviewPair(card.word, card.translation))
      )
        continue;
      const key = `${card.moduleId}:${reviewPair(card.word, card.translation)}`;
      const old = unique.get(key);
      if (!old || (card.srs.lastReviewedAt ?? 0) > (old.srs.lastReviewedAt ?? 0))
        unique.set(key, card);
    }
    return [...unique.values()];
  }
  const allCards = candidates(null);
  const dueCount = allCards.filter((c) => c.srs.dueDate <= Date.now()).length;
  const round = record.round;
  return {
    ready,
    record,
    round,
    pending,
    dueCount,
    storageError,
    checkpoints: checkpointBoundaries(lessons.length).map((n) => ({
      n,
      moduleId: lessons[n - 1].moduleId,
      afterLesson: lessons[n - 1].lesson.n,
      complete: Boolean(record.completed[String(n)]),
      unlocked: completed.slice(Math.max(0, n - (n % 3 || 3)), n).every(Boolean),
    })),
    shouldReviewBefore(lessonNumber: number) {
      const index =
        lessons.findIndex((item) => item.moduleId === moduleId && item.lesson.n === lessonNumber) +
        1;
      return pending !== null && index > pending;
    },
    currentCard: round?.queue[0] ? allCards.find((card) => card.id === round.queue[0]) : undefined,
    start(boundary: number | null) {
      if (!ready) return false;
      if (latest.current.round) return true;
      const next = startReviewRound(candidates(boundary), boundary, Date.now());
      if (!next.queue.length) return false;
      save({ ...latest.current, round: next });
      return true;
    },
    rate(grade: SrsGrade) {
      const r = latest.current.round;
      if (!r || !r.queue[0] || !ready) return;
      flashcards.reviewCard(r.queue[0], grade);
      save({ ...latest.current, round: rateReviewRound(r, grade) });
    },
    skipMissing() {
      const r = latest.current.round;
      if (r) save({ ...latest.current, round: { ...r, queue: r.queue.slice(1) } });
    },
    finish() {
      const r = latest.current.round;
      if (!r || r.queue.length) return;
      save({
        completed: {
          ...latest.current.completed,
          ...(r.checkpoint !== null && r.attempts > 0 ? { [r.checkpoint]: Date.now() } : {}),
        },
        round: null,
      });
    },
  };
}
export type LessonReviewController = ReturnType<typeof useLessonReview>;
