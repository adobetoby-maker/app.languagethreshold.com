import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function jsonFiles(root, directory = "") {
  return readdirSync(join(root, directory), { withFileTypes: true })
    .flatMap((entry) => {
      const relative = join(directory, entry.name);
      return entry.isDirectory()
        ? jsonFiles(root, relative)
        : entry.name.endsWith(".json")
          ? [relative]
          : [];
    })
    .sort();
}

const PACK_CATALOG = /^([a-z]{2,3}(?:-[A-Za-z]{2,8})?)\/catalog\/([a-z0-9][a-z0-9-]*\.json)$/;

/**
 * Review source and learner CDN content must be the same bytes in the deployable artifact.
 * When packCatalogs is given, the static root may also carry language-pack catalogs at
 * <code>/catalog/<module>.json (emitted by scripts/vite-language-pack-catalogs.mjs); each must be
 * byte-identical to packCatalogs/<code>/<module>.json and is then left out of the inventory check.
 */
export function verifyLessonReviewContent(source, packaged, staticRoot, packCatalogs) {
  const files = jsonFiles(source);
  if (!files.includes("index.json")) throw new Error("Lesson review source index is missing.");
  for (const root of [packaged, staticRoot]) {
    let found = jsonFiles(root);
    if (packCatalogs && root === staticRoot) {
      found = found.filter((file) => {
        const match = PACK_CATALOG.exec(file.split("\\").join("/"));
        if (!match) return true;
        const origin = join(packCatalogs, match[1], match[2]);
        let expected;
        try {
          expected = readFileSync(origin);
        } catch {
          throw new Error(`Language pack catalog has no source: ${file}`);
        }
        if (!expected.equals(readFileSync(join(root, file))))
          throw new Error(`Language pack catalog bytes differ: ${file}`);
        return false;
      });
    }
    if (JSON.stringify(found) !== JSON.stringify(files))
      throw new Error("Lesson review artifact inventory differs from source.");
    for (const file of files) {
      if (!readFileSync(join(source, file)).equals(readFileSync(join(root, file))))
        throw new Error(`Lesson review artifact bytes differ: ${file}`);
    }
  }
  return files.length;
}
