import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outRoot = path.join(repoRoot, "node_modules", ".cache", "lle-tests");

/**
 * Compiles a source module (including `.tsx`) to a plain ESM file that
 * `node --test` can import directly.
 *
 * The reducer and request schema worth testing live in files that also carry
 * JSX and pull in browser/SDK-only modules. Node can strip types but not JSX,
 * so those modules are unimportable as-is — which is why the shipped
 * MERGE_REMOTE reducer and the Tutor request schema had no direct coverage.
 * Bundling with esbuild and stubbing the unrelated imports closes that gap
 * without splitting production files apart for the sake of the harness.
 *
 * Output lands inside the repo so bare imports (`react`, `zod`) still resolve.
 */
export async function loadModule(entry, { stubs = [] } = {}) {
  mkdirSync(outRoot, { recursive: true });

  const stubPath = path.join(outRoot, "stub.js");
  writeFileSync(
    stubPath,
    [
      "const noop = () => {};",
      "export const supabase = {};",
      "export const toast = Object.assign(noop, { success: noop, error: noop, info: noop });",
      "export const initSentry = noop;",
      "export const Sentry = { captureException: noop };",
      "export const createFileRoute = () => () => ({});",
      "export default noop;",
    ].join("\n"),
  );

  const outfile = path.join(outRoot, `${path.basename(entry).replace(/\W/g, "_")}.mjs`);

  await build({
    entryPoints: [path.join(repoRoot, entry)],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node22",
    logLevel: "silent",
    external: ["react", "react-dom", "zod"],
    plugins: [
      {
        name: "stub-unrelated-imports",
        setup(pluginBuild) {
          pluginBuild.onResolve({ filter: /.*/ }, (args) =>
            stubs.some((pattern) => pattern.test(args.path)) ? { path: stubPath } : null,
          );
        },
      },
    ],
  });

  return import(`${outfile}?t=${Date.now()}`);
}
