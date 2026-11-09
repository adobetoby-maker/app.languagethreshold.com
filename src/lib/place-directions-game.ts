/** Shared geometry uses normalized coordinates in the uncropped square workshop artwork. */
export interface Point {
  x: number;
  y: number;
}
export type Place =
  | "under"
  | "on"
  | "inside"
  | "outside"
  | "beside"
  | "behind"
  | "front"
  | "between"
  | "near"
  | "far"
  | "under-tool";
export const PLACES: { id: Place; es: string; en: string; point: Point }[] = [
  { id: "under", es: "debajo de la mesa", en: "under the table", point: { x: 0.61, y: 0.59 } },
  { id: "on", es: "encima de la mesa", en: "on top of the table", point: { x: 0.61, y: 0.4 } },
  { id: "inside", es: "dentro de la caja", en: "inside the toolbox", point: { x: 0.17, y: 0.57 } },
  { id: "outside", es: "fuera de la caja", en: "outside the toolbox", point: { x: 0.4, y: 0.6 } },
  {
    id: "beside",
    es: "al lado de la caja",
    en: "next to the toolbox",
    point: { x: 0.34, y: 0.61 },
  },
  { id: "behind", es: "detrás de la mesa", en: "behind the table", point: { x: 0.62, y: 0.24 } },
  {
    id: "front",
    es: "delante de la mesa",
    en: "in front of the table",
    point: { x: 0.62, y: 0.76 },
  },
  { id: "between", es: "entre los conos", en: "between the cones", point: { x: 0.54, y: 0.83 } },
  { id: "near", es: "cerca de la caja", en: "near the toolbox", point: { x: 0.34, y: 0.66 } },
  { id: "far", es: "lejos de la caja", en: "far from the toolbox", point: { x: 0.86, y: 0.15 } },
  {
    id: "under-tool",
    es: "debajo de la llave",
    en: "under the wrench",
    point: { x: 0.63, y: 0.4 },
  },
];
function rect(p: Point, x: number, y: number, w: number, h: number) {
  return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
}
export function acceptsPlace(id: Place, p: Point) {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1)
    return false;
  const inside = rect(p, 0.065, 0.52, 0.23, 0.1);
  switch (id) {
    case "under":
      return rect(p, 0.4, 0.47, 0.41, 0.23);
    case "on":
      return (
        p.y >= 0.35 &&
        p.y <= 0.45 &&
        p.x >= 0.39 - (p.y - 0.35) * 0.9 &&
        p.x <= 0.85 + (p.y - 0.35) * 0.9
      );
    case "inside":
      return inside;
    case "outside":
      return !inside;
    case "beside":
      return rect(p, 0.3, 0.52, 0.12, 0.18);
    case "behind":
      return rect(p, 0.35, 0.1, 0.59, 0.23);
    case "front":
      return rect(p, 0.3, 0.71, 0.64, 0.22);
    case "between":
      return rect(p, 0.35, 0.76, 0.37, 0.14);
    case "near":
      return !inside && Math.hypot(p.x - 0.175, p.y - 0.58) < 0.3;
    case "far":
      return Math.hypot(p.x - 0.175, p.y - 0.58) > 0.65;
    case "under-tool":
      return Math.hypot(p.x - 0.63, p.y - 0.4) < 0.075;
  }
}
export const CHALLENGES: {
  place: Place;
  pickup: boolean;
  tool: "hammer" | "screwdriver" | "backpack";
  es: string;
  en: string;
}[] = [
  {
    place: "under",
    pickup: false,
    tool: "hammer",
    es: "Pon el martillo debajo de la mesa.",
    en: "Put the hammer under the table.",
  },
  {
    place: "inside",
    pickup: false,
    tool: "screwdriver",
    es: "Pon el destornillador dentro de la caja.",
    en: "Put the screwdriver inside the toolbox.",
  },
  {
    place: "on",
    pickup: false,
    tool: "hammer",
    es: "Pon el martillo encima de la mesa.",
    en: "Put the hammer on top of the table.",
  },
  {
    place: "outside",
    pickup: true,
    tool: "screwdriver",
    es: "Levanta el destornillador y ponlo fuera de la caja.",
    en: "Pick up the screwdriver and put it outside the toolbox.",
  },
  {
    place: "beside",
    pickup: false,
    tool: "backpack",
    es: "Pon la mochila al lado de la caja.",
    en: "Put the backpack next to the toolbox.",
  },
  {
    place: "behind",
    pickup: false,
    tool: "hammer",
    es: "Pon el martillo detrás de la mesa.",
    en: "Put the hammer behind the table.",
  },
  {
    place: "front",
    pickup: false,
    tool: "backpack",
    es: "Pon la mochila delante de la mesa.",
    en: "Put the backpack in front of the table.",
  },
  {
    place: "between",
    pickup: false,
    tool: "screwdriver",
    es: "Pon el destornillador entre los conos.",
    en: "Put the screwdriver between the cones.",
  },
  {
    place: "near",
    pickup: true,
    tool: "hammer",
    es: "Levanta el martillo y ponlo cerca de la caja.",
    en: "Pick up the hammer and put it near the toolbox.",
  },
  {
    place: "far",
    pickup: true,
    tool: "backpack",
    es: "Levanta la mochila y ponla lejos de la caja.",
    en: "Pick up the backpack and put it far from the toolbox.",
  },
  {
    place: "under-tool",
    pickup: true,
    tool: "hammer",
    es: "Levanta el martillo y ponlo debajo de la llave.",
    en: "Pick up the hammer and put it under the wrench.",
  },
  {
    place: "under",
    pickup: true,
    tool: "hammer",
    es: "Levanta el martillo y ponlo debajo de la mesa.",
    en: "Pick up the hammer and put it under the table.",
  },
];
export function initialPosition(place: Place): Point {
  return place === "outside" ? { x: 0.17, y: 0.57 } : { x: 0.13, y: 0.18 };
}
export function validPlacement(
  place: Place,
  point: Point,
  needsPickup: boolean,
  pickedUp: boolean,
  demonstrating: boolean,
) {
  return !demonstrating && (!needsPickup || pickedUp) && acceptsPlace(place, point);
}
