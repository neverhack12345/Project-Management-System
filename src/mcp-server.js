import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import {
  addTask,
  assertVersionToken,
  loadAllProjects,
  loadProject,
  updateMilestone,
  updateProjectMeta,
  updateProjectStatus
} from "./markdown-store.js";
import {
  buildDependencyInsights,
  buildPortfolioSummary,
  buildTimeline,
  computeHealth
} from "./indexer.js";
import { getPortfolioActivity, getProjectHistory } from "./git-history.js";
import { readOpsState, runDueOps } from "./auto-ops.js";
import { buildActionQueue, writeActionQueueReport } from "./action-playbook.js";
import { resolveSafePlaybookActions } from "./playbook-resolver.js";
import { enqueueIncomingEvent, listIncomingEvents, processIncomingEvents } from "./intake-automation.js";

const execFileAsync = promisify(execFile);

const server = new Server(
  { name: "project-management-mcp", version: "0.1.0" },
  { capabilities: { tools: {}, resources: {} } }
);

function contentJson(value) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

async function runNodeScript(scriptName, args = [], dryRun = false) {
  if (dryRun) return { ok: true, dryRun: true, scriptName, args };
  const scriptPath = path.join(process.cwd(), "scripts", scriptName);
  const { stdout, stderr } = await execFileAsync("node", [scriptPath, ...args], { cwd: process.cwd() });
  return { ok: true, scriptName, stdout, stderr };
}

