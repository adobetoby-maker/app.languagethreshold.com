import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import { loadModule } from "./helpers/bundle.mjs";
test("request departure during status persistence prevents starting a password email", async () => {
  const dir = mkdtempSync(resolve("node_modules/.cache/owner-mail-cancel-"));
  const keys = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY", "TEAM_FROM_EMAIL"];
  const old = keys.map((k) => process.env[k]);
  const oldFetch = globalThis.fetch;
  try {
    writeFileSync(
      join(dir, "entry.ts"),
      `export {manageOwnerUser} from ${JSON.stringify(resolve("src/lib/owner-users-server.ts"))};export {teamAdminClient} from ${JSON.stringify(resolve("src/lib/team-server.ts"))};`,
    );
    const m = await loadModule(relative(process.cwd(), join(dir, "entry.ts")));
    process.env.SUPABASE_URL = "https://fixture.invalid";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-service-key";
    process.env.RESEND_API_KEY = "synthetic-email-key";
    process.env.TEAM_FROM_EMAIL = "qa@example.invalid";
    const c = new AbortController(),
      uid = "10000000-0000-4000-8000-000000000002";
    let sends = 0,
      linkCreated = false;
    globalThis.fetch = async () => {
      sends++;
      return Response.json({ id: "fixture-email" });
    };
    const db = m.teamAdminClient(
      async (input, init) => {
        const path = new URL(String(input)).pathname;
        if (path === "/rest/v1/rpc/platform_claim_password_invite") return Response.json(true);
        if (path === `/auth/v1/admin/users/${uid}`)
          return Response.json({
            id: uid,
            email: "qa@example.invalid",
            email_confirmed_at: "2026-01-01T00:00:00Z",
          });
        if (path === "/auth/v1/admin/generate_link") {
          linkCreated = true;
          return Response.json({
            id: uid,
            email: "qa@example.invalid",
            action_link:
              "https://fixture.invalid/auth/v1/verify?token=fixture&redirect_to=" +
              encodeURIComponent("https://app.languagethreshold.com/account/password"),
          });
        }
        if (path === "/rest/v1/platform_owner_operations") {
          c.abort();
          return new Response(null, { status: 204 });
        }
        throw Error("Unexpected fixture request " + path);
      },
      new Request("https://app.invalid/api/owner-users", { signal: c.signal }),
    );
    await assert.rejects(
      m.manageOwnerUser(db, "10000000-0000-4000-8000-000000000001", {
        action: "password_invite",
        userId: uid,
        delivery: "email",
        requestId: "10000000-0000-4000-8000-000000000003",
      }),
      (e) => e.status === 499,
    );
    assert.equal(linkCreated, true);
    assert.equal(sends, 0);
  } finally {
    globalThis.fetch = oldFetch;
    keys.forEach((k, i) =>
      old[i] === undefined ? delete process.env[k] : (process.env[k] = old[i]),
    );
    rmSync(dir, { recursive: true, force: true });
  }
});
