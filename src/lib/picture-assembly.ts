import { PICTURE_MODULES, PICTURE_OBJECTS, basePictureModule } from "./picture-action.ts";
export type AssemblyKind = "backpack" | "toolbox" | "tackle" | "worktable";
export interface AssemblyItem {
  id: string;
  object: string;
  slot: number;
  es: string;
  en: string;
}
export interface AssemblyPuzzle {
  id: string;
  kind: AssemblyKind;
  title: string;
  items: AssemblyItem[];
}
const positions = [
  ["superior izquierdo", "top-left"],
  ["superior derecho", "top-right"],
  ["central izquierdo", "middle-left"],
  ["central derecho", "middle-right"],
  ["inferior izquierdo", "bottom-left"],
  ["inferior derecho", "bottom-right"],
];
const containers = {
  backpack: {
    title: "Pack your backpack",
    es: "de la mochila",
    en: "of the backpack",
    noun: "bolsillo",
    english: "pocket",
  },
  toolbox: {
    title: "Organize your toolbox",
    es: "de la caja de herramientas",
    en: "of the toolbox",
    noun: "compartimento",
    english: "compartment",
  },
  tackle: {
    title: "Organize your tackle box",
    es: "de la caja de pesca",
    en: "of the tackle box",
    noun: "compartimento",
    english: "compartment",
  },
  worktable: {
    title: "Set out your equipment",
    es: "de la mesa",
    en: "of the table",
    noun: "espacio",
    english: "space",
  },
};
const basics: Record<AssemblyKind, string[]> = {
  backpack: ["book", "bottle", "phone", "towel", "hat", "shoes", "gloves"],
  toolbox: ["hammer", "wrench", "screwdriver", "tape", "gloves", "flashlight"],
  tackle: ["lure", "reel", "float", "pliers", "line", "gloves"],
  worktable: ["clipboard", "gloves", "tray", "towel", "phone", "bandage", "helmet"],
};
export const ASSEMBLY_PUZZLES: AssemblyPuzzle[] = PICTURE_MODULES.map((m) => {
  const kind: AssemblyKind =
    m.id === "sport-fishing"
      ? "tackle"
      : m.category === "Medical" ||
          m.category === "English for Work" ||
          /framer|roofing|siding|gutters|construction/.test(m.id)
        ? "worktable"
        : m.category === "Trades" || m.id === "place-directions"
          ? "toolbox"
          : "backpack";
  const excluded =
    kind === "backpack"
      ? [
          "backpack",
          "suitcase",
          "crate",
          "bucket",
          "tackle",
          "hockeystick",
          "lacrossestick",
          "bat",
          "net",
          "rope",
          "pipe",
        ]
      : kind === "toolbox"
        ? ["backpack", "helmet", "bucket", "pipe", "crate"]
        : [];
  const candidates = kind === "tackle" ? basics.tackle : [...m.objects, ...basics[kind]];
  const objects = [...new Set(candidates)].filter((id) => !excluded.includes(id)).slice(0, 6);
  const box = containers[kind];
  return {
    id: m.id,
    kind,
    title: box.title,
    items: objects.map((object, slot) => {
      const word = PICTURE_OBJECTS[object];
      const [es, en] = positions[slot];
      return {
        id: `assembly-${m.id}-${slot + 1}`,
        object,
        slot,
        es: `Pon ${word.es} en el ${box.noun} ${es} ${box.es}.`,
        en:
          kind === "worktable"
            ? `Put the ${word.en} on the ${en} area ${box.en}.`
            : `Put the ${word.en} in the ${en} ${box.english} ${box.en}.`,
      };
    }),
  };
});
export function assemblyForModule(id: string) {
  return ASSEMBLY_PUZZLES.find((p) => p.id === basePictureModule(id)) ?? ASSEMBLY_PUZZLES[0];
}
export function assemblySlot(point: { x: number; y: number }): number | null {
  const column = point.x < 0.5 ? 0 : 1;
  const row = Math.round((point.y - 0.28) / 0.22);
  if (row < 0 || row > 2) return null;
  const x = column === 0 ? 0.32 : 0.68,
    y = 0.28 + row * 0.22;
  return Math.abs(point.x - x) <= 0.14 && Math.abs(point.y - y) <= 0.085 ? row * 2 + column : null;
}
export function assemblySlotPoint(slot: number) {
  return { x: slot % 2 === 0 ? 0.32 : 0.68, y: 0.28 + Math.floor(slot / 2) * 0.22 };
}
