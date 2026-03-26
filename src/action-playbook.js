import fs from "node:fs/promises";
import path from "node:path";

const PRIORITY_WEIGHT = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function stableActionId(parts) {
  return parts.filter(Boolean).join(":");
}

function prioritySort(a, b) {
  const diff = (PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0);
  if (diff !== 0) return diff;
  return a.title.localeCompare(b.title);
}

function actionBase({
  id,
  title,
  reason,
  priority,
  projectSlug = null,
  alertType,
  safeExecute = false,
  requiresVersionToken = false,
  suggestedPatch = null,
  executeHint = null
}) {
  return {
    id,
    title,
    reason,
    priority,
    projectSlug,
    alertType,
    safeExecute,
    requiresVersionToken,
    suggestedPatch,
    executeHint
  };
}

export function buildActionQueue(projects, alerts, dependencyInsights = { invalidRefs: [], blockedBy: {} }) {
  const projectBySlug = new Map(toArray(projects).map((project) => [project.slug, project]));
  const queue = [];

  for (const alert of toArray(alerts)) {
    if (alert.type === "stale" && alert.slug) {
      const project = projectBySlug.get(alert.slug);
      if (!project) continue;
      const nextAction =
        project.nextAction && project.nextAction.trim()
          ? project.nextAction.trim()
          : "Review project state and update next milestone decision.";
      queue.push(
        actionBase({
          id: stableActionId(["stale", project.slug]),
          title: `Refresh stale project ${project.slug}`,
          reason: `${project.slug} has been stale for ${alert.days} days.`,
          priority: "high",
          projectSlug: project.slug,
          alertType: "stale",
          safeExecute: true,
          requiresVersionToken: true,
          suggestedPatch: { nextAction },
          executeHint: "update_project_meta"
        })
      );
      continue;
    }

    if (alert.type === "blockedTooLong" && alert.slug) {
      const project = projectBySlug.get(alert.slug);
      if (!project) continue;
      const nextAction =
        project.nextAction && project.nextAction.trim()
          ? project.nextAction.trim()
          : "Escalate blocker owner and define unblock step today.";
      queue.push(
        actionBase({
          id: stableActionId(["blockedTooLong", project.slug]),
          title: `Unblock project ${project.slug}`,
          reason: `${project.slug} is blocked for ${alert.days} days.`,
          priority: "critical",
          projectSlug: project.slug,
          alertType: "blockedTooLong",
          safeExecute: true,
          requiresVersionToken: true,
          suggestedPatch: {
            nextAction,
            blockedReason: project.blockedReason || String(alert.reason || "")
          },
          executeHint: "update_project_meta"
        })
      );
      continue;
    }

    if (alert.type === "overdue" && alert.slug) {
      queue.push(
        actionBase({
          id: stableActionId(["overdue", alert.slug]),
          title: `Resolve overdue plan for ${alert.slug}`,
          reason: `${alert.slug} is overdue since ${alert.dueDate}.`,
          priority: "critical",
          projectSlug: alert.slug,
          alertType: "overdue",
          safeExecute: false,
          requiresVersionToken: false,
          suggestedPatch: null,
          executeHint: "manual_decision_required"
        })
      );
      continue;
    }

    if (alert.type === "dependencyInvalidRef") {
      queue.push(
        actionBase({
          id: stableActionId(["dependencyInvalidRef", alert.milestone, alert.missing]),
          title: "Fix invalid milestone dependency reference",
          reason: `${alert.milestone} points to missing dependency ${alert.missing}.`,
          priority: "high",
          projectSlug: String(alert.milestone || "").split(":")[0] || null,
          alertType: "dependencyInvalidRef",
          safeExecute: false,
          requiresVersionToken: false,
          suggestedPatch: null,
          executeHint: "update_milestone"
        })
      );
    }
  }

  for (const invalid of toArray(dependencyInsights.invalidRefs)) {
    queue.push(
      actionBase({
        id: stableActionId(["invalidRef", invalid.from, invalid.missing]),
        title: "Repair broken dependency link",
        reason: `${invalid.from} references missing milestone ${invalid.missing}.`,
        priority: "high",
        projectSlug: String(invalid.from || "").split(":")[0] || null,
        alertType: "dependencyInvalidRef",
        safeExecute: false,
        requiresVersionToken: false,
        suggestedPatch: null,
        executeHint: "update_milestone"
      })
    );
  }

  const deduped = Array.from(new Map(queue.map((action) => [action.id, action])).values()).sort(prioritySort);
  return {
    generatedAt: new Date().toISOString(),
    total: deduped.length,
    actions: deduped
  };
}

export async function writeActionQueueReport(queue) {
  const reportsDir = path.join(process.cwd(), "reports");
  await fs.mkdir(reportsDir, { recursive: true });
  const target = path.join(reportsDir, "action-queue-latest.json");
  await fs.writeFile(target, JSON.stringify(queue, null, 2), "utf8");
  return target;
}
