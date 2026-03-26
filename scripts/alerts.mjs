import fs from "node:fs/promises";
import path from "node:path";
import { loadAllProjects } from "../src/markdown-store.js";
import { buildDependencyInsights } from "../src/indexer.js";

function arg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx === -1 ? fallback : process.argv[idx + 1] || fallback;
}

const staleDays = Number(arg("staleDays", "14"));
const preStaleEarlyDays = Number(arg("preStaleEarlyDays", "7"));
const preStaleLateDays = Number(arg("preStaleLateDays", "12"));
const dueInDays = Number(arg("dueInDays", "7"));
const blockedDays = Number(arg("blockedDays", "3"));
const now = new Date();
const dueCutoff = new Date(now.getTime() + dueInDays * 24 * 60 * 60 * 1000);

const projects = await loadAllProjects();
const alerts = [];
const dependencyInsights = buildDependencyInsights(projects);

for (const project of projects) {
  const last = new Date(project.lastUpdated || project.modifiedAt);
  const staleFor = Math.floor((now.getTime() - last.getTime()) / (24 * 60 * 60 * 1000));
  if (staleFor > staleDays) alerts.push({ type: "stale", slug: project.slug, days: staleFor });
  if (staleFor >= preStaleEarlyDays && staleFor < preStaleLateDays) {
    alerts.push({ type: "preStaleEarly", slug: project.slug, days: staleFor, threshold: staleDays });
  }
  if (staleFor >= preStaleLateDays && staleFor < staleDays) {
    alerts.push({ type: "preStaleLate", slug: project.slug, days: staleFor, threshold: staleDays });
  }

  if (project.dueDate) {
    const due = new Date(project.dueDate);
    if (due < now && project.status !== "done") alerts.push({ type: "overdue", slug: project.slug, dueDate: project.dueDate });
    if (due >= now && due <= dueCutoff) alerts.push({ type: "dueSoon", slug: project.slug, dueDate: project.dueDate });
  }

  if (project.status === "blocked" && staleFor >= blockedDays) {
    alerts.push({ type: "blockedTooLong", slug: project.slug, days: staleFor, reason: project.blockedReason || "" });
  }
}

for (const invalid of dependencyInsights.invalidRefs || []) {
  alerts.push({
    type: "dependencyInvalidRef",
    milestone: invalid.from,
    missing: invalid.missing
  });
}

const blockedBy = dependencyInsights.blockedBy || {};
for (const milestoneKey of Object.keys(blockedBy)) {
  const deps = blockedBy[milestoneKey];
  if (deps.length >= 3) {
    alerts.push({
      type: "dependencyChainRisk",
      milestone: milestoneKey,
      dependencyCount: deps.length
    });
  }
}

const reportsDir = path.join(process.cwd(), "reports");
await fs.mkdir(reportsDir, { recursive: true });
await fs.writeFile(path.join(reportsDir, "alerts-latest.json"), JSON.stringify(alerts, null, 2), "utf8");
console.log(`Generated ${alerts.length} alert(s).`);
