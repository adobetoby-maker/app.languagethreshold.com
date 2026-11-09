import profiles from "../../content/picture-action/module-profiles.json" with { type: "json" };
import authored from "../../content/picture-action/scenes.json" with { type: "json" };
import {
  CHALLENGES,
  PLACES,
  acceptsPlace,
  initialPosition,
  type Point,
  type Place,
} from "./place-directions-game.ts";
export type SceneId =
  | "workshop"
  | "clinic"
  | "or"
  | "truck"
  | "bedroom"
  | "fishing"
  | "soccer"
  | "farm"
  | `module-${string}`;
export type InstructionMode = "voice-text" | "voice" | "text";
export interface PictureTarget {
  id: string;
  es: string;
  en: string;
  point: Point;
  width: number;
  height: number;
}
export interface PictureChallenge {
  id: string;
  object: string;
  es: string;
  en: string;
  target: string;
  action: "place" | "hang" | "clean";
  pickup: boolean;
  start: Point;
}
export interface PictureScene {
  id: SceneId;
  name: string;
  alt: string;
  image: string;
  targets: PictureTarget[];
  challenges: PictureChallenge[];
}
const workshop: PictureScene = {
  id: "workshop",
  name: "Workshop",
  alt: "Workshop with an open toolbox on the left, a table on the right, and two cones in front.",
  image: "/images/picture-action/workshop",
  targets: PLACES.map((p) => ({ ...p, width: 0.18, height: 0.14 })),
  challenges: CHALLENGES.map((c, i) => ({
    id: `workshop-${i + 1}`,
    object: c.tool,
    es: c.es,
    en: c.en,
    target: c.place,
    action: "place",
    pickup: c.pickup,
    start: initialPosition(c.place),
  })),
};
export const SHARED_PICTURE_SCENES: readonly PictureScene[] = [
  workshop,
  ...(authored.scenes as PictureScene[]),
];
export const PICTURE_OBJECTS: Record<string, { es: string; en: string; icon?: string }> = {
  ...authored.objects,
  ...profiles.objects,
};
export const PICTURE_MODULES = profiles.modules;
export function basePictureModule(id: string) {
  return id.replace(/^(foundation-|master-)/, "");
}
export const MODULE_PICTURE_SCENES: readonly PictureScene[] = profiles.modules.map((m) => {
  const base = SHARED_PICTURE_SCENES.find((s) => s.id === m.scene)!;
  // Floor, shelves and seats support ordinary objects; hooks are reserved for the shared hang task.
  const targets = base.targets.filter((t) => t.id !== "door-hook");
  return {
    ...base,
    id: `module-${m.id}` as SceneId,
    name: `${m.name} · objects & actions`,
    challenges: Array.from({ length: 6 }, (_, i) => {
      const object = m.objects[i % m.objects.length];
      const word = PICTURE_OBJECTS[object];
      const target = targets[i % targets.length];
      const pickup = i >= 3;
      return {
        id: `module-${m.id}-${i + 1}`,
        object,
        es: `${pickup ? `Recoge ${word.es}. ` : ""}Pon ${word.es} ${target.es}.`,
        en: `${pickup ? `Pick up the ${word.en}. ` : ""}Put the ${word.en} ${target.en}.`,
        target: target.id,
        action: "place" as const,
        pickup,
        start: base.id === "workshop" ? initialPosition(target.id as Place) : { x: 0.12, y: 0.9 },
      };
    }),
  };
});
export const PICTURE_SCENES: readonly PictureScene[] = [
  ...SHARED_PICTURE_SCENES,
  ...MODULE_PICTURE_SCENES,
];
export function pictureScenesForModule(id: string) {
  const own = MODULE_PICTURE_SCENES.find((s) => s.id === `module-${basePictureModule(id)}`);
  return own ? [own, ...SHARED_PICTURE_SCENES] : [...SHARED_PICTURE_SCENES];
}
export function pictureScene(id: string) {
  return PICTURE_SCENES.find((s) => s.id === id) ?? workshop;
}
export function sceneForModule(moduleId: string, category = ""): SceneId {
  const id = basePictureModule(moduleId.toLowerCase());
  if (id !== "place-directions" && profiles.modules.some((m) => m.id === id)) return `module-${id}`;
  if (/or-evs|operating|surg|anesth/.test(id)) return "or";
  if (/clean|housekeep|hotel|hospitality/.test(id)) return "bedroom";
  if (/nurs|medical|clinic|physician|dental|patient|health|fmg/.test(id) || category === "Medical")
    return "clinic";
  if (/truck|logistic|transport|driv|delivery|farm|landscap|agricult/.test(id)) return "truck";
  if (
    /place-directions|roof|construction|electric|plumb|carpent|weld|military/.test(id) ||
    category === "Trades"
  )
    return "workshop";
  return "bedroom";
}
export function supportsPicturePair(target: string, native: string) {
  return (
    (target === "Spanish" && native === "English") || (target === "English" && native === "Spanish")
  );
}
export function acceptsPictureTarget(scene: PictureScene, id: string, p: Point) {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1)
    return false;
  const t = scene.targets.find((t) => t.id === id);
  if (!t) return false;
  if (scene.image === workshop.image) return acceptsPlace(id as Place, p);
  return Math.abs(p.x - t.point.x) <= t.width / 2 && Math.abs(p.y - t.point.y) <= t.height / 2;
}
export function cleaningDistance(scene: PictureScene, target: string, from: Point, to: Point) {
  if (!acceptsPictureTarget(scene, target, from) || !acceptsPictureTarget(scene, target, to))
    return 0;
  return Math.min(0.04, Math.hypot(to.x - from.x, to.y - from.y));
}
export const CLEANING_DISTANCE = 0.1;
export function canFinishAction(
  scene: PictureScene,
  c: PictureChallenge,
  p: Point,
  picked: boolean,
  demo: boolean,
  cleaned = 0,
) {
  return (
    !demo &&
    (!c.pickup || picked) &&
    acceptsPictureTarget(scene, c.target, p) &&
    (c.action !== "clean" || cleaned >= CLEANING_DISTANCE)
  );
}
export interface PicturePreferences {
  mode: InstructionMode;
  rate: number;
  scenes: Record<string, SceneId>;
}
export function picturePreferences(raw: unknown): PicturePreferences {
  const x = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const mode = ["voice-text", "voice", "text"].includes(String(x.mode))
    ? (x.mode as InstructionMode)
    : "voice-text";
  const rate = [0.65, 0.85, 1].includes(Number(x.rate)) ? Number(x.rate) : 0.85;
  const scenes: Record<string, SceneId> = {};
  if (x.scenes && typeof x.scenes === "object" && !Array.isArray(x.scenes))
    for (const [k, v] of Object.entries(x.scenes))
      if (
        PICTURE_SCENES.some((s) => s.id === v) &&
        k.length < 150 &&
        !["__proto__", "constructor", "prototype"].includes(k)
      )
        scenes[k] = v as SceneId;
  return { mode, rate, scenes };
}
