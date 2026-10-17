import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const project = "prj_at1LY9ncmWfGUecndikWrEUccuqo";
const companion = "https://exams.languagethreshold.com";

export function validateCompanionStage(alias, deployment) {
  assert.equal(alias.alias, "exams.languagethreshold.com");
  assert.equal(alias.projectId, project);
  assert.equal(alias.deploymentId, deployment.id);
  assert.equal(deployment.projectId, project);
  assert.equal(deployment.target, null, "Companion QA requires a Preview, never production");
  assert.equal(deployment.readyState, "READY");
}

export function assertQaStage(base) {
  if (base !== companion) {
    assert.match(base ?? "", /^https:\/\/language-threshold-[a-z0-9]+-adobetoby-5572s-projects\.vercel\.app$/);
    return;
  }
  const get = path => JSON.parse(execFileSync("npx", ["--yes", "vercel@53.1.0", "api", path,
    "--scope", "adobetoby-5572s-projects", "--raw"], {
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  }));
  const alias = get("/v4/aliases/exams.languagethreshold.com");
  assert.match(alias.deploymentId ?? "", /^dpl_[a-zA-Z0-9]+$/);
  validateCompanionStage(alias, get(`/v13/deployments/${alias.deploymentId}`));
}
