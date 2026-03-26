import fs from "node:fs/promises";
import path from "node:path";
import { buildDependencyInsights } from "./indexer.js";
import {
  assertVersionToken,
  getProjectVersionToken,
  loadAllProjects,
  updateProjectMeta
} from "./markdown-store.js";
import { buildActionQueue, writeActionQueueReport } from "./action-playbook.js";

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function resolveSafePlaybookActions({ dryRun = false, maxActions = Infinity } = {}) {
  const projects = await loadAllProjects();
  const alerts = await readJson(path.join(process.cwd(), "reports", "alerts-latest.json"), []);
  const queue = buildActionQueue(projects, alerts, buildDependencyInsights(projects));
  const safeCandidates = (queue.actions || [])
    .filter((action) => action.safeExecute && action.projectSlug && action.executeHint === "update_project_meta")
    .slice(0, Math.max(0, Number(maxActions) || 0));

  const results = [];
  for (const action of safeCandidates) {
    if (dryRun) {
      results.push({
        actionId: action.id,
        slug: action.projectSlug,
        ok: true,
        dryRun: true,
        patch: action.suggestedPatch || {}
      });
      continue;
    }
    try {
      const token = await getProjectVersionToken(action.projectSlug);
      await assertVersionToken(action.projectSlug, token);
      await updateProjectMeta(action.projectSlug, action.suggestedPatch || {});
      results.push({ actionId: action.id, slug: action.projectSlug, ok: true });
    } catch (error) {
      results.push({ actionId: action.id, slug: action.projectSlug, ok: false, error: error.message });
    }
  }

  let refreshedQueue = queue;
  if (!dryRun) {
    const refreshedProjects = await loadAllProjects();
    refreshedQueue = buildActionQueue(refreshedProjects, alerts, buildDependencyInsights(refreshedProjects));
    await writeActionQueueReport(refreshedQueue);
  }

  const remainingSafe = (refreshedQueue.actions || []).filter((a) => a.safeExecute).length;
  return {
    ok: true,
    dryRun,
    evaluated: (queue.actions || []).length,
    safeCandidates: safeCandidates.length,
    executed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
    remaining: {
      total: (refreshedQueue.actions || []).length,
      safe: remainingSafe,
      manual: (refreshedQueue.actions || []).length - remainingSafe
    }
  };
}
