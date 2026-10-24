import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { execFileSync } from "node:child_process";

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
    define: {
      __LT_APP_BUILD__: JSON.stringify({
        commit: commit && /^[a-f0-9]{40}$/i.test(commit) ? commit : null,
        builtAt: new Date().toISOString(),
        environment,
      }),
    },
  };
});
