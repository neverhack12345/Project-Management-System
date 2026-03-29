import { initScrollChrome } from "./shell/scroll-chrome.js";
import { createFlash } from "./shell/flash.js";
import * as projectApi from "./api/projects.js";
import { initVaultSidebarCollapse } from "./shell/sidebar-collapse.js";

const projectList = document.getElementById("projectList");
const searchInput = document.getElementById("search");
const statusFilter = document.getElementById("statusFilter");
const priorityFilter = document.getElementById("priorityFilter");
const overdueFilter = document.getElementById("overdueFilter");
const saveViewBtn = document.getElementById("saveViewBtn");
const savedViews = document.getElementById("savedViews");
const deleteViewBtn = document.getElementById("deleteViewBtn");
const statusFlash = createFlash(document.getElementById("flash"));
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
const factCreateModal = document.getElementById("factCreateModal");
const newFactSlug = document.getElementById("newFactSlug");
const newFactStatement = document.getElementById("newFactStatement");
const newFactStatus = document.getElementById("newFactStatus");
const newFactSource = document.getElementById("newFactSource");
const newFactNote = document.getElementById("newFactNote");
const createFactBtn = document.getElementById("createFactBtn");
const closeFactModalBtn = document.getElementById("closeFactModalBtn");
const cancelFactModalBtn = document.getElementById("cancelFactModalBtn");
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
const taskDetailModal = document.getElementById("taskDetailModal");
const taskDetailModalBody = document.getElementById("taskDetailModalBody");
const taskDetailModalTitle = document.getElementById("taskDetailModalTitle");
const closeTaskDetailModalBtn = document.getElementById("closeTaskDetailModalBtn");
const closeTaskDetailFooterBtn = document.getElementById("closeTaskDetailFooterBtn");
const factsWorkspaceSlug = document.getElementById("factsWorkspaceSlug");
const factsWorkspaceList = document.getElementById("factsWorkspaceList");
const taskDetailFactsSection = document.getElementById("taskDetailFactsSection");
const taskDetailFactRefsSelect = document.getElementById("taskDetailFactRefsSelect");
const taskDetailSaveFactsBtn = document.getElementById("taskDetailSaveFactsBtn");

const SAVED_VIEWS_KEY = "project_dashboard_saved_views";
const DIGEST_PREFS_KEY = "project_dashboard_digest_prefs";
const ACTIVE_TAB_KEY = "project_dashboard_active_tab";
const selectedProjects = new Set();
let currentTimelineEvents = [];
const taskOptionsByProject = new Map();
const factOptionsByProject = new Map();
/** Kanban card payload while task detail modal is open (for saving fact links). */
let taskDetailBoardTask = null;

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

function syncTaskOverlayBodyClass() {
  const anyOpen =
    (taskCreateModal && !taskCreateModal.hidden) ||
    (taskDetailModal && !taskDetailModal.hidden) ||
    (factCreateModal && !factCreateModal.hidden);
  document.body.classList.toggle("task-modal-open", Boolean(anyOpen));
}

function openTaskCreateModal() {
  if (!taskCreateModal) return;
  setTaskModalCreatedDates();
  syncDueFromDatePicker();
  updateTaskRecurPreview();
  taskCreateModal.hidden = false;
  taskCreateModal.setAttribute("aria-hidden", "false");
  syncTaskOverlayBodyClass();
  newTaskTitle?.focus();
}

function closeTaskCreateModal() {
  if (!taskCreateModal) return;
  taskCreateModal.hidden = true;
  taskCreateModal.setAttribute("aria-hidden", "true");
  syncTaskOverlayBodyClass();
}

function clearCreateFactForm() {
  if (newFactStatement) newFactStatement.value = "";
  if (newFactSource) newFactSource.value = "";
  if (newFactNote) newFactNote.value = "";
  if (newFactStatus) newFactStatus.value = "unknown";
}

function closeFactCreateModal() {
  if (!factCreateModal) return;
  factCreateModal.hidden = true;
  factCreateModal.setAttribute("hidden", "");
  factCreateModal.setAttribute("aria-hidden", "true");
  syncTaskOverlayBodyClass();
}

