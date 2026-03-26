const projectList = document.getElementById("projectList");
const searchInput = document.getElementById("search");
const statusFilter = document.getElementById("statusFilter");
const priorityFilter = document.getElementById("priorityFilter");
const overdueFilter = document.getElementById("overdueFilter");
const saveViewBtn = document.getElementById("saveViewBtn");
const savedViews = document.getElementById("savedViews");
const deleteViewBtn = document.getElementById("deleteViewBtn");
const flash = document.getElementById("flash");
const refreshBtn = document.getElementById("refreshBtn");
const commandPaletteBtn = document.getElementById("commandPaletteBtn");
const selectAllProjects = document.getElementById("selectAllProjects");
const bulkStatus = document.getElementById("bulkStatus");
const bulkPriority = document.getElementById("bulkPriority");
const applyBulkBtn = document.getElementById("applyBulkBtn");
const quietHoursInput = document.getElementById("quietHours");
const digestOverdue = document.getElementById("digestOverdue");
const digestStale = document.getElementById("digestStale");
const digestBlocked = document.getElementById("digestBlocked");
const projectCardTpl = document.getElementById("projectCardTpl");
const calendarEl = document.getElementById("calendar");
const ganttEl = document.getElementById("gantt");
const focusBtns = document.querySelectorAll(".focusBtn");
const historyDrawer = document.getElementById("historyDrawer");
const historyTitle = document.getElementById("historyTitle");
const historyList = document.getElementById("historyList");
const closeHistoryBtn = document.getElementById("closeHistoryBtn");
const healthList = document.getElementById("healthList");
const alertsList = document.getElementById("alertsList");
const actionQueueList = document.getElementById("actionQueueList");
const activityList = document.getElementById("activityList");
const dependencyList = document.getElementById("dependencyList");
const portfolioList = document.getElementById("portfolioList");
const todayBriefList = document.getElementById("todayBriefList");
const trendsList = document.getElementById("trendsList");
const opsStateList = document.getElementById("opsStateList");
const capacityList = document.getElementById("capacityList");
const timeEntriesList = document.getElementById("timeEntriesList");
const timeSlug = document.getElementById("timeSlug");
const timeMinutes = document.getElementById("timeMinutes");
const timeNote = document.getElementById("timeNote");
const addTimeEntryBtn = document.getElementById("addTimeEntryBtn");
const intakeFormSelect = document.getElementById("intakeFormSelect");
const intakePayload = document.getElementById("intakePayload");
const submitIntakeBtn = document.getElementById("submitIntakeBtn");
const intakeList = document.getElementById("intakeList");
const runAutomationDryBtn = document.getElementById("runAutomationDryBtn");
const runAutomationBtn = document.getElementById("runAutomationBtn");
const exportSnapshotBtn = document.getElementById("exportSnapshotBtn");
const automationList = document.getElementById("automationList");
const migrationInput = document.getElementById("migrationInput");
const previewMigrationBtn = document.getElementById("previewMigrationBtn");
const migrationList = document.getElementById("migrationList");
const commandPalette = document.getElementById("commandPalette");
const paletteInput = document.getElementById("paletteInput");
const paletteList = document.getElementById("paletteList");
const closePaletteBtn = document.getElementById("closePaletteBtn");

const SAVED_VIEWS_KEY = "project_dashboard_saved_views";
const DIGEST_PREFS_KEY = "project_dashboard_digest_prefs";
const selectedProjects = new Set();

const qs = () => {
  const p = new URLSearchParams();
  if (searchInput.value.trim()) p.set("q", searchInput.value.trim());
  if (statusFilter.value) p.set("status", statusFilter.value);
  if (priorityFilter.value) p.set("priority", priorityFilter.value);
  if (overdueFilter.checked) p.set("overdue", "true");
  return p.toString();
};

async function fetchProjects() {
  const res = await fetch(`/api/projects?${qs()}`);
  return res.json();
}

