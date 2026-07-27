import { access, readFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const taskDir = "ai-rosetta/tasks/LT-20260726-usability-onboarding";
const required = [
  "AI_HANDOFF.md",
  "ai-rosetta/README.md",
  "ai-rosetta/PRD.md",
  "ai-rosetta/PREFLIGHT.md",
  "ai-rosetta/SECURITY_BASELINE.md",
  "ai-rosetta/PORTFOLIO.md",
  "ai-rosetta/projects/language-threshold.md",
  "ai-rosetta/agents/CLAUDE_STATUS.md",
  "ai-rosetta/agents/CODEX_STATUS.md",
  `${taskDir}/BRIEF.md`,
  `${taskDir}/REMOTE_STATE.md`,
  `${taskDir}/DUO-002_POSTMORTEM.md`,
  "ai-rosetta/templates/AGENT_RESULT_TEMPLATE.md",
  "ai-rosetta/templates/REMOTE_STATE_TEMPLATE.md",
  "ai-rosetta/templates/CROSS_REVIEW_TEMPLATE.md",
];

const errors = [];
const warnings = [];

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

const [
  handoff,
  readme,
  prd,
  project,
  brief,
  remote,
  postmortem,
  claude,
  codex,
  agents,
  claudeInstructions,
  resultTemplate,
  remoteTemplate,
  reviewTemplate,
] = await Promise.all([
  load("AI_HANDOFF.md"),
  load("ai-rosetta/README.md"),
  load("ai-rosetta/PRD.md"),
  load("ai-rosetta/projects/language-threshold.md"),
  load(`${taskDir}/BRIEF.md`),
  load(`${taskDir}/REMOTE_STATE.md`),
  load(`${taskDir}/DUO-002_POSTMORTEM.md`),
  load("ai-rosetta/agents/CLAUDE_STATUS.md"),
  load("ai-rosetta/agents/CODEX_STATUS.md"),
  load("AGENTS.md"),
  load("CLAUDE.md"),
  load("ai-rosetta/templates/AGENT_RESULT_TEMPLATE.md"),
  load("ai-rosetta/templates/REMOTE_STATE_TEMPLATE.md"),
  load("ai-rosetta/templates/CROSS_REVIEW_TEMPLATE.md"),
]);

if (!handoff.includes("adobetoby-maker/app.languagethreshold.com")) {
  errors.push("AI_HANDOFF.md must name the canonical repository.");
}
if (!handoff.includes("Coordination branch:")) {
  errors.push("AI_HANDOFF.md must name the current coordination branch.");
}
if (!project.includes("deployment_provider: vercel")) {
  errors.push("Project record must identify Vercel as deployment provider.");
}
if (!/^task_id: LT-\d{8}-[a-z0-9-]+$/m.test(brief)) {
  errors.push("Task brief must contain a valid immutable Rosetta task ID.");
}
if (!/^coordination_ref: [a-z0-9][a-z0-9/_-]+$/m.test(brief)) {
  errors.push("Task brief must contain a coordination_ref.");
}

for (const [name, content, field] of [
  ["project", project, "production_commit"],
  ["task brief", brief, "baseline_commit"],
  ["remote state", remote, "coordination_baseline"],
  ["remote state", remote, "production_commit"],
]) {
  const commit = content.match(new RegExp(`^${field}: ([a-f0-9]{40})$`, "m"))?.[1];
  if (!commit) errors.push(`${name} must contain exact ${field}.`);
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

const applicationHeads = [...remote.matchAll(/^application_head: ([a-f0-9]{40})$/gm)].map(
  (match) => match[1],
);
const previewCommits = [...remote.matchAll(/^preview_commit: ([a-f0-9]{40})$/gm)].map(
  (match) => match[1],
);
const documentationHeads = [
  ...remote.matchAll(/^documentation_head: ([a-f0-9]{40})$/gm),
].map((match) => match[1]);

if (applicationHeads.length !== 2 || previewCommits.length !== 2) {
  errors.push("REMOTE_STATE.md must record two application and preview commits.");
} else {
  applicationHeads.forEach((head, index) => {
    if (head !== previewCommits[index]) {
      errors.push(
        `Preview commit ${previewCommits[index]} does not match application head ${head}.`,
      );
    }
  });
}
if (documentationHeads.length !== 2) {
  errors.push("REMOTE_STATE.md must record both documentation heads.");
}
if ((remote.match(/^application_tree_verified_identical: true$/gm) ?? []).length !== 2) {
  errors.push(
    "REMOTE_STATE.md must prove application-tree identity for both later documentation heads.",
  );
}
if ((remote.match(/^result_status: independent-complete$/gm) ?? []).length !== 2) {
  errors.push("REMOTE_STATE.md must record two independent-complete results.");
}
if ((remote.match(/^preview_status: READY$/gm) ?? []).length !== 2) {
  errors.push("REMOTE_STATE.md must record two READY previews.");
}
if ((remote.match(/^deployment_record: https:\/\/vercel\.com\//gm) ?? []).length !== 2) {
  errors.push("REMOTE_STATE.md must link two Vercel deployment records.");
}

for (const phrase of [
  "application_head:",
  "documentation_head:",
  "preview_commit:",
  "runtime_certified:",
  "Server cleanup",
  "Secret hygiene",
]) {
  if (!resultTemplate.includes(phrase)) {
    errors.push(`Agent result template is missing: ${phrase}`);
  }
}
if (!remoteTemplate.includes("pr_is_draft:")) {
  errors.push("Remote-state template must record actual PR draft state.");
}
if (!reviewTemplate.includes("This file lands on the reviewer's branch.")) {
  errors.push("Cross-review template must define its landing branch.");
}
if (!postmortem.includes("## Observed facts") || !postmortem.includes("## Recommendations adopted")) {
  errors.push("DUO-002 postmortem must separate facts from recommendations.");
}

for (const [name, content] of [
  ["README", readme],
  ["PRD", prd],
]) {
  for (const phrase of [
    "coordination ref",
    "application head",
    "documentation head",
    "project-scoped",
  ]) {
    if (!content.toLowerCase().includes(phrase)) {
      errors.push(`${name} must explain ${phrase}.`);
    }
  }
}

for (const [name, content] of [
  ["AGENTS.md", agents],
  ["CLAUDE.md", claudeInstructions],
]) {
  if (!/draft PR/i.test(content)) {
    errors.push(`${name} must require a draft PR checkpoint.`);
  }
  if (!/never borrow/i.test(content)) {
    errors.push(`${name} must prohibit borrowing project credentials.`);
  }
  if (!/dev server/i.test(content)) {
    errors.push(`${name} must include local dev-server cleanup.`);
  }
}

const staleCloudflareInstruction =
  /(?:^|\n)\s*(?:[-*]\s*)?(?:(?:npx|pnpm dlx)\s+)?wrangler\s+(?:deploy|publish)\b/im.test(
    agents,
  ) ||
  /npm\s+run\s+deploy[^\n]*(?:cloudflare|wrangler)/i.test(agents) ||
  /(?:^|\n)\s*-\s*(?:deployed|deployment)\s+(?:to|via):?\s*cloudflare\b/im.test(
    agents,
  );
if (staleCloudflareInstruction) {
  errors.push(
    "AGENTS.md contains an instruction to deploy through Cloudflare; this app deploys to Vercel.",
  );
}
if (/production_approved: true/.test(brief) || /production_approved: true/.test(remote)) {
  errors.push("Production approval may not be inferred.");
}

async function walk(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", "dist", ".vercel"].includes(entry.name)) continue;
    const path = `${dir}/${entry.name}`.replace(/^\.\//, "");
    if (entry.isDirectory()) found.push(...(await walk(path)));
    else found.push(path);
  }
  return found;
}

let trackedFiles;
try {
  trackedFiles = execFileSync("git", ["ls-files", "-z"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  })
    .split("\0")
    .filter(Boolean);
} catch {
  trackedFiles = await walk(".");
}

const trackedEnv = trackedFiles.filter((path) =>
  /(^|\/)\.env(?:\.|$)/.test(path) && !/\.example$/.test(path),
);
const legacyTrackedEnv = new Set([
  ".env.sentry-build-plugin",
  ".env.vercel-local",
  ".env.vercel-prod",
  ".env.vercel-pulled",
]);
const newTrackedEnv = trackedEnv.filter((path) => !legacyTrackedEnv.has(path));
const observedLegacyEnv = trackedEnv.filter((path) => legacyTrackedEnv.has(path));
if (newTrackedEnv.length) {
  errors.push(`New tracked environment file(s) are prohibited: ${newTrackedEnv.join(", ")}`);
}
if (observedLegacyEnv.length) {
  warnings.push(
    `Known tracked environment debt remains: ${observedLegacyEnv.join(", ")}`,
  );
}

const secretPatterns = [
  ["Anthropic", /sk-ant-[A-Za-z0-9_-]{20,}/g],
  ["OpenAI", /sk-proj-[A-Za-z0-9_-]{20,}/g],
  ["Stripe", /sk_(?:live|test)_[A-Za-z0-9]{20,}/g],
  ["Supabase service JWT", /eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,}/g],
];
const legacySecretPaths = new Set([
  ".env.vercel-local",
  ".env.vercel-prod",
  ".env.vercel-pulled",
  ".github/workflows/deploy.yml",
]);
const observedLegacySecretPaths = new Set();

for (const path of trackedFiles) {
  let content;
  try {
    content = await readFile(path, "utf8");
  } catch {
    continue;
  }
  for (const [label, pattern] of secretPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) {
      if (legacySecretPaths.has(path)) {
        observedLegacySecretPaths.add(path);
      } else {
        errors.push(`${path} contains a ${label} secret-shaped value.`);
      }
    }
  }
}

if (observedLegacySecretPaths.size) {
  warnings.push(
    `Known secret-shaped path debt remains: ${[...observedLegacySecretPaths].join(", ")}`,
  );
}

if (errors.length) {
  console.error("AI Rosetta check failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("AI Rosetta check passed.");
console.log("Validated coordination, completion, preview alignment, and secret hygiene.");
for (const warning of warnings) console.warn(`Warning: ${warning}`);
