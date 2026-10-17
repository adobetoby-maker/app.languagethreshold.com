import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
const state = JSON.parse(
  readFileSync(
    join(homedir(), ".codex", "tmp", "language-threshold-qa", "roofing-20261015.json"),
    "utf8",
  ),
);
const keys = JSON.parse(
  execFileSync(
    "/opt/homebrew/bin/supabase",
    ["projects", "api-keys", "--project-ref", state.project, "--output", "json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 20000 },
  ),
);
const url = `https://${state.project}.supabase.co`;
const auth = createClient(
  url,
  keys.find((k) => k.type === "publishable" && !k.disabled)?.api_key ??
    keys.find((k) => k.name === "anon")?.api_key,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const signed = await auth.auth.signInWithPassword({ email: state.email, password: state.password });
if (signed.error || !signed.data.session) throw new Error("QA sign-in failed.");
const token = signed.data.session.access_token;
const base = "https://app.languagethreshold.com";
const request = async (path, authenticated = true) => {
  const r = await fetch(base + path, {
    headers: authenticated ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: r.status, cache: r.headers.get("cache-control"), body: await r.json() };
};
const own = await request(`/api/team?org=${state.organizationId}`);
assert.equal(own.status, 200);
assert.equal(own.body.role, "learner");
for (const key of [
  "members",
  "assignments",
  "activity",
  "activity7",
  "lessons",
  "attempts",
  "certificates",
]) {
  for (const row of own.body[key] ?? [])
    assert.equal(row.user_id, state.learnerId, `Learner received another user's ${key}`);
}
assert.equal(own.body.certificates.length, 0);
const db = createClient(url, keys.find((k) => k.name === "service_role")?.api_key, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const realOrg = await db
  .from("team_members")
  .select("organization_id")
  .eq("user_id", state.ownerId)
  .eq("role", "owner")
  .eq("status", "active")
  .neq("organization_id", state.organizationId)
  .limit(1)
  .single();
assert.ok(realOrg.data?.organization_id);
const other = await request(`/api/team?org=${realOrg.data.organization_id}`);
assert.equal(other.status, 403);
assert.equal(other.body.error, "Team access required.");
const anonymous = await request(`/api/team?org=${state.organizationId}`, false);
assert.equal(anonymous.status, 403);
assert.equal(own.cache, "no-store");
const result = {
  testedAt: new Date().toISOString(),
  target: base,
  scope:
    "Dedicated real Auth QA learner and isolated QA organization; no invitations or certificates",
  qaOrganization: state.organizationId,
  checks: {
    realLearnerSignIn: true,
    ownTeamStatus: own.status,
    ownRole: own.body.role,
    onlyOwnRecords: true,
    crossTeamStatus: other.status,
    anonymousStatus: anonymous.status,
    noStore: own.cache,
    noCertificates: true,
  },
  limits: [
    "UI practice and learner-to-admin activity synchronization are separate pending checks.",
  ],
};
writeFileSync(
  "docs/reviews/qa-team-access-2026-10-15.json",
  JSON.stringify(result, null, 2) + "\n",
);
await auth.auth.signOut({ scope: "local" });
console.log(JSON.stringify(result.checks));
