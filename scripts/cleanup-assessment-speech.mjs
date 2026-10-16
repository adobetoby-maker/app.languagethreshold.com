/** Owner/operator command. Dry-run by default. No policy activation, key files or learner output. */
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { cleanupAssessmentSpeech } from "../src/lib/assessments/speech-cleanup.ts";
const allowed = new Set(["--execute", "--help"]);
if (process.argv.slice(2).some((arg) => !allowed.has(arg)))
  throw new Error("Use --help or --execute; no project override is accepted.");
if (process.argv.includes("--help")) {
  console.log(
    "npm run assessment:speech-cleanup [-- --execute]\nDefault: read-only policy/queue summary. --execute: at most 10 batches of 25, approved enabled policies only. Nonzero exit means failure or remaining backlog; inspect and run again. No policy is enabled by this command.",
  );
  process.exit(0);
}
const project = "pollhlkgltdkdskdzsgd";
try {
  const keys = JSON.parse(
    execFileSync(
      "/opt/homebrew/bin/supabase",
      ["projects", "api-keys", "--project-ref", project, "--output", "json"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 20000 },
    ),
  );
  const service = keys.find((key) => key.name === "service_role" && !key.disabled)?.api_key;
  if (!service) throw new Error("Project operator access unavailable.");
  const deadline = AbortSignal.timeout(10 * 60 * 1000);
  const db = createClient(`https://${project}.supabase.co`, service, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: AbortSignal.any([
            deadline,
            AbortSignal.timeout(20000),
            ...(init?.signal ? [init.signal] : []),
          ]),
        }),
    },
  });
  const pending = await db
    .from("assessment_speech_evidence")
    .select("id", { count: "exact", head: true })
    .neq("state", "deleted");
  if (pending.error) throw new Error("Queue status unavailable.");
  const preview = await cleanupAssessmentSpeech(db);
  const report = {
    runAt: new Date().toISOString(),
    project,
    mode: process.argv.includes("--execute") ? "execute" : "dry_run",
    enabledPolicies: preview.enabledPolicies,
    trackedPending: pending.count,
    batches: 0,
    selected: 0,
    deleted: 0,
    failed: 0,
    mayHaveMore: false,
  };
  if (report.mode === "execute") {
    for (let i = 0; i < 10; i++) {
      const batch = await cleanupAssessmentSpeech(db, true);
      if (batch.dryRun) throw new Error("Unexpected cleanup mode.");
      report.batches++;
      report.selected += batch.selected;
      report.deleted += batch.deleted;
      report.failed += batch.failed;
      report.mayHaveMore = batch.mayHaveMore;
      if (batch.failed || !batch.mayHaveMore) break;
    }
  }
  console.log(JSON.stringify(report));
  if (report.failed || report.mayHaveMore) process.exitCode = 1;
} catch {
  console.error(
    "Speech cleanup could not finish. No policy was enabled. Check operator access, private storage and the cleanup queue; retry after resolving the failure.",
  );
  process.exitCode = 1;
}
