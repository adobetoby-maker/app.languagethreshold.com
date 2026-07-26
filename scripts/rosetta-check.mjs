import { readFile, access } from "node:fs/promises";

const required = [
  "AI_HANDOFF.md",
  "ai-rosetta/README.md",
  "ai-rosetta/PRD.md",
  "ai-rosetta/PREFLIGHT.md",
  "ai-rosetta/PORTFOLIO.md",
  "ai-rosetta/projects/language-threshold.md",
  "ai-rosetta/agents/CLAUDE_STATUS.md",
  "ai-rosetta/agents/CODEX_STATUS.md",
  "ai-rosetta/tasks/LT-20260726-usability-onboarding/BRIEF.md",
];

const errors = [];

for (const path of required) {
  try {
    await access(path);
  } catch {
    errors.push(`Missing required Rosetta file: ${path}`);
  }
}

async function load(path) {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
}

const handoff = await load("AI_HANDOFF.md");
const project = await load("ai-rosetta/projects/language-threshold.md");
const brief = await load(
  "ai-rosetta/tasks/LT-20260726-usability-onboarding/BRIEF.md",
);
const claude = await load("ai-rosetta/agents/CLAUDE_STATUS.md");
const codex = await load("ai-rosetta/agents/CODEX_STATUS.md");
const agents = await load("AGENTS.md");

if (!handoff.includes("adobetoby-maker/app.languagethreshold.com")) {
  errors.push("AI_HANDOFF.md must name the canonical repository.");
}

if (!project.includes("deployment_provider: vercel")) {
  errors.push("Project record must identify Vercel as deployment provider.");
}

if (!/^task_id: LT-\d{8}-[a-z0-9-]+$/m.test(brief)) {
  errors.push("Task brief must contain a valid immutable Rosetta task ID.");
}

for (const [name, content] of [
  ["project", project],
  ["task brief", brief],
]) {
  const commit = content.match(
    /^(?:production_commit|baseline_commit): ([a-f0-9]+)$/m,
  )?.[1];
  if (!commit || commit.length !== 40) {
    errors.push(`${name} must contain an exact 40-character commit.`);
  }
}

const allowed = new Set([
  "idle",
  "investigating",
  "planning",
  "implementing",
  "verifying",
  "independent-complete",
  "cross-reviewing",
  "blocked",
  "awaiting-toby",
  "done",
]);

for (const [name, content] of [
  ["Claude", claude],
  ["Codex", codex],
]) {
  const status = content.match(/^status: (.+)$/m)?.[1];
  if (!allowed.has(status)) {
    errors.push(`${name} status is missing or invalid: ${status ?? "none"}`);
  }
}

const claudeBranch = claude.match(/^branch: (.*)$/m)?.[1];
const codexBranch = codex.match(/^branch: (.*)$/m)?.[1];
if (claudeBranch && codexBranch && claudeBranch === codexBranch) {
  errors.push("Claude and Codex may not claim the same working branch.");
}

if (/deployed to cloudflare workers|npm run deploy.*cloudflare/i.test(agents)) {
  errors.push(
    "AGENTS.md contains stale Cloudflare production guidance; this app deploys to Vercel.",
  );
}

if (/production_approved: true/.test(brief)) {
  errors.push("Production approval may not be inferred in the bootstrap task.");
}

if (errors.length) {
  console.error("AI Rosetta check failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("AI Rosetta check passed.");

