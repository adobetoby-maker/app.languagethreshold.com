// Built by TAC — 2026-10-20
// The shared way the offline generators call the logged-in Claude Code CLI (`claude -p`) on the
// owner's subscription. Used by scripts/build-core60.mts and scripts/build-lesson-content.mts.
// Node only (child_process); never imported by the app bundle.

import { spawn } from "node:child_process";

/**
 * The child's environment: the given one, minus every ANTHROPIC_* variable (an API key, auth
 * token or base URL would make the CLI bill the API instead of the subscription) and every
 * Claude Code session variable (CLAUDECODE, CLAUDE_CODE_*, ...) inherited from a parent session.
 */
export function cliEnv(source: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(source)) {
    if (/^(ANTHROPIC_|CLAUDE_CODE_|CLAUDE_AGENT_SDK_|CLAUDE_PREVIEW_)|^(CLAUDECODE|CLAUDE_PID|CLAUDE_EFFORT)$/.test(key)) continue;
    env[key] = value;
  }
  return env;
}

export interface CliRun {
  stdout: string;
  stderr: string;
  code: number | null;
  timedOut: boolean;
}

export interface CliRunOptions {
  /** The CLI binary (path or name on PATH). */
  bin: string;
  args: string[];
  /** The prompt, written to stdin. */
  input: string;
  /** Working directory: an empty temp directory, so no project context is picked up. */
  cwd: string;
  timeoutMs: number;
  /** The environment to scrub and pass on (default: this process's). */
  env?: NodeJS.ProcessEnv;
}

/** Runs the CLI once with a scrubbed environment; resolves (never rejects) with what it printed. */
export function runClaudeCli(options: CliRunOptions): Promise<CliRun> {
  return new Promise((resolveRun) => {
    const child = spawn(options.bin, options.args, {
      cwd: options.cwd,
      env: cliEnv(options.env),
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 10_000).unref();
    }, options.timeoutMs);
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", (error) => {
      clearTimeout(timer);
      resolveRun({ stdout, stderr: `${stderr}\n${error.message}`, code: null, timedOut });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolveRun({ stdout, stderr, code, timedOut });
    });
    // Intended change (not an incidental one): without this handler, a child that exits before
    // reading its prompt makes the stdin write fail with EPIPE as an unhandled "error" event and
    // crashes the whole run.
    child.stdin.on("error", () => {
      // the child exited before reading its prompt; "close" reports the outcome
    });
    child.stdin.end(options.input);
  });
}
