import { z } from "zod";
import { LANGUAGES, type Language } from "../data/languages.ts";
import { MODULES } from "../data/modules.ts";
import { getCurriculum } from "../data/curriculum.ts";
import type { AppState } from "../state/app-state";
import { vocabWordKey } from "../state/vocab-store.ts";
import {
  profileSnapshotKey,
  readProfileSnapshot,
  saveProfileSnapshot,
} from "./profile-device-snapshot.ts";
import type { LearnerStorage } from "./learner-device-store.ts";

export const PROFILE_RECOVERY_CATEGORIES = {
  notes: "Personal profile notes",
  vocabulary: "Profile vocabulary",
  activity: "Practice activity totals",
  modules: "Older unlabeled module history",
} as const;
export type ProfileRecoveryKind = keyof typeof PROFILE_RECOVERY_CATEGORIES;
const kinds = Object.keys(PROFILE_RECOVERY_CATEGORIES) as ProfileRecoveryKind[];
const keys = ["lt.app.v2", "lt.app.v1", "lt.app"] as const;
const receiptKey = "lt.legacy-profile-claim.v1";
const language = z.enum(LANGUAGES as [Language, ...Language[]]);
const count = z.number().int().min(0).max(1_000_000_000);
const text = z.string().trim().min(1);
const notes = z
  .array(
    z.object({
      id: text.max(200),
      text: text.max(50000),
      createdAt: z.number().finite().nonnegative(),
    }),
  )
  .max(10000);
const words = z
  .array(
    z.object({
      word: text.max(1000),
      translation: z.string().max(10000),
      category: z.string().max(200),
      correctCount: count.default(0),
      moduleId: text.max(200).optional(),
    }),
  )
  .max(10000);
const wordsByLanguage = (value: unknown) => z.record(language, words).parse(value);
const instant = z.string().datetime({ offset: true });
const moduleLog = z.object({
  startDate: z.string().date().optional(),
  startDateSetAt: instant.optional(),
  lastReviewAt: instant.optional(),
  lessons: z.record(
    z.object({
      visits: z.record(instant),
      wayVisits: z.record(instant).optional(),
      masteredAt: instant.optional(),
      needsPractice: z.boolean().optional(),
      reviews: z
        .array(z.object({ at: instant, ok: z.boolean() }))
        .max(1000)
        .optional(),
    }),
  ),
});
const activityKeys = [
  "xp",
  "wordsLookedUp",
  "notesSaved",
  "tutorMessages",
  "conversationExchanges",
  "lessonsCompleted",
  "customTextsAdded",
  "lettersWritten",
  "challengesCleared",
] as const;
type ActivityKey = (typeof activityKeys)[number];
type ProfileFields =
  | "userNotes"
  | "vocabByLanguage"
  | "vocabRevisionsByLanguage"
  | "core30Log"
  | "lessonProgress"
  | ActivityKey;
export type LegacyProfilePatch = Partial<Pick<AppState, ProfileFields>>;
type CurrentProfile = Pick<AppState, ProfileFields>;

