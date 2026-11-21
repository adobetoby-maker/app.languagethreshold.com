import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
// @ts-expect-error -- plain ESM build helper without type declarations
import { languagePackCatalogs } from "./scripts/vite-language-pack-catalogs.mjs";

export default defineConfig(({ command }) => {
  let commit = process.env.VERCEL_GIT_COMMIT_SHA;
  if (!commit || !/^[a-f0-9]{40}$/i.test(commit)) {
    try {
      commit = execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {
      commit = undefined;
    }
  }
  const stage = process.env.LT_DEPLOYMENT_STAGE ?? process.env.VERCEL_ENV;
  const environment =
    command === "serve"
      ? "development"
      : stage === "preview"
        ? "preview"
        : stage === "production" ||
            (process.env.GITHUB_EVENT_NAME === "push" &&
              process.env.GITHUB_REF === "refs/heads/main")
          ? "production"
          : "build";
  return {
    // Language-pack catalog modules (draft packs only when VITE_LT_QA=1).
    plugins: [languagePackCatalogs()],
    // Worktrees may share an installed dependency cache through a symlink.
    ...(command === "serve"
      ? { server: { fs: { allow: [process.cwd(), realpathSync("node_modules")] } } }
      : {}),
    define: {
      __LT_APP_BUILD__: JSON.stringify({
        commit: commit && /^[a-f0-9]{40}$/i.test(commit) ? commit : null,
        builtAt: new Date().toISOString(),
        environment,
      }),
    },
  };
});
