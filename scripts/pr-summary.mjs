import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";

const execFileAsync = promisify(execFile);
const { stdout: log } = await execFileAsync("git", ["log", "--oneline", "--", "projects"], { cwd: process.cwd() });
const lines = log.split("\n").filter(Boolean).slice(0, 20);
const body = [
  "## Project updates summary",
  "",
  ...lines.map((line) => `- ${line}`),
  "",
  "## Checks",
  "- [ ] validate",
  "- [ ] weekly report",
  "- [ ] alerts"
].join("\n");

await fs.mkdir("reports", { recursive: true });
await fs.writeFile("reports/pr-summary.md", body + "\n", "utf8");
console.log("Generated reports/pr-summary.md");