async function fetchTimeline() {
  const res = await fetch("/api/timeline");
  return res.json();
}
async function fetchHealth() {
  const res = await fetch("/api/health");
  return res.json();
}
async function fetchAlerts() {
  const res = await fetch("/api/alerts");
  return res.json();
}
async function fetchActivity() {
  const res = await fetch("/api/activity?limit=10");
  return res.json();
}
async function fetchActionQueue() {
  const res = await fetch("/api/playbook/actions");
  return res.json();
}
async function fetchDependencies() {
  const res = await fetch("/api/dependencies");
  return res.json();
}
async function fetchPortfolio() {
  const res = await fetch("/api/portfolio");
  return res.json();
}
async function fetchTodayBrief() {
  const res = await fetch("/api/today-brief");
  return res.json();
}
async function fetchTrends() {
  const res = await fetch("/api/trends?days=7");
  return res.json();
}
async function fetchOpsState() {
  const res = await fetch("/api/ops-state");
  return res.json();
}
async function fetchCapacity() {
  const res = await fetch("/api/capacity?days=7");
  return res.json();
}
async function fetchTimeEntries() {
  const res = await fetch("/api/time-entries?days=14");
  return res.json();
}
async function fetchIntakeForms() {
  const res = await fetch("/api/intake/forms");
  return res.json();
}
async function addTimeEntry(payload) {
  const res = await fetch("/api/time-entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || "Failed to log time");
}
async function submitIntake(formId, payload) {
  const res = await fetch("/api/intake/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ formId, payload })
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || "Failed intake submit");
  return data;
}
async function runAutomation(dryRun) {
  const res = await fetch("/api/automation/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dryRun })
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || "Automation run failed");
  return data;
}
async function fetchAutomationRuns() {
  const res = await fetch("/api/automation/runs?limit=10");
  return res.json();
}
async function exportSnapshot() {
  const res = await fetch("/api/workspace/export-snapshot", { method: "POST" });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || "Snapshot export failed");
  return data;
}
async function previewMigration(items) {
  const res = await fetch("/api/migration/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items })
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || "Migration preview failed");
  return data;
}

async function saveStatus(slug, status, decisionNote = "", previousStatus = "") {
  const project = currentProjects.find((item) => item.slug === slug);
  const res = await fetch(`/api/projects/${slug}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, decisionNote, previousStatus, versionToken: project?.versionToken || "" })
  });
  await handleWriteResponse(res);
}

async function addTask(slug, task, recurrence = "") {
  const project = currentProjects.find((item) => item.slug === slug);
  const res = await fetch(`/api/projects/${slug}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, recurrence, versionToken: project?.versionToken || "" })
  });
  await handleWriteResponse(res);
}

async function applyBulkUpdates(updates) {
  const res = await fetch("/api/projects/bulk", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updates })
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || "Bulk update failed");
  return data.results || [];
}

async function fetchHistory(slug) {
  const res = await fetch(`/api/projects/${slug}/history?limit=5`);
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load history");
  return data.commits || [];
}

async function saveProjectMeta(slug, payload) {
  const project = currentProjects.find((item) => item.slug === slug);
  const res = await fetch(`/api/projects/${slug}/meta`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, versionToken: project?.versionToken || "" })
  });
  await handleWriteResponse(res);
}

async function handleWriteResponse(res) {
  const data = await res.json();
  if (res.status === 409) {
    flash.textContent = `Conflict: ${data.error}`;
    throw new Error(data.error);
  }
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || "Request failed");
  }
  if (data.commit?.warning) {
    flash.textContent = data.commit.warning;
  } else {
    flash.textContent = "";
  }
}

let currentProjects = [];