function toolError(error) {
  const payload = { ok: false, error: error.message || String(error) };
  if (error.code) payload.code = error.code;
  if (error.currentToken) payload.currentToken = error.currentToken;
  return contentJson(payload);
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: "list_projects", description: "List all projects", inputSchema: { type: "object", properties: {} } },
    { name: "get_project", description: "Get a project by slug", inputSchema: { type: "object", required: ["slug"], properties: { slug: { type: "string" } } } },
    { name: "get_timeline", description: "Get milestone timeline", inputSchema: { type: "object", properties: {} } },
    { name: "get_activity", description: "Get portfolio git activity", inputSchema: { type: "object", properties: { limit: { type: "number" }, skip: { type: "number" } } } },
    { name: "get_health", description: "Get health scores and top risks", inputSchema: { type: "object", properties: {} } },
    { name: "get_dependencies", description: "Get dependency insights", inputSchema: { type: "object", properties: {} } },
    { name: "get_portfolio_summary", description: "Get owner/status/month summary", inputSchema: { type: "object", properties: {} } },
    { name: "get_alerts", description: "Get generated alerts", inputSchema: { type: "object", properties: {} } },
    { name: "get_today_brief", description: "Get consolidated daily operational brief", inputSchema: { type: "object", properties: {} } },
    { name: "get_trends", description: "Get snapshot trends", inputSchema: { type: "object", properties: { days: { type: "number" } } } },
    { name: "get_ops_state", description: "Get auto-ops state file status", inputSchema: { type: "object", properties: {} } },
    { name: "get_actionable_playbook", description: "Get prioritized actionable alert queue", inputSchema: { type: "object", properties: {} } },
    {
      name: "enqueue_incoming_event",
      description: "Queue an incoming event for automatic triage",
      inputSchema: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          owner: { type: "string" },
          urgency: { type: "string" },
          dueDays: { type: "number" },
          estimateHours: { type: "number" },
          projectSlug: { type: "string" },
          recurrence: { type: "string" },
          kind: { type: "string" }
        }
      }
    },
    {
      name: "list_incoming_events",
      description: "List recently queued incoming events",
      inputSchema: { type: "object", properties: { limit: { type: "number" } } }
    },
    {
      name: "process_incoming_events",
      description: "Process pending incoming events using automatic routing",
      inputSchema: {
        type: "object",
        properties: {
          dryRun: { type: "boolean" },
          maxEvents: { type: "number" }
        }
      }
    },
    {
      name: "resolve_safe_playbook_actions",
      description: "Execute all safe playbook actions in one pass",
      inputSchema: {
        type: "object",
        properties: {
          dryRun: { type: "boolean" },
          maxActions: { type: "number" }
        }
      }
    },
    {
      name: "run_playbook_action",
      description: "Execute one safe playbook action by actionId",
      inputSchema: {
        type: "object",
        required: ["actionId"],
        properties: {
          actionId: { type: "string" },
          versionToken: { type: "string" },
          dryRun: { type: "boolean" }
        }
      }
    },
    {
      name: "update_project_status",
      description: "Update project status (side effect, requires versionToken)",
      inputSchema: {
        type: "object",
        required: ["slug", "status", "versionToken"],
        properties: { slug: { type: "string" }, status: { type: "string" }, versionToken: { type: "string" } }
      }
    },
    {
      name: "add_project_task",
      description: "Add task to project (side effect, requires versionToken)",
      inputSchema: {
        type: "object",
        required: ["slug", "task", "versionToken"],
        properties: { slug: { type: "string" }, task: { type: "string" }, versionToken: { type: "string" } }
      }
    },
    {
      name: "update_project_meta",
      description: "Update project metadata (side effect, requires versionToken)",
      inputSchema: {
        type: "object",
        required: ["slug", "versionToken"],
        properties: {
          slug: { type: "string" },
          blockedReason: { type: "string" },
          nextAction: { type: "string" },
          priority: { type: "string" },
          versionToken: { type: "string" }
        }
      }
    },
    {
      name: "update_milestone",
      description: "Update milestone fields (side effect, requires versionToken)",
      inputSchema: {
        type: "object",
        required: ["slug", "milestoneId", "versionToken"],
        properties: {
          slug: { type: "string" },
          milestoneId: { type: "string" },
          name: { type: "string" },
          status: { type: "string" },
          startDate: { type: "string" },
          dueDate: { type: "string" },
          versionToken: { type: "string" }
        }
      }
    },
    { name: "run_validate", description: "Run validation script", inputSchema: { type: "object", properties: { dryRun: { type: "boolean" } } } },
    { name: "run_weekly_review", description: "Generate weekly review report", inputSchema: { type: "object", properties: { dryRun: { type: "boolean" } } } },
    { name: "run_alerts", description: "Generate alerts report", inputSchema: { type: "object", properties: { dryRun: { type: "boolean" } } } },
    { name: "run_search_index", description: "Build local search index", inputSchema: { type: "object", properties: { dryRun: { type: "boolean" } } } },
    { name: "run_impact_check", description: "Generate impact report", inputSchema: { type: "object", properties: { dryRun: { type: "boolean" } } } },
    { name: "run_schema_migration", description: "Run schema migration", inputSchema: { type: "object", properties: { dryRun: { type: "boolean" } } } },
    { name: "generate_pr_summary", description: "Generate PR summary markdown", inputSchema: { type: "object", properties: { dryRun: { type: "boolean" } } } }
    ,
    { name: "playbook_daily_standup", description: "Run daily standup playbook (validate+alerts+brief)", inputSchema: { type: "object", properties: { dryRun: { type: "boolean" } } } },
    { name: "playbook_unblock_scan", description: "Run unblock scan playbook", inputSchema: { type: "object", properties: { dryRun: { type: "boolean" } } } },
    { name: "playbook_weekly_review", description: "Run weekly review playbook", inputSchema: { type: "object", properties: { dryRun: { type: "boolean" } } } }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = request.params.arguments || {};
  runDueOps({ source: "mcp" }).catch(() => {});
  try {
    switch (request.params.name) {
      case "list_projects":
        return contentJson({ projects: await loadAllProjects() });
      case "get_project":
        return contentJson({ project: await loadProject(args.slug) });
      case "get_timeline": {
        const projects = await loadAllProjects();
        return contentJson({ events: buildTimeline(projects) });
      }
      case "get_activity":
        return contentJson(await getPortfolioActivity({ limit: args.limit, skip: args.skip }));
      case "get_health": {
        const projects = await loadAllProjects();
        const ranked = projects
          .map((project) => ({ slug: project.slug, name: project.name, score: computeHealth(project) }))
          .sort((a, b) => a.score - b.score);
        return contentJson({ topAtRisk: ranked.slice(0, 5), all: ranked });
      }
      case "get_dependencies": {
        const projects = await loadAllProjects();
        return contentJson(buildDependencyInsights(projects));
      }
      case "get_portfolio_summary": {
        const projects = await loadAllProjects();
        return contentJson(buildPortfolioSummary(projects));
      }
      case "get_alerts": {
        const alertsPath = path.join(process.cwd(), "reports", "alerts-latest.json");
        try {
          const raw = await fs.readFile(alertsPath, "utf8");
          return contentJson({ alerts: JSON.parse(raw) });
        } catch {
          return contentJson({ alerts: [] });
        }
      }
      case "get_today_brief": {
        const projects = await loadAllProjects();
        const now = new Date();
        const dueSoonCutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const ranked = projects
          .map((project) => ({ slug: project.slug, score: computeHealth(project), nextAction: project.nextAction }))
          .sort((a, b) => a.score - b.score);
        return contentJson({
          topRisks: ranked.slice(0, 5),
          overdue: projects.filter((p) => p.dueDate && new Date(p.dueDate) < now && p.status !== "done").map((p) => p.slug),
          dueSoon: projects.filter((p) => p.dueDate && new Date(p.dueDate) >= now && new Date(p.dueDate) <= dueSoonCutoff).map((p) => p.slug),
          blocked: projects.filter((p) => p.status === "blocked").map((p) => p.slug),
          stale: projects.filter((p) => now.getTime() - new Date(p.lastUpdated || p.modifiedAt).getTime() > 14 * 24 * 60 * 60 * 1000).map((p) => p.slug)
        });
      }
      case "get_trends": {
        const days = Math.max(1, Math.min(Number(args.days) || 7, 90));
        const snapshotsDir = path.join(process.cwd(), "reports", "snapshots");
        try {
          const files = (await fs.readdir(snapshotsDir)).filter((f) => f.endsWith(".json")).sort().slice(-days);
          const rows = [];
          for (const file of files) {
            const raw = await fs.readFile(path.join(snapshotsDir, file), "utf8");
            rows.push(JSON.parse(raw));
          }
          return contentJson({ days, rows });
        } catch {
          return contentJson({ days, rows: [] });
        }
      }
      case "get_ops_state":
        return contentJson({ state: await readOpsState() });
      case "get_actionable_playbook": {
        const projects = await loadAllProjects();
        let alerts = [];
        try {
          const raw = await fs.readFile(path.join(process.cwd(), "reports", "alerts-latest.json"), "utf8");
          alerts = JSON.parse(raw);
        } catch {
          alerts = [];
        }
        const queue = buildActionQueue(projects, alerts, buildDependencyInsights(projects));
        await writeActionQueueReport(queue);
        return contentJson(queue);
      }
      case "enqueue_incoming_event":
        return contentJson(await enqueueIncomingEvent(args));
      case "list_incoming_events":
        return contentJson({ events: await listIncomingEvents({ limit: args.limit }) });
      case "process_incoming_events":
        return contentJson(await processIncomingEvents({ dryRun: Boolean(args.dryRun), maxEvents: args.maxEvents }));
      case "run_playbook_action": {
        const projects = await loadAllProjects();
        let alerts = [];
        try {
          const raw = await fs.readFile(path.join(process.cwd(), "reports", "alerts-latest.json"), "utf8");
          alerts = JSON.parse(raw);
        } catch {
          alerts = [];
        }
        const queue = buildActionQueue(projects, alerts, buildDependencyInsights(projects));
        const action = (queue.actions || []).find((item) => item.id === args.actionId);
        if (!action) throw new Error(`Playbook action not found: ${args.actionId}`);
        if (!action.safeExecute) {
          return contentJson({
            ok: false,
            actionId: args.actionId,
            reason: "Action requires manual decision and cannot be auto-executed."
          });
        }
        if (!action.projectSlug || action.executeHint !== "update_project_meta") {
          throw new Error("Unsupported safe-execute action shape.");
        }
        if (args.dryRun) {
          return contentJson({
            ok: true,
            dryRun: true,
            actionId: args.actionId,
            wouldExecute: {
              tool: "update_project_meta",
              slug: action.projectSlug,
              patch: action.suggestedPatch
            }
          });
        }
        await assertVersionToken(action.projectSlug, args.versionToken);
        const result = await updateProjectMeta(action.projectSlug, action.suggestedPatch || {});
        return contentJson({ ok: true, actionId: args.actionId, result });
      }
      case "resolve_safe_playbook_actions":
        return contentJson(await resolveSafePlaybookActions({ dryRun: Boolean(args.dryRun), maxActions: args.maxActions }));
      case "update_project_status":
        await assertVersionToken(args.slug, args.versionToken);
        return contentJson(await updateProjectStatus(args.slug, args.status));
      case "add_project_task":
        await assertVersionToken(args.slug, args.versionToken);
        return contentJson(await addTask(args.slug, args.task));
      case "update_project_meta":
        await assertVersionToken(args.slug, args.versionToken);
        return contentJson(
          await updateProjectMeta(args.slug, {
            blockedReason: args.blockedReason,
            nextAction: args.nextAction,
            priority: args.priority
          })
        );
      case "update_milestone":
        await assertVersionToken(args.slug, args.versionToken);
        return contentJson(
          await updateMilestone(args.slug, args.milestoneId, {
            name: args.name,
            status: args.status,
            startDate: args.startDate,
            dueDate: args.dueDate
          })
        );
      case "run_validate":
        return contentJson(await runNodeScript("validate.mjs", [], args.dryRun));
      case "run_weekly_review":
        return contentJson(await runNodeScript("weekly-review.mjs", [], args.dryRun));
      case "run_alerts":
        return contentJson(await runNodeScript("alerts.mjs", [], args.dryRun));
      case "run_search_index":
        return contentJson(await runNodeScript("build-search-index.mjs", [], args.dryRun));
      case "run_impact_check":
        return contentJson(await runNodeScript("impact-check.mjs", [], args.dryRun));
      case "run_schema_migration":
        return contentJson(await runNodeScript("migrate-schema.mjs", [], args.dryRun));
      case "generate_pr_summary":
        return contentJson(await runNodeScript("pr-summary.mjs", [], args.dryRun));
      case "playbook_daily_standup": {
        const dryRun = Boolean(args.dryRun);
        const validate = await runNodeScript("validate.mjs", [], dryRun);
        const alerts = await runNodeScript("alerts.mjs", [], dryRun);
        const projects = await loadAllProjects();
        const ranked = projects.map((p) => ({ slug: p.slug, score: computeHealth(p) })).sort((a, b) => a.score - b.score);
        return contentJson({ ok: true, playbook: "daily_standup", validate, alerts, topRisks: ranked.slice(0, 5) });
      }
      case "playbook_unblock_scan": {
        const dryRun = Boolean(args.dryRun);
        const deps = buildDependencyInsights(await loadAllProjects());
        const blocked = (await loadAllProjects()).filter((p) => p.status === "blocked").map((p) => ({ slug: p.slug, reason: p.blockedReason }));
        const alerts = await runNodeScript("alerts.mjs", [], dryRun);
        return contentJson({ ok: true, playbook: "unblock_scan", blocked, dependencyInvalidRefs: deps.invalidRefs, alerts });
      }
      case "playbook_weekly_review": {
        const dryRun = Boolean(args.dryRun);
        const validate = await runNodeScript("validate.mjs", [], dryRun);
        const review = await runNodeScript("weekly-review.mjs", [], dryRun);
        const impact = await runNodeScript("impact-check.mjs", [], dryRun);
        const prSummary = await runNodeScript("pr-summary.mjs", [], dryRun);
        return contentJson({ ok: true, playbook: "weekly_review", validate, review, impact, prSummary });
      }
      default:
        return contentJson({ ok: false, error: `Unknown tool: ${request.params.name}` });
    }
  } catch (error) {
    return toolError(error);
  }
});

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    { uri: "resource://schema", name: "Schema", mimeType: "text/markdown", description: "Project markdown schema" },
    { uri: "resource://readme", name: "README", mimeType: "text/markdown", description: "Project overview and usage" },
    { uri: "resource://scripts", name: "Scripts", mimeType: "application/json", description: "Script capability summary" },
    { uri: "resource://reports/latest-weekly", name: "Latest weekly report", mimeType: "text/markdown", description: "Most recent weekly report" },
    { uri: "resource://reports/alerts", name: "Alerts report", mimeType: "application/json", description: "Latest generated alerts" }
  ]
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  if (uri === "resource://schema") {
    const text = await fs.readFile(path.join(process.cwd(), "docs", "SCHEMA.md"), "utf8");
    return { contents: [{ uri, mimeType: "text/markdown", text }] };
  }
  if (uri === "resource://readme") {
    const text = await fs.readFile(path.join(process.cwd(), "README.md"), "utf8");
    return { contents: [{ uri, mimeType: "text/markdown", text }] };
  }
  if (uri === "resource://scripts") {
    const payload = {
      scripts: [
        "validate.mjs",
        "weekly-review.mjs",
        "alerts.mjs",
        "build-search-index.mjs",
        "impact-check.mjs",
        "migrate-schema.mjs",
        "pr-summary.mjs"
      ]
    };
    return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(payload, null, 2) }] };
  }
  if (uri === "resource://reports/latest-weekly") {
    const reportsDir = path.join(process.cwd(), "reports");
    const files = (await fs.readdir(reportsDir)).filter((f) => f.startsWith("weekly-review-")).sort();
    const latest = files[files.length - 1];
    const text = latest ? await fs.readFile(path.join(reportsDir, latest), "utf8") : "No weekly report found.";
    return { contents: [{ uri, mimeType: "text/markdown", text }] };
  }
  if (uri === "resource://reports/alerts") {
    const alertsPath = path.join(process.cwd(), "reports", "alerts-latest.json");
    let text = "[]";
    try {
      text = await fs.readFile(alertsPath, "utf8");
    } catch {}
    return { contents: [{ uri, mimeType: "application/json", text }] };
  }
  throw new Error(`Unknown resource: ${uri}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
