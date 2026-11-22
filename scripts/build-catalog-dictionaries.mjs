// Built by TAC — 2026-11-21
// Writes content/language-packs/<code>/dictionary-index.json for every imported catalog: the
// catalog's own lesson terms (no sentences), one entry per distinct target/native pair, with the
// pack code and pack version the PWA checks before showing it (src/components/dictionary/
// use-catalog-dictionary.ts). Run by scripts/import-language-packs.mjs after it splits a catalog;
// safe to rerun on its own:  node scripts/build-catalog-dictionaries.mjs
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentRoot = path.join(root, "content/language-packs");
const SENTENCE = /[.?!…]["»”)]?\s*$/u;

export function buildCatalogDictionaries() {
  if (!existsSync(contentRoot)) return [];
  const written = [];
  for (const code of readdirSync(contentRoot)) {
    const dir = path.join(contentRoot, code);
    const headerFile = path.join(dir, "catalog.json");
    const packFile = path.join(root, "src/data/language-packs", `${code}.json`);
    if (!existsSync(headerFile) || !existsSync(packFile)) continue;
    // A pack whose ids predate packs reads its own authored dictionary, not its catalog.
    if (JSON.parse(readFileSync(packFile, "utf8")).ids?.legacyUnscopedStorage) continue;
    // A language whose app file names a bundled dataset shows that dataset instead.
    const appFile = path.join(root, "src/data/language-packs/app", `${code}.json`);
    if (existsSync(appFile) && JSON.parse(readFileSync(appFile, "utf8")).app?.dictionary) continue;
    const seen = new Map();
    let meta = null;
    for (const name of readdirSync(dir).sort()) {
      if (!name.endsWith(".json") || name === "catalog.json" || name === "dictionary-index.json")
        continue;
      const file = JSON.parse(readFileSync(path.join(dir, name), "utf8"));
      if (!file?.module?.lessons) continue;
      meta ??= { languageCode: file.languageCode, nativeCode: file.nativeCode, packVersion: file.packVersion };
      for (const lesson of file.module.lessons)
        for (const item of lesson.items ?? []) {
          const target = String(item.target ?? "").trim();
          const native = String(item.native ?? "").trim();
          if (!target || !native || SENTENCE.test(target)) continue;
          const key = `${target.toLocaleLowerCase(code)}|${native.toLocaleLowerCase("en")}`;
          if (!seen.has(key))
            seen.set(key, {
              id: item.id,
              target,
              native,
              ...(item.note ? { note: item.note } : {}),
              moduleId: file.module.id,
            });
        }
    }
    if (!meta) continue;
    const out = { version: 1, ...meta, entries: [...seen.values()] };
    writeFileSync(path.join(dir, "dictionary-index.json"), `${JSON.stringify(out)}\n`);
    written.push(`${code}: ${out.entries.length} entries`);
  }
  return written;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  for (const line of buildCatalogDictionaries()) console.log(line);
