import { z } from "zod";
import { LANGUAGES } from "../data/languages.ts";
import type { LibraryEntry } from "../state/library-state";
import type { LibraryStorage } from "./library-device";

export const LEGACY_LIBRARY_KEY = "lt.library.custom.v1";
const CLAIM_KEY = "lt.legacy-library-claim.v1";
const sentence = z.object({ en: z.string().max(50000), target: z.string().max(50000) });
const sentences = z.array(sentence).max(20000);
const book = z.object({
  id: z.string().min(1).max(200),
  title: z.string().min(1).max(1000),
  subtitle: z.string().max(2000).default(""),
  language: z.enum(LANGUAGES as [(typeof LANGUAGES)[number], ...(typeof LANGUAGES)[number][]]),
  targetLabel: z.string().max(200),
  sentences,
  section: z.literal("custom"),
  flag: z.string().max(40).default("📖"),
  available: z.boolean(),
  chapters: z
    .array(z.object({ title: z.string().max(1000), sentences }))
    .max(1000)
    .optional(),
  createdAt: z.number().finite().nonnegative().optional(),
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
});
const uuid = z.string().uuid();
const claim = z.object({ schema: z.literal(1), actor: z.string().min(1), ids: z.record(uuid) });
function parse(raw: string) {
  if (raw.length > 8 * 1024 * 1024)
    throw Error("Older library save is too large to recover safely.");
  return JSON.parse(raw);
}
export function readLegacyLibrary(storage: LibraryStorage, actor: string) {
  const receipt = storage.getItem(CLAIM_KEY);
  const owner = receipt ? claim.parse(parse(receipt)) : null;
  if (owner && owner.actor !== actor)
    return { status: "other-account" as const, books: [], owner: null };
  const raw = storage.getItem(LEGACY_LIBRARY_KEY);
  const books = raw ? z.array(book).max(1000).parse(parse(raw)) : [];
  if (new Set(books.map((entry) => entry.id)).size !== books.length)
    throw Error("Older library identifiers could not be checked. Originals remain untouched.");
  return { status: "available" as const, books, owner };
}
export function inspectLegacyLibrary(storage: LibraryStorage | null, actor: string | null) {
  if (!actor) return { status: "sign-in" as const, count: 0 };
  try {
    if (!storage) throw Error("Storage unavailable");
    const result = readLegacyLibrary(storage, actor);
    return { status: result.status, count: result.books.length };
  } catch {
    return { status: "unreadable" as const, count: 0 };
  }
}
/** Ownership is reserved before saving, so a failed write can only be retried by this account. */
export function prepareLegacyLibraryRecovery(storage: LibraryStorage, actor: string) {
  const source = readLegacyLibrary(storage, actor);
  if (source.status !== "available") throw Error("These older texts belong to another account.");
  if (!source.books.length) throw Error("No compatible older texts were found.");
  const ids = { ...source.owner?.ids };
  const books: LibraryEntry[] = source.books.map((entry) => {
    const previous = Object.hasOwn(ids, entry.id) ? ids[entry.id] : undefined;
    const id = previous ?? crypto.randomUUID();
    Object.defineProperty(ids, entry.id, { value: id, enumerable: true, configurable: true });
    return { ...entry, id };
  });
  storage.setItem(CLAIM_KEY, JSON.stringify({ schema: 1, actor, ids }));
  return books;
}