function parse(raw: string): Record<string, unknown> {
  if (raw.length > 8 * 1024 * 1024)
    throw Error("The older profile is too large to recover safely.");
  return z.record(z.unknown()).parse(JSON.parse(raw));
}
function source(storage: LearnerStorage, actor: string) {
  const receiptRaw = storage.getItem(receiptKey);
  const receipt =
    receiptRaw === null
      ? null
      : z
          .object({
            schema: z.literal(1),
            actor: text,
            sourceKey: z.enum(keys),
            done: z.array(z.enum(kinds as [ProfileRecoveryKind, ...ProfileRecoveryKind[]])),
          })
          .parse(parse(receiptRaw));
  if (receipt && receipt.actor !== actor)
    throw Error("This older profile is associated with another account.");
  for (const key of keys) {
    const raw = storage.getItem(key);
    if (raw === null) continue;
    if (receipt && receipt.sourceKey !== key)
      throw Error("The older profile source changed. Originals remain untouched.");
    const data = parse(raw);
    if (
      data.__v !== undefined &&
      (!Number.isInteger(data.__v) || Number(data.__v) < 1 || Number(data.__v) > 5)
    )
      throw Error("This profile version is not supported for recovery.");
    return { key, data, receipt };
  }
  return null;
}
function normalized(
  data: Record<string, unknown>,
  kind: ProfileRecoveryKind,
  chosenLanguage?: Language,
): LegacyProfilePatch {
  if (kind === "notes") {
    const entries = notes.parse(data.userNotes ?? []);
    if (new Set(entries.map((n) => n.id)).size !== entries.length)
      throw Error("Older note identifiers are duplicated.");
    return { userNotes: entries };
  }
  if (kind === "vocabulary") {
    const map = z.record(language, words).parse(data.vocabByLanguage ?? {});
    const legacy = words.parse(data.userVocab ?? []);
    const label = language.safeParse(data.vocabLang);
    const target = label.success
      ? label.data
      : chosenLanguage === undefined
        ? undefined
        : language.parse(chosenLanguage);
    if (legacy.length && !target)
      throw Error("Choose the language of the older unlabeled vocabulary first.");
    if (target && legacy.length) {
      const present = new Set((map[target] ?? []).map((w) => vocabWordKey(w.word)));
      map[target] = [
        ...(map[target] ?? []),
        ...legacy.filter(
          (w) => !present.has(vocabWordKey(w.word)) && !!present.add(vocabWordKey(w.word)),
        ),
      ];
    }
    return { vocabByLanguage: map };
  }
  if (kind === "activity") {
    return Object.fromEntries(
      activityKeys.filter((k) => data[k] !== undefined).map((k) => [k, count.parse(data[k])]),
    ) as Partial<Pick<AppState, ActivityKey>>;
  }
  const rawLog = z.record(z.unknown()).parse(data.core30Log ?? {});
  const rawProgress = z.record(z.unknown()).parse(data.lessonProgress ?? {});
  const core30Log: AppState["core30Log"] = {},
    lessonProgress: Record<string, number> = {};
  for (const module of MODULES) {
    if (Object.hasOwn(rawLog, module.id)) {
      const log = moduleLog.parse(rawLog[module.id]);
      const available = new Set((getCurriculum(module.id)?.lessons ?? []).map((l) => String(l.n)));
      if (Object.keys(log.lessons).some((n) => !available.has(n)))
        throw Error("Older lesson numbers do not match this module.");
      core30Log[module.id] = log;
    }
    if (Object.hasOwn(rawProgress, module.id))
      lessonProgress[module.id] = count.max(30).parse(rawProgress[module.id]);
  }
  return { core30Log, lessonProgress };
}
function total(patch: LegacyProfilePatch, kind: ProfileRecoveryKind) {
  if (kind === "notes") return patch.userNotes?.length ?? 0;
  if (kind === "vocabulary")
    return Object.values(patch.vocabByLanguage ?? {}).reduce(
      (n, list) => n + (list?.length ?? 0),
      0,
    );
  if (kind === "activity") return activityKeys.filter((k) => (patch[k] ?? 0) > 0).length;
  return new Set([
    ...Object.keys(patch.core30Log ?? {}),
    ...Object.keys(patch.lessonProgress ?? {}),
  ]).size;
}
export function inspectLegacyProfile(storage: LearnerStorage | null, actor: string) {
  return kinds.map((kind) => {
    try {
      if (!storage) throw Error("Storage unavailable");
      const old = source(storage, actor);
      if (!old) return { kind, status: "absent" as const, count: 0, needsLanguage: false };
      if (old.receipt?.done.includes(kind))
        return { kind, status: "recovered" as const, count: 0, needsLanguage: false };
      const needsLanguage =
        kind === "vocabulary" &&
        words.parse(old.data.userVocab ?? []).length > 0 &&
        !language.safeParse(old.data.vocabLang).success;
      // Count only; no language is assigned until an explicit choice at recovery.
      const value = normalized(old.data, kind, needsLanguage ? LANGUAGES[0] : undefined);
      const n = total(value, kind);
      return {
        kind,
        status: n ? ("available" as const) : ("absent" as const),
        count: n,
        needsLanguage,
      };
    } catch (error) {
      return {
        kind,
        status:
          error instanceof Error && /another account/.test(error.message)
            ? ("other-account" as const)
            : ("unreadable" as const),
        count: 0,
        needsLanguage: false,
      };
    }
  });
}

