import fs from "node:fs/promises";
import path from "node:path";
import { addTask, loadAllProjects, updateProjectMeta } from "./markdown-store.js";

const reportsDir = path.join(process.cwd(), "reports");
const incomingEventsPath = path.join(reportsDir, "incoming-events.ndjson");

function toSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeUrgency(value) {
  const raw = String(value || "").toLowerCase();
  if (["critical", "high", "medium", "low"].includes(raw)) return raw;
  return "medium";
}

function dueDaysForUrgency(urgency) {
  if (urgency === "critical") return 3;
  if (urgency === "high") return 7;
  if (urgency === "low") return 30;
  return 14;
}

function inferEventType(event) {
  const explicit = String(event.kind || event.type || "").toLowerCase();
  if (explicit === "task" || explicit === "project") return explicit;

  const title = String(event.title || "");
  const text = `${title} ${String(event.description || "")}`.toLowerCase();
  const estimateHours = Number(event.estimateHours || 0);
  if (estimateHours >= 16) return "project";
  if (/\b(project|initiative|epic|migration|launch|roadmap)\b/.test(text)) return "project";
  return "task";
}

function normalizeEvent(raw, index = 0) {
  const now = new Date().toISOString();
  return {
    id: String(raw.id || `evt-${Date.now()}-${index}`),
    at: String(raw.at || now),
    title: String(raw.title || raw.name || "").trim(),
    description: String(raw.description || raw.note || "").trim(),
    owner: String(raw.owner || raw.requestedOwner || "unassigned").trim(),
    urgency: normalizeUrgency(raw.urgency || raw.priority),
    projectSlug: String(raw.projectSlug || raw.slug || "").trim(),
    estimateHours: Math.max(0, Number(raw.estimateHours || 0)),
    dueDays: Math.max(1, Number(raw.dueDays || 0) || dueDaysForUrgency(normalizeUrgency(raw.urgency || raw.priority))),
    recurrence: String(raw.recurrence || "").trim().toLowerCase(),
    status: String(raw.status || "pending").trim().toLowerCase(),
    kind: String(raw.kind || raw.type || "").trim().toLowerCase()
  };
}

async function readNdjson(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

async function writeNdjson(filePath, rows) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const body = rows.map((row) => JSON.stringify(row)).join("\n");
  await fs.writeFile(filePath, `${body}${body ? "\n" : ""}`, "utf8");
}

async function appendNdjson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

async function createProjectFromTemplate(payload) {
  const name = String(payload.name || "").trim();
  if (!name) throw new Error("quick-project requires name");
  const owner = String(payload.owner || "unassigned").trim();
  const dueDays = Math.max(1, Number(payload.dueDays) || 30);
  const slug = toSlug(name);
  const today = new Date();
  const due = new Date(today.getTime() + dueDays * 24 * 60 * 60 * 1000);
  const templateDir = path.join(process.cwd(), "templates", "project");
  const targetDir = path.join(process.cwd(), "projects", slug);
  await fs.mkdir(targetDir, { recursive: true });
  for (const file of ["README.md", "spec.md", "research.md", "milestones.md", "tasks.md"]) {
    const source = path.join(templateDir, file);
    const target = path.join(targetDir, file);
    let content = await fs.readFile(source, "utf8");
    content = content
      .replaceAll("{{slug}}", slug)
      .replaceAll("{{name}}", name)
      .replaceAll("{{owner}}", owner)
      .replaceAll("{{today}}", today.toISOString().slice(0, 10))
      .replaceAll("{{dueDate}}", due.toISOString().slice(0, 10));
    if (file === "README.md") {
      if (payload.nextAction) {
        content = content.replace("nextAction: Define first milestone", `nextAction: ${String(payload.nextAction).trim()}`);
      }
      if (Number.isFinite(Number(payload.estimateHours))) {
        content = content.replace("estimateHours: 0", `estimateHours: ${Math.max(0, Number(payload.estimateHours))}`);
      }
      if (payload.priority) {
        content = content.replace("priority: medium", `priority: ${String(payload.priority).trim().toLowerCase()}`);
      }
    }
    await fs.writeFile(target, content, "utf8");
  }
  return { type: "project", slug };
}

