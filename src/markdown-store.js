import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { ALLOWED_STATUS, PROJECTS_DIR } from "./constants.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TASK_REF_RE = /^[a-z0-9][a-z0-9-]*:[a-z0-9][a-z0-9-]*$/;
const PROJECT_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TASK_LANES = new Set(["backlog", "todo", "in-progress", "done"]);
const FACT_STATUSES = new Set(["unknown", "unverified", "in-review", "verified"]);
const FACT_RE = /^[a-z0-9][a-z0-9-]*$/;
const FACT_REF_RE = /^[a-z0-9][a-z0-9-]*:[a-z0-9][a-z0-9-]*$/;
const FACTS_START = "<!-- facts-registry:start -->";
const FACTS_END = "<!-- facts-registry:end -->";

export function isIsoDate(value) {
  return typeof value === "string" && ISO_DATE.test(value);
}

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toLowerCase();
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
  const today = new Date().toISOString().slice(0, 10);
  const doneTaskIds = new Set();
  for (const line of lines) {
    if (!line.startsWith("- [x] ")) continue;
    const idMatch = line.match(/\[id:([a-z0-9][a-z0-9-]*)\]/);
    if (idMatch?.[1]) doneTaskIds.add(idMatch[1]);
  }
  let total = 0;
  let done = 0;
  let recurring = 0;
  let overdue = 0;
  let dueSoon = 0;
  let withDependencies = 0;
  let blockedByDependencies = 0;
  for (const line of lines) {
    const isOpen = line.startsWith("- [ ] ");
    const isDone = line.startsWith("- [x] ");
    if (isOpen) total += 1;
    if (isDone) {
      total += 1;
      done += 1;
    }
    if (line.includes("[recur:")) recurring += 1;
    const dueMatch = line.match(/\[due:(\d{4}-\d{2}-\d{2})\]/);
    if (isOpen && dueMatch?.[1]) {
      const dueDate = dueMatch[1];
      if (dueDate < today) overdue += 1;
      if (dueDate >= today) {
        const dueAt = new Date(dueDate).getTime();
        const soonCutoff = Date.now() + 7 * 24 * 60 * 60 * 1000;
        if (dueAt <= soonCutoff) dueSoon += 1;
      }
    }
    const depsMatch = line.match(/\[deps:([a-z0-9,:\s-]+)\]/);
    if (isOpen && depsMatch?.[1]) {
      const deps = depsMatch[1]
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
      if (deps.length) {
        withDependencies += 1;
        const unresolved = deps.some((depId) => {
          const localDepId = depId.includes(":") ? depId.split(":")[1] : depId;
          return !doneTaskIds.has(localDepId);
        });
        if (unresolved) blockedByDependencies += 1;
      }
    }
  }
  return {
    total,
    done,
    recurring,
    open: Math.max(total - done, 0),
    overdue,
    dueSoon,
    withDependencies,
    blockedByDependencies
  };
}

function normalizeTaskState(rawState, isDone) {
  const value = String(rawState || "").trim().toLowerCase();
  if (isDone) return "done";
  if (TASK_LANES.has(value) && value !== "done") return value;
  return "todo";
}

