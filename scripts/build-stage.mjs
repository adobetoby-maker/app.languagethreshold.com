/** Preview builds can never emit a production cleanup schedule. */
import { spawn } from "node:child_process";
const child = spawn("npm", ["run", "build"], {
  env: {
    ...process.env,
    LT_DEPLOYMENT_STAGE: "preview",
    LT_ASSESSMENT_CLEANUP_SCHEDULE: "disabled",
  },
  stdio: "inherit",
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 1));
