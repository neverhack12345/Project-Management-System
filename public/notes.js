import { marked } from "https://esm.sh/marked@12.0.2";
import DOMPurify from "https://esm.sh/dompurify@3.1.7";
import mermaid from "https://esm.sh/mermaid@11.4.1";

marked.use({ gfm: true, breaks: true });

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "strict"
});

const STARRED_STORAGE_KEY = "vault_starred_paths_v1";

const vaultTreeEl = document.getElementById("vaultTree");
const noteBodyEl = document.getElementById("noteBody");
const noteTitleEl = document.getElementById("noteTitle");
const noteTagsEl = document.getElementById("noteTags");
const breadcrumbsEl = document.getElementById("breadcrumbs");
const backlinkListEl = document.getElementById("backlinkList");
const outgoingListEl = document.getElementById("outgoingList");
const vaultSearchEl = document.getElementById("vaultSearch");
const searchHitsEl = document.getElementById("searchHits");
const panelReader = document.getElementById("panelReader");
const panelGraph = document.getElementById("panelGraph");
const mermaidGraphHost = document.getElementById("mermaidGraphHost");
const brokenLinksListEl = document.getElementById("brokenLinksList");
const vaultFlashEl = document.getElementById("vaultFlash");
const btnEditNote = document.getElementById("btnEditNote");
const btnNewNote = document.getElementById("btnNewNote");
const btnSaveNote = document.getElementById("btnSaveNote");
const btnCancelEdit = document.getElementById("btnCancelEdit");
const noteEditorEl = document.getElementById("noteEditor");
const floatToolbar = document.getElementById("floatToolbar");
const badgeEditing = document.getElementById("badgeEditing");
const badgeReadTime = document.getElementById("badgeReadTime");
const btnStarNote = document.getElementById("btnStarNote");
const navSideFiles = document.getElementById("navSideFiles");
const navSideSearch = document.getElementById("navSideSearch");
const navSideStarred = document.getElementById("navSideStarred");
const navSideGraph = document.getElementById("navSideGraph");
const navSideSettings = document.getElementById("navSideSettings");
const vaultTreeHost = document.getElementById("vaultTreeHost");
const starredListHost = document.getElementById("starredListHost");
const starredListEl = document.getElementById("starredList");
const sharedPlaceholder = document.getElementById("sharedPlaceholder");
const backFromGraphBtn = document.getElementById("backFromGraphBtn");
const btnToggleInspector = document.getElementById("btnToggleInspector");
const vaultHelpLink = document.getElementById("vaultHelpLink");
const btnPublishStub = document.getElementById("btnPublishStub");
const newNoteDialog = document.getElementById("newNoteDialog");
const newNotePath = document.getElementById("newNotePath");
const newNoteTitle = document.getElementById("newNoteTitle");
const newNoteCreateBtn = document.getElementById("newNoteCreateBtn");
const newNoteCancelBtn = document.getElementById("newNoteCancelBtn");

let currentPath = "";
let currentSource = "";
let isEditing = false;
let currentListView = "recent";

function showFlash(message, isError) {
  vaultFlashEl.textContent = message || "";
  vaultFlashEl.classList.toggle("error", Boolean(isError));
  if (message && !isError) {
    window.clearTimeout(showFlash._t);
    showFlash._t = window.setTimeout(() => {
      vaultFlashEl.textContent = "";
    }, 5000);
  }
}

