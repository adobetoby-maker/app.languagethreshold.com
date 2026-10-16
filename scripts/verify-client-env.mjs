/** A deployable browser bundle must contain public Supabase configuration. Never print keys. */
import { loadEnv } from "vite";
import { pathToFileURL } from "node:url";
export function verifyClientEnvironment(env) {
  if (env.VITE_SUPABASE_URL !== "https://pollhlkgltdkdskdzsgd.supabase.co") {
    throw new Error(
      "Build blocked: VITE_SUPABASE_URL must identify the Language Threshold app database.",
    );
  }
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
  if (key.startsWith("sb_publishable_") && key.length > 30) return;
  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8"));
    if (payload.role === "anon" && payload.ref === "pollhlkgltdkdskdzsgd") return;
  } catch {
    /* Missing or invalid public key. */
  }
  throw new Error(
    "Build blocked: configure the app's PUBLIC Supabase key. A server secret cannot be included in the browser bundle.",
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyClientEnvironment(loadEnv("production", process.cwd(), "VITE_"));
  console.log("✓ browser database configuration verified (public key only)");
}