/** @param {string} [explicitPreferred] - project slug to preselect */
function openFactCreateModal(explicitPreferred) {
  if (!factCreateModal) return;
  clearCreateFactForm();
  let preferred = (explicitPreferred && String(explicitPreferred).trim()) || "";
  if (!preferred) {
    preferred =
      newTaskSlug?.value?.trim() ||
      factsWorkspaceSlug?.value?.trim() ||
      "";
  }
  if (newFactSlug) {
    const match = preferred && [...newFactSlug.options].some((o) => o.value === preferred);
    const pick = match ? preferred : [...newFactSlug.options].find((o) => o.value)?.value || "";
    if (pick) newFactSlug.value = pick;
  }
  factCreateModal.removeAttribute("hidden");
  factCreateModal.hidden = false;
  factCreateModal.setAttribute("aria-hidden", "false");
  syncTaskOverlayBodyClass();
  requestAnimationFrame(() => newFactStatement?.focus());
}

async function submitCreateFact() {
  const slug = newFactSlug?.value;
  if (!slug) {
    statusFlash.show("Select a project.", { error: true });
    return;
  }
  const statement = newFactStatement?.value.trim() || "";
  if (!statement) {
    statusFlash.show("Enter a fact statement.", { error: true });
    return;
  }
  const status = newFactStatus?.value || "unknown";
  const source = newFactSource?.value.trim() || "";
  const verificationNote = newFactNote?.value.trim() || "";
  if (status === "verified" && (!source || !verificationNote)) {
    statusFlash.show("Verified facts require source and verification note.", { error: true });
    return;
  }
  try {
    await createProjectFact(slug, {
      statement,
      status,
      sources: source ? [source] : [],
      verificationNote
    });
    clearCreateFactForm();
    closeFactCreateModal();
    factOptionsByProject.delete(slug);
    await refresh();
    statusFlash.show(`Created fact in ${slug}`);
  } catch (error) {
    statusFlash.show(error.message, { error: true });
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function openTaskDetailModal(boardTask) {
  if (!taskDetailModal || !taskDetailModalBody) return;
  const project = currentProjects.find((p) => p.slug === boardTask.projectSlug);
  const full = project?.tasks?.find((t) => t.id === boardTask.id);
  const titleText = full?.title || boardTask.title || "Task";
  if (taskDetailModalTitle) taskDetailModalTitle.textContent = titleText;

  const deps = (full?.dependsOn || boardTask.dependsOn || []).join(", ") || "—";
  const facts = (full?.factRefs || []).join(", ") || "—";
  const unresolved = (full?.unresolvedFactRefs || boardTask.unresolvedFactRefs || []).join(", ") || "—";
  const lane = full?.state || boardTask.state || "—";
  const done = full?.done ? "Yes" : "No";
  const due = full?.dueDate || boardTask.dueDate || "—";
  const projectName = project?.name || boardTask.projectName || boardTask.projectSlug;
  const refText = full?.ref || boardTask.ref || `${boardTask.projectSlug}:${boardTask.id}`;

  taskDetailModalBody.innerHTML = `
    <dl class="task-detail-dl">
      <dt>Project</dt><dd>${escapeHtml(projectName)} <span class="task-detail-muted">(${escapeHtml(boardTask.projectSlug)})</span></dd>
      <dt>Task ID</dt><dd><code>${escapeHtml(boardTask.id)}</code></dd>
      <dt>Reference</dt><dd><code>${escapeHtml(refText)}</code></dd>
      <dt>Lane</dt><dd>${escapeHtml(lane)}</dd>
      <dt>Done</dt><dd>${escapeHtml(done)}</dd>
      <dt>Due date</dt><dd>${escapeHtml(due)}</dd>
      <dt>Dependencies</dt><dd>${escapeHtml(deps)}</dd>
      <dt>Fact refs</dt><dd>${escapeHtml(facts)}</dd>
      <dt>Unresolved facts</dt><dd>${escapeHtml(unresolved)}</dd>
    </dl>
    <p class="helper-text">Drag a card to another column to change its lane. Edit fact links below, or use the Facts tab for the full registry. Refresh after editing task markdown on disk.</p>
  `;
  taskDetailBoardTask = boardTask;
  if (taskDetailFactsSection && project) {
    taskDetailFactsSection.hidden = false;
    populateTaskDetailFactSelect(project, full);
  } else if (taskDetailFactsSection) {
    taskDetailFactsSection.hidden = true;
  }
  taskDetailModal.hidden = false;
  taskDetailModal.setAttribute("aria-hidden", "false");
  syncTaskOverlayBodyClass();
}

function closeTaskDetailModal() {
  if (!taskDetailModal) return;
  taskDetailBoardTask = null;
  if (taskDetailFactsSection) taskDetailFactsSection.hidden = true;
  taskDetailModal.hidden = true;
  taskDetailModal.setAttribute("aria-hidden", "true");
  syncTaskOverlayBodyClass();
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

async function saveStatus(slug, status, decisionNote = "", previousStatus = "") {
  const project = currentProjects.find((item) => item.slug === slug);
  const res = await projectApi.patchProjectStatus(slug, {
    status,
    decisionNote,
    previousStatus,
    versionToken: project?.versionToken || ""
  });
  await handleWriteResponse(res);
}

async function addTask(slug, task, dueDate, recurrence = "", dependsOn = [], factRefs = []) {
  const project = currentProjects.find((item) => item.slug === slug);
  const res = await projectApi.postProjectTask(slug, {
    task,
    dueDate,
    recurrence,
    dependsOn,
    factRefs,
    versionToken: project?.versionToken || ""
  });
  return handleWriteResponse(res);
}

async function saveProjectMeta(slug, payload) {
  const project = currentProjects.find((item) => item.slug === slug);
  const res = await projectApi.patchProjectMeta(slug, { ...payload, versionToken: project?.versionToken || "" });
  await handleWriteResponse(res);
}

async function moveTaskLane(projectSlug, taskId, state, versionToken) {
  const res = await projectApi.patchTaskState(projectSlug, taskId, { state, versionToken });
  await handleWriteResponse(res);
}

async function createProjectFact(slug, payload) {
  const project = currentProjects.find((item) => item.slug === slug);
  const res = await projectApi.postProjectFact(slug, { ...payload, versionToken: project?.versionToken || "" });
  return handleWriteResponse(res);
}

async function updateProjectFact(slug, factId, payload) {
  const project = currentProjects.find((item) => item.slug === slug);
  const res = await projectApi.patchProjectFact(slug, factId, { ...payload, versionToken: project?.versionToken || "" });
  return handleWriteResponse(res);
}

async function saveTaskFactRefs(slug, taskId, factIds) {
  const project = currentProjects.find((item) => item.slug === slug);
  const res = await projectApi.patchTaskFactRefs(slug, taskId, {
    factRefs: factIds,
    versionToken: project?.versionToken || ""
  });
  return handleWriteResponse(res);
}

function collectUsedFactRefs(project) {
  const used = new Set();
  for (const task of project.tasks || []) {
    for (const ref of task.factRefs || []) used.add(ref);
  }
  return used;
}

function populateTaskDetailFactSelect(project, full) {
  if (!taskDetailFactRefsSelect || !project) return;
  const slug = project.slug;
  taskDetailFactRefsSelect.innerHTML = "";
  const selectedRefs = new Set(full?.factRefs || []);
  for (const fact of project.facts || []) {
    const opt = document.createElement("option");
    opt.value = fact.factId;
    const snippet = fact.statement.length > 72 ? `${fact.statement.slice(0, 72)}…` : fact.statement;
    opt.textContent = `${fact.factId} · [${fact.status}] ${snippet}`;
    opt.selected = selectedRefs.has(fact.ref) || selectedRefs.has(fact.factId);
    taskDetailFactRefsSelect.appendChild(opt);
  }
}

function renderFactsWorkspace() {
  if (!factsWorkspaceList || !factsWorkspaceSlug) return;
  const slug = factsWorkspaceSlug.value;
  const project = currentProjects.find((p) => p.slug === slug);
  factsWorkspaceList.innerHTML = "";
  if (!project) {
    factsWorkspaceList.innerHTML = "<p class=\"helper-text\">Load projects to manage facts.</p>";
    return;
  }
  const usedRefs = collectUsedFactRefs(project);
  const filterEl = document.querySelector(".factsFilterBtn.active");
  const filter = filterEl?.dataset.factsFilter || "all";
  const facts = project.facts || [];
  const filtered = filter === "unassigned" ? facts.filter((f) => !usedRefs.has(f.ref)) : [...facts];
  if (!filtered.length) {
    factsWorkspaceList.innerHTML = "<p class=\"helper-text\">No facts match this filter.</p>";
    return;
  }
  for (const fact of filtered) {
    const linked = (project.tasks || []).filter((t) => (t.factRefs || []).includes(fact.ref));
    const card = document.createElement("article");
    card.className = "dash-fact-card";
    const head = document.createElement("div");
    head.className = "dash-fact-card-head";
    const idCode = document.createElement("code");
    idCode.textContent = fact.factId;
    const badge = document.createElement("span");
    badge.className = usedRefs.has(fact.ref) ? "dash-fact-badge dash-fact-badge--linked" : "dash-fact-badge dash-fact-badge--free";
    badge.textContent = usedRefs.has(fact.ref) ? `${linked.length} task(s)` : "Unassigned";
    head.appendChild(idCode);
    head.appendChild(badge);
    card.appendChild(head);
    const st = document.createElement("p");
    st.className = "dash-fact-statement";
    st.textContent = fact.statement || "(no statement)";
    card.appendChild(st);
    const meta = document.createElement("p");
    meta.className = "helper-text dash-fact-meta";
    meta.textContent = `Status: ${fact.status || "unknown"}`;
    card.appendChild(meta);
    if (linked.length) {
      const ul = document.createElement("ul");
      ul.className = "dash-fact-linked-tasks";
      for (const t of linked) {
        const li = document.createElement("li");
        li.textContent = `${t.id} — ${t.title}`;
        ul.appendChild(li);
      }
      card.appendChild(ul);
    }
    const assignRow = document.createElement("div");
    assignRow.className = "dash-fact-assign-row row";
    const assignLabel = document.createElement("span");
    assignLabel.className = "task-modal-label";
    assignLabel.textContent = "Assign to task";
    const assignSelect = document.createElement("select");
    assignSelect.className = "task-modal-input";
    const assignPlaceholder = document.createElement("option");
    assignPlaceholder.value = "";
    assignPlaceholder.textContent = "Select task…";
    assignSelect.appendChild(assignPlaceholder);
    for (const t of project.tasks || []) {
      const o = document.createElement("option");
      o.value = t.id;
      o.textContent = `${t.id} — ${t.title}`;
      assignSelect.appendChild(o);
    }
    const assignBtn = document.createElement("button");
    assignBtn.type = "button";
    assignBtn.className = "vault-btn-new vault-btn-new--inline vault-btn-new--secondary";
    assignBtn.textContent = "Assign";
    assignBtn.addEventListener("click", async () => {
      const taskId = assignSelect.value;
      if (!taskId) {
        statusFlash.show("Select a task to assign this fact.", { error: true });
        return;
      }
      const task = (project.tasks || []).find((x) => x.id === taskId);
      if (!task) return;
      const ids = [
        ...new Set(
          [...(task.factRefs || [])].map((r) => (r.includes(":") ? r.split(":").pop() : r)).concat(fact.factId)
        )
      ];
      try {
        await saveTaskFactRefs(slug, taskId, ids);
        factOptionsByProject.delete(slug);
        await refresh();
        statusFlash.show(`Linked ${fact.factId} to task ${taskId}`);
      } catch (error) {
        statusFlash.show(error.message, { error: true });
      }
    });
    assignRow.appendChild(assignLabel);
    assignRow.appendChild(assignSelect);
    assignRow.appendChild(assignBtn);
    card.appendChild(assignRow);
    const details = document.createElement("details");
    details.className = "dash-fact-edit";
    const summary = document.createElement("summary");
    summary.textContent = "Edit statement, status, sources, verification";
    details.appendChild(summary);
    const editGrid = document.createElement("div");
    editGrid.className = "form-grid dash-fact-edit-grid";
    const stmtLabel = document.createElement("label");
    stmtLabel.className = "field field-full";
    stmtLabel.innerHTML = "<span>Statement</span>";
    const stmtTa = document.createElement("textarea");
    stmtTa.rows = 2;
    stmtTa.className = "task-modal-textarea";
    stmtTa.value = fact.statement || "";
    stmtLabel.appendChild(stmtTa);
    const statusLabel = document.createElement("label");
    statusLabel.className = "field";
    statusLabel.innerHTML = "<span>Status</span>";
    const statusSel = document.createElement("select");
    statusSel.className = "task-modal-input";
    for (const value of ["unknown", "unverified", "in-review", "verified"]) {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = value;
      statusSel.appendChild(opt);
    }
    statusSel.value = fact.status || "unknown";
    statusLabel.appendChild(statusSel);
    const srcLabel = document.createElement("label");
    srcLabel.className = "field field-full";
    srcLabel.innerHTML = "<span>Sources (comma-separated)</span>";
    const srcInput = document.createElement("input");
    srcInput.type = "text";
    srcInput.className = "task-modal-input";
    srcInput.value = (fact.sources || []).join(", ");
    srcLabel.appendChild(srcInput);
    const noteLabel = document.createElement("label");
    noteLabel.className = "field field-full";
    noteLabel.innerHTML = "<span>Verification note</span>";
    const noteInput = document.createElement("input");
    noteInput.type = "text";
    noteInput.className = "task-modal-input";
    noteInput.value = fact.verificationNote || "";
    noteLabel.appendChild(noteInput);
    const saveDetails = document.createElement("button");
    saveDetails.type = "button";
    saveDetails.className = "vault-btn-new vault-btn-new--inline";
    saveDetails.textContent = "Save fact";
    saveDetails.addEventListener("click", async () => {
      const statement = stmtTa.value.trim();
      const status = statusSel.value;
      const sources = srcInput.value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const verificationNote = noteInput.value.trim();
      if (status === "verified" && (!sources.length || !verificationNote)) {
        statusFlash.show("Verified facts require at least one source and a verification note.", { error: true });
        return;
      }
      const projectRow = currentProjects.find((p) => p.slug === slug);
      if (!projectRow?.versionToken) {
        statusFlash.show("Project data is stale — click Refresh in the header, then try again.", { error: true });
        return;
      }
      const prevLabel = saveDetails.textContent;
      saveDetails.disabled = true;
      saveDetails.textContent = "Saving…";
      try {
        await updateProjectFact(slug, fact.factId, {
          statement,
          status,
          sources,
          verificationNote
        });
        factOptionsByProject.delete(slug);
        statusFlash.show(`Updated fact ${fact.factId}`);
        await refresh();
      } catch (error) {
        statusFlash.show(error?.message || String(error), { error: true });
      } finally {
        saveDetails.disabled = false;
        saveDetails.textContent = prevLabel;
      }
    });
    editGrid.appendChild(stmtLabel);
    editGrid.appendChild(statusLabel);
    editGrid.appendChild(srcLabel);
    editGrid.appendChild(noteLabel);
    details.appendChild(editGrid);
    details.appendChild(saveDetails);
    card.appendChild(details);
    factsWorkspaceList.appendChild(card);
  }
}

async function handleWriteResponse(res) {
  const data = await res.json();
  if (res.status === 409) {
    statusFlash.show(`Conflict: ${data.error}`, { error: true });
    throw new Error(data.error);
  }
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || "Request failed");
  }
  if (data.commit?.warning) {
    statusFlash.show(data.commit.warning, { clearAfterMs: null });
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
  setSelectOptions(newFactSlug, options, "Select project");
  setSelectOptions(intakeSlug, options, "Select project");
  if (factsWorkspaceSlug) {
    setSelectOptions(factsWorkspaceSlug, options, "Select project");
    if (!factsWorkspaceSlug.value && options.length) factsWorkspaceSlug.value = options[0];
  }
  if (!newTaskSlug.value && options.length) newTaskSlug.value = options[0];
  if (newFactSlug && !newFactSlug.value && options.length) newFactSlug.value = options[0];
  if (!intakeSlug.value && options.length) intakeSlug.value = options[0];
  const slug = newTaskSlug.value;
  populateProjectTaskOptions(slug, newTaskDependsOn, newTaskFactRefs);
  if (slug && !factOptionsByProject.has(slug)) {
    projectApi.fetchProjectFacts(slug)
      .then((facts) => {
        factOptionsByProject.set(
          slug,
          facts.map((fact) => fact.factId)
        );
        populateProjectTaskOptions(slug, newTaskDependsOn, newTaskFactRefs);
      })
      .catch(() => {});
  }
  renderFactsWorkspace();
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
        statusFlash.show("Decision note is required for blocked/done transitions.", { error: true });
        return;
      }
      try {
        await saveStatus(project.slug, statusSelect.value, note, project.status);
        decisionNoteInput.value = "";
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
    const factList = node.querySelector(".factList");
    async function loadFacts() {
      factList.innerHTML = "";
      try {
        const facts = await projectApi.fetchProjectFacts(project.slug);
        if (!facts.length) {
          factList.innerHTML = "<li>No facts yet.</li>";
          return;
        }
        for (const fact of facts) {
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
              statusFlash.show(error.message, { error: true });
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
        if (newTaskSlug?.value === project.slug) {
          populateProjectTaskOptions(project.slug, newTaskDependsOn, newTaskFactRefs);
        }
      } catch (error) {
        factList.innerHTML = `<li>${error.message}</li>`;
      }
    }
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
        const commits = await projectApi.fetchProjectHistory(project.slug);
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
        statusFlash.show(error.message, { error: true });
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
      card.title = "Click for details · drag to move lane";
      let kanbanPointerDown = null;
      card.addEventListener("pointerdown", (e) => {
        kanbanPointerDown = { x: e.clientX, y: e.clientY };
      });
      card.addEventListener("click", (e) => {
        if (!kanbanPointerDown) return;
        const dist = Math.hypot(e.clientX - kanbanPointerDown.x, e.clientY - kanbanPointerDown.y);
        kanbanPointerDown = null;
        if (dist > 14) return;
        openTaskDetailModal(task);
      });
      const projectLabel = task.projectName || task.projectSlug;
      card.innerHTML = `
        <div class="kanban-project" title="Project">${escapeHtml(projectLabel)}<span class="kanban-project-slug">${escapeHtml(task.projectSlug)}</span></div>
        <div class="kanban-title">${escapeHtml(task.title)}</div>
        <div class="kanban-meta"><code>${escapeHtml(task.id)}</code></div>
        <div class="kanban-meta">due: ${escapeHtml(task.dueDate || "n/a")}</div>
        <div class="kanban-meta">${deps ? `deps: ${escapeHtml(deps)}` : "deps: none"}</div>
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
      runBtn.type = "button";
      runBtn.className = "vault-btn-new vault-btn-new--inline";
      runBtn.addEventListener("click", async () => {
        try {
          await saveProjectMeta(action.projectSlug, action.suggestedPatch || {});
          await refresh();
        } catch (error) {
          statusFlash.show(error.message, { error: true });
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
      projectApi.listProjects(qs()),
      projectApi.fetchTaskBoard(),
      projectApi.fetchTimeline(),
      projectApi.fetchHealth(),
      projectApi.fetchAlerts(),
      projectApi.fetchActionQueue(),
      projectApi.fetchActivity(),
      projectApi.fetchDependencies(),
      projectApi.fetchPortfolio(),
      projectApi.fetchTodayBrief(),
      projectApi.fetchTrends(),
      projectApi.fetchOpsState(),
      projectApi.fetchCapacity(),
      projectApi.fetchTimeEntries(),
      projectApi.fetchIntakeForms(),
      projectApi.fetchAutomationRuns()
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
  renderFactsWorkspace();
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
    if (taskDetailModal && !taskDetailModal.hidden) {
      closeTaskDetailModal();
      return;
    }
    if (factCreateModal && !factCreateModal.hidden) {
      closeFactCreateModal();
      return;
    }
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
    const results = await projectApi.patchProjectsBulk(updates);
    const failed = results.filter((r) => !r.ok).length;
    statusFlash.show(
      failed ? `Bulk update completed with ${failed} failure(s)` : "Bulk update completed",
      failed ? { error: true, clearAfterMs: null } : {}
    );
    await refresh();
  } catch (error) {
    statusFlash.show(error.message, { error: true });
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
    await projectApi.postTimeEntry({
      slug: timeSlug.value.trim(),
      minutes: Number(timeMinutes.value || 0),
      note: timeNote.value.trim()
    });
    timeMinutes.value = "";
    timeNote.value = "";
    await refresh();
  } catch (error) {
    statusFlash.show(error.message, { error: true });
  }
});
createProjectBtn.addEventListener("click", async () => {
  const name = newProjectName.value.trim();
  if (!name) {
    statusFlash.show("Project name is required.", { error: true });
    return;
  }
  const dueDays = Number(newProjectDueDays.value || 30);
  if (!Number.isFinite(dueDays) || dueDays < 1) {
    statusFlash.show("Due in days must be at least 1.", { error: true });
    return;
  }
  const estimateHoursRaw = newProjectEstimateHours.value.trim();
  const estimateHours = estimateHoursRaw ? Number(estimateHoursRaw) : undefined;
  if (estimateHoursRaw && (!Number.isFinite(estimateHours) || estimateHours < 0)) {
    statusFlash.show("Estimate hours must be a non-negative number.", { error: true });
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
    const result = await projectApi.postIntakeSubmit("quick-project", payload);
    statusFlash.show(`Project created: ${result?.slug || name}`);
    clearCreateProjectForm();
    await refresh();
  } catch (error) {
    statusFlash.show(error.message, { error: true });
  }
});
createTaskBtn?.addEventListener("click", async () => {
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
    statusFlash.show("Project slug is required to add a task.", { error: true });
    return;
  }
  if (!task) {
    statusFlash.show("Task description is required.", { error: true });
    return;
  }
  if (!dueDate) {
    statusFlash.show("Task due date is required (YYYY-MM-DD).", { error: true });
    return;
  }
  if (!isIsoDateClient(dueDate)) {
    statusFlash.show("Due date must be a valid calendar date.", { error: true });
    return;
  }
  if (taskModalFutureDatesOnly?.checked) {
    const today = new Date().toISOString().slice(0, 10);
    if (dueDate < today) {
      statusFlash.show("Due date must be today or later when “Only future dates” is checked.", { error: true });
      return;
    }
  }
  const recurrenceRaw = newTaskRecurText?.value || "";
  const recurrenceTrim = recurrenceRaw.trim();
  const recurrenceSkip = /^(none|no|-)$/i.test(recurrenceTrim);
  const recurrence = recurrenceSkip ? "" : parseRecurrenceFromText(recurrenceRaw);
  if (recurrenceTrim && !recurrenceSkip && !recurrence) {
    statusFlash.show(
      "Recurrence text was not recognized. Use phrases like “daily”, “every week”, or “monthly”, or leave blank.",
      { error: true }
    );
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
        statusFlash.show(
          `Task created (${result?.taskId || "ok"}) but project priority was not updated: ${metaErr.message}`,
          { error: true, clearAfterMs: null }
        );
        clearCreateTaskForm();
        closeTaskCreateModal();
        await refresh();
        return;
      }
    }
    if (result?.taskId) statusFlash.show(`Task created: ${result.taskId}`);
    else statusFlash.show("Task created successfully.");
    clearCreateTaskForm();
    closeTaskCreateModal();
    await refresh();
  } catch (error) {
    statusFlash.show(error.message, { error: true });
  }
});
newTaskSlug?.addEventListener("change", () => {
  const slug = newTaskSlug.value;
  populateProjectTaskOptions(slug, newTaskDependsOn, newTaskFactRefs);
  if (!factOptionsByProject.has(slug)) {
    projectApi.fetchProjectFacts(slug)
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

document.body.addEventListener("click", (e) => {
  const opener = e.target.closest?.("[data-open-fact-modal]");
  if (!opener) return;
  e.preventDefault();
  const which = opener.getAttribute("data-open-fact-modal");
  if (which === "facts") {
    openFactCreateModal(factsWorkspaceSlug?.value?.trim());
  } else if (which === "projects") {
    openFactCreateModal(newTaskSlug?.value?.trim());
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
if (factCreateModal) {
  factCreateModal.addEventListener("click", (e) => {
    if (e.target === factCreateModal) closeFactCreateModal();
  });
}
closeFactModalBtn?.addEventListener("click", () => closeFactCreateModal());
cancelFactModalBtn?.addEventListener("click", () => closeFactCreateModal());
createFactBtn?.addEventListener("click", () => submitCreateFact());
if (taskDetailModal) {
  taskDetailModal.addEventListener("click", (e) => {
    if (e.target === taskDetailModal) closeTaskDetailModal();
  });
}
if (closeTaskDetailModalBtn) closeTaskDetailModalBtn.addEventListener("click", () => closeTaskDetailModal());
if (closeTaskDetailFooterBtn) closeTaskDetailFooterBtn.addEventListener("click", () => closeTaskDetailModal());
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
        statusFlash.show("Quick Task requires project slug, title, and due date.", { error: true });
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
        statusFlash.show("Quick Project requires a project name in Title / Name.", { error: true });
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
        statusFlash.show("Incoming Event requires a title.", { error: true });
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
      statusFlash.show("Select an intake form type.", { error: true });
      return;
    }
    const result = await projectApi.postIntakeSubmit(formId, payload);
    intakeList.innerHTML = `<li>Submitted: ${result.result?.type || "n/a"} ${result.result?.slug || ""}</li>`;
    clearIntakeForm();
    await refresh();
  } catch (error) {
    statusFlash.show(error.message, { error: true });
  }
});
intakeFormSelect.addEventListener("change", updateIntakeFieldVisibility);
runAutomationDryBtn.addEventListener("click", async () => {
  try {
    const result = await projectApi.postAutomationRun(true);
    statusFlash.show(`Automation dry-run evaluated ${result.evaluated} rule(s)`);
    await refresh();
  } catch (error) {
    statusFlash.show(error.message, { error: true });
  }
});
runAutomationBtn.addEventListener("click", async () => {
  try {
    const result = await projectApi.postAutomationRun(false);
    statusFlash.show(`Automation run evaluated ${result.evaluated} rule(s)`);
    await refresh();
  } catch (error) {
    statusFlash.show(error.message, { error: true });
  }
});
exportSnapshotBtn.addEventListener("click", async () => {
  try {
    const result = await projectApi.postExportSnapshot();
    statusFlash.show(`Snapshot exported: ${result.path}`);
  } catch (error) {
    statusFlash.show(error.message, { error: true });
  }
});
previewMigrationBtn.addEventListener("click", async () => {
  try {
    const items = JSON.parse(migrationInput.value || "[]");
    const result = await projectApi.postMigrationPreview(items);
    migrationList.innerHTML = `
      <li>Total: ${result.total}</li>
      <li>Normalized: ${result.normalized.length}</li>
      <li>Issues: ${result.issues.length}</li>
    `;
  } catch (error) {
    statusFlash.show(error.message, { error: true });
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
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const list = [...tabButtons];
    const currentIndex = list.indexOf(btn);
    const delta = event.key === "ArrowDown" ? 1 : -1;
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

factsWorkspaceSlug?.addEventListener("change", () => renderFactsWorkspace());
for (const btn of document.querySelectorAll(".factsFilterBtn")) {
  btn.addEventListener("click", () => {
    for (const b of document.querySelectorAll(".factsFilterBtn")) b.classList.remove("active");
    btn.classList.add("active");
    renderFactsWorkspace();
  });
}
taskDetailSaveFactsBtn?.addEventListener("click", async () => {
  if (!taskDetailBoardTask) return;
  const slug = taskDetailBoardTask.projectSlug;
  const taskId = taskDetailBoardTask.id;
  const ids = getSelectedValues(taskDetailFactRefsSelect);
  try {
    await saveTaskFactRefs(slug, taskId, ids);
    factOptionsByProject.delete(slug);
    await refresh();
    const proj = currentProjects.find((p) => p.slug === slug);
    const nextBoard = {
      ...taskDetailBoardTask,
      versionToken: proj?.versionToken || taskDetailBoardTask.versionToken
    };
    openTaskDetailModal(nextBoard);
    statusFlash.show("Fact links saved");
  } catch (error) {
    statusFlash.show(error.message, { error: true });
  }
});

setActiveTab(localStorage.getItem(ACTIVE_TAB_KEY) || "overview", false);
applyDigestPrefs(readDigestPrefs());
renderSavedViews();
clearCreateTaskForm();
refresh();

initScrollChrome({
  scrollRoot: document.querySelector(".dash-app .dash-dashboard-scroll"),
  header: document.querySelector(".dash-app .vault-main-top")
});

initVaultSidebarCollapse({
  toggleEls: document.querySelectorAll(".vault-sidebar-toggle"),
  sidebarEl: document.getElementById("vaultSidebar")
});

document.getElementById("dashCommandPaletteBtn")?.addEventListener("click", () => {
  commandPaletteBtn?.click();
});

document.getElementById("dashHelpLink")?.addEventListener("click", (e) => {
  e.preventDefault();
  statusFlash.show(
    "Search and filters: toolbar search. Command palette: sidebar or ⌃/⌘K. Facts: left nav → Facts (create → assign → update). Escape closes overlays.",
    { clearAfterMs: 12000 }
  );
});
