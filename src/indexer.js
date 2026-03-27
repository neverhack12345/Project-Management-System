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
  const milestoneEdges = [];
  const invalidRefs = [];
  const taskNodeMap = new Map();
  const taskEdges = [];
  const invalidTaskRefs = [];
  const crossProjectTaskEdges = [];
  for (const project of projects) {
    for (const ms of project.milestones || []) {
      const key = `${project.slug}:${ms.id}`;
      milestoneMap.set(key, { ...ms, projectSlug: project.slug, projectStatus: project.status });
    }
    for (const task of project.tasks || []) {
      const key = task.ref;
      taskNodeMap.set(key, {
        key,
        projectSlug: project.slug,
        taskId: task.id,
        done: Boolean(task.done)
      });
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
          milestoneEdges.push({ from: depKey, to: from });
        }
      }
    }
    for (const task of project.tasks || []) {
      const taskKey = task.ref;
      const refs = task.dependsOn || [];
      for (const ref of refs) {
        if (!taskNodeMap.has(ref)) {
          invalidTaskRefs.push({ from: taskKey, missing: ref });
          continue;
        }
        taskEdges.push({ from: ref, to: taskKey });
        if (ref.split(":")[0] !== project.slug) {
          crossProjectTaskEdges.push({ from: ref, to: taskKey });
        }
      }
    }
  }
  const blockedBy = {};
  for (const edge of milestoneEdges) {
    blockedBy[edge.to] = blockedBy[edge.to] || [];
    blockedBy[edge.to].push(edge.from);
  }
  const taskBlockedBy = {};
  for (const edge of taskEdges) {
    taskBlockedBy[edge.to] = taskBlockedBy[edge.to] || [];
    taskBlockedBy[edge.to].push(edge.from);
  }
  const tasksByProject = {};
  const verificationByProject = {};
  for (const project of projects) {
    tasksByProject[project.slug] = {
      total: project.taskSummary?.total || 0,
      open: project.taskSummary?.open || 0,
      blockedByDependencies: project.taskSummary?.blockedByDependencies || 0,
      unresolvedFactRefs: project.taskSummary?.unresolvedFactRefs || 0,
      tasksWithUnresolvedFacts: project.taskSummary?.tasksWithUnresolvedFacts || 0
    };
    verificationByProject[project.slug] = {
      totalFacts: project.factsSummary?.total || 0,
      verifiedFacts: project.factsSummary?.verified || 0,
      unresolvedFacts: project.factsSummary?.unresolved || 0
    };
  }
  return {
    edges: milestoneEdges,
    invalidRefs,
    blockedBy,
    taskEdges,
    invalidTaskRefs,
    taskBlockedBy,
    crossProjectTaskEdges,
    tasksByProject,
    verificationByProject
  };
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
