import assert from "node:assert/strict";
import test from "node:test";
import { verifyClientEnvironment } from "../scripts/verify-client-env.mjs";
const url = "https://pollhlkgltdkdskdzsgd.supabase.co";
const jwt = (role) =>
  `test.${Buffer.from(JSON.stringify({ role, ref: "pollhlkgltdkdskdzsgd" })).toString("base64url")}.test`;
test("browser build rejects empty configuration and server secrets", () => {
  assert.throws(() => verifyClientEnvironment({}));
  assert.throws(() =>
    verifyClientEnvironment({
      VITE_SUPABASE_URL: url,
      VITE_SUPABASE_PUBLISHABLE_KEY: jwt("service_role"),
    }),
  );
  assert.throws(() =>
    verifyClientEnvironment({
      VITE_SUPABASE_URL: "https://another.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: jwt("anon"),
    }),
  );
  assert.doesNotThrow(() =>
    verifyClientEnvironment({ VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: jwt("anon") }),
  );
});
