import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const mode = process.argv.includes("--mode") ? process.argv[process.argv.indexOf("--mode") + 1] : "daily";

const tasksByMode = {
  daily: ["validate.mjs", "alerts.mjs", "weekly-review.mjs", "snapshot.mjs"],
  weekly: ["migrate-schema.mjs", "validate.mjs", "impact-check.mjs", "pr-summary.mjs", "alerts.mjs", "weekly-review.mjs", "snapshot.mjs"]
};

const tasks = tasksByMode[mode] || tasksByMode.daily;
for (const task of tasks) {
  const { stdout, stderr } = await execFileAsync("node", [`scripts/${task}`], { cwd: process.cwd() });
  if (stdout.trim()) process.stdout.write(`${stdout}\n`);
  if (stderr.trim()) process.stderr.write(`${stderr}\n`);
}

console.log(`run-ops complete (mode=${mode})`);