function readDigestPrefs() {
  try {
    return JSON.parse(localStorage.getItem(DIGEST_PREFS_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeDigestPrefs(value) {
  localStorage.setItem(DIGEST_PREFS_KEY, JSON.stringify(value));
}

function getDigestPrefs() {
  return {
    quietHours: quietHoursInput.value.trim(),
    overdue: digestOverdue.checked,
    stale: digestStale.checked,
    blocked: digestBlocked.checked
  };
}

function applyDigestPrefs(prefs) {
  quietHoursInput.value = prefs.quietHours || "";
  digestOverdue.checked = prefs.overdue !== false;
  digestStale.checked = prefs.stale !== false;
  digestBlocked.checked = prefs.blocked !== false;
}

function renderProjects(projects) {
  currentProjects = projects;
  projectList.innerHTML = "";
  for (const project of projects) {
    const node = projectCardTpl.content.cloneNode(true);
    node.querySelector(".title").textContent = `${project.name} (${project.slug})`;
    const blockedBadge =
      project.status === "blocked" && project.blockedReason
        ? ` | Blocked: ${project.blockedReason}`
        : "";
    node.querySelector(".meta").textContent =
      `Owner: ${project.owner} | Status: ${project.status} | Due: ${project.dueDate || "n/a"}${blockedBadge}`;
    if (project.status === "blocked") {
      node.querySelector(".meta").classList.add("meta-blocked");
    }
    node.querySelector(".action").textContent = `Next: ${project.nextAction || "n/a"} | Recurring tasks: ${project.taskSummary?.recurring || 0}`;
    const statusSelect = node.querySelector(".statusSelect");
    statusSelect.value = project.status;
    const decisionNoteInput = node.querySelector(".decisionNoteInput");
    node.querySelector(".saveStatus").addEventListener("click", async () => {
      const note = decisionNoteInput.value.trim();
      if ((statusSelect.value === "blocked" || statusSelect.value === "done") && !note) {
        flash.textContent = "Decision note is required for blocked/done transitions.";
        return;
      }
      try {
        await saveStatus(project.slug, statusSelect.value, note, project.status);
        decisionNoteInput.value = "";
        await refresh();
      } catch {}
    });
    const taskInput = node.querySelector(".taskInput");
    const taskRecur = node.querySelector(".taskRecur");
    node.querySelector(".addTask").addEventListener("click", async () => {
      if (!taskInput.value.trim()) return;
      try {
        await addTask(project.slug, taskInput.value.trim(), taskRecur.value);
        taskInput.value = "";
        taskRecur.value = "";
        await refresh();
      } catch {}
    });
    const blockedReasonInput = node.querySelector(".blockedReasonInput");
    blockedReasonInput.value = project.blockedReason || "";
    node.querySelector(".saveMeta").addEventListener("click", async () => {
      try {
        await saveProjectMeta(project.slug, { blockedReason: blockedReasonInput.value });
        await refresh();
      } catch {}
    });

    const selectBox = node.querySelector(".selectProject");
    selectBox.checked = selectedProjects.has(project.slug);
    selectBox.addEventListener("change", () => {
      if (selectBox.checked) selectedProjects.add(project.slug);
      else selectedProjects.delete(project.slug);
    });

    node.querySelector(".loadHistory").addEventListener("click", async () => {
      historyTitle.textContent = `Project History: ${project.name} (${project.slug})`;
      historyList.innerHTML = "";
      historyDrawer.classList.remove("hidden");
      try {
        const commits = await fetchHistory(project.slug);
        if (!commits.length) {
          historyList.innerHTML = "<li>No history yet.</li>";
          return;
        }
        for (const commit of commits) {
          const item = document.createElement("li");
          item.textContent = `${commit.sha.slice(0, 7)} ${commit.subject} - ${commit.author} (${commit.date})`;
          historyList.appendChild(item);
        }
      } catch (error) {
        historyList.innerHTML = `<li>${error.message}</li>`;
      }
    });
    projectList.appendChild(node);
  }
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function renderCalendar(events) {
  calendarEl.innerHTML = "";
  const now = new Date();
  const first = startOfMonth(now);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  for (let i = 0; i < startWeekday; i += 1) {
    const filler = document.createElement("div");
    filler.className = "calendar-day";
    calendarEl.appendChild(filler);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), day);
    const key = d.toISOString().slice(0, 10);
    const dayEl = document.createElement("div");
    dayEl.className = "calendar-day";
    dayEl.innerHTML = `<div class="date">${key}</div>`;
    for (const event of events.filter((e) => e.dueDate === key)) {
      const ev = document.createElement("div");
      ev.className = "calendar-event";
      ev.textContent = `${event.projectSlug}: ${event.milestoneName}`;
      dayEl.appendChild(ev);
    }
    calendarEl.appendChild(dayEl);
  }
}

function renderGantt(events) {
  ganttEl.innerHTML = "";
  const valid = events.filter((e) => e.startDate && e.dueDate);
  if (!valid.length) {
    ganttEl.textContent = "No milestone date ranges yet.";
    return;
  }
  const min = Math.min(...valid.map((e) => new Date(e.startDate).getTime()));
  const max = Math.max(...valid.map((e) => new Date(e.dueDate).getTime()));
  const span = Math.max(max - min, 24 * 60 * 60 * 1000);

  for (const event of valid) {
    const row = document.createElement("div");
    row.className = "gantt-row";
    const title = document.createElement("div");
    title.className = "gantt-title";
    title.textContent = `${event.projectSlug} - ${event.milestoneName} (${event.startDate} to ${event.dueDate})`;
    const track = document.createElement("div");
    track.className = "gantt-track";
    const bar = document.createElement("div");
    bar.className = "gantt-bar";
    const left = ((new Date(event.startDate).getTime() - min) / span) * 100;
    const width =
      ((new Date(event.dueDate).getTime() - new Date(event.startDate).getTime()) / span) * 100;
    bar.style.left = `${Math.max(left, 0)}%`;
    bar.style.width = `${Math.max(width, 1)}%`;
    track.appendChild(bar);
    row.appendChild(title);
    row.appendChild(track);
    ganttEl.appendChild(row);
  }
}

function renderHealth(data) {
  healthList.innerHTML = "";
  for (const item of data.topAtRisk || []) {
    const li = document.createElement("li");
    li.textContent = `${item.slug}: score ${item.score}`;
    healthList.appendChild(li);
  }
  if (!healthList.children.length) healthList.innerHTML = "<li>No data.</li>";
}

function renderAlerts(data) {
  alertsList.innerHTML = "";
  const prefs = getDigestPrefs();
  let suppressed = 0;
  for (const item of data.alerts || []) {
    if (item.type === "overdue" && !prefs.overdue) {
      suppressed += 1;
      continue;
    }
    if (item.type === "stale" && !prefs.stale) {
      suppressed += 1;
      continue;
    }
    if ((item.type === "preStaleEarly" || item.type === "preStaleLate") && !prefs.stale) {
      suppressed += 1;
      continue;
    }
    if (item.type === "blockedTooLong" && !prefs.blocked) {
      suppressed += 1;
      continue;
    }
    const li = document.createElement("li");
    li.textContent = `${item.type}: ${item.slug || item.milestone || "n/a"}`;
    alertsList.appendChild(li);
  }
  if (suppressed > 0) {
    const li = document.createElement("li");
    li.textContent = `suppressed by digest controls: ${suppressed}`;
    alertsList.appendChild(li);
  }
  if (!alertsList.children.length) alertsList.innerHTML = "<li>No alerts.</li>";
}

function renderActionQueue(data) {
  actionQueueList.innerHTML = "";
  for (const action of data.actions || []) {
    const li = document.createElement("li");
    const details = `${action.priority.toUpperCase()} - ${action.title}`;
    const reason = action.reason ? ` (${action.reason})` : "";
    li.textContent = `${details}${reason}`;
    if (action.safeExecute && action.projectSlug && action.executeHint === "update_project_meta") {
      const runBtn = document.createElement("button");
      runBtn.textContent = "Run";
      runBtn.className = "smallBtn";
      runBtn.addEventListener("click", async () => {
        try {
          await saveProjectMeta(action.projectSlug, action.suggestedPatch || {});
          await refresh();
        } catch (error) {
          flash.textContent = error.message;
        }
      });
      li.appendChild(document.createTextNode(" "));
      li.appendChild(runBtn);
    }
    actionQueueList.appendChild(li);
  }
  if (!actionQueueList.children.length) actionQueueList.innerHTML = "<li>No actions.</li>";
}

function renderActivity(data) {
  activityList.innerHTML = "";
  for (const item of data.events || []) {
    const li = document.createElement("li");
    li.textContent = `${item.sha.slice(0, 7)} ${item.subject}`;
    activityList.appendChild(li);
  }
  if (!activityList.children.length) activityList.innerHTML = "<li>No activity.</li>";
}

function renderDependencies(data) {
  dependencyList.innerHTML = "";
  const invalid = data.invalidRefs || [];
  const keys = Object.keys(data.blockedBy || {});
  const li1 = document.createElement("li");
  li1.textContent = `Dependency edges: ${(data.edges || []).length}`;
  dependencyList.appendChild(li1);
  const li2 = document.createElement("li");
  li2.textContent = `Blocked milestones: ${keys.length}`;
  dependencyList.appendChild(li2);
  const li3 = document.createElement("li");
  li3.textContent = `Invalid refs: ${invalid.length}`;
  dependencyList.appendChild(li3);
  for (const key of keys.slice(0, 5)) {
    const deps = (data.blockedBy?.[key] || []).slice(0, 3);
    const li = document.createElement("li");
    li.textContent = `${key} blocked by ${deps.join(", ") || "n/a"}`;
    dependencyList.appendChild(li);
  }
  for (const entry of invalid.slice(0, 3)) {
    const li = document.createElement("li");
    li.textContent = `Repair ${entry.from}: missing ${entry.missing}`;
    dependencyList.appendChild(li);
  }
}

function renderPortfolio(data) {
  portfolioList.innerHTML = "";
  const summary = data.summary || {};
  const owners = Object.entries(summary.byOwner || {});
  const statuses = Object.entries(summary.byStatus || {});
  const months = Object.entries(summary.byMonth || {});
  portfolioList.innerHTML = `
    <li>Owners: ${owners.map(([k, v]) => `${k}=${v}`).join(", ") || "n/a"}</li>
    <li>Statuses: ${statuses.map(([k, v]) => `${k}=${v}`).join(", ") || "n/a"}</li>
    <li>Due months: ${months.map(([k, v]) => `${k}=${v}`).join(", ") || "n/a"}</li>
  `;
}

function renderTodayBrief(data) {
  todayBriefList.innerHTML = `
    <li>Top risks: ${(data.topRisks || []).length}</li>
    <li>Overdue: ${(data.overdue || []).length}</li>
    <li>Due soon: ${(data.dueSoon || []).length}</li>
    <li>Blocked: ${(data.blocked || []).length}</li>
    <li>Stale: ${(data.stale || []).length}</li>
  `;
}

function renderTrends(data) {
  trendsList.innerHTML = "";
  for (const row of data.rows || []) {
    const li = document.createElement("li");
    li.textContent = `${row.date}: health=${row.avgHealth}, overdue=${row.overdue}, blocked=${row.blocked}`;
    trendsList.appendChild(li);
  }
  if (!trendsList.children.length) trendsList.innerHTML = "<li>No snapshots yet.</li>";
}

function renderOpsState(data) {
  const s = data.state || {};
  opsStateList.innerHTML = `
    <li>Last daily: ${s.lastDailyRun || "never"}</li>
    <li>Last weekly: ${s.lastWeeklyRun || "never"}</li>
    <li>Last monthly: ${s.lastMonthlyRun || "never"}</li>
    <li>Status: ${s.lastRunStatus || "unknown"}</li>
    <li>Source: ${s.lastRunSource || "n/a"}</li>
    <li>Error: ${s.lastRunError || "none"}</li>
  `;
}

function renderCapacity(data) {
  capacityList.innerHTML = `
    <li>Planned: ${data.plannedHours || 0}h</li>
    <li>Capacity: ${data.capacityHours || 0}h</li>
    <li>Utilization: ${data.utilization || 0}%</li>
    <li>Active projects: ${data.activeProjects || 0}</li>
  `;
}

function renderTimeEntries(data) {
  timeEntriesList.innerHTML = "";
  const summary = document.createElement("li");
  summary.textContent = `Last ${data.days || 14}d total: ${Math.round((data.totalMinutes || 0) / 60)}h`;
  timeEntriesList.appendChild(summary);
  for (const entry of (data.entries || []).slice(0, 6)) {
    const li = document.createElement("li");
    li.textContent = `${entry.date} ${entry.slug}: ${entry.minutes}m ${entry.note ? `- ${entry.note}` : ""}`;
    timeEntriesList.appendChild(li);
  }
}

function renderIntakeForms(data) {
  intakeFormSelect.innerHTML = "";
  for (const form of data.forms || []) {
    const opt = document.createElement("option");
    opt.value = form.id;
    opt.textContent = form.name;
    intakeFormSelect.appendChild(opt);
  }
}

function renderAutomationRuns(data) {
  automationList.innerHTML = "";
  for (const run of data.runs || []) {
    const li = document.createElement("li");
    li.textContent = `${run.at}: rules=${run.evaluated}, dryRun=${run.dryRun ? "yes" : "no"}`;
    automationList.appendChild(li);
  }
  if (!automationList.children.length) automationList.innerHTML = "<li>No automation runs yet.</li>";
}

async function refresh() {
  const [projectsRes, timelineRes, healthRes, alertsRes, actionQueueRes, activityRes, dependenciesRes, portfolioRes, todayBriefRes, trendsRes, opsStateRes, capacityRes, timeEntriesRes, intakeFormsRes, automationRunsRes] =
    await Promise.all([
      fetchProjects(),
      fetchTimeline(),
      fetchHealth(),
      fetchAlerts(),
      fetchActionQueue(),
      fetchActivity(),
      fetchDependencies(),
      fetchPortfolio(),
      fetchTodayBrief(),
      fetchTrends(),
      fetchOpsState(),
      fetchCapacity(),
      fetchTimeEntries(),
      fetchIntakeForms(),
      fetchAutomationRuns()
    ]);
  renderProjects(projectsRes.projects || []);
  renderCalendar(timelineRes.events || []);
  renderGantt(timelineRes.events || []);
  renderHealth(healthRes);
  renderAlerts(alertsRes);
  renderActionQueue(actionQueueRes);
  renderActivity(activityRes);
  renderDependencies(dependenciesRes);
  renderPortfolio(portfolioRes);
  renderTodayBrief(todayBriefRes);
  renderTrends(trendsRes);
  renderOpsState(opsStateRes);
  renderCapacity(capacityRes);
  renderTimeEntries(timeEntriesRes);
  renderIntakeForms(intakeFormsRes);
  renderAutomationRuns(automationRunsRes);
}

function readSavedViews() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_VIEWS_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeSavedViews(views) {
  localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views));
}

function renderSavedViews() {
  const views = readSavedViews();
  savedViews.innerHTML = '<option value="">Saved views</option>';
  for (const key of Object.keys(views)) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = key;
    savedViews.appendChild(option);
  }
}

