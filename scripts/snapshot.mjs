import fs from "node:fs/promises";
import path from "node:path";
import { loadAllProjects } from "../src/markdown-store.js";
import { computeHealth } from "../src/indexer.js";

const projects = await loadAllProjects();
const today = new Date().toISOString().slice(0, 10);
const now = new Date();

const metrics = {
  date: today,
  totalProjects: projects.length,
  blocked: projects.filter((p) => p.status === "blocked").length,
  overdue: projects.filter((p) => p.dueDate && new Date(p.dueDate) < now && p.status !== "done").length,
  dueSoon7d: projects.filter((p) => p.dueDate && new Date(p.dueDate) >= now && new Date(p.dueDate) <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)).length,
  avgHealth: projects.length
    ? Math.round(projects.reduce((sum, p) => sum + computeHealth(p), 0) / projects.length)
    : 0
};

const dir = path.join(process.cwd(), "reports", "snapshots");
await fs.mkdir(dir, { recursive: true });
await fs.writeFile(path.join(dir, `${today}.json`), JSON.stringify(metrics, null, 2), "utf8");
console.log(`Snapshot written: ${today}`);