/** Current records and explicit vocabulary resets win; overlapping totals are never added. */
export function mergeLegacyProfileCategory(
  current: CurrentProfile,
  old: Record<string, unknown>,
  kind: ProfileRecoveryKind,
  chosenLanguage?: Language,
): LegacyProfilePatch {
  const incoming = normalized(old, kind, chosenLanguage);
  if (kind === "notes") {
    const present = notes.parse(current.userNotes);
    const seen = new Set(present.map((n) => n.id));
    return {
      userNotes: [...present, ...(incoming.userNotes ?? []).filter((n) => !seen.has(n.id))],
    };
  }
  if (kind === "vocabulary") {
    const map = wordsByLanguage(current.vocabByLanguage),
      revisions = z.record(language, count).parse(current.vocabRevisionsByLanguage);
    for (const [lang, list] of Object.entries(incoming.vocabByLanguage ?? {}) as [
      Language,
      AppState["userVocab"],
    ][]) {
      const present = map[lang] ?? [];
      // An explicit empty revision is an intentional reset, not an untouched baseline.
      if (!present.length && Object.hasOwn(revisions, lang)) continue;
      const seen = new Set(present.map((w) => vocabWordKey(w.word)));
      const added = list.filter(
        (w) => !seen.has(vocabWordKey(w.word)) && !!seen.add(vocabWordKey(w.word)),
      );
      if (added.length) {
        map[lang] = [...present, ...added];
        revisions[lang] = count.parse((revisions[lang] ?? 0) + 1);
      }
    }
    return { vocabByLanguage: map, vocabRevisionsByLanguage: revisions };
  }
  if (kind === "activity")
    return Object.fromEntries(
      activityKeys
        .filter((k) => incoming[k] !== undefined)
        .map((k) => [k, Math.max(count.parse(current[k]), incoming[k] ?? 0)]),
    );
  return {
    core30Log: { ...incoming.core30Log, ...current.core30Log },
    lessonProgress: { ...incoming.lessonProgress, ...current.lessonProgress },
  };
}

export function recoverLegacyProfile({
  storage,
  actor,
  kind,
  current,
  snapshot,
  confirmed,
  chosenLanguage,
  isCurrent,
  apply,
}: {
  storage: LearnerStorage;
  actor: string;
  kind: ProfileRecoveryKind;
  current: AppState;
  confirmed: boolean;
  snapshot: Record<string, unknown>;
  chosenLanguage?: Language;
  isCurrent: () => boolean;
  apply: (patch: LegacyProfilePatch) => void;
}) {
  if (!actor || !confirmed || !isCurrent())
    throw Error("Sign in and confirm ownership before recovering this profile.");
  z.enum(kinds as [ProfileRecoveryKind, ...ProfileRecoveryKind[]]).parse(kind);
  const old = source(storage, actor);
  if (!old || old.receipt?.done.includes(kind))
    throw Error("This category is absent or already recovered.");
  if (!total(normalized(old.data, kind, chosenLanguage), kind))
    throw Error("No compatible older data was found for this category.");
  const patch = mergeLegacyProfileCategory(current, old.data, kind, chosenLanguage);
  if (
    storage.getItem(profileSnapshotKey(actor)) !== null &&
    readProfileSnapshot(storage, actor) === null
  )
    throw Error("Current profile storage could not be checked. It has not been replaced.");
  if (!isCurrent()) throw Error("Your account changed. Sign in again before recovery.");
  const receipt = { schema: 1, actor, sourceKey: old.key, done: old.receipt?.done ?? [] };
  storage.setItem(receiptKey, JSON.stringify(receipt));
  if (!isCurrent()) throw Error("Your account changed. Recovery stopped.");
  // Persist before applying UI state. No reload races a deferred provider write.
  if (!saveProfileSnapshot(storage, actor, { ...snapshot, ...patch, __v: 5 }))
    throw Error("Recovery could not be saved. Originals remain intact; this account can retry.");
  storage.setItem(receiptKey, JSON.stringify({ ...receipt, done: [...receipt.done, kind] }));
  if (!isCurrent())
    throw Error("Your account changed. Sign back in to restore the saved category.");
  apply(patch);
}
