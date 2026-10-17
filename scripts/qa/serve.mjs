/** Local QA server. Project keys remain in process memory; billing and email are disabled. */
import { execFileSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { homedir } from "node:os";
import { join } from "node:path";
const project = "pollhlkgltdkdskdzsgd";
const keys = JSON.parse(
  execFileSync(
    "/opt/homebrew/bin/supabase",
    ["projects", "api-keys", "--project-ref", project, "--output", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 20000 },
  ),
);
const service = keys.find((k) => k.name === "service_role" && !k.disabled)?.api_key;
const publishable =
  keys.find((k) => k.type === "publishable" && !k.disabled)?.api_key ??
  keys.find((k) => k.name === "anon" && !k.disabled)?.api_key;
if (!service || !publishable) throw new Error("QA server project access unavailable.");
const env = {
  ...process.env,
  SUPABASE_URL: `https://${project}.supabase.co`,
  VITE_SUPABASE_URL: `https://${project}.supabase.co`,
  VITE_SUPABASE_PUBLISHABLE_KEY: publishable,
  SUPABASE_SERVICE_ROLE_KEY: service,
  TEAM_ENROLLMENT_ENABLED: "false",
  RESEND_API_KEY: "",
  TEAM_FROM_EMAIL: "",
  STRIPE_SECRET_KEY: "",
  STRIPE_WEBHOOK_SECRET: "",
};
const aiFileIndex = process.argv.indexOf("--ai-env-file");
if (aiFileIndex >= 0) {
  const configured = parseEnv(readFileSync(process.argv[aiFileIndex + 1], "utf8"));
  if (configured.ANTHROPIC_API_KEY) env.ANTHROPIC_API_KEY = configured.ANTHROPIC_API_KEY;
}
try {
  const qa = JSON.parse(
    readFileSync(join(homedir(), ".codex/tmp/language-threshold-qa/roofing-20261015.json"), "utf8"),
  );
  if (qa.project === project && qa.run === "roofing-20261015")
    env.LT_EXAMS_PILOT_USER_IDS = [qa.learnerId, qa.adminId, qa.personalId]
      .filter(Boolean)
      .join(",");
} catch {
  /* A normal dev server does not enable assessment pilots. */
}
const child = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "dev", "--port", "4311", "--host", "127.0.0.1", "--strictPort"],
  { env, stdio: "inherit" },
);
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
