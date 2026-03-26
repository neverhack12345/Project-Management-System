import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";

const execFileAsync = promisify(execFile);
const { stdout: log } = await execFileAsync("git", ["log", "--oneline", "--", "projects"], { cwd: process.cwd() });
const lines = log.split("\n").filter(Boolean).slice(0, 20);
let impactSummary = "- No impact report found.";
try {
  const impactRaw = await fs.readFile(path.join(process.cwd(), "reports", "impact-latest.json"), "utf8");
  const impacts = JSON.parse(impactRaw);
  if (Array.isArray(impacts) && impacts.length) {
    impactSummary = impacts
      .slice(0, 8)
      .map((i) => `- ${i.severity?.toUpperCase() || "INFO"} ${i.category || i.impact}: ${i.file}`)
      .join("\n");
  }
} catch {}

const body = [
  "## Project updates summary",
  "",
  ...lines.map((line) => `- ${line}`),
  "",
  "## Impact highlights",
  impactSummary,
  "",
  "## Checks",
  "- [ ] validate",
  "- [ ] weekly report",
  "- [ ] alerts"
].join("\n");

await fs.mkdir("reports", { recursive: true });
await fs.writeFile("reports/pr-summary.md", body + "\n", "utf8");
console.log("Generated reports/pr-summary.md");