function loadStarredSet() {
  try {
    const raw = localStorage.getItem(STARRED_STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveStarredSet(set) {
  localStorage.setItem(STARRED_STORAGE_KEY, JSON.stringify([...set]));
}

function normalizeTags(frontmatter) {
  if (!frontmatter || typeof frontmatter !== "object") return [];
  const t = frontmatter.tags;
  if (t == null) return [];
  if (Array.isArray(t)) return t.map((x) => String(x).trim()).filter(Boolean);
  if (typeof t === "string") {
    return t
      .split(/[,\n]/)
      .map((x) => x.trim().replace(/^#/, ""))
      .filter(Boolean);
  }
  return [];
}

function renderNoteTags(tags) {
  if (!noteTagsEl) return;
  noteTagsEl.innerHTML = "";
  if (!tags.length) {
    noteTagsEl.classList.add("hidden");
    return;
  }
  noteTagsEl.classList.remove("hidden");
  for (const tag of tags) {
    const span = document.createElement("span");
    span.className = "vault-tag";
    span.textContent = tag.startsWith("#") ? tag : `#${tag}`;
    noteTagsEl.appendChild(span);
  }
}

function estimateReadMinutes(markdown) {
  const text = String(markdown || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  const words = text ? text.split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / 200));
}

function updateStarButton() {
  if (!btnStarNote || !currentPath) return;
  const starred = loadStarredSet().has(currentPath);
  btnStarNote.setAttribute("aria-pressed", starred ? "true" : "false");
  btnStarNote.textContent = starred ? "★" : "☆";
}

function renderStarredList() {
  if (!starredListEl) return;
  const set = loadStarredSet();
  starredListEl.innerHTML = "";
  const paths = [...set].sort((a, b) => a.localeCompare(b));
  for (const p of paths) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = p;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      openVaultPath(p);
    });
    li.appendChild(a);
    starredListEl.appendChild(li);
  }
}

function syncSidebarNav() {
  const graphVisible = panelGraph && !panelGraph.classList.contains("hidden");
  const readerVisible = panelReader && !panelReader.classList.contains("hidden");
  navSideGraph?.classList.toggle("active", graphVisible);
  navSideFiles?.classList.toggle("active", readerVisible && currentListView === "recent" && !graphVisible);
  navSideStarred?.classList.toggle("active", readerVisible && currentListView === "starred" && !graphVisible);
}

function setListView(view) {
  currentListView = view;
  document.querySelectorAll(".vault-view-tab").forEach((btn) => {
    const on = btn.dataset.view === view;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });
  if (vaultTreeHost) vaultTreeHost.classList.toggle("hidden", view !== "recent");
  if (starredListHost) starredListHost.classList.toggle("hidden", view !== "starred");
  if (sharedPlaceholder) sharedPlaceholder.classList.toggle("hidden", view !== "shared");
  if (view === "starred") renderStarredList();
  syncSidebarNav();
}

function setEditUi(editing) {
  isEditing = editing;
  btnEditNote.classList.toggle("hidden", editing);
  btnNewNote.classList.toggle("hidden", editing);
  btnSaveNote.classList.toggle("hidden", !editing);
  btnCancelEdit.classList.toggle("hidden", !editing);
  noteEditorEl.classList.toggle("hidden", !editing);
  noteBodyEl.classList.toggle("hidden", editing);
  btnEditNote.disabled = !currentPath;
  if (floatToolbar) floatToolbar.classList.toggle("hidden", !editing);
  if (badgeEditing) badgeEditing.classList.toggle("hidden", !editing);
}

function exitEditModeSilent() {
  isEditing = false;
  setEditUi(false);
}

function posixNormalize(parts) {
  const stack = [];
  for (const p of parts) {
    if (!p || p === ".") continue;
    if (p === "..") stack.pop();
    else stack.push(p);
  }
  return stack.join("/");
}

/** Resolve a relative or same-dir .md href against current note path */
function resolveMarkdownHref(fromPath, href) {
  const [pathPart, frag] = href.split("#");
  const dir = fromPath.includes("/") ? fromPath.slice(0, fromPath.lastIndexOf("/")) : "";
  const segments = pathPart.startsWith("/") ? pathPart.slice(1).split("/") : [...dir.split("/").filter(Boolean), ...pathPart.split("/")];
  const resolved = posixNormalize(segments);
  if (!resolved || !resolved.toLowerCase().endsWith(".md")) return null;
  return frag ? `${resolved}#${frag}` : resolved;
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function rewriteVaultMarkdownProtocols(html) {
  return html
    .replace(/href="vpath:([^"]+)"/g, (_, enc) => {
      let p;
      try {
        p = decodeURIComponent(enc);
      } catch {
        p = enc;
      }
      return `href="#" data-vault-path="${escapeAttr(p)}" class="vault-int-link"`;
    })
    .replace(/href="vpath-broken:([^"]+)"/g, (_, enc) => {
      let raw;
      try {
        raw = decodeURIComponent(enc);
      } catch {
        raw = enc;
      }
      return `href="#" title="Unresolved link" class="vault-link-broken" data-vault-broken="${escapeAttr(raw)}"`;
    });
}