function applyFilterState(state) {
  searchInput.value = state.q || "";
  statusFilter.value = state.status || "";
  priorityFilter.value = state.priority || "";
  overdueFilter.checked = state.overdue || false;
}

function getFilterState() {
  return {
    q: searchInput.value.trim(),
    status: statusFilter.value,
    priority: priorityFilter.value,
    overdue: overdueFilter.checked
  };
}

function applyFocus(name) {
  const now = new Date();
  if (name === "DueSoon") {
    statusFilter.value = "active";
    overdueFilter.checked = false;
  }
  if (name === "Blocked") {
    statusFilter.value = "blocked";
    overdueFilter.checked = false;
  }
  if (name === "Overdue") {
    statusFilter.value = "";
    overdueFilter.checked = true;
  }
  if (name === "NeedsUpdate") {
    statusFilter.value = "";
    overdueFilter.checked = false;
    searchInput.value = "";
    const daysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const p = new URLSearchParams(qs());
    p.set("updatedBefore", daysAgo);
    fetch(`/api/projects?${p.toString()}`)
      .then((r) => r.json())
      .then((projectsRes) => renderProjects(projectsRes.projects || []));
    return;
  }
  refresh();
}

function openPalette() {
  commandPalette.classList.remove("hidden");
  paletteInput.focus();
  renderPalette();
}

