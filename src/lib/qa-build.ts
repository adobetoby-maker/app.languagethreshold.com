// Built by TAC — 2026-11-21
// The PWA's QA build flag (language-pack model section 14): draft language packs (status.availability
// "draft") appear only in a QA build. Build or serve with VITE_LT_QA=1 to get one:
//   VITE_LT_QA=1 npm run dev -- --host 0.0.0.0 --port 8791
// Vite replaces import.meta.env.VITE_LT_QA at build time, so a normal build carries no draft pack
// code path that a learner could switch on. Under plain Node (tests, scripts) LT_QA=1 sets it.

export function isQaBuild(): boolean {
  // Under Vite (client and server bundles) only the build-time flag counts, so nothing set at
  // run time (a global, a server env var) can switch draft packs on in a normal build.
  let env: ImportMetaEnv | undefined;
  try {
    env = import.meta.env;
  } catch {
    env = undefined;
  }
  if (env) return env.VITE_LT_QA === "1";
  // Plain Node (tests, scripts): no bundler.
  const nodeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env;
  return nodeEnv?.LT_QA === "1";
}
