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
const kanbanBoard = document.getElementById("kanbanBoard");
const calendarEl = document.getElementById("calendar");
const ganttEl = document.getElementById("gantt");
const timelineYear = document.getElementById("timelineYear");
const timelineMonth = document.getElementById("timelineMonth");
const timelineLegend = document.getElementById("timelineLegend");
const focusBtns = document.querySelectorAll(".focusBtn");
const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");
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
const newProjectName = document.getElementById("newProjectName");
const newProjectOwner = document.getElementById("newProjectOwner");
const newProjectDueDays = document.getElementById("newProjectDueDays");
const newProjectEstimateHours = document.getElementById("newProjectEstimateHours");
const newProjectNextAction = document.getElementById("newProjectNextAction");
const newProjectPriority = document.getElementById("newProjectPriority");
const createProjectBtn = document.getElementById("createProjectBtn");
const newTaskSlug = document.getElementById("newTaskSlug");
const newTaskDueDate = document.getElementById("newTaskDueDate");
const newTaskDueText = document.getElementById("newTaskDueText");
const newTaskTitle = document.getElementById("newTaskTitle");
const newTaskRecurText = document.getElementById("newTaskRecurText");
const newTaskRecurPreview = document.getElementById("newTaskRecurPreview");
const newTaskDependsOn = document.getElementById("newTaskDependsOn");
const newTaskFactRefs = document.getElementById("newTaskFactRefs");
const createTaskBtn = document.getElementById("createTaskBtn");
const openTaskModalBtn = document.getElementById("openTaskModalBtn");
const taskCreateModal = document.getElementById("taskCreateModal");
const closeTaskModalBtn = document.getElementById("closeTaskModalBtn");
const cancelTaskModalBtn = document.getElementById("cancelTaskModalBtn");
const taskModalFutureDatesOnly = document.getElementById("taskModalFutureDatesOnly");
const taskModalCreatedText = document.getElementById("taskModalCreatedText");
const taskModalCreatedDate = document.getElementById("taskModalCreatedDate");
const intakeFormSelect = document.getElementById("intakeFormSelect");
const intakeFormFields = document.getElementById("intakeFormFields");
const intakeHelperText = document.getElementById("intakeHelperText");
const intakeSlug = document.getElementById("intakeSlug");
const intakeTitle = document.getElementById("intakeTitle");
const intakeDescription = document.getElementById("intakeDescription");
const intakeDueDate = document.getElementById("intakeDueDate");
const intakeDueDays = document.getElementById("intakeDueDays");
const intakeOwner = document.getElementById("intakeOwner");
const intakeUrgency = document.getElementById("intakeUrgency");
const intakeEstimateHours = document.getElementById("intakeEstimateHours");
const intakeRecurrence = document.getElementById("intakeRecurrence");
const intakeDependsOn = document.getElementById("intakeDependsOn");
const intakeFactRefs = document.getElementById("intakeFactRefs");
const intakeKind = document.getElementById("intakeKind");
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
const ACTIVE_TAB_KEY = "project_dashboard_active_tab";
const selectedProjects = new Set();
let currentTimelineEvents = [];
const taskOptionsByProject = new Map();
const factOptionsByProject = new Map();

function isIsoDateClient(value) {
  const s = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const parts = s.split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.getFullYear() === parts[0] && d.getMonth() === parts[1] - 1 && d.getDate() === parts[2];
}

function parseRecurrenceFromText(text) {
  const t = String(text || "").trim().toLowerCase();
  if (!t) return "";
  if (/\b(daily|every day|each day)\b/.test(t) || (/\bday\b/.test(t) && /\b(every|each)\b/.test(t))) return "daily";
  if (
    /\b(weekly|week)\b/.test(t) ||
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(t) ||
    /\b(mon|tue|wed|thu|fri|sat|sun)\b/.test(t)
  ) {
    return "weekly";
  }
  if (/\b(monthly|month|every month)\b/.test(t)) return "monthly";
  return "";
}

function updateTaskRecurPreview() {
  if (!newTaskRecurPreview || !newTaskRecurText) return;
  const v = parseRecurrenceFromText(newTaskRecurText.value);
  newTaskRecurPreview.textContent = v || "—";
}

function syncDueFromDatePicker() {
  if (newTaskDueDate?.value && newTaskDueText) newTaskDueText.value = newTaskDueDate.value;
}

function syncDueFromTextField() {
  const t = newTaskDueText?.value.trim() || "";
  if (isIsoDateClient(t) && newTaskDueDate) newTaskDueDate.value = t;
}

