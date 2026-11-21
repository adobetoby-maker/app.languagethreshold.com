#!/usr/bin/env node
// Built by TAC — 2026-11-21
// import_pack for the PWA (language-pack model section 16): copies the app-ready packs written by
// the core60-languages pipeline into this app. Run it again after the pipeline re-assembles a pack;
// adding a language is "run this script", with no hand-edited code.
//
//   node scripts/import-language-packs.mjs [--from <out/bundle dir>] [--code <code> ...]
//
// Writes, for every pack in <from>/packs.json (or only the --code ones):
//   src/data/language-packs/<code>.json          the runtime pack (catalog "pack" object)
//   src/data/language-packs/packs.json           the pack index (out/packs.json), filtered to bundled packs
//   src/data/language-packs/bundled.ts           generated static imports of every bundled pack
//   content/language-packs/<code>/catalog.json   the catalog v2 header (no lessons) + module list
//   content/language-packs/<code>/<module>.json  one catalog v2 module per file (lazy-loaded)
// content/language-packs is NOT public: scripts/vite-language-pack-catalogs.mjs serves and emits
// a pack's catalog only when the build may show that pack (draft packs: QA builds only).
//
// Fail closed: a catalog whose languageCode differs from its pack, whose embedded pack differs from
// pack.json, or whose module lessons do not match lessonCount is refused, and nothing is written.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const from = path.resolve(
  option("--from") ?? process.env.CORE60_BUNDLE_DIR ?? "../core60-languages/out/bundle",
);
const onlyCodes = args.flatMap((a, i) => (a === "--code" ? [args[i + 1]] : []));

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const fail = (message) => {
  console.error(`import-language-packs: ${message}`);
  process.exit(1);
};

if (!existsSync(path.join(from, "packs.json"))) fail(`no packs.json in ${from} (use --from)`);
const index = readJson(path.join(from, "packs.json"));
const selected = index.filter((entry) => onlyCodes.length === 0 || onlyCodes.includes(entry.code));
if (selected.length === 0) fail("no pack selected");

const packDir = path.join(repoRoot, "src/data/language-packs");
const catalogRoot = path.join(repoRoot, "content/language-packs");
const stable = (value) => JSON.stringify(value);
const planned = [];

for (const entry of selected) {
  const code = entry.code;
  if (!/^[a-z]{2,3}(-[A-Za-z]{2,8})?$/.test(code)) fail(`bad pack code "${code}"`);
  const pack = readJson(path.join(from, code, "pack.json"));
  const catalog = readJson(path.join(from, entry.catalog));
  if (pack.schemaVersion !== 1) fail(`${code}: pack schemaVersion ${pack.schemaVersion} is not 1`);
  if (pack.code !== code) fail(`${code}: pack.json declares "${pack.code}"`);
  if (catalog.version !== 2) fail(`${code}: catalog version ${catalog.version} is not 2`);
  if (catalog.languageCode !== code) fail(`${code}: catalog declares languageCode "${catalog.languageCode}"`);
  if (catalog.packVersion !== entry.packVersion) fail(`${code}: catalog packVersion differs from packs.json`);
  if (stable(catalog.pack) !== stable(pack)) fail(`${code}: catalog's embedded pack differs from pack.json`);
  if (pack.status.availability !== entry.availability) fail(`${code}: availability differs between pack and index`);
  const modules = [];
  for (const module of catalog.modules) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(module.id)) fail(`${code}: bad module id "${module.id}"`);
    if (!Array.isArray(module.lessons) || module.lessons.length !== module.lessonCount)
      fail(`${code}/${module.id}: ${module.lessons?.length} lessons, lessonCount ${module.lessonCount}`);
    modules.push(module);
  }
  planned.push({ entry, pack, catalog, modules });
}

mkdirSync(packDir, { recursive: true });
const keptIndex = existsSync(path.join(packDir, "packs.json"))
  ? readJson(path.join(packDir, "packs.json")).filter((e) => !planned.some((p) => p.entry.code === e.code))
  : [];
for (const { entry, pack, catalog, modules } of planned) {
  const code = entry.code;
  writeFileSync(path.join(packDir, `${code}.json`), `${JSON.stringify(pack, null, 1)}\n`);
  const dir = path.join(catalogRoot, code);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const header = {
    version: catalog.version,
    language: catalog.language,
    nativeLanguage: catalog.nativeLanguage,
    languageCode: catalog.languageCode,
    nativeCode: catalog.nativeCode,
    packVersion: catalog.packVersion,
    modules: modules.map(({ lessons, ...rest }) => ({
      ...rest,
      sha256: createHash("sha256").update(JSON.stringify(lessons)).digest("hex").slice(0, 16),
    })),
  };
  writeFileSync(path.join(dir, "catalog.json"), `${JSON.stringify(header)}\n`);
  for (const module of modules) {
    // Every module file carries its pair and pack version, so it can be checked on its own.
    const file = {
      version: catalog.version,
      languageCode: catalog.languageCode,
      nativeCode: catalog.nativeCode,
      packVersion: catalog.packVersion,
      module,
    };
    writeFileSync(path.join(dir, `${module.id}.json`), `${JSON.stringify(file)}\n`);
  }
  keptIndex.push(entry);
  console.log(`${code}: pack + ${modules.length} modules (${entry.availability})`);
}

keptIndex.sort((a, b) => a.code.localeCompare(b.code));
writeFileSync(path.join(packDir, "packs.json"), `${JSON.stringify(keptIndex, null, 1)}\n`);

const ident = (code) => `pack_${code.replace(/-/g, "_")}`;
writeFileSync(
  path.join(packDir, "bundled.ts"),
  [
    "// GENERATED by scripts/import-language-packs.mjs — do not edit by hand.",
    "// Every runtime language pack this app bundles. Read through ./index.ts, never directly.",
    ...keptIndex.map(
      (e) => `import ${ident(e.code)} from "./${e.code}.json" with { type: "json" };`,
    ),
    "",
    `export const BUNDLED_PACKS: readonly unknown[] = [${keptIndex.map((e) => ident(e.code)).join(", ")}];`,
    "",
  ].join("\n"),
);
console.log(`index: ${keptIndex.map((e) => `${e.code} (${e.availability})`).join(", ")}`);

// The catalog dictionaries (dictionary-index.json) are derived from the module files just written.
const { buildCatalogDictionaries } = await import("./build-catalog-dictionaries.mjs");
for (const line of buildCatalogDictionaries()) console.log(`dictionary ${line}`);
