import fs from "node:fs/promises";
import { CACHE_DIR, CACHE_FILE } from "./constants.js";
import { filterProjects, loadAllProjects } from "./markdown-store.js";

export async function buildIndex() {
  const projects = await loadAllProjects();
  const index = {
    generatedAt: new Date().toISOString(),
    totalProjects: projects.length,
    projects: projects.map((project) => ({
      slug: project.slug,
      name: project.name,
      owner: project.owner,
      status: project.status,
      priority: project.priority,
      tags: project.tags,
      dueDate: project.dueDate,
      startDate: project.startDate,
      lastUpdated: project.lastUpdated,
      nextAction: project.nextAction,
      blockedReason: project.blockedReason,
      taskSummary: project.taskSummary,
      versionToken: project.versionToken,
      milestones: project.milestones
    }))
  };
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(index, null, 2), "utf8");
  return index;
}

export async function queryIndex(query = {}) {
  const index = await buildIndex();
  const filtered = filterProjects(index.projects, query);
  return {
    generatedAt: index.generatedAt,
    totalProjects: filtered.length,
    projects: filtered
  };
}

export function buildTimeline(projects) {
  const events = [];
  for (const project of projects) {
    for (const milestone of project.milestones || []) {
      events.push({
        projectSlug: project.slug,
        projectName: project.name,
        projectStatus: project.status,
        milestoneId: milestone.id,
        milestoneName: milestone.name,
        status: milestone.status,
        startDate: milestone.startDate,
        dueDate: milestone.dueDate,
        dependsOn: milestone.dependsOn || []
      });
    }
  }
  return events.sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));
}

export function buildDependencyInsights(projects) {
  const milestoneMap = new Map();
  const edges = [];
  const invalidRefs = [];
  for (const project of projects) {
    for (const ms of project.milestones || []) {
      const key = `${project.slug}:${ms.id}`;
      milestoneMap.set(key, { ...ms, projectSlug: project.slug, projectStatus: project.status });
    }
  }
  for (const project of projects) {
    for (const ms of project.milestones || []) {
      const from = `${project.slug}:${ms.id}`;
      for (const dep of ms.dependsOn || []) {
        const depKey = dep.includes(":") ? dep : `${project.slug}:${dep}`;
        if (!milestoneMap.has(depKey)) {
          invalidRefs.push({ from, missing: depKey });
        } else {
          edges.push({ from: depKey, to: from });
        }
      }
    }
  }
  const blockedBy = {};
  for (const edge of edges) {
    blockedBy[edge.to] = blockedBy[edge.to] || [];
    blockedBy[edge.to].push(edge.from);
  }
  return { edges, invalidRefs, blockedBy };
}

export function computeHealth(project) {
  let score = 100;
  const now = new Date().toISOString().slice(0, 10);
  if (project.status === "blocked") score -= 30;
  if (project.dueDate && project.dueDate < now && project.status !== "done") score -= 25;
  if (project.lastUpdated) {
    const days = Math.floor((Date.now() - new Date(project.lastUpdated).getTime()) / (24 * 60 * 60 * 1000));
    if (days > 14) score -= 20;
    else if (days > 7) score -= 10;
  }
  const completion =
    project.taskSummary.total > 0 ? project.taskSummary.done / project.taskSummary.total : 0.5;
  score -= Math.round((1 - completion) * 20);
  return Math.max(0, Math.min(100, score));
}

export function buildPortfolioSummary(projects) {
  const byOwner = {};
  const byStatus = {};
  const byMonth = {};
  for (const project of projects) {
    byOwner[project.owner] = (byOwner[project.owner] || 0) + 1;
    byStatus[project.status] = (byStatus[project.status] || 0) + 1;
    const month = project.dueDate ? project.dueDate.slice(0, 7) : "unknown";
    byMonth[month] = (byMonth[month] || 0) + 1;
  }
  return { byOwner, byStatus, byMonth };
}
