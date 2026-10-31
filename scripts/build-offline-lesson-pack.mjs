import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Static allowlist: no server output, private routes, source maps or account data. */
export function offlineAssetInventory(staticRoot, libraryShards = null) {
  const assets = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error("Offline assets cannot be symbolic links.");
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile() && /\.(?:js|mjs|css|woff2?|png|svg|jpg|webp|ico)$/.test(entry.name)) {
        // A lesson download needs its language's core + selected trade, not the
        // entire multilingual library. Keep the existing 512-asset safety bound.
        const shard = entry.name.match(/^([a-f0-9]{16})-.*\.js$/)?.[1];
        if (libraryShards && shard && !libraryShards.has(shard)) continue;
        const bytes = readFileSync(file);
        const url = "/" + path.relative(staticRoot, file).split(path.sep).join("/");
        assets.push({ url, bytes: bytes.length, sha256: digest(bytes) });
      }
    }
  }
  visit(path.join(staticRoot, "assets"));
  assets.sort((a, b) => a.url.localeCompare(b.url, "en"));
  if (
    !assets.length ||
    assets.length > 512 ||
    assets.reduce((sum, a) => sum + a.bytes, 0) > 64 * 1024 * 1024
  )
    throw new Error("Offline application asset inventory exceeds its bounded size.");
  return assets;
}

export async function buildOfflineLessonPack(staticRoot, packId = "roofing-es-en") {
  const compiled = await build({
    entryPoints: ["src/lib/lesson-offline-pack.ts"],
    bundle: true,
    format: "esm",
    platform: "node",
    write: false,
    logLevel: "silent",
  });
  const { publicLessonOfflinePack } = await import(
    "data:text/javascript;base64," +
      Buffer.from(compiled.outputFiles[0].contents).toString("base64")
  );
  const pack = publicLessonOfflinePack(packId);
  const content = JSON.stringify(pack);
  const hash = digest(content);
  const filename = `${packId}-${hash}.json`;
  const libraryManifest = JSON.parse(readFileSync("src/data/library-pack-manifest.json", "utf8"));
  const libraryShards = new Set([
    ...(libraryManifest[`${pack.targetLanguage}/core`] ?? []),
    ...(libraryManifest[`${pack.targetLanguage}/${pack.moduleId}`] ?? []),
  ]);
  const assets = offlineAssetInventory(staticRoot, libraryShards);
  const appVersion = digest(JSON.stringify(assets));
  const manifest = {
    schema: 1,
    packId,
    version: digest(`${hash}:${appVersion}`),
    appVersion,
    content: { url: `/lesson-packs/${filename}`, bytes: Buffer.byteLength(content), sha256: hash },
    assets,
    shell: "/",
    totalBytes: Buffer.byteLength(content) + assets.reduce((sum, asset) => sum + asset.bytes, 0),
    installationStatus: "not-installed",
  };
  const directory = path.join(staticRoot, "lesson-packs");
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, filename), content);
  writeFileSync(path.join(directory, `${packId}.json`), JSON.stringify(manifest));
  console.log(
    `✓ ${packId} draft pack: 30 lessons, ${assets.length} hashed app assets, ${manifest.totalBytes} bytes; installation is separate`,
  );
  return manifest;
}
