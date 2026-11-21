// Built by TAC — 2026-11-21
// Serves (dev) and emits (build) the catalog module files of every bundled language pack this build
// may show, at /lesson-content/<code>/catalog/<module>.json. Source: content/language-packs/<code>/
// (written by scripts/import-language-packs.mjs). A pack whose status.availability is "draft" is
// included only when VITE_LT_QA=1, so a normal build carries no draft lesson file at any URL.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const ROUTE = /^\/lesson-content\/([a-z]{2,3}(?:-[A-Za-z]{2,8})?)\/catalog\/([a-z0-9][a-z0-9-]*\.json)$/;

function visibleCodes(root, qa) {
  const index = path.join(root, "src/data/language-packs/packs.json");
  if (!existsSync(index)) return new Set();
  const entries = JSON.parse(readFileSync(index, "utf8"));
  return new Set(
    entries
      .filter(
        (entry) =>
          entry.availability === "native" ||
          entry.availability === "online" ||
          (qa && entry.availability === "draft"),
      )
      .map((entry) => entry.code),
  );
}

export function languagePackCatalogs({ root = process.cwd(), qa = process.env.VITE_LT_QA === "1" } = {}) {
  const contentRoot = path.join(root, "content/language-packs");
  const codes = visibleCodes(root, qa);
  const fileFor = (code, name) => {
    if (!codes.has(code)) return null;
    const file = path.join(contentRoot, code, name);
    return file.startsWith(path.join(contentRoot, code) + path.sep) && existsSync(file) ? file : null;
  };
  return {
    name: "lt-language-pack-catalogs",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const match = ROUTE.exec((req.url ?? "").split("?")[0]);
        const file = match ? fileFor(match[1], match[2]) : null;
        if (!file) return next();
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
        res.end(readFileSync(file));
      });
    },
    generateBundle() {
      // Client assets only: the server bundle never serves lesson files.
      if (this.environment && this.environment.name !== "client") return;
      for (const code of codes) {
        const dir = path.join(contentRoot, code);
        if (!existsSync(dir)) continue;
        for (const name of readdirSync(dir)) {
          if (!name.endsWith(".json")) continue;
          this.emitFile({
            type: "asset",
            fileName: `lesson-content/${code}/catalog/${name}`,
            source: readFileSync(path.join(dir, name)),
          });
        }
      }
    },
  };
}
