import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { maybeAutoCommit } from "./git-ops.js";
import { getPortfolioActivity, getProjectHistory } from "./git-history.js";
import { buildDependencyInsights, buildPortfolioSummary, buildTimeline, computeHealth, queryIndex } from "./indexer.js";
import { readOpsState, runDueOps } from "./auto-ops.js";
import { buildActionQueue, writeActionQueueReport } from "./action-playbook.js";
import { resolveSafePlaybookActions } from "./playbook-resolver.js";
import { enqueueIncomingEvent, listIncomingEvents, processIncomingEvents, submitIntakeForm } from "./intake-automation.js";
import {
  addTask,
  assertVersionToken,
  ensureProjectsDir,
  loadAllProjects,
  updateProjectMeta,
  updateMilestone,
  updateProjectStatus
} from "./markdown-store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public");
const reportsDir = path.join(__dirname, "..", "reports");
const decisionLogPath = path.join(reportsDir, "decision-log.ndjson");
const timeEntriesPath = path.join(reportsDir, "time-entries.ndjson");
const intakeFormsPath = path.join(process.cwd(), "forms", "intake.json");
const automationRulesPath = path.join(process.cwd(), "config", "automation-rules.json");
const automationRunsPath = path.join(reportsDir, "automation-runs.ndjson");

async function appendDecisionLog(entry) {
  await fs.mkdir(reportsDir, { recursive: true });
  await fs.appendFile(decisionLogPath, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, "utf8");
}

function toSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function appendTimeEntry(entry) {
  await fs.mkdir(reportsDir, { recursive: true });
  await fs.appendFile(timeEntriesPath, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, "utf8");
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

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function appendAutomationRun(entry) {
  await fs.mkdir(reportsDir, { recursive: true });
  await fs.appendFile(automationRunsPath, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`, "utf8");
}

function evaluateCondition(condition, context) {
  if (!condition || typeof condition !== "object") return true;
  if (condition.type === "alertCountAtLeast") {
    return (context.alerts?.length || 0) >= Number(condition.value || 0);
  }
  if (condition.type === "hasAlertType") {
    return (context.alerts || []).some((item) => item.type === condition.value);
  }
  if (condition.type === "projectStatusCountAtLeast") {
    const min = Number(condition.min || 1);
    const count = (context.projects || []).filter((p) => p.status === condition.status).length;
    return count >= min;
  }
  return false;
}

async function createApp() {
  await ensureProjectsDir();
  const app = express();
  app.use(express.json());
  app.use(express.static(publicDir));
  app.use((req, _res, next) => {
    if (req.path.startsWith("/api") || req.path === "/") {
      runDueOps({ source: "web" }).catch(() => {});
    }
    next();
  });

  app.get("/api/projects", async (req, res) => {
    const result = await queryIndex(req.query);
    res.json(result);
  });

  app.get("/api/timeline", async (_req, res) => {
    const projects = await loadAllProjects();
    res.json({
      generatedAt: new Date().toISOString(),
      events: buildTimeline(projects)
    });
  });

  app.get("/api/projects/:slug/history", async (req, res) => {
    try {
      const history = await getProjectHistory(req.params.slug, {
        limit: req.query.limit,
        skip: req.query.skip
      });
      res.json({ ok: true, ...history });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/activity", async (req, res) => {
    try {
      const activity = await getPortfolioActivity({ limit: req.query.limit, skip: req.query.skip });
      res.json({ ok: true, ...activity });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/alerts", async (_req, res) => {
    try {
      const alertsPath = path.join(reportsDir, "alerts-latest.json");
      const raw = await fs.readFile(alertsPath, "utf8");
      res.json({ ok: true, alerts: JSON.parse(raw) });
    } catch {
      res.json({ ok: true, alerts: [] });
    }
  });

  app.get("/api/dependencies", async (_req, res) => {
    const projects = await loadAllProjects();
    res.json({ ok: true, ...buildDependencyInsights(projects) });
  });

  app.get("/api/health", async (_req, res) => {
    const projects = await loadAllProjects();
    const ranked = projects
      .map((project) => ({ slug: project.slug, name: project.name, score: computeHealth(project) }))
      .sort((a, b) => a.score - b.score);
    res.json({ ok: true, topAtRisk: ranked.slice(0, 5), all: ranked });
  });

  app.get("/api/portfolio", async (_req, res) => {
    const projects = await loadAllProjects();
    res.json({ ok: true, summary: buildPortfolioSummary(projects) });
  });

  app.get("/api/capacity", async (req, res) => {
    const days = Math.max(1, Math.min(Number(req.query.days) || 7, 60));
    const hoursPerDay = Math.max(1, Math.min(Number(req.query.hoursPerDay) || 6, 24));
    const projects = await loadAllProjects();
    const active = projects.filter((p) => p.status !== "done");
    const totalEstimate = active.reduce((sum, p) => sum + Number(p.estimateHours || 0), 0);
    const capacity = days * hoursPerDay;
    res.json({
      ok: true,
      days,
      hoursPerDay,
      capacityHours: capacity,
      plannedHours: totalEstimate,
      utilization: capacity ? Math.round((totalEstimate / capacity) * 100) : 0,
      activeProjects: active.length
    });
  });

  app.get("/api/time-entries", async (req, res) => {
    const days = Math.max(1, Math.min(Number(req.query.days) || 14, 180));
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const rows = (await readNdjson(timeEntriesPath)).filter((row) => new Date(row.at || 0).getTime() >= cutoff);
    const totalMinutes = rows.reduce((sum, row) => sum + Number(row.minutes || 0), 0);
    res.json({ ok: true, days, totalMinutes, entries: rows.slice(-200).reverse() });
  });

  app.post("/api/time-entries", async (req, res) => {
    try {
      if (!req.body.slug || !Number.isFinite(Number(req.body.minutes))) {
        throw new Error("slug and minutes are required");
      }
      await appendTimeEntry({
        slug: req.body.slug,
        minutes: Math.max(1, Number(req.body.minutes)),
        note: String(req.body.note || "").trim(),
        date: String(req.body.date || new Date().toISOString().slice(0, 10))
      });
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/intake/forms", async (_req, res) => {
    try {
      const raw = await fs.readFile(intakeFormsPath, "utf8");
      res.json({ ok: true, ...JSON.parse(raw) });
    } catch {
      res.json({ ok: true, forms: [] });
    }
  });

  app.post("/api/intake/submit", async (req, res) => {
    try {
      const formId = String(req.body.formId || "");
      const result = await submitIntakeForm({ formId, payload: req.body.payload || {} });
      res.json({ ok: true, result });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/intake/events", async (req, res) => {
    try {
      const limit = Math.max(1, Math.min(Number(req.query.limit) || 50, 500));
      const events = await listIncomingEvents({ limit });
      res.json({ ok: true, events });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/intake/events", async (req, res) => {
    try {
      const queued = await enqueueIncomingEvent(req.body || {});
      if (Boolean(req.query.autoProcess)) {
        const processed = await processIncomingEvents({ dryRun: false, maxEvents: 1 });
        res.json({ ok: true, queued, processed });
        return;
      }
      res.json({ ok: true, ...queued });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/intake/process", async (req, res) => {
    try {
      const dryRun = Boolean(req.body?.dryRun);
      const maxEvents = Math.max(0, Number(req.body?.maxEvents) || 25);
      const result = await processIncomingEvents({ dryRun, maxEvents });
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/ops-state", async (_req, res) => {
    res.json({ ok: true, state: await readOpsState() });
  });

  app.get("/api/playbook/actions", async (_req, res) => {
    const projects = await loadAllProjects();
    const dependencyInsights = buildDependencyInsights(projects);
    let alerts = [];
    try {
      const alertsPath = path.join(reportsDir, "alerts-latest.json");
      const raw = await fs.readFile(alertsPath, "utf8");
      alerts = JSON.parse(raw);
    } catch {
      alerts = [];
    }
    const queue = buildActionQueue(projects, alerts, dependencyInsights);
    await writeActionQueueReport(queue);
    res.json({ ok: true, ...queue });
  });

  app.get("/api/automation/rules", async (_req, res) => {
    const config = await readJson(automationRulesPath, { rules: [] });
    res.json({ ok: true, ...config });
  });

  app.put("/api/automation/rules", async (req, res) => {
    try {
      const rules = Array.isArray(req.body?.rules) ? req.body.rules : null;
      if (!rules) throw new Error("rules array is required");
      await writeJson(automationRulesPath, { rules });
      res.json({ ok: true, rulesCount: rules.length });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/automation/runs", async (req, res) => {
    const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 200));
    const rows = await readNdjson(automationRunsPath);
    res.json({ ok: true, runs: rows.slice(-limit).reverse() });
  });

  app.post("/api/automation/run", async (req, res) => {
    try {
      const dryRun = Boolean(req.body?.dryRun);
      const config = await readJson(automationRulesPath, { rules: [] });
      const projects = await loadAllProjects();
      const alerts = await readJson(path.join(reportsDir, "alerts-latest.json"), []);
      const context = { projects, alerts };
      const outcomes = [];
      for (const rule of config.rules || []) {
        if (!rule?.enabled) continue;
        const passed = (rule.conditions || []).every((cond) => evaluateCondition(cond, context));
        const outcome = { ruleId: rule.id, name: rule.name, passed, actions: [] };
        if (passed) {
          for (const action of rule.actions || []) {
            if (action.type === "regeneratePlaybook") {
              const queue = buildActionQueue(projects, alerts, buildDependencyInsights(projects));
              if (!dryRun) await writeActionQueueReport(queue);
              outcome.actions.push({ type: action.type, ok: true, dryRun });
              continue;
            }
            if (action.type === "appendAutomationNote") {
              if (!dryRun) {
                await appendDecisionLog({
                  slug: "system",
                  fromStatus: "automation",
                  toStatus: "automation",
                  note: String(action.value || "automation note"),
                  source: "automation.rule"
                });
              }
              outcome.actions.push({ type: action.type, ok: true, dryRun });
              continue;
            }
            outcome.actions.push({ type: action.type, ok: false, error: "Unsupported action type" });
          }
        }
        outcomes.push(outcome);
      }
      const summary = { dryRun, evaluated: (config.rules || []).length, outcomes };
      if (!dryRun) await appendAutomationRun(summary);
      res.json({ ok: true, ...summary });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/playbook/resolve-safe", async (req, res) => {
    try {
      const dryRun = Boolean(req.body?.dryRun);
      const maxActions = Math.max(0, Number(req.body?.maxActions) || 999);
      const result = await resolveSafePlaybookActions({ dryRun, maxActions });
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/migration/preview", async (req, res) => {
    try {
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      const normalized = [];
      const issues = [];
      const mapStatus = {
        todo: "planning",
        inprogress: "active",
        blocked: "blocked",
        done: "done"
      };
      for (const [index, item] of items.entries()) {
        const title = String(item.title || item.name || "").trim();
        if (!title) {
          issues.push({ index, field: "title", error: "missing title/name" });
          continue;
        }
        const rawState = String(item.state || item.status || "planning").toLowerCase();
        const mappedStatus = mapStatus[rawState] || (["idea", "planning", "active", "blocked", "done"].includes(rawState) ? rawState : "planning");
        const dueDate = String(item.due || item.dueDate || "");
        const estimateHours = Math.max(0, Number(item.estimateHours || 0));
        normalized.push({
          slug: toSlug(title),
          name: title,
          owner: String(item.owner || "unassigned"),
          status: mappedStatus,
          dueDate,
          estimateHours
        });
        if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
          issues.push({ index, field: "dueDate", error: "must be ISO YYYY-MM-DD" });
        }
      }
      res.json({ ok: true, total: items.length, normalized, issues });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/workspace/export-snapshot", async (_req, res) => {
    try {
      const projects = await loadAllProjects();
      const alerts = await readJson(path.join(reportsDir, "alerts-latest.json"), []);
      const actionQueue = await readJson(path.join(reportsDir, "action-queue-latest.json"), { actions: [] });
      const snapshotDir = path.join(reportsDir, "workspace-snapshot");
      await fs.mkdir(snapshotDir, { recursive: true });
      const manifest = {
        generatedAt: new Date().toISOString(),
        projectCount: projects.length,
        alertsCount: alerts.length,
        actionQueueCount: (actionQueue.actions || []).length,
        projects: projects.map((p) => ({
          slug: p.slug,
          status: p.status,
          priority: p.priority,
          dueDate: p.dueDate,
          estimateHours: p.estimateHours || 0
        }))
      };
      const target = path.join(snapshotDir, "workspace-snapshot-latest.json");
      await fs.writeFile(target, JSON.stringify(manifest, null, 2), "utf8");
      res.json({ ok: true, path: target, summary: manifest });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/today-brief", async (_req, res) => {
    const projects = await loadAllProjects();
    const now = new Date();
    const dueSoonCutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const ranked = projects
      .map((project) => ({ slug: project.slug, name: project.name, score: computeHealth(project), nextAction: project.nextAction }))
      .sort((a, b) => a.score - b.score);
    const overdue = projects
      .filter((p) => p.dueDate && new Date(p.dueDate) < now && p.status !== "done")
      .map((p) => ({ slug: p.slug, dueDate: p.dueDate }));
    const dueSoon = projects
      .filter((p) => p.dueDate && new Date(p.dueDate) >= now && new Date(p.dueDate) <= dueSoonCutoff)
      .map((p) => ({ slug: p.slug, dueDate: p.dueDate }));
    const blocked = projects
      .filter((p) => p.status === "blocked")
      .map((p) => ({ slug: p.slug, reason: p.blockedReason || "" }));
    const stale = projects
      .filter((p) => {
        const d = new Date(p.lastUpdated || p.modifiedAt);
        return now.getTime() - d.getTime() > 14 * 24 * 60 * 60 * 1000;
      })
      .map((p) => ({ slug: p.slug, lastUpdated: p.lastUpdated }));
    res.json({
      ok: true,
      topRisks: ranked.slice(0, 5),
      overdue,
      dueSoon,
      blocked,
      stale,
      nextActions: ranked.slice(0, 5).map((r) => ({ slug: r.slug, nextAction: r.nextAction || "n/a" }))
    });
  });

  app.get("/api/trends", async (req, res) => {
    const days = Math.max(1, Math.min(Number(req.query.days) || 7, 90));
    const snapshotsDir = path.join(reportsDir, "snapshots");
    try {
      const files = (await fs.readdir(snapshotsDir))
        .filter((f) => f.endsWith(".json"))
        .sort()
        .slice(-days);
      const rows = [];
      for (const file of files) {
        const raw = await fs.readFile(path.join(snapshotsDir, file), "utf8");
        rows.push(JSON.parse(raw));
      }
      res.json({ ok: true, days, rows });
    } catch {
      res.json({ ok: true, days, rows: [] });
    }
  });

  app.patch("/api/projects/:slug/status", async (req, res) => {
    try {
      await assertVersionToken(req.params.slug, req.body.versionToken);
      const result = await updateProjectStatus(req.params.slug, req.body.status);
      if (typeof req.body.decisionNote === "string" && req.body.decisionNote.trim()) {
        await appendDecisionLog({
          slug: req.params.slug,
          fromStatus: req.body.previousStatus || "unknown",
          toStatus: req.body.status,
          note: req.body.decisionNote.trim(),
          source: "web"
        });
      }
      const commit = await maybeAutoCommit({
        slug: req.params.slug,
        message: `project(${req.params.slug}): update status to ${req.body.status}`,
        files: [result.updatedFile]
      });
      res.json({ ok: true, commit });
    } catch (error) {
      if (error.code === "VERSION_CONFLICT" || error.code === "TOKEN_REQUIRED") {
        res.status(409).json({ ok: false, error: error.message, currentToken: error.currentToken });
        return;
      }
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/projects/:slug/tasks", async (req, res) => {
    try {
      if (!req.body.task || typeof req.body.task !== "string") {
        throw new Error("task is required");
      }
      await assertVersionToken(req.params.slug, req.body.versionToken);
      const result = await addTask(req.params.slug, req.body.task.trim(), req.body.recurrence || "");
      const commit = await maybeAutoCommit({
        slug: req.params.slug,
        message: `project(${req.params.slug}): add task${req.body.recurrence ? ` (${req.body.recurrence})` : ""}`,
        files: [result.updatedFile]
      });
      res.json({ ok: true, commit });
    } catch (error) {
      if (error.code === "VERSION_CONFLICT" || error.code === "TOKEN_REQUIRED") {
        res.status(409).json({ ok: false, error: error.message, currentToken: error.currentToken });
        return;
      }
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.patch("/api/projects/bulk", async (req, res) => {
    try {
      const updates = Array.isArray(req.body?.updates) ? req.body.updates : [];
      if (!updates.length) throw new Error("updates array is required");
      const results = [];
      for (const item of updates) {
        if (!item?.slug || !item?.versionToken) {
          results.push({ slug: item?.slug || "unknown", ok: false, error: "slug and versionToken are required" });
          continue;
        }
        try {
          await assertVersionToken(item.slug, item.versionToken);
          if (item.status) {
            await updateProjectStatus(item.slug, item.status);
            if (typeof item.decisionNote === "string" && item.decisionNote.trim()) {
              await appendDecisionLog({
                slug: item.slug,
                fromStatus: item.previousStatus || "unknown",
                toStatus: item.status,
                note: item.decisionNote.trim(),
                source: "web.bulk"
              });
            }
          }
          const patch = {};
          if (typeof item.priority === "string") patch.priority = item.priority;
          if (typeof item.nextAction === "string") patch.nextAction = item.nextAction;
          if (typeof item.blockedReason === "string") patch.blockedReason = item.blockedReason;
          if (Object.keys(patch).length) {
            await updateProjectMeta(item.slug, patch);
          }
          results.push({ slug: item.slug, ok: true });
        } catch (error) {
          results.push({ slug: item.slug, ok: false, error: error.message, code: error.code || "UPDATE_FAILED" });
        }
      }
      res.json({ ok: true, results });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.patch("/api/projects/:slug/milestones/:milestoneId", async (req, res) => {
    try {
      await assertVersionToken(req.params.slug, req.body.versionToken);
      const result = await updateMilestone(req.params.slug, req.params.milestoneId, req.body || {});
      const commit = await maybeAutoCommit({
        slug: req.params.slug,
        message: `project(${req.params.slug}): update milestone ${req.params.milestoneId}`,
        files: [result.updatedFile]
      });
      res.json({ ok: true, commit });
    } catch (error) {
      if (error.code === "VERSION_CONFLICT" || error.code === "TOKEN_REQUIRED") {
        res.status(409).json({ ok: false, error: error.message, currentToken: error.currentToken });
        return;
      }
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.patch("/api/projects/:slug/meta", async (req, res) => {
    try {
      await assertVersionToken(req.params.slug, req.body.versionToken);
      const result = await updateProjectMeta(req.params.slug, req.body || {});
      const commit = await maybeAutoCommit({
        slug: req.params.slug,
        message: `project(${req.params.slug}): update project metadata`,
        files: [result.updatedFile]
      });
      res.json({ ok: true, commit });
    } catch (error) {
      if (error.code === "VERSION_CONFLICT" || error.code === "TOKEN_REQUIRED") {
        res.status(409).json({ ok: false, error: error.message, currentToken: error.currentToken });
        return;
      }
      res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.get("*", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });

  return app;
}

const port = Number(process.env.PORT || 3000);
const app = await createApp();
app.listen(port, () => {
  console.log(`Project dashboard running on http://localhost:${port}`);
});