function setTaskModalCreatedDates() {
  const iso = new Date().toISOString().slice(0, 10);
  if (taskModalCreatedText) taskModalCreatedText.value = iso;
  if (taskModalCreatedDate) taskModalCreatedDate.value = iso;
}

function openTaskCreateModal() {
  if (!taskCreateModal) return;
  setTaskModalCreatedDates();
  syncDueFromDatePicker();
  updateTaskRecurPreview();
  taskCreateModal.hidden = false;
  taskCreateModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("task-modal-open");
  newTaskTitle?.focus();
}

function closeTaskCreateModal() {
  if (!taskCreateModal) return;
  taskCreateModal.hidden = true;
  taskCreateModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("task-modal-open");
}

function selectedTaskCreatePriority() {
  return document.querySelector('input[name="taskCreatePriority"]:checked')?.value || "normal";
}

function priorityMetaFromChoice(choice) {
  const map = { lowest: "low", low: "low", medium: "medium", high: "high", highest: "critical" };
  return map[choice] || null;
}

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
async function fetchTaskBoard() {
  const res = await fetch("/api/tasks/board");
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
async function fetchProjectFacts(slug) {
  const res = await fetch(`/api/projects/${slug}/facts`);
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || "Failed to load facts");
  return data.facts || [];
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

async function addTask(slug, task, dueDate, recurrence = "", dependsOn = [], factRefs = []) {
  const project = currentProjects.find((item) => item.slug === slug);
  const res = await fetch(`/api/projects/${slug}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, dueDate, recurrence, dependsOn, factRefs, versionToken: project?.versionToken || "" })
  });
  return handleWriteResponse(res);
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

async function moveTaskLane(projectSlug, taskId, state, versionToken) {
  const res = await fetch(`/api/projects/${projectSlug}/tasks/${taskId}/state`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state, versionToken })
  });
  await handleWriteResponse(res);
}
async function createProjectFact(slug, payload) {
  const project = currentProjects.find((item) => item.slug === slug);
  const res = await fetch(`/api/projects/${slug}/facts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, versionToken: project?.versionToken || "" })
  });
  return handleWriteResponse(res);
}
async function updateProjectFact(slug, factId, payload) {
  const project = currentProjects.find((item) => item.slug === slug);
  const res = await fetch(`/api/projects/${slug}/facts/${factId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, versionToken: project?.versionToken || "" })
  });
  return handleWriteResponse(res);
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
  return data;
}

let currentProjects = [];

function parseCsv(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getSelectedValues(selectEl) {
  if (!selectEl) return [];
  return [...selectEl.selectedOptions].map((option) => option.value).filter(Boolean);
}

function setSelectOptions(selectEl, options, placeholder, allowMultiple = false) {
  if (!selectEl) return;
  const previous = allowMultiple ? getSelectedValues(selectEl) : [selectEl.value];
  selectEl.innerHTML = "";
  if (!allowMultiple) {
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = placeholder;
    selectEl.appendChild(emptyOption);
  }
  for (const optionValue of options) {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionValue;
    if (previous.includes(optionValue)) option.selected = true;
    selectEl.appendChild(option);
  }
}

function populateProjectTaskOptions(slug, depsSelect, factsSelect) {
  const taskOptions = taskOptionsByProject.get(slug) || [];
  const factOptions = factOptionsByProject.get(slug) || [];
  setSelectOptions(depsSelect, taskOptions, "No dependencies", true);
  setSelectOptions(factsSelect, factOptions, "No fact refs", true);
}

function populateNewTaskProjectOptions(projects) {
  const options = (projects || []).map((project) => project.slug);
  setSelectOptions(newTaskSlug, options, "Select project");
  setSelectOptions(intakeSlug, options, "Select project");
  if (!newTaskSlug.value && options.length) newTaskSlug.value = options[0];
  if (!intakeSlug.value && options.length) intakeSlug.value = options[0];
  const slug = newTaskSlug.value;
  populateProjectTaskOptions(slug, newTaskDependsOn, newTaskFactRefs);
  if (slug && !factOptionsByProject.has(slug)) {
    fetchProjectFacts(slug)
      .then((facts) => {
        factOptionsByProject.set(
          slug,
          facts.map((fact) => fact.factId)
        );
        populateProjectTaskOptions(slug, newTaskDependsOn, newTaskFactRefs);
      })
      .catch(() => {});
  }
}

function clearCreateProjectForm() {
  newProjectName.value = "";
  newProjectOwner.value = "";
  newProjectDueDays.value = "";
  newProjectEstimateHours.value = "";
  newProjectNextAction.value = "";
  newProjectPriority.value = "";
}

function clearCreateTaskForm() {
  newTaskTitle.value = "";
  for (const option of newTaskDependsOn.options) option.selected = false;
  for (const option of newTaskFactRefs.options) option.selected = false;
  if (newTaskRecurText) newTaskRecurText.value = "";
  updateTaskRecurPreview();
  newTaskDueDate.value = new Date().toISOString().slice(0, 10);
  syncDueFromDatePicker();
  const normalRadio = document.querySelector('input[name="taskCreatePriority"][value="normal"]');
  if (normalRadio) normalRadio.checked = true;
  if (taskModalFutureDatesOnly) taskModalFutureDatesOnly.checked = true;
  setTaskModalCreatedDates();
}

function clearIntakeForm() {
  intakeSlug.value = "";
  intakeTitle.value = "";
  intakeDescription.value = "";
  intakeDueDate.value = "";
  intakeDueDays.value = "";
  intakeOwner.value = "";
  intakeUrgency.value = "";
  intakeEstimateHours.value = "";
  intakeRecurrence.value = "";
  intakeDependsOn.value = "";
  intakeFactRefs.value = "";
  intakeKind.value = "";
}

function updateIntakeFieldVisibility() {
  const formId = intakeFormSelect.value || "quick-task";
  const fieldNodes = intakeFormFields?.querySelectorAll(".field[data-intake]") || [];
  for (const node of fieldNodes) {
    const allowed = String(node.dataset.intake || "")
      .split(" ")
      .map((v) => v.trim())
      .filter(Boolean);
    node.hidden = !(allowed.includes("all") || allowed.includes(formId));
  }
  if (!intakeHelperText) return;
  if (formId === "quick-task") {
    intakeHelperText.textContent = "Quick Task: add a task with due date, optional recurrence and refs.";
    return;
  }
  if (formId === "quick-project") {
    intakeHelperText.textContent = "Quick Project: create a new project from template fields.";
    return;
  }
  if (formId === "incoming-event") {
    intakeHelperText.textContent = "Incoming Event: queue an event for routing into a task or project.";
    return;
  }
  intakeHelperText.textContent = "Advanced intake mode using explicit form fields.";
}

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
    node.querySelector(".action").textContent =
      `Next: ${project.nextAction || "n/a"} | Open: ${project.taskSummary?.open || 0} | Overdue: ${project.taskSummary?.overdue || 0} | Blocked by deps: ${project.taskSummary?.blockedByDependencies || 0} | Unresolved facts: ${project.factsSummary?.unresolved || 0}`;
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
    const taskDueDate = node.querySelector(".taskDueDate");
    const taskDeps = node.querySelector(".taskDeps");
    const taskFacts = node.querySelector(".taskFacts");
    const taskRecur = node.querySelector(".taskRecur");
    populateProjectTaskOptions(project.slug, taskDeps, taskFacts);
    taskDueDate.value = new Date().toISOString().slice(0, 10);
    node.querySelector(".addTask").addEventListener("click", async () => {
      if (!taskInput.value.trim()) return;
      if (!taskDueDate.value) {
        flash.textContent = "Task deadline is required.";
        return;
      }
      const dependsOn = getSelectedValues(taskDeps).map((value) => value.split(" - ")[0]);
      const factRefs = getSelectedValues(taskFacts);
      try {
        const result = await addTask(
          project.slug,
          taskInput.value.trim(),
          taskDueDate.value,
          taskRecur.value,
          dependsOn,
          factRefs
        );
        if (result?.taskId) flash.textContent = `Task created: ${result.taskId}`;
        taskInput.value = "";
        taskDueDate.value = new Date().toISOString().slice(0, 10);
        for (const option of taskDeps.options) option.selected = false;
        for (const option of taskFacts.options) option.selected = false;
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
    const factStatementInput = node.querySelector(".factStatementInput");
    const factStatusSelect = node.querySelector(".factStatusSelect");
    const factSourceInput = node.querySelector(".factSourceInput");
    const factNoteInput = node.querySelector(".factNoteInput");
    const factList = node.querySelector(".factList");
    async function loadFacts() {
      factList.innerHTML = "";
      try {
        const facts = await fetchProjectFacts(project.slug);
        if (!facts.length) {
          factList.innerHTML = "<li>No facts yet.</li>";
          return;
        }
        for (const fact of facts.slice(0, 8)) {
          const li = document.createElement("li");
          li.textContent = `${fact.factId} [${fact.status}] ${fact.statement}`;
          const status = document.createElement("select");
          for (const value of ["unknown", "unverified", "in-review", "verified"]) {
            const opt = document.createElement("option");
            opt.value = value;
            opt.textContent = value;
            status.appendChild(opt);
          }
          status.value = fact.status || "unknown";
          status.addEventListener("change", async () => {
            try {
              await updateProjectFact(project.slug, fact.factId, {
                status: status.value,
                sources: fact.sources || [],
                verificationNote: fact.verificationNote || ""
              });
              await refresh();
            } catch (error) {
              flash.textContent = error.message;
            }
          });
          li.appendChild(document.createTextNode(" "));
          li.appendChild(status);
          factList.appendChild(li);
        }
        factOptionsByProject.set(
          project.slug,
          facts.map((fact) => fact.factId)
        );
        populateProjectTaskOptions(project.slug, taskDeps, taskFacts);
      } catch (error) {
        factList.innerHTML = `<li>${error.message}</li>`;
      }
    }
    node.querySelector(".addFact").addEventListener("click", async () => {
      const statement = factStatementInput.value.trim();
      if (!statement) return;
      const status = factStatusSelect.value;
      const source = factSourceInput.value.trim();
      const verificationNote = factNoteInput.value.trim();
      if (status === "verified" && (!source || !verificationNote)) {
        flash.textContent = "Verified facts require source and verification note.";
        return;
      }
      try {
        await createProjectFact(project.slug, {
          statement,
          status,
          sources: source ? [source] : [],
          verificationNote
        });
        factStatementInput.value = "";
        factSourceInput.value = "";
        factNoteInput.value = "";
        await refresh();
      } catch (error) {
        flash.textContent = error.message;
      }
    });
    loadFacts().catch(() => {});

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

function renderKanban(data) {
  if (!kanbanBoard) return;
  const lanes = data?.lanes || {};
  taskOptionsByProject.clear();
  const laneOrder = ["backlog", "todo", "in-progress", "done"];
  kanbanBoard.innerHTML = "";
  for (const laneId of laneOrder) {
    const laneEl = document.createElement("div");
    laneEl.className = "kanban-lane";
    laneEl.dataset.lane = laneId;
    laneEl.innerHTML = `<h3>${laneId}</h3>`;
    laneEl.addEventListener("dragover", (event) => event.preventDefault());
    laneEl.addEventListener("drop", async (event) => {
      event.preventDefault();
      const raw = event.dataTransfer?.getData("application/json");
      if (!raw) return;
      try {
        const payload = JSON.parse(raw);
        await moveTaskLane(payload.projectSlug, payload.taskId, laneId, payload.versionToken);
        await refresh();
      } catch (error) {
        flash.textContent = error.message;
      }
    });
    for (const task of lanes[laneId] || []) {
      const existing = taskOptionsByProject.get(task.projectSlug) || [];
      const label = `${task.id} - ${task.title}`;
      if (!existing.includes(label)) existing.push(label);
      taskOptionsByProject.set(task.projectSlug, existing);
      const card = document.createElement("article");
      card.className = "kanban-task";
      card.draggable = true;
      card.addEventListener("dragstart", (event) => {
        event.dataTransfer?.setData(
          "application/json",
          JSON.stringify({
            projectSlug: task.projectSlug,
            taskId: task.id,
            versionToken: task.versionToken
          })
        );
      });
      const deps = (task.dependsOn || []).slice(0, 2).join(", ");
      const unresolved = (task.unresolvedFactRefs || []).length;
      card.innerHTML = `
        <div class="kanban-title">${task.title}</div>
        <div class="kanban-meta">${task.projectSlug}:${task.id}</div>
        <div class="kanban-meta">due: ${task.dueDate || "n/a"}</div>
        <div class="kanban-meta">${deps ? `deps: ${deps}` : "deps: none"}</div>
        <div class="kanban-meta ${unresolved ? "warn" : ""}">unresolved facts: ${unresolved}</div>
      `;
      laneEl.appendChild(card);
    }
    kanbanBoard.appendChild(laneEl);
  }
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getEventYear(event) {
  const source = event?.dueDate || event?.startDate;
  if (!source) return null;
  const year = Number(String(source).slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function getQuarterAccentClass(dateValue) {
  if (!dateValue) return "year-accent-0";
  const month = new Date(dateValue).getMonth();
  const quarter = Math.floor(month / 3);
  return `year-accent-${Math.max(0, Math.min(quarter, 5))}`;
}

function renderTimelineLegend() {
  if (!timelineLegend) return;
  const labels = ["Q1 (Jan-Mar)", "Q2 (Apr-Jun)", "Q3 (Jul-Sep)", "Q4 (Oct-Dec)"];
  timelineLegend.innerHTML = "";
  for (let index = 0; index < labels.length; index += 1) {
    const item = document.createElement("div");
    item.className = "timeline-legend-item";
    const dot = document.createElement("span");
    dot.className = `timeline-dot year-accent-${index}`;
    const text = document.createElement("span");
    text.textContent = labels[index];
    item.appendChild(dot);
    item.appendChild(text);
    timelineLegend.appendChild(item);
  }
}

function populateTimelineYearOptions(events) {
  if (!timelineYear) return;
  const years = [...new Set((events || []).map(getEventYear).filter(Boolean))].sort((a, b) => b - a);
  const previous = timelineYear.value;
  timelineYear.innerHTML = "";
  if (!years.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No years";
    timelineYear.appendChild(option);
    return;
  }
  for (const year of years) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    timelineYear.appendChild(option);
  }
  timelineYear.value = years.includes(Number(previous)) ? previous : String(years[0]);
}

function populateTimelineMonthOptions() {
  if (!timelineMonth) return;
  const previous = timelineMonth.value;
  const monthLabels = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  timelineMonth.innerHTML = "";
  for (let month = 0; month < 12; month += 1) {
    const option = document.createElement("option");
    option.value = String(month);
    option.textContent = monthLabels[month];
    timelineMonth.appendChild(option);
  }
  if (previous && Number(previous) >= 0 && Number(previous) <= 11) {
    timelineMonth.value = previous;
  } else {
    timelineMonth.value = String(new Date().getMonth());
  }
}

function getSelectedTimelineYear(events) {
  if (!timelineYear?.value) {
    const fallback = [...new Set((events || []).map(getEventYear).filter(Boolean))].sort((a, b) => b - a)[0];
    return fallback || new Date().getFullYear();
  }
  return Number(timelineYear.value);
}

function getSelectedTimelineMonth() {
  const value = Number(timelineMonth?.value);
  if (!Number.isFinite(value) || value < 0 || value > 11) return new Date().getMonth();
  return value;
}

function refreshTimelineViews() {
  const selectedYear = getSelectedTimelineYear(currentTimelineEvents);
  const selectedMonth = getSelectedTimelineMonth();
  const selectedMonthEvents = currentTimelineEvents.filter((event) => {
    if (getEventYear(event) !== selectedYear) return false;
    if (!event?.dueDate) return false;
    return new Date(event.dueDate).getMonth() === selectedMonth;
  });
  const selectedYearEvents = currentTimelineEvents.filter((event) => getEventYear(event) === selectedYear);
  renderCalendar(selectedMonthEvents, selectedYear, selectedMonth);
  renderGantt(selectedYearEvents, selectedYear);
}

function setActiveTab(tabName, persist = true) {
  for (const btn of tabButtons) {
    const active = btn.dataset.tab === tabName;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", String(active));
    btn.tabIndex = active ? 0 : -1;
  }
  for (const panel of tabPanels) {
    const active = panel.id === `tab${tabName.charAt(0).toUpperCase()}${tabName.slice(1)}`;
    panel.classList.toggle("active", active);
    panel.hidden = !active;
  }
  if (persist) localStorage.setItem(ACTIVE_TAB_KEY, tabName);
}

function renderCalendar(events, selectedYear, selectedMonth) {
  calendarEl.innerHTML = "";
  const now = new Date();
  const first = startOfMonth(new Date(selectedYear || now.getFullYear(), selectedMonth ?? now.getMonth(), 1));
  const startWeekday = first.getDay();
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();

  for (let i = 0; i < startWeekday; i += 1) {
    const filler = document.createElement("div");
    filler.className = "calendar-day";
    calendarEl.appendChild(filler);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const d = new Date(first.getFullYear(), first.getMonth(), day);
    const key = d.toISOString().slice(0, 10);
    const dayEl = document.createElement("div");
    dayEl.className = "calendar-day";
    dayEl.innerHTML = `<div class="date">${key}</div>`;
    const dayEvents = events.filter((e) => e.dueDate === key);
    const visibleEvents = dayEvents.slice(0, 3);
    const hiddenEvents = dayEvents.slice(3);
    for (const event of visibleEvents) {
      const ev = document.createElement("div");
      ev.className = `calendar-event ${getQuarterAccentClass(event.dueDate)}`;
      ev.textContent = `${event.projectSlug}: ${event.milestoneName}`;
      dayEl.appendChild(ev);
    }
    if (hiddenEvents.length) {
      const hiddenWrap = document.createElement("div");
      hiddenWrap.hidden = true;
      for (const event of hiddenEvents) {
        const ev = document.createElement("div");
        ev.className = `calendar-event ${getQuarterAccentClass(event.dueDate)}`;
        ev.textContent = `${event.projectSlug}: ${event.milestoneName}`;
        hiddenWrap.appendChild(ev);
      }
      const more = document.createElement("div");
      more.className = "calendar-more";
      more.textContent = `+${hiddenEvents.length} more`;
      more.addEventListener("click", () => {
        const expanded = !hiddenWrap.hidden;
        hiddenWrap.hidden = expanded;
        more.classList.toggle("expanded", !expanded);
        more.textContent = expanded ? `+${hiddenEvents.length} more` : "Show less";
      });
      dayEl.appendChild(hiddenWrap);
      dayEl.appendChild(more);
    }
    calendarEl.appendChild(dayEl);
  }
}

function renderGantt(events, selectedYear) {
  ganttEl.innerHTML = "";
  const valid = events.filter((e) => e.startDate && e.dueDate);
  if (!valid.length) {
    ganttEl.textContent = `No milestone date ranges for ${selectedYear || "selected year"} yet.`;
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
    bar.className = `gantt-bar ${getQuarterAccentClass(event.dueDate)}`;
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
  const invalidTaskRefs = data.invalidTaskRefs || [];
  const taskBlockedKeys = Object.keys(data.taskBlockedBy || {});
  const crossTaskEdges = data.crossProjectTaskEdges || [];
  const tasksByProject = Object.entries(data.tasksByProject || {});
  const verificationByProject = Object.entries(data.verificationByProject || {});
  const li1 = document.createElement("li");
  li1.textContent = `Dependency edges: ${(data.edges || []).length}`;
  dependencyList.appendChild(li1);
  const li2 = document.createElement("li");
  li2.textContent = `Blocked milestones: ${keys.length}`;
  dependencyList.appendChild(li2);
  const li3 = document.createElement("li");
  li3.textContent = `Invalid refs: ${invalid.length}`;
  dependencyList.appendChild(li3);
  const li4 = document.createElement("li");
  li4.textContent = `Task dependency edges: ${(data.taskEdges || []).length}`;
  dependencyList.appendChild(li4);
  const li5 = document.createElement("li");
  li5.textContent = `Cross-project task dependencies: ${crossTaskEdges.length}`;
  dependencyList.appendChild(li5);
  const li6 = document.createElement("li");
  li6.textContent = `Invalid task refs: ${invalidTaskRefs.length}`;
  dependencyList.appendChild(li6);
  for (const key of keys.slice(0, 5)) {
    const deps = (data.blockedBy?.[key] || []).slice(0, 3);
    const li = document.createElement("li");
    li.textContent = `${key} blocked by ${deps.join(", ") || "n/a"}`;
    dependencyList.appendChild(li);
  }
  for (const key of taskBlockedKeys.slice(0, 5)) {
    const deps = (data.taskBlockedBy?.[key] || []).slice(0, 3);
    const li = document.createElement("li");
    li.textContent = `Task ${key} blocked by ${deps.join(", ") || "n/a"}`;
    dependencyList.appendChild(li);
  }
  for (const [slug, summary] of tasksByProject.slice(0, 5)) {
    const li = document.createElement("li");
    li.textContent = `${slug} tasks: total=${summary.total}, open=${summary.open}, blockedByDeps=${summary.blockedByDependencies}`;
    dependencyList.appendChild(li);
  }
  for (const [slug, summary] of verificationByProject.slice(0, 5)) {
    const li = document.createElement("li");
    li.textContent = `${slug} facts: verified=${summary.verifiedFacts}/${summary.totalFacts}, unresolved=${summary.unresolvedFacts}`;
    dependencyList.appendChild(li);
  }
  for (const entry of invalid.slice(0, 3)) {
    const li = document.createElement("li");
    li.textContent = `Repair ${entry.from}: missing ${entry.missing}`;
    dependencyList.appendChild(li);
  }
  for (const entry of invalidTaskRefs.slice(0, 3)) {
    const li = document.createElement("li");
    li.textContent = `Repair task ${entry.from}: missing ${entry.missing}`;
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
  updateIntakeFieldVisibility();
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
  const [projectsRes, boardRes, timelineRes, healthRes, alertsRes, actionQueueRes, activityRes, dependenciesRes, portfolioRes, todayBriefRes, trendsRes, opsStateRes, capacityRes, timeEntriesRes, intakeFormsRes, automationRunsRes] =
    await Promise.all([
      fetchProjects(),
      fetchTaskBoard(),
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
  populateNewTaskProjectOptions(projectsRes.projects || []);
  renderKanban(boardRes);
  currentTimelineEvents = timelineRes.events || [];
  populateTimelineYearOptions(currentTimelineEvents);
  populateTimelineMonthOptions();
  renderTimelineLegend();
  refreshTimelineViews();
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
  if (event.key === "Escape") {
    if (taskCreateModal && !taskCreateModal.hidden) {
      closeTaskCreateModal();
      return;
    }
    closePalette();
  }
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
createProjectBtn.addEventListener("click", async () => {
  const name = newProjectName.value.trim();
  if (!name) {
    flash.textContent = "Project name is required.";
    return;
  }
  const dueDays = Number(newProjectDueDays.value || 30);
  if (!Number.isFinite(dueDays) || dueDays < 1) {
    flash.textContent = "Due in days must be at least 1.";
    return;
  }
  const estimateHoursRaw = newProjectEstimateHours.value.trim();
  const estimateHours = estimateHoursRaw ? Number(estimateHoursRaw) : undefined;
  if (estimateHoursRaw && (!Number.isFinite(estimateHours) || estimateHours < 0)) {
    flash.textContent = "Estimate hours must be a non-negative number.";
    return;
  }
  try {
    const payload = {
      name,
      owner: newProjectOwner.value.trim() || "unassigned",
      dueDays,
      nextAction: newProjectNextAction.value.trim(),
      priority: newProjectPriority.value || undefined
    };
    if (estimateHoursRaw) payload.estimateHours = estimateHours;
    const result = await submitIntake("quick-project", payload);
    flash.textContent = `Project created: ${result?.slug || name}`;
    clearCreateProjectForm();
    await refresh();
  } catch (error) {
    flash.textContent = error.message;
  }
});
createTaskBtn.addEventListener("click", async () => {
  const slug = newTaskSlug.value.trim();
  const task = newTaskTitle.value.trim();
  syncDueFromTextField();
  let dueDate = "";
  if (newTaskDueText?.value.trim() && isIsoDateClient(newTaskDueText.value.trim())) {
    dueDate = newTaskDueText.value.trim();
  } else if (newTaskDueDate.value) {
    dueDate = newTaskDueDate.value;
  }
  if (!slug) {
    flash.textContent = "Project slug is required to add a task.";
    return;
  }
  if (!task) {
    flash.textContent = "Task description is required.";
    return;
  }
  if (!dueDate) {
    flash.textContent = "Task due date is required (YYYY-MM-DD).";
    return;
  }
  if (!isIsoDateClient(dueDate)) {
    flash.textContent = "Due date must be a valid calendar date.";
    return;
  }
  if (taskModalFutureDatesOnly?.checked) {
    const today = new Date().toISOString().slice(0, 10);
    if (dueDate < today) {
      flash.textContent = "Due date must be today or later when “Only future dates” is checked.";
      return;
    }
  }
  const recurrenceRaw = newTaskRecurText?.value || "";
  const recurrenceTrim = recurrenceRaw.trim();
  const recurrenceSkip = /^(none|no|-)$/i.test(recurrenceTrim);
  const recurrence = recurrenceSkip ? "" : parseRecurrenceFromText(recurrenceRaw);
  if (recurrenceTrim && !recurrenceSkip && !recurrence) {
    flash.textContent =
      "Recurrence text was not recognized. Use phrases like “daily”, “every week”, or “monthly”, or leave blank.";
    return;
  }
  try {
    const result = await addTask(
      slug,
      task,
      dueDate,
      recurrence,
      getSelectedValues(newTaskDependsOn).map((value) => value.split(" - ")[0]),
      getSelectedValues(newTaskFactRefs)
    );
    const metaPriority = priorityMetaFromChoice(selectedTaskCreatePriority());
    if (metaPriority) {
      try {
        await saveProjectMeta(slug, { priority: metaPriority });
      } catch (metaErr) {
        flash.textContent = `Task created (${result?.taskId || "ok"}) but project priority was not updated: ${metaErr.message}`;
        clearCreateTaskForm();
        closeTaskCreateModal();
        await refresh();
        return;
      }
    }
    if (result?.taskId) flash.textContent = `Task created: ${result.taskId}`;
    else flash.textContent = "Task created successfully.";
    clearCreateTaskForm();
    closeTaskCreateModal();
    await refresh();
  } catch (error) {
    flash.textContent = error.message;
  }
});
newTaskSlug.addEventListener("change", () => {
  const slug = newTaskSlug.value;
  populateProjectTaskOptions(slug, newTaskDependsOn, newTaskFactRefs);
  if (!factOptionsByProject.has(slug)) {
    fetchProjectFacts(slug)
      .then((facts) => {
        factOptionsByProject.set(
          slug,
          facts.map((fact) => fact.factId)
        );
        populateProjectTaskOptions(slug, newTaskDependsOn, newTaskFactRefs);
      })
      .catch(() => {});
  }
});

if (openTaskModalBtn && taskCreateModal) {
  openTaskModalBtn.addEventListener("click", () => openTaskCreateModal());
}
if (closeTaskModalBtn) closeTaskModalBtn.addEventListener("click", () => closeTaskCreateModal());
if (cancelTaskModalBtn) cancelTaskModalBtn.addEventListener("click", () => closeTaskCreateModal());
if (taskCreateModal) {
  taskCreateModal.addEventListener("click", (e) => {
    if (e.target === taskCreateModal) closeTaskCreateModal();
  });
}
if (newTaskDueDate) newTaskDueDate.addEventListener("change", syncDueFromDatePicker);
if (newTaskDueText) newTaskDueText.addEventListener("input", syncDueFromTextField);
if (newTaskRecurText) newTaskRecurText.addEventListener("input", updateTaskRecurPreview);
submitIntakeBtn.addEventListener("click", async () => {
  try {
    const formId = intakeFormSelect.value;
    let payload = {};
    if (formId === "quick-task") {
      const slug = intakeSlug.value.trim();
      const task = intakeTitle.value.trim();
      const dueDate = intakeDueDate.value;
      if (!slug || !task || !dueDate) {
        flash.textContent = "Quick Task requires project slug, title, and due date.";
        return;
      }
      payload = {
        slug,
        task,
        dueDate,
        recurrence: intakeRecurrence.value || "",
        dependsOn: parseCsv(intakeDependsOn.value),
        factRefs: parseCsv(intakeFactRefs.value)
      };
      if (intakeUrgency.value) payload.priority = intakeUrgency.value;
      if (intakeDescription.value.trim()) payload.nextAction = intakeDescription.value.trim();
    } else if (formId === "quick-project") {
      const name = intakeTitle.value.trim();
      if (!name) {
        flash.textContent = "Quick Project requires a project name in Title / Name.";
        return;
      }
      payload = {
        name,
        owner: intakeOwner.value.trim() || "unassigned",
        dueDays: Number(intakeDueDays.value || 30),
        nextAction: intakeDescription.value.trim()
      };
      if (intakeEstimateHours.value.trim()) payload.estimateHours = Number(intakeEstimateHours.value);
      if (intakeUrgency.value) payload.priority = intakeUrgency.value;
    } else if (formId === "incoming-event") {
      const title = intakeTitle.value.trim();
      if (!title) {
        flash.textContent = "Incoming Event requires a title.";
        return;
      }
      payload = {
        title,
        description: intakeDescription.value.trim(),
        owner: intakeOwner.value.trim() || "unassigned",
        urgency: intakeUrgency.value || "medium",
        projectSlug: intakeSlug.value.trim(),
        estimateHours: intakeEstimateHours.value.trim() ? Number(intakeEstimateHours.value) : 0,
        dueDays: intakeDueDays.value.trim() ? Number(intakeDueDays.value) : undefined,
        recurrence: intakeRecurrence.value || "",
        kind: intakeKind.value || ""
      };
    } else {
      flash.textContent = "Select an intake form type.";
      return;
    }
    const result = await submitIntake(formId, payload);
    intakeList.innerHTML = `<li>Submitted: ${result.result?.type || "n/a"} ${result.result?.slug || ""}</li>`;
    clearIntakeForm();
    await refresh();
  } catch (error) {
    flash.textContent = error.message;
  }
});
intakeFormSelect.addEventListener("change", updateIntakeFieldVisibility);
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
for (const btn of tabButtons) {
  btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  btn.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const list = [...tabButtons];
    const currentIndex = list.indexOf(btn);
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + delta + list.length) % list.length;
    const next = list[nextIndex];
    next.focus();
    setActiveTab(next.dataset.tab);
  });
}
timelineYear?.addEventListener("change", refreshTimelineViews);
timelineMonth?.addEventListener("change", refreshTimelineViews);
closeHistoryBtn.addEventListener("click", () => {
  historyDrawer.classList.add("hidden");
});
setActiveTab(localStorage.getItem(ACTIVE_TAB_KEY) || "overview", false);
applyDigestPrefs(readDigestPrefs());
renderSavedViews();
clearCreateTaskForm();
refresh();