function rewriteRelativeMarkdownLinks(html, fromPath) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  for (const a of wrapper.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href");
    if (!href || href === "#" || /^https?:\/\//i.test(href) || href.startsWith("mailto:")) continue;
    if (a.hasAttribute("data-vault-path") || a.hasAttribute("data-vault-broken")) continue;
    if (!href.toLowerCase().includes(".md")) continue;
    const resolved = resolveMarkdownHref(fromPath, href);
    if (resolved) {
      a.setAttribute("href", "#");
      a.setAttribute("data-vault-path", resolved);
      a.classList.add("vault-int-link");
    }
  }
  return wrapper.innerHTML;
}

function sanitizeNoteHtml(html) {
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ["data-vault-path", "data-vault-broken", "data-vault-excalidraw", "class"],
    ADD_TAGS: ["details", "summary"],
    ALLOW_UNKNOWN_PROTOCOLS: false
  });
}

function promoteMermaidBlocks(rootEl) {
  for (const pre of rootEl.querySelectorAll("pre code.language-mermaid")) {
    const code = pre.textContent || "";
    const mPre = document.createElement("pre");
    mPre.className = "mermaid";
    mPre.textContent = code;
    pre.parentElement.replaceWith(mPre);
  }
}

async function runMermaidIn(rootEl) {
  const nodes = rootEl.querySelectorAll("pre.mermaid");
  if (!nodes.length) return;
  try {
    await mermaid.run({ nodes: [...nodes] });
  } catch (e) {
    console.warn("Mermaid render:", e);
  }
}