function parseTaskLine(line, projectSlug) {
  const isOpen = line.startsWith("- [ ] ");
  const isDone = line.startsWith("- [x] ");
  if (!isOpen && !isDone) return null;
  const idMatch = line.match(/\[id:([a-z0-9][a-z0-9-]*)\]/);
  const dueMatch = line.match(/\[due:(\d{4}-\d{2}-\d{2})\]/);
  const stateMatch = line.match(/\[state:(backlog|todo|in-progress|done)\]/);
  const depsMatch = line.match(/\[deps:([a-z0-9,:\s-]+)\]/);
  const factsMatch = line.match(/\[facts:([a-z0-9,:\s-]+)\]/);
  const title = line
    .replace(/^- \[[ x]\] /, "")
    .replace(/\s+\[(id|due|deps|recur|state):[^\]]+\]/g, "")
    .trim();
  if (!idMatch?.[1]) return null;
  return {
    id: idMatch[1],
    ref: `${projectSlug}:${idMatch[1]}`,
    projectSlug,
    title,
    done: isDone,
    dueDate: dueMatch?.[1] || "",
    state: normalizeTaskState(stateMatch?.[1], isDone),
    dependsOn: (depsMatch?.[1] || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
      .map((ref) => (ref.includes(":") ? ref : `${projectSlug}:${ref}`)),
    factRefs: (factsMatch?.[1] || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
      .map((ref) => (ref.includes(":") ? ref : `${projectSlug}:${ref}`))
  };
}

export function parseTasksMarkdown(markdown, projectSlug) {
  return String(markdown || "")
    .split("\n")
    .map((line) => parseTaskLine(line, projectSlug))
    .filter(Boolean);
}

function parseFactsRegistry(markdown) {
  const source = String(markdown || "");
  const start = source.indexOf(FACTS_START);
  const end = source.indexOf(FACTS_END);
  if (start === -1 || end === -1 || end <= start) return [];
  const raw = source.slice(start + FACTS_START.length, end).trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeFact(projectSlug, fact) {
  const factId = String(fact.factId || makeId("f")).trim().toLowerCase();
  if (!FACT_RE.test(factId)) {
    throw new Error(`Invalid factId: ${factId}`);
  }
  const status = String(fact.status || "unknown").trim().toLowerCase();
  if (!FACT_STATUSES.has(status)) {
    throw new Error(`Invalid fact status: ${status}`);
  }
  const sources = Array.isArray(fact.sources) ? fact.sources.map((item) => String(item || "").trim()).filter(Boolean) : [];
  const verificationNote = String(fact.verificationNote || "").trim();
  if (status === "verified" && (!sources.length || !verificationNote)) {
    throw new Error("Verified facts require at least one source and a verificationNote");
  }
  return {
    factId,
    ref: `${projectSlug}:${factId}`,
    statement: String(fact.statement || "").trim(),
    status,
    sources,
    verificationNote,
    verifiedAt: String(fact.verifiedAt || ""),
    verifiedBy: String(fact.verifiedBy || "")
  };
}

function upsertFactsRegistry(markdown, facts) {
  const source = String(markdown || "");
  const payload = JSON.stringify(facts, null, 2);
  const block = `${FACTS_START}\n${payload}\n${FACTS_END}`;
  const start = source.indexOf(FACTS_START);
  const end = source.indexOf(FACTS_END);
  if (start !== -1 && end !== -1 && end > start) {
    const before = source.slice(0, start).replace(/\s*$/, "");
    const after = source.slice(end + FACTS_END.length).replace(/^\s*/, "");
    return `${before}\n\n## Facts Registry\n\n${block}\n\n${after}`.trimEnd() + "\n";
  }
  return `${source.trimEnd()}\n\n## Facts Registry\n\n${block}\n`;
}

function normalizeFactRefs(projectSlug, factRefs) {
  const refs = (Array.isArray(factRefs) ? factRefs : String(factRefs || "").split(","))
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean)
    .map((ref) => (ref.includes(":") ? ref : `${projectSlug}:${ref}`));
  for (const ref of refs) {
    if (!FACT_REF_RE.test(ref)) throw new Error(`Invalid fact ref: ${ref}`);
  }
  return refs;
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

  const [readme, milestones, tasks, research] = await Promise.all([
    readMarkdownFile(readmePath),
    readMarkdownFile(milestonesPath),
    fs.readFile(tasksPath, "utf8"),
    fs.readFile(researchPath, "utf8")
  ]);

  const readmeStats = await fs.stat(readmePath);
  const milestonesData = Array.isArray(milestones.data.milestones) ? milestones.data.milestones : [];
  const taskSummary = summarizeTasks(tasks);
  const tasksParsed = parseTasksMarkdown(tasks, slug);
  const facts = parseFactsRegistry(research).map((item) => normalizeFact(slug, item));
  const factByRef = new Map(facts.map((fact) => [fact.ref, fact]));
  const tasksEnriched = tasksParsed.map((task) => {
    const unresolvedFactRefs = task.factRefs.filter((ref) => {
      const fact = factByRef.get(ref);
      return !fact || fact.status !== "verified";
    });
    return { ...task, unresolvedFactRefs };
  });
  const factsSummary = {
    total: facts.length,
    verified: facts.filter((f) => f.status === "verified").length,
    unresolved: facts.filter((f) => f.status !== "verified").length
  };

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
    tasksMarkdown: tasks,
    tasks: tasksEnriched,
    taskSummary: {
      ...taskSummary,
      unresolvedFactRefs: tasksEnriched.reduce((sum, task) => sum + (task.unresolvedFactRefs?.length || 0), 0),
      tasksWithUnresolvedFacts: tasksEnriched.filter((task) => (task.unresolvedFactRefs?.length || 0) > 0).length
    },
    facts,
    factsSummary,
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

export async function addTask(slug, task, dueDate, recurrence = "", dependsOn = [], factRefs = []) {
  const taskPath = path.join(PROJECTS_DIR, slug, "tasks.md");
  const raw = await fs.readFile(taskPath, "utf8");
  if (!isIsoDate(String(dueDate || ""))) {
    throw new Error("dueDate must be ISO YYYY-MM-DD");
  }
  const makeTaskId = () =>
    `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toLowerCase();
  const toDepIds = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") return value.split(",");
    return [];
  };
  const depIds = toDepIds(dependsOn)
    .map((entry) => String(entry || "").trim().toLowerCase())
    .filter(Boolean);
  const normalizedDeps = depIds.map((depId) => (depId.includes(":") ? depId : `${slug}:${depId}`));
  for (const depId of normalizedDeps) {
    if (!TASK_REF_RE.test(depId)) {
      throw new Error(`Invalid dependency task ref: ${depId}`);
    }
  }
  const normalizedFacts = normalizeFactRefs(slug, factRefs);
  const taskId = makeTaskId();
  const recurValue = String(recurrence || "").trim().toLowerCase();
  const recurToken = ["daily", "weekly", "monthly"].includes(recurValue)
    ? ` [recur:${recurValue}]`
    : "";
  const depsToken = normalizedDeps.length ? ` [deps:${normalizedDeps.join(",")}]` : "";
  const factsToken = normalizedFacts.length ? ` [facts:${normalizedFacts.join(",")}]` : "";
  const dueToken = ` [due:${String(dueDate)}]`;
  const idToken = ` [id:${taskId}]`;
  const stateToken = " [state:todo]";
  const next = `${raw.trimEnd()}\n- [ ] ${task}${idToken}${dueToken}${stateToken}${depsToken}${factsToken}${recurToken}\n`;
  await atomicWrite(taskPath, next);
  return { updatedFile: taskPath, taskId };
}

export async function updateTaskState(slug, taskId, state) {
  const normalizedState = String(state || "").trim().toLowerCase();
  if (!TASK_LANES.has(normalizedState)) {
    throw new Error(`Invalid task lane: ${state}`);
  }
  const taskPath = path.join(PROJECTS_DIR, slug, "tasks.md");
  const raw = await fs.readFile(taskPath, "utf8");
  const lines = raw.split("\n");
  let found = false;
  const nextLines = lines.map((line) => {
    if (!line.includes(`[id:${taskId}]`)) return line;
    if (!line.startsWith("- [ ] ") && !line.startsWith("- [x] ")) return line;
    found = true;
    let next = line;
    if (normalizedState === "done") {
      next = next.replace(/^- \[[ x]\] /, "- [x] ");
    } else {
      next = next.replace(/^- \[[ x]\] /, "- [ ] ");
    }
    if (/\[state:[^\]]+\]/.test(next)) {
      next = next.replace(/\[state:[^\]]+\]/, `[state:${normalizedState}]`);
    } else {
      next = `${next} [state:${normalizedState}]`;
    }
    return next;
  });
  if (!found) throw new Error(`Task not found: ${slug}:${taskId}`);
  await atomicWrite(taskPath, `${nextLines.join("\n").replace(/\n*$/, "")}\n`);
  return { updatedFile: taskPath };
}

function parseTaskLineParts(line) {
  const isOpen = line.startsWith("- [ ] ");
  const isDone = line.startsWith("- [x] ");
  if (!isOpen && !isDone) return null;
  const idMatch = line.match(/\[id:([a-z0-9][a-z0-9-]*)\]/);
  if (!idMatch) return null;
  const dueMatch = line.match(/\[due:(\d{4}-\d{2}-\d{2})\]/);
  const stateMatch = line.match(/\[state:(backlog|todo|in-progress|done)\]/);
  const depsMatch = line.match(/\[deps:([^\]]+)\]/);
  const factsMatch = line.match(/\[facts:([^\]]+)\]/);
  const recurMatch = line.match(/\[recur:(daily|weekly|monthly)\]/);
  const title = line
    .replace(/^- \[[ x]\] /, "")
    .replace(/\s+\[(id|due|deps|recur|state|facts):[^\]]+\]/g, "")
    .trim();
  return {
    isDone,
    taskId: idMatch[1],
    due: dueMatch?.[1] || "",
    state: normalizeTaskState(stateMatch?.[1], isDone),
    depsRaw: depsMatch?.[1] || "",
    factsRaw: factsMatch?.[1] || "",
    recur: recurMatch?.[1] || "",
    title
  };
}

function normalizeDepIdList(slug, dependsOn) {
  const toDepIds = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") return value.split(",");
    return [];
  };
  const depIds = toDepIds(dependsOn)
    .map((entry) => String(entry || "").trim().toLowerCase())
    .filter(Boolean);
  return depIds.map((depId) => (depId.includes(":") ? depId : `${slug}:${depId}`));
}

function validateDepRefs(normalizedDeps) {
  for (const depId of normalizedDeps) {
    if (!TASK_REF_RE.test(depId)) {
      throw new Error(`Invalid dependency task ref: ${depId}`);
    }
  }
}

function buildTaskLine(slug, parts) {
  const isDone = Boolean(parts.isDone);
  const prefix = isDone ? "- [x] " : "- [ ] ";
  const lane = isDone ? "done" : String(parts.state || "todo").trim().toLowerCase();
  const idToken = ` [id:${parts.taskId}]`;
  const dueToken = parts.due ? ` [due:${parts.due}]` : "";
  const stateToken = ` [state:${lane}]`;
  const depsToken = parts.depsNorm?.length ? ` [deps:${parts.depsNorm.join(",")}]` : "";
  const factsToken = parts.factsNorm?.length ? ` [facts:${parts.factsNorm.join(",")}]` : "";
  const recurValue = String(parts.recur || "").trim().toLowerCase();
  const recurToken = ["daily", "weekly", "monthly"].includes(recurValue) ? ` [recur:${recurValue}]` : "";
  return `${prefix}${parts.title}${idToken}${dueToken}${stateToken}${depsToken}${factsToken}${recurToken}`;
}

function lineReferencesTaskRef(line, projectSlugOfLine, targetRefLower) {
  const m = line.match(/\[deps:([^\]]+)\]/);
  if (!m) return false;
  const bits = m[1]
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  for (const b of bits) {
    const full = b.includes(":") ? b : `${projectSlugOfLine}:${b}`;
    if (full === targetRefLower) return true;
  }
  return false;
}

export async function updateTask(slug, taskId, patch = {}) {
  const taskPath = path.join(PROJECTS_DIR, slug, "tasks.md");
  const raw = await fs.readFile(taskPath, "utf8");
  const lines = raw.split("\n");
  let idx = -1;
  let parts = null;
  for (let i = 0; i < lines.length; i++) {
    const p = parseTaskLineParts(lines[i]);
    if (p && p.taskId === taskId) {
      idx = i;
      parts = p;
      break;
    }
  }
  if (!parts || idx === -1) throw new Error(`Task not found: ${slug}:${taskId}`);

  let title = typeof patch.title === "string" ? patch.title.trim() : parts.title;
  let due = parts.due;
  if (patch.dueDate !== undefined && patch.dueDate !== null && String(patch.dueDate).trim() !== "") {
    const d = String(patch.dueDate).trim();
    if (!isIsoDate(d)) throw new Error("dueDate must be ISO YYYY-MM-DD");
    due = d;
  }
  let state = parts.state;
  if (typeof patch.state === "string" && patch.state.trim()) {
    const ns = patch.state.trim().toLowerCase();
    if (!TASK_LANES.has(ns)) throw new Error(`Invalid task lane: ${patch.state}`);
    state = ns;
  }
  let isDone = parts.isDone;
  if (patch.done === true) {
    isDone = true;
    state = "done";
  }
  if (patch.done === false) {
    isDone = false;
    if (state === "done") state = "todo";
  }
  if (state === "done") isDone = true;

  let depsNorm;
  if (patch.dependsOn !== undefined) {
    depsNorm = normalizeDepIdList(slug, patch.dependsOn);
    validateDepRefs(depsNorm);
  } else {
    const dr = parts.depsRaw;
    depsNorm = dr
      ? dr
          .split(",")
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean)
          .map((depId) => (depId.includes(":") ? depId : `${slug}:${depId}`))
      : [];
  }

  let factsNorm;
  if (patch.factRefs !== undefined) {
    factsNorm = normalizeFactRefs(slug, patch.factRefs);
    const project = await loadProject(slug);
    const knownFacts = new Set((project.facts || []).map((fact) => fact.ref));
    for (const ref of factsNorm) {
      if (!knownFacts.has(ref)) throw new Error(`Unknown fact ref: ${ref}`);
    }
  } else {
    factsNorm = parts.factsRaw
      ? parts.factsRaw
          .split(",")
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean)
          .map((ref) => (ref.includes(":") ? ref : `${slug}:${ref}`))
      : [];
  }

  let recur = parts.recur;
  if (patch.recurrence !== undefined) {
    const recurValue = String(patch.recurrence || "").trim().toLowerCase();
    recur = ["daily", "weekly", "monthly"].includes(recurValue) ? recurValue : "";
  }

  if (!isDone && !due) {
    throw new Error("Open tasks require a due date (dueDate)");
  }

  const newLine = buildTaskLine(slug, {
    isDone,
    taskId,
    title,
    due,
    state: isDone ? "done" : state,
    depsNorm,
    factsNorm,
    recur
  });
  lines[idx] = newLine;
  await atomicWrite(taskPath, `${lines.join("\n").replace(/\n*$/, "")}\n`);
  return { updatedFile: taskPath };
}

export async function removeTask(slug, taskId) {
  const taskPath = path.join(PROJECTS_DIR, slug, "tasks.md");
  const raw = await fs.readFile(taskPath, "utf8");
  const lines = raw.split("\n");
  let targetLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (
      lines[i].includes(`[id:${taskId}]`) &&
      (lines[i].startsWith("- [ ] ") || lines[i].startsWith("- [x] "))
    ) {
      targetLineIdx = i;
      break;
    }
  }
  if (targetLineIdx === -1) throw new Error(`Task not found: ${slug}:${taskId}`);
  const targetRef = `${slug}:${taskId}`.toLowerCase();
  const slugs = await listProjectSlugs();
  for (const otherSlug of slugs) {
    const p = path.join(PROJECTS_DIR, otherSlug, "tasks.md");
    let content;
    try {
      content = await fs.readFile(p, "utf8");
    } catch {
      continue;
    }
    for (const line of content.split("\n")) {
      if (
        otherSlug === slug &&
        line.includes(`[id:${taskId}]`) &&
        (line.startsWith("- [ ] ") || line.startsWith("- [x] "))
      ) {
        continue;
      }
      if (lineReferencesTaskRef(line, otherSlug, targetRef)) {
        throw new Error(`Cannot remove task ${slug}:${taskId}: referenced by a dependency in project ${otherSlug}`);
      }
    }
  }
  const next = lines.filter((_, i) => i !== targetLineIdx);
  await atomicWrite(taskPath, `${next.join("\n").replace(/\n*$/, "")}\n`);
  return { updatedFile: taskPath };
}

export async function listProjectFacts(slug) {
  const project = await loadProject(slug);
  return project.facts || [];
}

export async function createProjectFact(slug, payload = {}) {
  const researchPath = path.join(PROJECTS_DIR, slug, "research.md");
  const raw = await fs.readFile(researchPath, "utf8");
  const current = parseFactsRegistry(raw).map((item) => normalizeFact(slug, item));
  const fact = normalizeFact(slug, {
    factId: payload.factId || makeId("f"),
    statement: payload.statement || "",
    status: payload.status || "unknown",
    sources: payload.sources || [],
    verificationNote: payload.verificationNote || "",
    verifiedAt: payload.verifiedAt || "",
    verifiedBy: payload.verifiedBy || ""
  });
  if (current.some((item) => item.factId === fact.factId)) {
    throw new Error(`factId already exists: ${fact.factId}`);
  }
  const nextFacts = [...current, fact];
  await atomicWrite(researchPath, upsertFactsRegistry(raw, nextFacts.map(({ ref, ...rest }) => rest)));
  return { updatedFile: researchPath, fact };
}

export async function updateProjectFact(slug, factId, patch = {}) {
  const researchPath = path.join(PROJECTS_DIR, slug, "research.md");
  const raw = await fs.readFile(researchPath, "utf8");
  const current = parseFactsRegistry(raw).map((item) => normalizeFact(slug, item));
  const idx = current.findIndex((item) => item.factId === factId);
  if (idx === -1) throw new Error(`Fact not found: ${slug}:${factId}`);
  const merged = normalizeFact(slug, { ...current[idx], ...patch, factId });
  current[idx] = merged;
  await atomicWrite(researchPath, upsertFactsRegistry(raw, current.map(({ ref, ...rest }) => rest)));
  return { updatedFile: researchPath, fact: merged };
}

export async function updateTaskFactRefs(slug, taskId, factRefs = []) {
  const normalizedFacts = normalizeFactRefs(slug, factRefs);
  const project = await loadProject(slug);
  const knownFacts = new Set((project.facts || []).map((fact) => fact.ref));
  for (const ref of normalizedFacts) {
    if (!knownFacts.has(ref)) throw new Error(`Unknown fact ref: ${ref}`);
  }
  const taskPath = path.join(PROJECTS_DIR, slug, "tasks.md");
  const raw = await fs.readFile(taskPath, "utf8");
  const lines = raw.split("\n");
  let found = false;
  const nextLines = lines.map((line) => {
    if (!line.includes(`[id:${taskId}]`)) return line;
    if (!line.startsWith("- [ ] ") && !line.startsWith("- [x] ")) return line;
    found = true;
    let next = line.replace(/\s+\[facts:[^\]]+\]/g, "");
    if (normalizedFacts.length) next = `${next} [facts:${normalizedFacts.join(",")}]`;
    return next;
  });
  if (!found) throw new Error(`Task not found: ${slug}:${taskId}`);
  await atomicWrite(taskPath, `${nextLines.join("\n").replace(/\n*$/, "")}\n`);
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

/**
 * @param {string} slug
 * @param {{ confirmSlug?: string }} opts
 */
export async function deleteProject(slug, opts = {}) {
  const s = String(slug || "").trim();
  const confirm = String(opts.confirmSlug || "").trim();
  if (confirm !== s) {
    throw new Error("confirmSlug must exactly match slug for destructive delete");
  }
  if (!PROJECT_SLUG_RE.test(s)) {
    throw new Error("Invalid project slug");
  }
  const dir = path.join(PROJECTS_DIR, s);
  try {
    await fs.access(dir);
  } catch {
    throw new Error(`Project not found: ${s}`);
  }
  await fs.rm(dir, { recursive: true, force: false });
  return { deleted: s, dir };
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
