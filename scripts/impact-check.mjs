import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const since = process.argv.includes("--since") ? process.argv[process.argv.indexOf("--since") + 1] : "HEAD~5";
let stdout = "";
try {
  ({ stdout } = await execFileAsync("git", ["diff", "--name-only", `${since}..HEAD`, "--", "projects"], {
    cwd: process.cwd()
  }));
} catch {
  ({ stdout } = await execFileAsync("git", ["diff", "--name-only", "HEAD", "--", "projects"], {
    cwd: process.cwd()
  }));
}

const changed = stdout.split("\n").filter(Boolean);
const impact = [];
for (const file of changed) {
  if (file.endsWith("/spec.md")) impact.push({ file, impact: "specChanged-reviewMilestonesAndTasks" });
  else if (file.endsWith("/milestones.md")) impact.push({ file, impact: "timelineAndDependencyImpact" });
  else if (file.endsWith("/README.md")) impact.push({ file, impact: "statusOrMetadataImpact" });
}

await fs.mkdir("reports", { recursive: true });
await fs.writeFile("reports/impact-latest.json", JSON.stringify(impact, null, 2), "utf8");
console.log(`Impact entries: ${impact.length}`);
