import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolveSafePlaybookActions } from "../src/playbook-resolver.js";
import { processIncomingEvents } from "../src/intake-automation.js";

const execFileAsync = promisify(execFile);

function arg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx === -1 ? fallback : process.argv[idx + 1] || fallback;
}

async function runScript(scriptName, args = []) {
  const { stdout, stderr } = await execFileAsync("node", [`scripts/${scriptName}`, ...args], { cwd: process.cwd() });
  if (stdout.trim()) process.stdout.write(`${stdout}\n`);
  if (stderr.trim()) process.stderr.write(`${stderr}\n`);
}

const dryRun = process.argv.includes("--dryRun");
const maxActions = Number(arg("maxActions", "999"));
const maxEvents = Number(arg("maxEvents", "25"));

await runScript("validate.mjs");
const intake = await processIncomingEvents({ dryRun, maxEvents });
console.log(JSON.stringify({ stage: "incoming-event-resolution", ...intake }, null, 2));
await runScript("alerts.mjs");

const resolution = await resolveSafePlaybookActions({ dryRun, maxActions });
console.log(JSON.stringify({ stage: "safe-playbook-resolution", ...resolution }, null, 2));

await runScript("alerts.mjs");
await runScript("weekly-review.mjs");

console.log(`triage-resolve complete (dryRun=${dryRun}, maxEvents=${maxEvents}, maxActions=${maxActions})`);
