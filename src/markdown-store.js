import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { ALLOWED_STATUS, PROJECTS_DIR } from "./constants.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value) {
  return typeof value === "string" && ISO_DATE.test(value);
}

function toDateString(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    const maybeDate = new Date(value);
    if (!Number.isNaN(maybeDate.getTime()) && value.length >= 10) {
      return maybeDate.toISOString().slice(0, 10);
    }
  }
  return "";
}

function toSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeStatus(value) {
  if (!value || !ALLOWED_STATUS.has(value)) return "planning";
  return value;
}

async function readMarkdownFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return matter(raw);
}

export async function listProjectSlugs() {
  try {
    const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

function summarizeTasks(markdown) {
  const lines = markdown.split("\n");
  let total = 0;
  let done = 0;
  let recurring = 0;
  for (const line of lines) {
    if (line.startsWith("- [ ] ")) total += 1;
    if (line.startsWith("- [x] ")) {
      total += 1;
      done += 1;
    }
    if (line.includes("[recur:")) recurring += 1;
  }
  return { total, done, recurring };
}

function normalizeMilestone(raw) {
  return {
    id: raw.id || toSlug(raw.name || "milestone"),
    name: raw.name || "Untitled milestone",
    status: normalizeStatus(raw.status),
    startDate: toDateString(raw.startDate),
    dueDate: toDateString(raw.dueDate),
    dependsOn: Array.isArray(raw.dependsOn) ? raw.dependsOn : []
  };
}

export async function loadProject(slug) {
  const projectDir = path.join(PROJECTS_DIR, slug);
  const readmePath = path.join(projectDir, "README.md");
  const specPath = path.join(projectDir, "spec.md");
  const researchPath = path.join(projectDir, "research.md");
  const milestonesPath = path.join(projectDir, "milestones.md");
  const tasksPath = path.join(projectDir, "tasks.md");

  const [readme, milestones, tasks] = await Promise.all([
    readMarkdownFile(readmePath),
    readMarkdownFile(milestonesPath),
    fs.readFile(tasksPath, "utf8")
  ]);

  const readmeStats = await fs.stat(readmePath);
  const milestonesData = Array.isArray(milestones.data.milestones) ? milestones.data.milestones : [];
  const taskSummary = summarizeTasks(tasks);

  return {
    slug,
    path: projectDir,
    files: { readmePath, specPath, researchPath, milestonesPath, tasksPath },
    name: readme.data.name || slug,
    owner: readme.data.owner || "unassigned",
    status: normalizeStatus(readme.data.status),
    priority: readme.data.priority || "medium",
    tags: Array.isArray(readme.data.tags) ? readme.data.tags : [],
    description: readme.data.description || "",
    nextAction: readme.data.nextAction || "",
    blockedReason: readme.data.blockedReason || "",
    startDate: toDateString(readme.data.startDate),
    dueDate: toDateString(readme.data.dueDate),
    lastUpdated: toDateString(readme.data.lastUpdated),
    estimateHours: Number(readme.data.estimateHours || 0),
    modifiedAt: readmeStats.mtime.toISOString(),
    versionToken: String(readmeStats.mtimeMs),
    taskSummary,
    milestones: milestonesData.map(normalizeMilestone)
  };
}

export async function loadAllProjects() {
  const slugs = await listProjectSlugs();
  const projects = [];

  for (const slug of slugs) {
    try {
      projects.push(await loadProject(slug));
    } catch {
      // Skip malformed project folders to keep dashboard resilient.
    }
  }
  return projects;
}

export function filterProjects(projects, query = {}) {
  const q = (query.q || "").toLowerCase().trim();
  const status = query.status || "";
  const owner = query.owner || "";
  const dueBefore = query.dueBefore || "";
  const dueAfter = query.dueAfter || "";
  const tag = query.tag || "";
  const priority = query.priority || "";
  const overdue = query.overdue === "true";
  const updatedBefore = query.updatedBefore || "";
  const updatedAfter = query.updatedAfter || "";
  const blockedReason = (query.blockedReason || "").toLowerCase().trim();
  const now = new Date().toISOString().slice(0, 10);

  return projects.filter((project) => {
    if (status && project.status !== status) return false;
    if (owner && project.owner !== owner) return false;
    if (tag && !project.tags.includes(tag)) return false;
    if (priority && project.priority !== priority) return false;
    if (overdue) {
      if (!isIsoDate(project.dueDate) || project.dueDate >= now || project.status === "done") return false;
    }
    if (updatedBefore && isIsoDate(project.lastUpdated) && project.lastUpdated > updatedBefore) return false;
    if (updatedAfter && isIsoDate(project.lastUpdated) && project.lastUpdated < updatedAfter) return false;
    if (blockedReason && !String(project.blockedReason || "").toLowerCase().includes(blockedReason)) return false;
    if (q) {
      const blob = [
        project.slug,
        project.name,
        project.owner,
        project.status,
        project.priority,
        project.description,
        project.nextAction,
        project.tags.join(" ")
      ]
        .join(" ")
        .toLowerCase();
      if (!blob.includes(q)) return false;
    }
    if (dueBefore && isIsoDate(project.dueDate) && project.dueDate > dueBefore) return false;
    if (dueAfter && isIsoDate(project.dueDate) && project.dueDate < dueAfter) return false;
    return true;
  });
}

export async function updateProjectStatus(slug, status) {
  if (!ALLOWED_STATUS.has(status)) {
    throw new Error(`Invalid status: ${status}`);
  }
  const readmePath = path.join(PROJECTS_DIR, slug, "README.md");
  const raw = await fs.readFile(readmePath, "utf8");
  const parsed = matter(raw);
  parsed.data.status = status;
  parsed.data.lastUpdated = new Date().toISOString().slice(0, 10);
  await atomicWrite(readmePath, matter.stringify(parsed.content, parsed.data));
  return { updatedFile: readmePath };
}

export async function updateProjectMeta(slug, patch = {}) {
  const readmePath = path.join(PROJECTS_DIR, slug, "README.md");
  const raw = await fs.readFile(readmePath, "utf8");
  const parsed = matter(raw);

  if (typeof patch.blockedReason === "string") {
    parsed.data.blockedReason = patch.blockedReason.trim();
  }
  if (typeof patch.nextAction === "string") {
    parsed.data.nextAction = patch.nextAction.trim();
  }
  if (typeof patch.priority === "string" && patch.priority.trim()) {
    parsed.data.priority = patch.priority.trim();
  }
  if (typeof patch.estimateHours === "number" && Number.isFinite(patch.estimateHours) && patch.estimateHours >= 0) {
    parsed.data.estimateHours = patch.estimateHours;
  }
  parsed.data.lastUpdated = new Date().toISOString().slice(0, 10);

  await atomicWrite(readmePath, matter.stringify(parsed.content, parsed.data));
  return { updatedFile: readmePath };
}

export async function addTask(slug, task, recurrence = "") {
  const taskPath = path.join(PROJECTS_DIR, slug, "tasks.md");
  const raw = await fs.readFile(taskPath, "utf8");
  const recurValue = String(recurrence || "").trim().toLowerCase();
  const recurToken = ["daily", "weekly", "monthly"].includes(recurValue)
    ? ` [recur:${recurValue}]`
    : "";
  const next = `${raw.trimEnd()}\n- [ ] ${task}${recurToken}\n`;
  await atomicWrite(taskPath, next);
  return { updatedFile: taskPath };
}

export async function updateMilestone(slug, milestoneId, patch) {
  const milestonesPath = path.join(PROJECTS_DIR, slug, "milestones.md");
  const raw = await fs.readFile(milestonesPath, "utf8");
  const parsed = matter(raw);
  const list = Array.isArray(parsed.data.milestones) ? parsed.data.milestones : [];
  const idx = list.findIndex((item) => item.id === milestoneId);
  if (idx === -1) throw new Error(`Milestone not found: ${milestoneId}`);

  const next = { ...list[idx] };
  if (patch.name) next.name = patch.name;
  if (patch.status && ALLOWED_STATUS.has(patch.status)) next.status = patch.status;
  if (patch.startDate && isIsoDate(patch.startDate)) next.startDate = patch.startDate;
  if (patch.dueDate && isIsoDate(patch.dueDate)) next.dueDate = patch.dueDate;
  list[idx] = next;
  parsed.data.milestones = list;
  await atomicWrite(milestonesPath, matter.stringify(parsed.content, parsed.data));
  return { updatedFile: milestonesPath };
}

export async function ensureProjectsDir() {
  await fs.mkdir(PROJECTS_DIR, { recursive: true });
}

export async function atomicWrite(filePath, data) {
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, data, "utf8");
  await fs.rename(tempPath, filePath);
}

export async function getProjectVersionToken(slug) {
  const readmePath = path.join(PROJECTS_DIR, slug, "README.md");
  const stats = await fs.stat(readmePath);
  return `${stats.mtimeMs}`;
}

export async function assertVersionToken(slug, expectedToken) {
  const currentToken = await getProjectVersionToken(slug);
  if (!expectedToken) {
    const error = new Error("versionToken is required");
    error.code = "TOKEN_REQUIRED";
    error.currentToken = currentToken;
    throw error;
  }
  if (String(expectedToken) !== String(currentToken)) {
    const error = new Error("Project was updated by another change. Refresh and retry.");
    error.code = "VERSION_CONFLICT";
    error.currentToken = currentToken;
    throw error;
  }
  return currentToken;
}
