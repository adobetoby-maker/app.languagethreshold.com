import { execFileSync } from "node:child_process";
import { existsSync, statSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

// Preserve the existing public sitemap scope. Blog URLs come from the live CMS.
const routes = ["/", "/pricing", "/team", "/support", "/vs/clinicalingo", "/vs/duolingo", "/blog"];
const routeDir = "src/routes";
function dependencies(file, seen = new Set()) {
  if (seen.has(file)) return seen;
  seen.add(file);
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(/(?:from\s*|import\s*\(|import\s*)["']([^"']+)["']/g)) {
    const spec = match[1];
    if (!spec.startsWith(".") && !spec.startsWith("@/")) continue;
    const base = spec.startsWith("@/")
      ? `src/${spec.slice(2)}`
      : path.join(path.dirname(file), spec);
    const resolved = [
      base,
      ...[".ts", ".tsx", ".json", ".css", "/index.ts", "/index.tsx"].map((ext) => base + ext),
    ].find(
      (candidate) =>
        existsSync(candidate) && statSync(candidate).isFile() && !candidate.endsWith(".server.ts"),
    );
    if (resolved) dependencies(resolved, seen);
  }
  return seen;
}
let fullHistory = false;
try {
  fullHistory =
    execFileSync("git", ["rev-parse", "--is-shallow-repository"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim() === "false";
} catch {}
const cacheFile = "scripts/seo/page-dates.json";
const cache = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, "utf8")) : {};
const pages = routes.map((urlPath) => {
  const file =
    urlPath === "/"
      ? `${routeDir}/index.tsx`
      : urlPath === "/blog"
        ? `${routeDir}/blog.index.tsx`
        : `${routeDir}/${urlPath.slice(1).replaceAll("/", ".")}.tsx`;
  // A page changes when its rendered source, local imports, or shared shell changes.
  const files = new Set([...dependencies(file), ...dependencies(`${routeDir}/__root.tsx`)]);
  const sha256 = createHash("sha256")
    .update(
      [...files]
        .sort()
        .map((file) => file + "\0" + readFileSync(file, "utf8"))
        .join("\0"),
    )
    .digest("hex");
  const lastmod = fullHistory
    ? execFileSync("git", ["log", "-1", "--format=%cI", "--", ...files], {
        encoding: "utf8",
      }).trim()
    : cache[urlPath]?.sha256 === sha256
      ? cache[urlPath].lastmod
      : undefined;
  if (!lastmod || !Number.isFinite(Date.parse(lastmod)))
    throw new Error(`No source date for ${urlPath}`);
  cache[urlPath] = { sha256, lastmod };
  return { path: urlPath, lastmod };
});
writeFileSync("src/lib/sitemap-pages.generated.json", JSON.stringify(pages, null, 2) + "\n");
console.log(`Generated source modification dates for ${pages.length} public pages.`);

writeFileSync(cacheFile, JSON.stringify(cache, null, 2) + "\n");
