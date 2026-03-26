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
const activityList = document.getElementById("activityList");
const dependencyList = document.getElementById("dependencyList");
const portfolioList = document.getElementById("portfolioList");

const SAVED_VIEWS_KEY = "project_dashboard_saved_views";

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
async function fetchDependencies() {
  const res = await fetch("/api/dependencies");
  return res.json();
}
async function fetchPortfolio() {
  const res = await fetch("/api/portfolio");
  return res.json();
}

async function saveStatus(slug, status) {
  const project = currentProjects.find((item) => item.slug === slug);
  const res = await fetch(`/api/projects/${slug}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, versionToken: project?.versionToken || "" })
  });
  await handleWriteResponse(res);
}

async function addTask(slug, task) {
  const project = currentProjects.find((item) => item.slug === slug);
  const res = await fetch(`/api/projects/${slug}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, versionToken: project?.versionToken || "" })
  });
  await handleWriteResponse(res);
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
    node.querySelector(".action").textContent = `Next: ${project.nextAction || "n/a"}`;
    const statusSelect = node.querySelector(".statusSelect");
    statusSelect.value = project.status;
    node.querySelector(".saveStatus").addEventListener("click", async () => {
      try {
        await saveStatus(project.slug, statusSelect.value);
        await refresh();
      } catch {}
    });
    const taskInput = node.querySelector(".taskInput");
    node.querySelector(".addTask").addEventListener("click", async () => {
      if (!taskInput.value.trim()) return;
      try {
        await addTask(project.slug, taskInput.value.trim());
        taskInput.value = "";
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
  for (const item of data.alerts || []) {
    const li = document.createElement("li");
    li.textContent = `${item.type}: ${item.slug}`;
    alertsList.appendChild(li);
  }
  if (!alertsList.children.length) alertsList.innerHTML = "<li>No alerts.</li>";
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

async function refresh() {
  const [projectsRes, timelineRes, healthRes, alertsRes, activityRes, dependenciesRes, portfolioRes] =
    await Promise.all([
      fetchProjects(),
      fetchTimeline(),
      fetchHealth(),
      fetchAlerts(),
      fetchActivity(),
      fetchDependencies(),
      fetchPortfolio()
    ]);
  renderProjects(projectsRes.projects || []);
  renderCalendar(timelineRes.events || []);
  renderGantt(timelineRes.events || []);
  renderHealth(healthRes);
  renderAlerts(alertsRes);
  renderActivity(activityRes);
  renderDependencies(dependenciesRes);
  renderPortfolio(portfolioRes);
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

refreshBtn.addEventListener("click", refresh);
searchInput.addEventListener("input", refresh);
statusFilter.addEventListener("change", refresh);
priorityFilter.addEventListener("change", refresh);
overdueFilter.addEventListener("change", refresh);
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
renderSavedViews();
refresh();