function closePalette() {
  commandPalette.classList.add("hidden");
}

function runPaletteCommand(value) {
  const v = value.trim().toLowerCase();
  if (!v) return;
  if (v.startsWith("status:")) {
    statusFilter.value = v.slice(7);
    refresh();
    return;
  }
  if (v.startsWith("focus:")) {
    applyFocus(v.slice(6));
    return;
  }
  searchInput.value = value.trim();
  refresh();
}

function renderPalette() {
  const query = paletteInput.value.trim().toLowerCase();
  paletteList.innerHTML = "";
  const matches = currentProjects.filter(
    (p) => !query || p.slug.toLowerCase().includes(query) || p.name.toLowerCase().includes(query)
  );
  for (const project of matches.slice(0, 8)) {
    const li = document.createElement("li");
    li.textContent = `${project.slug} (${project.status})`;
    li.addEventListener("click", () => {
      searchInput.value = project.slug;
      closePalette();
      refresh();
    });
    paletteList.appendChild(li);
  }
}

refreshBtn.addEventListener("click", refresh);
searchInput.addEventListener("input", refresh);
statusFilter.addEventListener("change", refresh);
priorityFilter.addEventListener("change", refresh);
overdueFilter.addEventListener("change", refresh);
commandPaletteBtn.addEventListener("click", openPalette);
closePaletteBtn.addEventListener("click", closePalette);
paletteInput.addEventListener("input", renderPalette);
paletteInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    runPaletteCommand(paletteInput.value);
    closePalette();
  }
});
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openPalette();
  }
  if (event.key === "Escape") closePalette();
});
selectAllProjects.addEventListener("change", () => {
  if (selectAllProjects.checked) {
    for (const project of currentProjects) selectedProjects.add(project.slug);
  } else {
    selectedProjects.clear();
  }
  renderProjects(currentProjects);
});
applyBulkBtn.addEventListener("click", async () => {
  const status = bulkStatus.value;
  const priority = bulkPriority.value;
  if (!status && !priority) return;
  const updates = currentProjects
    .filter((p) => selectedProjects.has(p.slug))
    .map((p) => ({ slug: p.slug, versionToken: p.versionToken, status, priority }));
  if (!updates.length) return;
  try {
    const results = await applyBulkUpdates(updates);
    const failed = results.filter((r) => !r.ok).length;
    flash.textContent = failed ? `Bulk update completed with ${failed} failure(s)` : "Bulk update completed";
    await refresh();
  } catch (error) {
    flash.textContent = error.message;
  }
});
for (const input of [quietHoursInput, digestOverdue, digestStale, digestBlocked]) {
  input.addEventListener("change", () => {
    writeDigestPrefs(getDigestPrefs());
    refresh();
  });
}
addTimeEntryBtn.addEventListener("click", async () => {
  try {
    await addTimeEntry({
      slug: timeSlug.value.trim(),
      minutes: Number(timeMinutes.value || 0),
      note: timeNote.value.trim()
    });
    timeMinutes.value = "";
    timeNote.value = "";
    await refresh();
  } catch (error) {
    flash.textContent = error.message;
  }
});
submitIntakeBtn.addEventListener("click", async () => {
  try {
    const formId = intakeFormSelect.value;
    const payload = JSON.parse(intakePayload.value || "{}");
    const result = await submitIntake(formId, payload);
    intakeList.innerHTML = `<li>Submitted: ${result.result?.type || "n/a"} ${result.result?.slug || ""}</li>`;
    await refresh();
  } catch (error) {
    flash.textContent = error.message;
  }
});
runAutomationDryBtn.addEventListener("click", async () => {
  try {
    const result = await runAutomation(true);
    flash.textContent = `Automation dry-run evaluated ${result.evaluated} rule(s)`;
    await refresh();
  } catch (error) {
    flash.textContent = error.message;
  }
});
runAutomationBtn.addEventListener("click", async () => {
  try {
    const result = await runAutomation(false);
    flash.textContent = `Automation run evaluated ${result.evaluated} rule(s)`;
    await refresh();
  } catch (error) {
    flash.textContent = error.message;
  }
});
exportSnapshotBtn.addEventListener("click", async () => {
  try {
    const result = await exportSnapshot();
    flash.textContent = `Snapshot exported: ${result.path}`;
  } catch (error) {
    flash.textContent = error.message;
  }
});
previewMigrationBtn.addEventListener("click", async () => {
  try {
    const items = JSON.parse(migrationInput.value || "[]");
    const result = await previewMigration(items);
    migrationList.innerHTML = `
      <li>Total: ${result.total}</li>
      <li>Normalized: ${result.normalized.length}</li>
      <li>Issues: ${result.issues.length}</li>
    `;
  } catch (error) {
    flash.textContent = error.message;
  }
});
saveViewBtn.addEventListener("click", () => {
  const name = window.prompt("Saved view name?");
  if (!name) return;
  const views = readSavedViews();
  views[name] = getFilterState();
  writeSavedViews(views);
  renderSavedViews();
});
savedViews.addEventListener("change", () => {
  const views = readSavedViews();
  const state = views[savedViews.value];
  if (!state) return;
  applyFilterState(state);
  refresh();
});
deleteViewBtn.addEventListener("click", () => {
  const selected = savedViews.value;
  if (!selected) return;
  const views = readSavedViews();
  delete views[selected];
  writeSavedViews(views);
  renderSavedViews();
});
for (const btn of focusBtns) {
  btn.addEventListener("click", () => applyFocus(btn.dataset.focus));
}
closeHistoryBtn.addEventListener("click", () => {
  historyDrawer.classList.add("hidden");
});
applyDigestPrefs(readDigestPrefs());
renderSavedViews();
refresh();
