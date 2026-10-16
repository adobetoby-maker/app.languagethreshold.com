/** Dedicated synthetic learner with no team membership; credentials never leave the private QA file. */
import { readFileSync, writeFileSync, chmodSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
const path = join(homedir(), ".codex/tmp/language-threshold-qa/roofing-20261015.json");
const qa = JSON.parse(readFileSync(path, "utf8"));
if (qa.project !== "pollhlkgltdkdskdzsgd" || qa.run !== "roofing-20261015")
  throw new Error("QA scope mismatch.");
qa.personalId ??= randomUUID();
qa.personalEmail ??= `qa-independent-${randomBytes(6).toString("hex")}@example.invalid`;
qa.personalPassword ??= `Qa!${randomBytes(30).toString("base64url")}9`;
writeFileSync(path, JSON.stringify(qa, null, 2) + "\n", { mode: 0o600 });
chmodSync(path, 0o600);
const keys = JSON.parse(
  execFileSync(
    "/opt/homebrew/bin/supabase",
    ["projects", "api-keys", "--project-ref", qa.project, "--output", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  ),
);
const db = createClient(
  `https://${qa.project}.supabase.co`,
  keys.find((key) => key.name === "service_role")?.api_key,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const existing = await db.auth.admin.getUserById(qa.personalId);
if (
  existing.data?.user &&
  (existing.data.user.email !== qa.personalEmail ||
    existing.data.user.app_metadata?.qa_run !== qa.run)
)
  throw new Error("QA learner identity mismatch.");
if (!existing.data?.user) {
  const result = await db.auth.admin.createUser({
    id: qa.personalId,
    email: qa.personalEmail,
    password: qa.personalPassword,
    email_confirm: true,
    user_metadata: { display_name: "QA independent learner", qa_run: qa.run },
    app_metadata: { qa_run: qa.run },
  });
  if (result.error) throw new Error("QA independent account creation failed.");
}
const { data: members, error } = await db
  .from("team_members")
  .select("id")
  .eq("user_id", qa.personalId);
if (error || members.length) throw new Error("Independent QA learner must have no team.");
console.log(
  JSON.stringify({
    ready: true,
    independentLearnerId: qa.personalId,
    teamMemberships: 0,
    invitationsSent: 0,
  }),
);