async function hydrateExcalidrawEmbeds(rootEl) {
  const exportToSvg = globalThis.ExcalidrawUtils?.exportToSvg;
  const nodes = rootEl.querySelectorAll("[data-vault-excalidraw]");
  if (!nodes.length) return;
  if (typeof exportToSvg !== "function") {
    for (const el of nodes) {
      el.innerHTML = '<p class="vault-excalidraw-error">Excalidraw library failed to load.</p>';
    }
    return;
  }
  for (const el of nodes) {
    const p = el.getAttribute("data-vault-excalidraw");
    if (!p) continue;
    el.innerHTML = '<p class="muted">Loading diagram…</p>';
    try {
      const res = await fetch(`/api/vault/excalidraw?path=${encodeURIComponent(p)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        el.innerHTML = `<p class="vault-excalidraw-error">${escapeAttr(data.error || `Failed (${res.status})`)}</p>`;
        continue;
      }
      const scene = data.scene;
      if (!scene || !Array.isArray(scene.elements)) {
        el.innerHTML = '<p class="vault-excalidraw-error">Invalid diagram data</p>';
        continue;
      }
      const svg = await exportToSvg({
        elements: scene.elements,
        appState: scene.appState || {},
        files: scene.files || {}
      });
      el.innerHTML = "";
      if (svg && String(svg.nodeName || "").toLowerCase() === "svg") {
        el.appendChild(svg);
      } else {
        el.innerHTML = '<p class="vault-excalidraw-error">Could not render diagram</p>';
      }
    } catch (e) {
      el.innerHTML = `<p class="vault-excalidraw-error">${escapeAttr(e.message || String(e))}</p>`;
    }
  }
}

function isExcalidrawVaultPath(p) {
  const lower = String(p || "").toLowerCase();
  if (lower.endsWith(".excalidraw.json")) return true;
  return lower.endsWith(".excalidraw");
}

function openVaultPath(p) {
  if (!p) return;
  if (isExcalidrawVaultPath(p)) {
    loadExcalidrawViewer(p);
    return;
  }
  if (p.toLowerCase().endsWith(".md")) loadNote(p);
}

function renderTree(nodes, depth = 0) {
  const ul = document.createElement("ul");
  for (const node of nodes) {
    const li = document.createElement("li");
    if (node.path) {
      const a = document.createElement("a");
      a.href = "#";
      a.textContent = node.name;
      a.className = "file-link";
      a.dataset.path = node.path;
      if (node.path === currentPath) a.classList.add("active");
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const kind =
          node.kind ||
          (isExcalidrawVaultPath(node.path) ? "excalidraw" : "md");
        if (kind === "excalidraw") loadExcalidrawViewer(node.path);
        else loadNote(node.path);
      });
      li.appendChild(a);
    } else {
      const details = document.createElement("details");
      if (depth === 0) details.open = true;
      const summary = document.createElement("summary");
      summary.textContent = node.name || "vault";
      details.appendChild(summary);
      details.appendChild(renderTree(node.children || [], depth + 1));
      li.appendChild(details);
    }
    ul.appendChild(li);
  }
  return ul;
}

async function refreshTree() {
  const res = await fetch("/api/vault/tree");
  const data = await res.json();
  vaultTreeEl.innerHTML = "";
  vaultTreeEl.appendChild(renderTree(data.tree || []));
}

function renderBreadcrumbs(relPath) {
  const parts = relPath.split("/");
  const crumbs = [];
  let acc = "";
  for (let i = 0; i < parts.length; i++) {
    acc = i === 0 ? parts[0] : `${acc}/${parts[i]}`;
    const isLast = i === parts.length - 1;
    const segment = parts[i];
    if (isLast) {
      crumbs.push(`<span>${escapeAttr(segment)}</span>`);
    } else if (acc.toLowerCase().endsWith(".md")) {
      crumbs.push(`<a href="#" data-crumb-path="${escapeAttr(acc)}">${escapeAttr(segment)}</a>`);
    } else {
      crumbs.push(`<span>${escapeAttr(segment)}</span>`);
    }
  }
  breadcrumbsEl.innerHTML = crumbs.join(' <span class="sep">/</span> ');
  for (const a of breadcrumbsEl.querySelectorAll("a[data-crumb-path]")) {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const p = a.getAttribute("data-crumb-path");
      if (p && p.toLowerCase().endsWith(".md")) loadNote(p);
    });
  }
}

function renderLinkList(el, paths, emptyLabel) {
  el.innerHTML = "";
  if (!paths || !paths.length) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = emptyLabel;
    el.appendChild(li);
    return;
  }
  for (const p of paths) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = p;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      loadNote(p);
    });
    li.appendChild(a);
    el.appendChild(li);
  }
}

function renderOutgoing(el, items) {
  el.innerHTML = "";
  if (!items || !items.length) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "No outgoing links";
    el.appendChild(li);
    return;
  }
  for (const item of items) {
    const li = document.createElement("li");
    if (item.resolved) {
      const a = document.createElement("a");
      a.href = "#";
      a.textContent = item.pathPart;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        loadNote(item.resolved);
      });
      li.appendChild(a);
    } else {
      const span = document.createElement("span");
      span.className = "vault-link-broken";
      span.textContent = item.pathPart + (item.ambiguous ? " (ambiguous)" : "");
      li.appendChild(span);
    }
    el.appendChild(li);
  }
}

async function loadExcalidrawViewer(relPath) {
  if (!relPath || !isExcalidrawVaultPath(relPath)) return;
  if (isEditing && noteEditorEl.value !== currentSource) {
    if (!window.confirm("Discard unsaved changes?")) return;
  }
  exitEditModeSilent();
  currentPath = relPath;
  currentSource = "";
  const baseName = relPath.includes("/") ? relPath.slice(relPath.lastIndexOf("/") + 1) : relPath;
  noteTitleEl.textContent = baseName;
  btnEditNote.disabled = true;
  renderNoteTags([]);
  if (badgeReadTime) badgeReadTime.textContent = "";
  updateStarButton();
  renderBreadcrumbs(relPath);

  const safePath = escapeAttr(relPath);
  noteBodyEl.innerHTML = sanitizeNoteHtml(
    `<div class="vault-excalidraw vault-excalidraw-viewer" data-vault-excalidraw="${safePath}"></div>`
  );

  promoteMermaidBlocks(noteBodyEl);
  await runMermaidIn(noteBodyEl);
  await hydrateExcalidrawEmbeds(noteBodyEl);

  renderLinkList(backlinkListEl, [], "No backlinks for diagram files");
  renderOutgoing(outgoingListEl, [], "No outgoing links");

  await refreshTree();
  history.replaceState(null, "", `${window.location.pathname}?path=${encodeURIComponent(relPath)}`);
}

async function loadNote(relPath) {
  if (!relPath || !relPath.toLowerCase().endsWith(".md")) return;
  if (isEditing && noteEditorEl.value !== currentSource) {
    if (!window.confirm("Discard unsaved changes?")) return;
  }
  exitEditModeSilent();
  currentPath = relPath;
  const url = `/api/vault/file?path=${encodeURIComponent(relPath)}`;
  const res = await fetch(url);
  if (!res.ok) {
    currentSource = "";
    noteTitleEl.textContent = "Error";
    noteBodyEl.innerHTML = `<p>Could not load note (${res.status}).</p>`;
    btnEditNote.disabled = true;
    renderNoteTags([]);
    if (badgeReadTime) badgeReadTime.textContent = "";
    updateStarButton();
    return;
  }
  const data = await res.json();
  currentSource = typeof data.source === "string" ? data.source : "";
  noteTitleEl.textContent = data.title || relPath;
  btnEditNote.disabled = false;
  renderNoteTags(normalizeTags(data.data));
  if (badgeReadTime) badgeReadTime.textContent = `${estimateReadMinutes(data.source || "")} MIN READ`;
  updateStarButton();
  renderBreadcrumbs(relPath);

  let html = marked.parse(data.previewMarkdown || "");
  html = rewriteVaultMarkdownProtocols(html);
  html = rewriteRelativeMarkdownLinks(html, relPath);
  html = sanitizeNoteHtml(html);
  noteBodyEl.innerHTML = html;

  promoteMermaidBlocks(noteBodyEl);
  await runMermaidIn(noteBodyEl);
  await hydrateExcalidrawEmbeds(noteBodyEl);

  renderLinkList(backlinkListEl, data.backlinks, "No backlinks yet");
  renderOutgoing(outgoingListEl, data.outgoing);

  noteBodyEl.querySelectorAll("a[data-vault-path]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const target = a.getAttribute("data-vault-path");
      if (target) {
        const [p] = target.split("#");
        loadNote(p);
      }
    });
  });

  await refreshTree();
  history.replaceState(null, "", `${window.location.pathname}?path=${encodeURIComponent(relPath)}`);
}

function enterEditMode() {
  if (!currentPath || !currentSource) {
    showFlash("Nothing to edit yet.", true);
    return;
  }
  setEditUi(true);
  noteEditorEl.value = currentSource;
  noteEditorEl.focus();
}

async function saveNote() {
  if (!currentPath) return;
  showFlash("Saving…");
  try {
    const res = await fetch("/api/vault/file", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: currentPath, content: noteEditorEl.value })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showFlash(data.error || `Save failed (${res.status})`, true);
      return;
    }
    if (data.commit?.warning) {
      showFlash(data.commit.warning, true);
    } else {
      showFlash("Saved.");
    }
    exitEditModeSilent();
    await loadNote(currentPath);
  } catch (e) {
    showFlash(e.message || "Save failed", true);
  }
}

async function cancelEdit() {
  if (noteEditorEl.value !== currentSource) {
    if (!window.confirm("Discard unsaved changes?")) return;
  }
  exitEditModeSilent();
  await loadNote(currentPath);
}

btnEditNote.addEventListener("click", () => enterEditMode());
btnSaveNote.addEventListener("click", () => saveNote());
btnCancelEdit.addEventListener("click", () => cancelEdit());

btnNewNote.addEventListener("click", () => {
  newNotePath.value = "";
  newNoteTitle.value = "";
  newNoteDialog.showModal();
});

newNoteCancelBtn.addEventListener("click", () => newNoteDialog.close());

newNoteCreateBtn.addEventListener("click", async () => {
  let rel = newNotePath.value.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!rel.toLowerCase().endsWith(".md")) {
    showFlash("Path must end in .md", true);
    return;
  }
  try {
    const res = await fetch("/api/vault/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: rel,
        title: newNoteTitle.value.trim() || undefined
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showFlash(data.error || `Create failed (${res.status})`, true);
      return;
    }
    newNoteDialog.close();
    if (data.commit?.warning) showFlash(data.commit.warning, true);
    else showFlash("Note created.");
    await loadNote(data.path);
  } catch (e) {
    showFlash(e.message || "Create failed", true);
  }
});

window.addEventListener("beforeunload", (e) => {
  if (isEditing && noteEditorEl.value !== currentSource) {
    e.preventDefault();
    e.returnValue = "";
  }
});

let searchTimer;
vaultSearchEl.addEventListener("input", () => {
  clearTimeout(searchTimer);
  const q = vaultSearchEl.value.trim();
  searchTimer = setTimeout(async () => {
    if (!q) {
      searchHitsEl.classList.add("hidden");
      searchHitsEl.innerHTML = "";
      return;
    }
    const res = await fetch(`/api/vault/search?q=${encodeURIComponent(q)}&limit=20`);
    const data = await res.json();
    searchHitsEl.innerHTML = "";
    if (!data.hits?.length) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "No results";
      btn.disabled = true;
      li.appendChild(btn);
      searchHitsEl.appendChild(li);
    } else {
      for (const h of data.hits) {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = h.title;
        btn.title = h.path;
        btn.addEventListener("click", () => {
          searchHitsEl.classList.add("hidden");
          vaultSearchEl.value = "";
          loadNote(h.path);
        });
        li.appendChild(btn);
        searchHitsEl.appendChild(li);
      }
    }
    searchHitsEl.classList.remove("hidden");
  }, 220);
});

function setPanel(name) {
  const isGraph = name === "graph";
  panelReader.classList.toggle("hidden", isGraph);
  panelGraph.classList.toggle("hidden", !isGraph);
  syncSidebarNav();
}

document.querySelectorAll(".vault-view-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.view;
    if (view) setListView(view);
  });
});

navSideFiles?.addEventListener("click", () => {
  setPanel("reader");
  setListView("recent");
});

navSideSearch?.addEventListener("click", () => {
  setPanel("reader");
  vaultSearchEl?.focus();
});

navSideStarred?.addEventListener("click", () => {
  setPanel("reader");
  setListView("starred");
});

navSideGraph?.addEventListener("click", () => {
  setPanel("graph");
  loadGraphPanel();
});

navSideSettings?.addEventListener("click", () => {
  showFlash("Local vault — files stay on disk in /vault. No cloud settings.");
});

backFromGraphBtn?.addEventListener("click", () => {
  setPanel("reader");
  syncSidebarNav();
});

btnStarNote?.addEventListener("click", () => {
  if (!currentPath) return;
  const set = loadStarredSet();
  if (set.has(currentPath)) set.delete(currentPath);
  else set.add(currentPath);
  saveStarredSet(set);
  updateStarButton();
  renderStarredList();
});

function editorWrap(before, after) {
  if (!noteEditorEl || noteEditorEl.classList.contains("hidden")) return;
  const ta = noteEditorEl;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const v = ta.value;
  const sel = v.slice(start, end);
  const aft = after !== undefined ? after : before;
  ta.value = v.slice(0, start) + before + sel + aft + v.slice(end);
  const c0 = start + before.length;
  const c1 = c0 + sel.length;
  ta.focus();
  ta.selectionStart = c0;
  ta.selectionEnd = c1;
}

document.querySelectorAll(".vault-ft-btn[data-cmd]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const cmd = btn.dataset.cmd;
    if (cmd === "bold") editorWrap("**", "**");
    else if (cmd === "italic") editorWrap("*", "*");
    else if (cmd === "link") editorWrap("[", "](url)");
    else if (cmd === "list") editorWrap("- ", "");
    else if (cmd === "image") editorWrap("![alt](", ")");
  });
});

btnPublishStub?.addEventListener("click", () => {
  showFlash("Publish is not configured for this offline vault.");
});

vaultHelpLink?.addEventListener("click", (e) => {
  e.preventDefault();
  showFlash("Search: top bar. Edit: toolbar. Graph: sidebar. Escape closes dialogs.");
});

btnToggleInspector?.addEventListener("click", () => {
  document.body.classList.toggle("vault-inspector-off");
  const on = !document.body.classList.contains("vault-inspector-off");
  btnToggleInspector.setAttribute("aria-pressed", on ? "true" : "false");
});

function graphMermaidSource(graph) {
  const { nodes = [], edges = [] } = graph || {};
  const idByPath = new Map();
  nodes.forEach((n, i) => {
    idByPath.set(n.id, `N${i}`);
  });
  const lines = ["flowchart LR"];
  for (const n of nodes) {
    const id = idByPath.get(n.id);
    const label = (n.title || n.id).replace(/"/g, "'");
    lines.push(`  ${id}["${label}"]`);
  }
  for (const e of edges) {
    if (!e.ok) continue;
    const a = idByPath.get(e.from);
    const b = idByPath.get(e.to);
    if (a && b) lines.push(`  ${a} --> ${b}`);
  }
  return lines.join("\n");
}

async function loadGraphPanel() {
  mermaidGraphHost.innerHTML = "";
  brokenLinksListEl.innerHTML = "";
  const res = await fetch("/api/vault/graph");
  const data = await res.json();
  const graph = data.graph || { nodes: [], edges: [] };
  const broken = (graph.edges || []).filter((e) => !e.ok);

  if (!graph.nodes?.length) {
    mermaidGraphHost.innerHTML = "<p class=\"muted\">No notes in vault yet. Add <code>.md</code> files under <code>vault/</code>.</p>";
    return;
  }

  const src = graphMermaidSource(graph);
  const pre = document.createElement("pre");
  pre.className = "mermaid";
  pre.textContent = src;
  mermaidGraphHost.appendChild(pre);
  try {
    await mermaid.run({ nodes: [pre] });
  } catch (e) {
    mermaidGraphHost.innerHTML = `<p class="vault-link-broken">Graph layout failed: ${escapeAttr(e.message || String(e))}</p><pre class="vault-graph-error-pre">${escapeAttr(src)}</pre>`;
  }

  if (broken.length) {
    const title = document.createElement("p");
    title.textContent = "Unresolved or ambiguous links:";
    brokenLinksListEl.appendChild(title);
    const ul = document.createElement("ul");
    for (const e of broken) {
      const li = document.createElement("li");
      li.textContent = `${e.from} → ${e.to}${e.ambiguous ? " (ambiguous)" : ""}`;
      ul.appendChild(li);
    }
    brokenLinksListEl.appendChild(ul);
  }
}

document.getElementById("refreshGraphBtn").addEventListener("click", () => {
  loadGraphPanel();
});

function initVaultScrollChrome() {
  const docCol = document.querySelector(".vault-doc-column");
  const mainTop = document.querySelector(".vault-main-top");
  if (!docCol || !mainTop) return;
  let scrollTimer = null;
  const onScroll = () => {
    mainTop.classList.toggle("is-doc-scrolled", docCol.scrollTop > 20);
    docCol.classList.add("is-scrolling");
    window.clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      docCol.classList.remove("is-scrolling");
    }, 1500);
  };
  docCol.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

async function boot() {
  initVaultScrollChrome();
  setListView("recent");
  setEditUi(false);
  btnEditNote.disabled = true;
  renderStarredList();
  syncSidebarNav();
  const params = new URLSearchParams(window.location.search);
  const pathParam = params.get("path");
  await refreshTree();
  if (pathParam) {
    if (pathParam.toLowerCase().endsWith(".md")) await loadNote(pathParam);
    else if (isExcalidrawVaultPath(pathParam)) await loadExcalidrawViewer(pathParam);
  } else {
    const res = await fetch("/api/vault/tree");
    const data = await res.json();
    const first =
      data.paths?.find((p) => p === "Welcome.md") ||
      data.paths?.find((p) => /(^|\/)welcome\.md$/i.test(p)) ||
      data.paths?.find((p) => p.toLowerCase().endsWith(".md"));
    if (first) await loadNote(first);
    else {
      currentPath = "";
      currentSource = "";
      noteTitleEl.textContent = "Empty vault";
      noteBodyEl.innerHTML =
        "<p>No notes yet. Use <strong>New note</strong> to create one under <code>vault/</code>, or add <code>.md</code> files on disk.</p>";
      btnEditNote.disabled = true;
      renderNoteTags([]);
      if (badgeReadTime) badgeReadTime.textContent = "";
      updateStarButton();
    }
  }
}

boot();
