/** Explicit local build helper: obtains only the existing public project key in memory. */
import { execFileSync, spawn } from "node:child_process";
import { verifyClientEnvironment } from "./verify-client-env.mjs";
const [command, ...args] = process.argv.slice(2);
if (!command) throw new Error("Pass the build or deployment command to run.");
execFileSync(process.execPath, ["scripts/verify-deploy-target.mjs"], { stdio: "inherit" });
const keys = JSON.parse(
  execFileSync(
    "/opt/homebrew/bin/supabase",
    ["projects", "api-keys", "--project-ref", "pollhlkgltdkdskdzsgd", "--output", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ),
);
const key =
  keys.find((entry) => entry.type === "publishable" && !entry.disabled)?.api_key ??
  keys.find((entry) => entry.name === "anon" && !entry.disabled)?.api_key;
const publicEnv = {
  VITE_SUPABASE_URL: "https://pollhlkgltdkdskdzsgd.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: key,
};
verifyClientEnvironment(publicEnv);
const child = spawn(command, args, { env: { ...process.env, ...publicEnv }, stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 1));
