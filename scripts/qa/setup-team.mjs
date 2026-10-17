/** Owner-authorized QA only. Keys remain in memory; generated QA credentials stay outside Git. */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const project = "pollhlkgltdkdskdzsgd";
const ownerEmail = process.env.LT_QA_OWNER_EMAIL?.trim().toLowerCase();
if (!ownerEmail) throw new Error("Set LT_QA_OWNER_EMAIL to the authorized QA workspace owner.");
const folder = join(homedir(), ".codex", "tmp", "language-threshold-qa");
mkdirSync(folder, { recursive: true, mode: 0o700 });
const path = join(folder, "roofing-20261015.json");
const state = existsSync(path)
  ? JSON.parse(readFileSync(path, "utf8"))
  : {
      run: "roofing-20261015",
      project,
      organizationId: randomUUID(),
      learnerId: randomUUID(),
      email: `qa-roofing-${randomBytes(6).toString("hex")}@example.invalid`,
      password: `Qa!${randomBytes(30).toString("base64url")}9`,
    };
if (state.project !== project || state.run !== "roofing-20261015")
  throw new Error("QA scope mismatch.");
state.adminId ??= randomUUID();
state.adminEmail ??= `qa-admin-${randomBytes(6).toString("hex")}@example.invalid`;
state.adminPassword ??= `Qa!${randomBytes(30).toString("base64url")}9`;
writeFileSync(path, JSON.stringify(state, null, 2) + "\n", { mode: 0o600 });
chmodSync(path, 0o600);
const keys = JSON.parse(
  execFileSync(
    "/opt/homebrew/bin/supabase",
    ["projects", "api-keys", "--project-ref", project, "--output", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 20000 },
  ),
);
const service = keys.find((k) => k.name === "service_role")?.api_key;
if (!service) throw new Error("Project administration is not available.");
const db = createClient(`https://${project}.supabase.co`, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const users = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (users.error) throw new Error("Could not verify the workspace owner.");
const owner = users.data.users.find((u) => u.email?.toLowerCase() === ownerEmail);
if (!owner) throw new Error("Expected workspace owner not found; no existing memberships changed.");
const existing = await db.auth.admin.getUserById(state.learnerId);
if (
  existing.data?.user &&
  (existing.data.user.email !== state.email ||
    existing.data.user.app_metadata?.qa_run !== state.run)
) {
  throw new Error("QA account identity does not match; stopped before changing memberships.");
}
if (!existing.data?.user) {
  const created = await db.auth.admin.createUser({
    id: state.learnerId,
    email: state.email,
    password: state.password,
    email_confirm: true,
    user_metadata: { display_name: "QA Roofing learner", qa_run: state.run },
    app_metadata: { qa_run: state.run },
  });
  if (created.error)
    throw new Error(`QA account creation failed (${created.error.status ?? "unknown status"}).`);
}
const existingAdmin = await db.auth.admin.getUserById(state.adminId);
if (
  existingAdmin.data?.user &&
  (existingAdmin.data.user.email !== state.adminEmail ||
    existingAdmin.data.user.app_metadata?.qa_run !== state.run)
)
  throw new Error("QA admin identity mismatch.");
if (!existingAdmin.data?.user) {
  const created = await db.auth.admin.createUser({
    id: state.adminId,
    email: state.adminEmail,
    password: state.adminPassword,
    email_confirm: true,
    user_metadata: { display_name: "QA team admin", qa_run: state.run },
    app_metadata: { qa_run: state.run },
  });
  if (created.error)
    throw new Error(`QA admin creation failed (${created.error.status ?? "unknown status"}).`);
}
const checked = async (result, label) => {
  if (result.error)
    throw new Error(`QA ${label} failed (${result.error.code ?? "unknown status"}).`);
};
await checked(
  await db.from("team_organizations").upsert({
    id: state.organizationId,
    name: "QA ONLY — Roofing trial 2026-10-15",
    owner_user_id: owner.id,
    billing_email: "qa-admin@example.invalid",
    onboarding_step: 6,
  }),
  "workspace",
);
await checked(
  await db.from("team_entitlements").upsert({
    organization_id: state.organizationId,
    seat_limit: 5,
    status: "manual",
    period_end: new Date(Date.now() + 86400000).toISOString(),
  }),
  "test entitlement",
);
await checked(
  await db.from("team_members").upsert(
    [
      {
        organization_id: state.organizationId,
        user_id: owner.id,
        display_name: "QA workspace owner",
        role: "owner",
        status: "active",
      },
      {
        organization_id: state.organizationId,
        user_id: state.adminId,
        display_name: "QA team admin",
        role: "admin",
        status: "active",
      },
      {
        organization_id: state.organizationId,
        user_id: state.learnerId,
        display_name: "QA Roofing learner",
        role: "learner",
        status: "active",
      },
    ],
    { onConflict: "organization_id,user_id" },
  ),
  "memberships",
);
await checked(
  await db.from("team_assignments").upsert(
    {
      organization_id: state.organizationId,
      user_id: state.learnerId,
      module_id: "roofing",
      require_certificate: false,
    },
    { onConflict: "organization_id,user_id,module_id" },
  ),
  "assignment",
);
await checked(
  await db.from("platform_audit_events").insert({
    actor_user_id: null,
    organization_id: state.organizationId,
    action: "qa.workspace.prepared",
    detail: {
      run: state.run,
      initiatedBy: "Codex; owner-authorized app verification",
      noInvitations: true,
      noCertificate: true,
    },
  }),
  "audit",
);
state.ownerId = owner.id;
state.createdAt ??= new Date().toISOString();
writeFileSync(path, JSON.stringify(state, null, 2) + "\n", { mode: 0o600 });
console.log(
  JSON.stringify({
    ready: true,
    organizationId: state.organizationId,
    learnerId: state.learnerId,
    credentialsFile: path,
    invitationsSent: 0,
    certificateRequired: false,
  }),
);