export async function submitIntakeForm({ formId, payload = {} }) {
  if (formId === "quick-task") {
    const slug = String(payload.slug || "");
    const task = String(payload.task || "").trim();
    if (!slug || !task) throw new Error("quick-task requires slug and task");
    await addTask(slug, task, payload.recurrence || "");
    if (payload.priority || payload.nextAction || payload.blockedReason) {
      await updateProjectMeta(slug, {
        priority: payload.priority,
        nextAction: payload.nextAction,
        blockedReason: payload.blockedReason
      });
    }
    return { type: "task", slug };
  }
  if (formId === "quick-project") {
    return createProjectFromTemplate(payload);
  }
  if (formId === "incoming-event") {
    const queued = await enqueueIncomingEvent(payload);
    return { type: "incoming-event", eventId: queued.event.id };
  }
  throw new Error(`Unsupported formId: ${formId}`);
}

function chooseFallbackProject(projects, owner) {
  const matchOwner = projects.find((p) => p.owner === owner && p.status !== "done");
  if (matchOwner) return matchOwner.slug;
  const active = projects.find((p) => p.status === "active");
  if (active) return active.slug;
  return projects[0]?.slug || "";
}

export async function enqueueIncomingEvent(payload = {}) {
  const event = normalizeEvent(payload);
  if (!event.title) throw new Error("Incoming event title is required");
  await appendNdjson(incomingEventsPath, event);
  return { ok: true, event };
}

export async function listIncomingEvents({ limit = 50 } = {}) {
  const rows = await readNdjson(incomingEventsPath);
  const capped = Math.max(1, Math.min(Number(limit) || 50, 500));
  return rows.slice(-capped).reverse();
}

export async function processIncomingEvents({ dryRun = false, maxEvents = 25 } = {}) {
  const rows = (await readNdjson(incomingEventsPath)).map((row, index) => normalizeEvent(row, index));
  const pendingIdx = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.status === "pending")
    .slice(0, Math.max(0, Number(maxEvents) || 0));

  const projects = await loadAllProjects();
  const results = [];

  for (const item of pendingIdx) {
    const event = item.row;
    const eventType = inferEventType(event);
    const owner = event.owner || "unassigned";
    const priority = event.urgency;
    try {
      let resolution;
      if (eventType === "project") {
        const payload = {
          name: event.title,
          owner,
          dueDays: event.dueDays,
          nextAction: event.description || "Triage incoming event and define first milestone",
          estimateHours: event.estimateHours || 4,
          priority
        };
        resolution = dryRun ? { type: "project", slug: toSlug(payload.name), dryRun: true } : await submitIntakeForm({ formId: "quick-project", payload });
      } else {
        const slug = event.projectSlug || chooseFallbackProject(projects, owner);
        if (!slug) throw new Error("No existing project available for task routing");
        const payload = {
          slug,
          task: event.description ? `${event.title}: ${event.description}` : event.title,
          recurrence: event.recurrence,
          priority
        };
        resolution = dryRun ? { type: "task", slug, dryRun: true } : await submitIntakeForm({ formId: "quick-task", payload });
      }
      results.push({ eventId: event.id, ok: true, eventType, resolution });
      if (!dryRun) {
        rows[item.index] = { ...rows[item.index], status: "resolved", resolvedAt: new Date().toISOString(), resolution };
      }
    } catch (error) {
      results.push({ eventId: event.id, ok: false, eventType, error: error.message });
      if (!dryRun) {
        rows[item.index] = { ...rows[item.index], status: "failed", error: error.message, failedAt: new Date().toISOString() };
      }
    }
  }

  if (!dryRun) {
    await writeNdjson(incomingEventsPath, rows);
  }

  const remainingPending = rows.filter((row) => row.status === "pending").length;
  return {
    ok: true,
    dryRun,
    processed: pendingIdx.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    remainingPending,
    results
  };
}
