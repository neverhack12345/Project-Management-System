import fs from "node:fs/promises";
import path from "node:path";
import { loadAllProjects } from "../src/markdown-store.js";

function arg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx === -1 ? fallback : process.argv[idx + 1] || fallback;
}

const staleDays = Number(arg("staleDays", "14"));
const dueInDays = Number(arg("dueInDays", "7"));
const blockedDays = Number(arg("blockedDays", "3"));
const now = new Date();
const dueCutoff = new Date(now.getTime() + dueInDays * 24 * 60 * 60 * 1000);

const projects = await loadAllProjects();
const alerts = [];

for (const project of projects) {
  const last = new Date(project.lastUpdated || project.modifiedAt);
  const staleFor = Math.floor((now.getTime() - last.getTime()) / (24 * 60 * 60 * 1000));
  if (staleFor > staleDays) alerts.push({ type: "stale", slug: project.slug, days: staleFor });

  if (project.dueDate) {
    const due = new Date(project.dueDate);
    if (due < now && project.status !== "done") alerts.push({ type: "overdue", slug: project.slug, dueDate: project.dueDate });
    if (due >= now && due <= dueCutoff) alerts.push({ type: "dueSoon", slug: project.slug, dueDate: project.dueDate });
  }

  if (project.status === "blocked" && staleFor >= blockedDays) {
    alerts.push({ type: "blockedTooLong", slug: project.slug, days: staleFor, reason: project.blockedReason || "" });
  }
}

const reportsDir = path.join(process.cwd(), "reports");
await fs.mkdir(reportsDir, { recursive: true });
await fs.writeFile(path.join(reportsDir, "alerts-latest.json"), JSON.stringify(alerts, null, 2), "utf8");
console.log(`Generated ${alerts.length} alert(s).`);
