// Built by TAC — 2026-10-23
/// <reference types="node" />
/**
 * Shared helpers for the exams v2 authoring scripts. Nothing here prints item content: banks are
 * read, validated and summarised as ids, codes and counts only.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { BankIssue, BankValidation } from "../src/lib/exams2/bank.ts";
import { getCurriculum } from "../src/data/curriculum.ts";
import { lessonSourceHash } from "../src/lib/exams2/source-hash.ts";

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The shared parent folder of this repository's agent worktrees on the owner's machine. */
export const WORKTREES_PARENT = "/Users/drive/lt-worktrees";

/**
 * Symlink-resolved path with the on-disk spelling (realpathSync.native). For a path that does
 * not exist yet, the nearest existing ancestor is resolved and the rest appended.
 */
const real = (path: string): string => {
  const absolute = resolve(path);
  try {
    return realpathSync.native(absolute);
  } catch {
    const parent = dirname(absolute);
    return parent === absolute ? absolute : join(real(parent), basename(absolute));
  }
};
const gitOutput = (args: string[]) =>
  execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });

/**
 * Directories a private bank must never live in: this checkout, every git worktree of this
 * repository (`git worktree list --porcelain`), the main checkout, and WORKTREES_PARENT.
 * Both the literal and the symlink-resolved form of each root are returned.
 */
export function protectedRoots(): string[] {
  const roots = new Set<string>([REPO_ROOT, WORKTREES_PARENT]);
  try {
    for (const line of gitOutput(["worktree", "list", "--porcelain"]).split("\n"))
      if (line.startsWith("worktree ")) roots.add(line.slice("worktree ".length).trim());
  } catch {
    // Not a git checkout (e.g. a packaged copy): the fixed roots still apply.
  }
  try {
    const common = gitOutput(["rev-parse", "--path-format=absolute", "--git-common-dir"]).trim();
    if (common) roots.add(dirname(common));
  } catch {
    // As above.
  }
  return [...new Set([...roots].filter(Boolean).flatMap((root) => [resolve(root), real(root)]))];
}

/**
 * True when `path`, literally or after resolving symlinks, is inside a protected root.
 * Compared case-insensitively: the macOS default file system is case-insensitive, so
 * /users/drive/LT-WORKTREES/... is the same folder as /Users/drive/lt-worktrees/....
 */
export function isProtectedPath(path: string, roots = protectedRoots()): boolean {
  const fold = (value: string) => value.normalize("NFC").toLowerCase().replace(/\/+$/, "");
  const candidates = [resolve(path), real(path)].map(fold);
  const folded = roots.flatMap((root) => [fold(resolve(root)), fold(real(root))]);
  return candidates.some((candidate) =>
    folded.some((root) => candidate === root || candidate.startsWith(root + "/")),
  );
}

export class UsageError extends Error {}

/** Resolve and read a private bank file. Refuses relative paths and paths inside the repository. */
export function readPrivateBank(path: string | undefined): { file: string; bank: unknown } {
  if (!path || !isAbsolute(path))
    throw new UsageError("Pass the absolute path of a private bank file outside this repository.");
  let file: string;
  try {
    file = realpathSync(path);
  } catch {
    throw new UsageError("The bank file does not exist.");
  }
  if (isProtectedPath(path))
    throw new UsageError(
      "Private banks must stay outside the repository and its worktrees; move the file and retry.",
    );
  let bank: unknown;
  try {
    bank = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    throw new UsageError("The bank file is not valid JSON.");
  }
  return { file, bank };
}

/** One issue as a content-free line: rule, code and the ids/numbers the validator attached. */
export function formatIssue(issue: BankIssue): string {
  const parts = [`rule ${issue.rule}`, issue.code];
  if (issue.itemId) parts.push(`item ${issue.itemId}`);
  if (issue.index !== undefined) parts.push(`index ${issue.index}`);
  if (issue.form) parts.push(`form ${issue.form}`);
  if (issue.lesson !== undefined) parts.push(`lesson ${issue.lesson}`);
  if (issue.count !== undefined) parts.push(`count ${issue.count}`);
  return parts.join("  ");
}

export function summary(result: BankValidation): string[] {
  const c = result.counts;
  return [
    `items ${c.items} (mc ${c.byType.mc}, typed ${c.byType.typed}, match ${c.byType.match})`,
    `lessons ${c.lessons}; forms A ${c.forms.A}, B ${c.forms.B}, C ${c.forms.C}; diagnostic pool ${c.diagnosticPool}; reviews ${c.reviews}`,
    `errors ${result.errors.length}; warnings ${result.warnings.length}`,
  ];
}

/** Current repo fingerprints of a module's Core 30 lessons, keyed by lesson number. */
export function currentSourceHashes(moduleId: string): Record<number, string> | null {
  const curriculum = getCurriculum(moduleId);
  if (!curriculum) return null;
  return Object.fromEntries(
    curriculum.lessons.map((lesson) => [lesson.n, lessonSourceHash(lesson)]),
  );
}

/** Run a CLI body: usage errors print one line and exit 2; other errors print no details. */
export async function runCli(body: () => Promise<number> | number) {
  try {
    process.exitCode = await body();
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(error.message);
      process.exitCode = 2;
    } else {
      console.error("Unexpected failure; no bank content was printed.");
      process.exitCode = 1;
    }
  }
}
