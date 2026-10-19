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

/** Review source and learner CDN content must be the same bytes in the deployable artifact. */
export function verifyLessonReviewContent(source, packaged, staticRoot) {
  const files = jsonFiles(source);
  if (!files.includes("index.json")) throw new Error("Lesson review source index is missing.");
  for (const root of [packaged, staticRoot]) {
    if (JSON.stringify(jsonFiles(root)) !== JSON.stringify(files))
      throw new Error("Lesson review artifact inventory differs from source.");
    for (const file of files) {
      if (!readFileSync(join(source, file)).equals(readFileSync(join(root, file))))
        throw new Error(`Lesson review artifact bytes differ: ${file}`);
    }
  }
  return files.length;
}
