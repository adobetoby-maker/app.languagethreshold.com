/** Explicit localhost-only fixture. No real owner session, email, billing or hosted mutation. */
import { build } from "esbuild";
import { createServer } from "node:http";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
const root = process.cwd(),
  source = resolve("tests/fixtures/owner-dashboard"),
  out = resolve("node_modules/.cache/owner-dashboard-ui");
mkdirSync(out, { recursive: true });
await build({
  entryPoints: [join(source, "main.tsx")],
  outfile: join(out, "bundle.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  jsx: "automatic",
  plugins: [
    {
      name: "fictional-owner-only",
      setup(b) {
        b.onResolve({ filter: /^@\/state\/auth-state$/ }, () => ({
          path: join(source, "auth.ts"),
        }));
        b.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({
          path: join(source, "client.ts"),
        }));
      },
    },
  ],
});
if (process.argv.includes("--build-only")) process.exit(0);
const cssDir = resolve(".vercel/output/static/assets"),
  css =
    readdirSync(cssDir).find((n) => /^styles-.*\.css$/.test(n)) ??
    readdirSync(cssDir).find((n) => n.endsWith(".css"));
const now = new Date().toISOString();
const users = [
  {
    id: "10000000-0000-4000-8000-000000000002",
    email: "synthetic-learner@example.invalid",
    displayName: "Synthetic Learner",
    createdAt: now,
    lastSignInAt: now,
    confirmed: true,
    bannedUntil: null,
    subscriptionStatus: "none",
    activeSeconds30d: 125,
    activeDays30d: 2,
    lastPracticeAt: now,
    freeUntil: null,
    freeActive: false,
  },
];
let discounts = [];
let customerMessages = [],
  referral = null;
const server = createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const url = new URL(req.url, "http://localhost");
  const json = (v) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(v));
  };
  if (url.pathname === "/api/owner-customers") {
    if (req.method === "GET")
      return json({
        ready: process.argv.includes("--email-ready"),
        unsubscribed: false,
        referral,
        referralCount: 0,
        messages: customerMessages,
      });
    let raw = "";
    for await (const part of req) raw += part;
    const body = JSON.parse(raw);
    if (body.action === "send") {
      if (body.recipient !== users[0].email || body.permissionConfirmed !== true) {
        res.statusCode = 400;
        return json({ error: "Reviewed recipient missing or changed" });
      }
      const message = customerMessages.find((m) => m.id === body.id);
      if (!message || message.status !== "draft") {
        res.statusCode = 409;
        return json({ error: "Already attempted" });
      }
      message.status = "accepted";
      return json({ notice: "Synthetic provider accepted. No real email sent." });
    }
    if (body.action === "draft")
      customerMessages.unshift({
        id: body.id,
        subject: body.subject,
        body: body.body,
        status: "draft",
        created_at: new Date().toISOString(),
      });
    if (body.action === "referral")
      referral = { code: "20000000-0000-4000-8000-000000000001", active: true };
    if (body.action === "disable_referral") referral.active = false;
    return json({
      notice:
        body.action === "draft"
          ? "Draft saved. No email sent."
          : "Referral tracking updated. Automatic rewards are off.",
    });
  }
  if (url.pathname === "/api/owner-users") {
    if (req.method === "GET") {
      if (url.searchParams.has("userId"))
        return json({
          usage: [
            {
              module_id: "core",
              activity: "see",
              active_seconds: 125,
              active_days: 2,
              last_practice_at: now,
            },
          ],
          memberships: [],
          grant: null,
        });
      const search = (url.searchParams.get("search") ?? "").toLowerCase();
      const matches = users.filter((u) =>
        (u.email + " " + u.displayName).toLowerCase().includes(search),
      );
      return json({
        users: matches,
        total: matches.length,
        page: 0,
        pageSize: 50,
        emailReady: false,
      });
    }
    let text = "";
    for await (const b of req) text += b;
    const body = JSON.parse(text);
    if (body.action === "add_tester") {
      const user = {
        ...users[0],
        id: randomUUID(),
        email: body.email,
        displayName: body.name,
        confirmed: false,
        lastSignInAt: null,
        lastPracticeAt: null,
        activeSeconds30d: 0,
        activeDays30d: 0,
        freeUntil: body.until,
        freeActive: true,
      };
      users.push(user);
      return json({
        userId: user.id,
        notice: "Synthetic tester created with free access. No real account was created.",
      });
    }
    if (body.action === "free_access") {
      const u = users.find((u) => u.id === body.userId);
      u.freeUntil = body.until;
      u.freeActive = true;
      return json({ notice: "Synthetic free access saved." });
    }
    return json({
      notice: "Fictional private link generated; no email sent.",
      link: "https://example.invalid/fictional-password-link",
    });
  }
  if (url.pathname === "/api/owner-discounts") {
    if (req.method === "GET")
      return json({ ready: true, discounts, hasMore: false, nextCursor: null });
    let text = "";
    for await (const b of req) text += b;
    const body = JSON.parse(text);
    if (body.action === "disable")
      discounts = discounts.map((d) => (d.id === body.promotionId ? { ...d, active: false } : d));
    else
      discounts.push({
        id: "promo_fixture" + discounts.length,
        code: body.code,
        active: true,
        percentOff: body.kind === "percent" ? body.value : null,
        amountOff: body.kind === "usd" ? body.value : null,
        duration: body.duration,
        expiresAt: Date.parse(body.expiresAt) / 1000,
        maxRedemptions: body.maxRedemptions,
        timesRedeemed: 0,
      });
    return json({ notice: "Synthetic discount saved; no Stripe write." });
  }
  if (url.pathname === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    return res.end(readFileSync(join(out, "bundle.js")));
  }
  if (url.pathname === "/styles.css") {
    res.setHeader("Content-Type", "text/css");
    return res.end(readFileSync(join(cssDir, css)));
  }
  if (url.pathname === "/") {
    res.setHeader("Content-Type", "text/html");
    return res.end(
      '<!doctype html><html lang="en" class="dark"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Local synthetic owner dashboard QA</title><link rel="stylesheet" href="/styles.css"><body class="bg-background text-foreground"><div id="root"></div><script type="module" src="/bundle.js"></script></body></html>',
    );
  }
  res.statusCode = 404;
  res.end();
});
server.listen(4338, "127.0.0.1", () =>
  console.log("Local synthetic owner dashboard: http://127.0.0.1:4338; no hosted writes."),
);
