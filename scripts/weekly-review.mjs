import fs from "node:fs/promises";
import path from "node:path";
import { loadAllProjects } from "../src/markdown-store.js";
import { computeHealth } from "../src/indexer.js";

const projects = await loadAllProjects();
const now = new Date();
const reportDate = now.toISOString().slice(0, 10);
const dueSoonCutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

const lines = [];
lines.push(`# Weekly Review - ${reportDate}`);
lines.push("");
lines.push("## Snapshot");
lines.push(`- Total projects: ${projects.length}`);
lines.push(`- Active: ${projects.filter((p) => p.status === "active").length}`);
lines.push(`- Blocked: ${projects.filter((p) => p.status === "blocked").length}`);
lines.push("");
lines.push("## Due in next 7 days");

const dueSoon = projects.filter((project) => {
  if (!project.dueDate) return false;
  const due = new Date(project.dueDate);
  return due >= now && due <= dueSoonCutoff;
});
if (!dueSoon.length) {
  lines.push("- None");
} else {
  for (const project of dueSoon) {
    lines.push(`- ${project.slug} (${project.status}) due ${project.dueDate}`);
  }
}

lines.push("");
lines.push("## Blocked projects");
const blocked = projects.filter((p) => p.status === "blocked");
if (!blocked.length) {
  lines.push("- None");
} else {
  for (const project of blocked) {
    lines.push(`- ${project.slug}: next action -> ${project.nextAction || "n/a"}`);
  }
}

lines.push("");
lines.push("## Overdue projects");
const overdue = projects.filter((p) => p.dueDate && new Date(p.dueDate) < now && p.status !== "done");
if (!overdue.length) lines.push("- None");
for (const project of overdue) lines.push(`- ${project.slug} overdue since ${project.dueDate}`);

lines.push("");
lines.push("## Top risk projects");
const topRisk = projects
  .map((project) => ({ project, score: computeHealth(project) }))
  .sort((a, b) => a.score - b.score)
  .slice(0, 5);
for (const row of topRisk) {
  lines.push(`- ${row.project.slug}: health=${row.score}, status=${row.project.status}, next=${row.project.nextAction || "n/a"}`);
}

lines.push("");
lines.push("## Next actions");
for (const project of projects) {
  lines.push(`- ${project.slug}: ${project.nextAction || "set nextAction in README frontmatter"}`);
}

const reportDir = path.join(process.cwd(), "reports");
await fs.mkdir(reportDir, { recursive: true });
const outPath = path.join(reportDir, `weekly-review-${reportDate}.md`);
await fs.writeFile(outPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Weekly review written to ${outPath}`);
