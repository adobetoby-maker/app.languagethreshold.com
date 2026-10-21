import { createFileRoute } from "@tanstack/react-router";
import { createClient, type User } from "@supabase/supabase-js";
import { hasActivePlan } from "@/lib/active-plan";
import { consumeServerRequestBudget } from "@/lib/speaking-security";

const KID_EMAIL_DOMAIN = "kids.languagethreshold.app";
// Per-parent budget for new kid accounts; bounds account creation by any one paying user.
const KID_CREATES_PER_HOUR = 5;

function kidEmail(username: string) {
  return `${username.toLowerCase().replace(/[^a-z0-9]/g, "")}@${KID_EMAIL_DOMAIN}`;
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
  });
}

function isKidAccount(user: User) {
  return (
    user.app_metadata?.is_kid === true ||
    user.user_metadata?.is_kid === true ||
    (user.email ?? "").toLowerCase().endsWith(`@${KID_EMAIL_DOMAIN}`)
  );
}

export const Route = createFileRoute("/api/family-add-kid")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!url || !key) return json({ error: "Server not configured." }, 500);

        // The parent is always the authenticated caller; any parentId in the body is ignored.
        const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
        if (!token) return json({ error: "Sign in to continue." }, 401);

        const admin = createClient(url, key, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: auth, error: authError } = await admin.auth.getUser(token);
        const parent = auth?.user;
        if (authError || !parent?.email)
          return json({ error: "Your session has expired. Sign in again." }, 401);
        if (isKidAccount(parent))
          return json({ error: "Kid accounts cannot add kid profiles." }, 403);

        let body: { username?: unknown; pin?: unknown };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return json({ error: "Missing fields." }, 400);
        }
        const username = typeof body?.username === "string" ? body.username.trim() : "";
        const pin = typeof body?.pin === "string" ? body.pin : "";
        if (!username || !pin) return json({ error: "Missing fields." }, 400);
        if (username.length < 2 || username.length > 24 || kidEmail(username).indexOf("@") < 2)
          return json({ error: "Username must be 2–24 letters or numbers." }, 400);
        if (!/^\d{4}$/.test(pin)) return json({ error: "PIN must be exactly 4 digits." }, 400);

        try {
          if (!(await hasActivePlan(admin, parent.id)))
            return json({ error: "Kid profiles need an active Family plan." }, 403);
        } catch {
          return json({ error: "Could not confirm your plan. Please try again." }, 503);
        }

        try {
          const allowed = await consumeServerRequestBudget(
            "user:family-add-kid",
            parent.id,
            KID_CREATES_PER_HOUR,
            3600,
          );
          if (!allowed) return json({ error: "Too many kid profiles added. Try again later." }, 429);
        } catch {
          return json({ error: "Could not add a kid profile right now. Please try again." }, 503);
        }

        const { data, error } = await admin.auth.admin.createUser({
          email: kidEmail(username),
          password: pin + pin,
          // app_metadata is service-role only; it is the trustworthy parent link.
          app_metadata: { is_kid: true, parent_id: parent.id },
          user_metadata: { display_name: username, is_kid: true, parent_id: parent.id },
          email_confirm: true,
        });

        if (error || !data?.user) {
          const taken = error?.message.includes("already been registered");
          return json(
            { error: taken ? "That username is already taken." : "Could not create kid profile." },
            400,
          );
        }

        return json({ id: data.user.id, username }, 200);
      },
    },
  },
});
