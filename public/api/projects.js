/** Portfolio / markdown-project HTTP API (no DOM). */

export async function listProjects(queryString) {
  const res = await fetch(`/api/projects?${queryString}`);
  return res.json();
}

export async function fetchTimeline() {
  const res = await fetch("/api/timeline");
  return res.json();
}

export async function fetchTaskBoard() {
  const res = await fetch("/api/tasks/board");
  return res.json();
}

export async function fetchHealth() {
  const res = await fetch("/api/health");
  return res.json();
}

export async function fetchAlerts() {
  const res = await fetch("/api/alerts");
  return res.json();
}

export async function fetchActivity() {
  const res = await fetch("/api/activity?limit=10");
  return res.json();
}

export async function fetchActionQueue() {
  const res = await fetch("/api/playbook/actions");
  return res.json();
}

export async function fetchDependencies() {
  const res = await fetch("/api/dependencies");
  return res.json();
}

export async function fetchPortfolio() {
  const res = await fetch("/api/portfolio");
  return res.json();
}

export async function fetchTodayBrief() {
  const res = await fetch("/api/today-brief");
  return res.json();
}

export async function fetchTrends() {
  const res = await fetch("/api/trends?days=7");
  return res.json();
}

export async function fetchOpsState() {
  const res = await fetch("/api/ops-state");
  return res.json();
}

export async function fetchCapacity() {
  const res = await fetch("/api/capacity?days=7");
  return res.json();
}

export async function fetchTimeEntries() {
  const res = await fetch("/api/time-entries?days=14");
  return res.json();
}

export async function fetchIntakeForms() {
  const res = await fetch("/api/intake/forms");
  return res.json();
}

export async function fetchProjectFacts(slug) {
  const res = await fetch(`/api/projects/${slug}/facts`);
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || "Failed to load facts");
  return data.facts || [];
}

export async function postTimeEntry(payload) {
  const res = await fetch("/api/time-entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || "Failed to log time");
}

export async function postIntakeSubmit(formId, payload) {
  const res = await fetch("/api/intake/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ formId, payload })
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || "Failed intake submit");
  return data;
}

export async function postAutomationRun(dryRun) {
  const res = await fetch("/api/automation/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dryRun })
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || "Automation run failed");
  return data;
}

export async function fetchAutomationRuns() {
  const res = await fetch("/api/automation/runs?limit=10");
  return res.json();
}

export async function postExportSnapshot() {
  const res = await fetch("/api/workspace/export-snapshot", { method: "POST" });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || "Snapshot export failed");
  return data;
}

export async function postMigrationPreview(items) {
  const res = await fetch("/api/migration/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items })
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || "Migration preview failed");
  return data;
}

export function patchProjectStatus(slug, body) {
  return fetch(`/api/projects/${slug}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function postProjectTask(slug, body) {
  return fetch(`/api/projects/${slug}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export async function patchProjectsBulk(updates) {
  const res = await fetch("/api/projects/bulk", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updates })
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || "Bulk update failed");
  return data.results || [];
}

export async function fetchProjectHistory(slug) {
  const res = await fetch(`/api/projects/${slug}/history?limit=5`);
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load history");
  return data.commits || [];
}

export function patchProjectMeta(slug, body) {
  return fetch(`/api/projects/${slug}/meta`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function patchTaskState(projectSlug, taskId, body) {
  return fetch(`/api/projects/${projectSlug}/tasks/${taskId}/state`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function postProjectFact(slug, body) {
  return fetch(`/api/projects/${slug}/facts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function patchProjectFact(slug, factId, body) {
  const encSlug = encodeURIComponent(slug);
  const encFact = encodeURIComponent(factId);
  return fetch(`/api/projects/${encSlug}/facts/${encFact}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

export function patchTaskFactRefs(slug, taskId, body) {
  return fetch(`/api/projects/${slug}/tasks/${taskId}/facts`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}
