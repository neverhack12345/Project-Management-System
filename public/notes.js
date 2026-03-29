import { marked } from "https://esm.sh/marked@12.0.2";
import DOMPurify from "https://esm.sh/dompurify@3.1.7";
import {
  initVaultMermaid,
  isExcalidrawVaultPath,
  isMermaidVaultPath,
  getVaultDiagramKind,
  extractMermaidSourceFromFile,
  extractMermaidBlockFromMarkdown,
  graphMermaidSource,
  runMermaidOnElements,
  renderMermaidSvgInto,
  hydrateExcalidrawEmbeds,
  renderVaultDiagramFile
} from "./vault-diagram-render.js";

marked.use({ gfm: true, breaks: true });

initVaultMermaid();

const STARRED_STORAGE_KEY = "vault_starred_paths_v1";
const VIEW_PREF_KEY = "vault_notes_view_rendered_v1";

/** When true, show raw file text instead of rendered preview (markdown / mermaid). */
let preferSourceView = localStorage.getItem(VIEW_PREF_KEY) === "raw";

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
const noteRawViewEl = document.getElementById("noteRawView");
const btnToggleSourceView = document.getElementById("btnToggleSourceView");
const floatToolbar = document.getElementById("floatToolbar");
const badgeEditing = document.getElementById("badgeEditing");
const badgeReadTime = document.getElementById("badgeReadTime");
const btnStarNote = document.getElementById("btnStarNote");
const navSideFiles = document.getElementById("navSideFiles");
const navSideGraph = document.getElementById("navSideGraph");
const vaultTreeHost = document.getElementById("vaultTreeHost");
const starredListHost = document.getElementById("starredListHost");
const starredListEl = document.getElementById("starredList");
const backFromGraphBtn = document.getElementById("backFromGraphBtn");
const btnToggleInspector = document.getElementById("btnToggleInspector");
const vaultHelpLink = document.getElementById("vaultHelpLink");
const btnPublishStub = document.getElementById("btnPublishStub");
const newNoteDialog = document.getElementById("newNoteDialog");
const newNotePath = document.getElementById("newNotePath");
const newNoteTitle = document.getElementById("newNoteTitle");
const newNoteCreateBtn = document.getElementById("newNoteCreateBtn");
const newNoteCancelBtn = document.getElementById("newNoteCancelBtn");
const diagramExpandDialog = document.getElementById("diagramExpandDialog");
const diagramExpandScaled = document.getElementById("diagramExpandScaled");
const diagramExpandClose = document.getElementById("diagramExpandClose");
const diagramExpandZoomIn = document.getElementById("diagramExpandZoomIn");
const diagramExpandZoomOut = document.getElementById("diagramExpandZoomOut");
const diagramExpandZoomReset = document.getElementById("diagramExpandZoomReset");
const diagramExpandZoomLabel = document.getElementById("diagramExpandZoomLabel");
const diagramExpandOpenTab = document.getElementById("diagramExpandOpenTab");

const VAULT_DIAG_SRC_PREFIX = "vaultDiagSrc:";
const VAULT_DIAG_OPEN_PREFIX = "vaultDiagOpen:";
/** Inline ```mermaid``` source keyed by wrap element — survives when localStorage is unavailable. */
const vaultMermaidSrcByWrap = new WeakMap();

let currentPath = "";
let diagramExpandFocusReturn = null;
let diagramExpandScale = 1;
let diagramExpandActiveHost = null;
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
  navSideFiles?.classList.toggle(
    "active",
    readerVisible && (currentListView === "recent" || currentListView === "starred") && !graphVisible
  );
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
  if (view === "starred") renderStarredList();
  syncSidebarNav();
}

function canToggleRenderedSource() {
  return (
    Boolean(currentPath) &&
    !btnEditNote.disabled &&
    (currentPath.toLowerCase().endsWith(".md") || isMermaidVaultPath(currentPath)) &&
    typeof currentSource === "string"
  );
}

function syncSourceToggleButton() {
  if (!btnToggleSourceView) return;
  const available = canToggleRenderedSource() && !isEditing;
  btnToggleSourceView.disabled = !available;
  btnToggleSourceView.textContent = available && preferSourceView ? "Rendered" : "Source";
  btnToggleSourceView.title = available
    ? preferSourceView
      ? "Show rendered preview"
      : "Show raw file source (no formatting)"
    : "Source view not available for this file";
  btnToggleSourceView.setAttribute("aria-pressed", available && preferSourceView ? "true" : "false");
}

/** Applies rendered vs raw layout for the reader (not used while editing). */
function applyViewMode() {
  if (!noteRawViewEl) return;
  if (isEditing) return;

  if (isExcalidrawVaultPath(currentPath) || !canToggleRenderedSource()) {
    noteRawViewEl.classList.add("hidden");
    noteBodyEl.classList.remove("hidden");
    syncSourceToggleButton();
    return;
  }

  if (preferSourceView) {
    noteRawViewEl.textContent = currentSource;
    noteRawViewEl.classList.remove("hidden");
    noteBodyEl.classList.add("hidden");
  } else {
    noteRawViewEl.classList.add("hidden");
    noteBodyEl.classList.remove("hidden");
  }
  syncSourceToggleButton();
}

function setEditUi(editing) {
  isEditing = editing;
  btnEditNote.classList.toggle("hidden", editing);
  btnNewNote.classList.toggle("hidden", editing);
  btnSaveNote.classList.toggle("hidden", !editing);
  btnCancelEdit.classList.toggle("hidden", !editing);
  noteEditorEl.classList.toggle("hidden", !editing);
  btnEditNote.disabled = !currentPath;
  if (floatToolbar) floatToolbar.classList.toggle("hidden", !editing);
  if (badgeEditing) badgeEditing.classList.toggle("hidden", !editing);
  if (editing) {
    noteBodyEl.classList.add("hidden");
    noteRawViewEl?.classList.add("hidden");
  } else {
    applyViewMode();
  }
  if (editing) {
    syncSourceToggleButton();
  }
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

/** Whether a vault-relative path points at a note or Mermaid diagram file. */
function isVaultInternalLinkTarget(pathSansFragment) {
  const p = pathSansFragment.split("#")[0].toLowerCase();
  return p.endsWith(".md") || p.endsWith(".mmd") || p.endsWith(".mermaid");
}

/** Resolve a relative or same-dir vault link (.md / .mmd / .mermaid) against current file path */
function resolveMarkdownHref(fromPath, href) {
  const [pathPart, frag] = href.split("#");
  const dir = fromPath.includes("/") ? fromPath.slice(0, fromPath.lastIndexOf("/")) : "";
  const segments = pathPart.startsWith("/") ? pathPart.slice(1).split("/") : [...dir.split("/").filter(Boolean), ...pathPart.split("/")];
  const resolved = posixNormalize(segments);
  if (!resolved || !isVaultInternalLinkTarget(resolved)) return null;
  return frag ? `${resolved}#${frag}` : resolved;
}

/**
 * Turn Obsidian `![[path.mmd]]` and markdown `![](path.mmd)` into ```mermaid fences before marked.parse.
 * Fixes broken <img> for .mmd/.mermaid URLs and covers stale API preview without server-side embed expansion.
 */
async function preprocessMarkdownMermaidEmbeds(markdown, fromPath) {
  const cache = new Map();
  async function loadDiagramText(pathOnly) {
    if (cache.has(pathOnly)) return cache.get(pathOnly);
    const res = await fetch(`/api/vault/file?path=${encodeURIComponent(pathOnly)}`);
    const data = await res.json().catch(() => ({}));
    const ok = res.ok && data.kind === "mermaid";
    const text = ok ? extractMermaidSourceFromFile(data.source || "") : null;
    cache.set(pathOnly, text);
    return text;
  }

  let md = String(markdown || "");

  const wikiRe = /!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
  for (const m of [...md.matchAll(wikiRe)]) {
    const full = m[0];
    const target = m[1].trim().split("#")[0].trim();
    if (!target) continue;
    const tl = target.toLowerCase();
    if (!tl.endsWith(".mmd") && !tl.endsWith(".mermaid")) continue;
    let pathPart = target;
    try {
      pathPart = decodeURIComponent(pathPart.replace(/\+/g, "%20"));
    } catch {
      /* keep */
    }
    const resolved = resolveMarkdownHref(fromPath, pathPart);
    if (!resolved) continue;
    const pathOnly = resolved.split("#")[0];
    const diagramText = await loadDiagramText(pathOnly);
    if (diagramText == null) continue;
    md = md.replaceAll(full, `\n\n\`\`\`mermaid\n${diagramText}\n\`\`\`\n\n`);
  }

  const imgRe = /!\[([^\]]*)\]\(([^)]+)\)/g;
  for (const m of [...md.matchAll(imgRe)]) {
    const full = m[0];
    let dest = m[2].trim().split("#")[0].trim();
    try {
      dest = decodeURIComponent(dest.replace(/\+/g, "%20"));
    } catch {
      /* keep */
    }
    const dLower = dest.toLowerCase();
    if (!dLower.endsWith(".mmd") && !dLower.endsWith(".mermaid")) continue;
    const resolved = resolveMarkdownHref(fromPath, dest);
    if (!resolved) continue;
    const pathOnly = resolved.split("#")[0];
    const diagramText = await loadDiagramText(pathOnly);
    if (diagramText == null) continue;
    md = md.replaceAll(full, `\n\n\`\`\`mermaid\n${diagramText}\n\`\`\`\n\n`);
  }

  return md;
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
    if (!isVaultInternalLinkTarget(href.split("#")[0])) continue;
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

function newVaultDiagSrcKey() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `mmd_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function promoteMermaidBlocks(rootEl) {
  let blockIndex = 0;
  for (const pre of rootEl.querySelectorAll("pre code.language-mermaid")) {
    const code = pre.textContent || "";
    const key = newVaultDiagSrcKey();
    try {
      localStorage.setItem(`${VAULT_DIAG_SRC_PREFIX}${key}`, code);
    } catch {
      /* quota — open-in-tab for inline mermaid may be unavailable */
    }
    const wrap = document.createElement("div");
    wrap.className = "vault-mermaid-wrap";
    wrap.dataset.vaultMermaidSrcKey = key;
    wrap.dataset.vaultMermaidBlockIndex = String(blockIndex);
    blockIndex++;
    vaultMermaidSrcByWrap.set(wrap, code);
    const mPre = document.createElement("pre");
    mPre.className = "mermaid";
    mPre.textContent = code;
    wrap.appendChild(mPre);
    pre.parentElement.replaceWith(wrap);
  }
}

async function runMermaidIn(rootEl) {
  const nodes = rootEl.querySelectorAll("pre.mermaid");
  if (!nodes.length) return;
  await runMermaidOnElements([...nodes]);
}

function collectDiagramExpandHosts(rootEl) {
  if (!rootEl) return [];
  const seen = new Set();
  const out = [];
  const add = (el) => {
    if (!el || seen.has(el)) return;
    seen.add(el);
    out.push(el);
  };
  rootEl.querySelectorAll(".vault-mermaid-wrap").forEach(add);
  rootEl.querySelectorAll("[data-vault-excalidraw]").forEach(add);
  rootEl.querySelectorAll(".mermaid").forEach((el) => {
    if (!el.closest(".vault-mermaid-wrap")) add(el);
  });
  return out;
}

function decorateDiagramExpandControls(rootEl) {
  if (!rootEl) return;
  for (const host of collectDiagramExpandHosts(rootEl)) {
    if (host.dataset.vaultExpandDecorated === "1") continue;
    if (!host.querySelector("svg")) continue;
    if (host.querySelector(".vault-diagram-expand-btn")) continue;
    host.classList.add("vault-diagram-expand-host");
    host.setAttribute("tabindex", "0");
    host.dataset.vaultExpandDecorated = "1";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "vault-diagram-expand-btn";
    btn.setAttribute("aria-label", "Expand diagram");
    btn.title = "Expand diagram";
    btn.innerHTML =
      '<span class="material-symbols-outlined vault-ms" aria-hidden="true">open_in_full</span>';
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      void openDiagramExpand(host);
    });
    host.appendChild(btn);
  }
}

function applyDiagramExpandZoomTransform() {
  if (!diagramExpandScaled) return;
  const s = diagramExpandScale;
  /* Avoid CSS `zoom` — it breaks flex sizing for dialog content in Chromium (blank expand view). */
  diagramExpandScaled.style.zoom = "";
  diagramExpandScaled.style.transform = s === 1 ? "" : `scale(${s})`;
  if (diagramExpandZoomLabel) diagramExpandZoomLabel.textContent = `${Math.round(s * 100)}%`;
}

function setDiagramExpandZoom(next) {
  diagramExpandScale = Math.min(4, Math.max(0.25, next));
  applyDiagramExpandZoomTransform();
}

function resetDiagramExpandZoom() {
  diagramExpandScale = 1;
  if (diagramExpandScaled) {
    diagramExpandScaled.style.zoom = "";
    diagramExpandScaled.style.transform = "";
  }
  if (diagramExpandZoomLabel) diagramExpandZoomLabel.textContent = "100%";
}

function buildDiagramStandalonePayload(host) {
  if (!host) return null;
  const ex = host.getAttribute("data-vault-excalidraw");
  if (ex) return { v: 1, kind: "excalidraw", path: ex };
  if (host.classList.contains("vault-mermaid-wrap")) {
    const source = getMermaidInlineSourceForWrap(host);
    if (source == null) return null;
    return { v: 1, kind: "mermaidSource", source };
  }
  if (host.classList.contains("mermaid") && !host.closest(".vault-mermaid-wrap")) {
    if (mermaidGraphHost && mermaidGraphHost.contains(host)) {
      return { v: 1, kind: "graph" };
    }
    if (isMermaidVaultPath(currentPath)) {
      return { v: 1, kind: "mermaidFile", path: currentPath };
    }
  }
  return null;
}

function openDiagramStandaloneFromHost(host) {
  const payload = buildDiagramStandalonePayload(host);
  if (!payload) {
    showFlash("Cannot open this diagram in a new tab.", true);
    return;
  }
  const token = newVaultDiagSrcKey();
  try {
    localStorage.setItem(`${VAULT_DIAG_OPEN_PREFIX}${token}`, JSON.stringify(payload));
  } catch {
    showFlash("Could not stage diagram for a new tab (storage full).", true);
    return;
  }
  const baseHref = window.location.pathname.endsWith("/")
    ? `${window.location.origin}${window.location.pathname}`
    : `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, "/")}`;
  const url = new URL("diagram-standalone.html", baseHref);
  url.searchParams.set("t", token);
  const w = window.open(url.href, "_blank", "noopener,noreferrer");
  if (!w) showFlash("Pop-up blocked — allow pop-ups for this site.", true);
}

/** Top-level SVG elements under host (skip nested SVGs so clones keep defs). */
function getDiagramRootSvgs(host) {
  const roots = [];
  for (const svg of host.querySelectorAll("svg")) {
    let p = svg.parentElement;
    let nestedInSvg = false;
    while (p && p !== host) {
      if (p.tagName && String(p.tagName).toLowerCase() === "svg") {
        nestedInSvg = true;
        break;
      }
      p = p.parentElement;
    }
    if (!nestedInSvg) roots.push(svg);
  }
  return roots;
}

async function openDiagramExpand(host) {
  if (!diagramExpandDialog || !diagramExpandScaled || !host) return;
  diagramExpandActiveHost = host;
  diagramExpandScaled.innerHTML = "";
  resetDiagramExpandZoom();
  applyDiagramExpandZoomTransform();

  const canTab = buildDiagramStandalonePayload(host) != null;
  if (diagramExpandOpenTab) diagramExpandOpenTab.disabled = !canTab;
  diagramExpandFocusReturn = document.activeElement;
  diagramExpandDialog.showModal();

  const mermaidOk = await tryRenderMermaidInExpandDialog(host);
  if (!mermaidOk) {
    const roots = getDiagramRootSvgs(host);
    if (!roots.length) {
      diagramExpandDialog.close();
      return;
    }
    for (const svg of roots) {
      diagramExpandScaled.appendChild(svg.cloneNode(true));
    }
  }
}

function finalizeDiagramUi() {
  if (noteBodyEl && !noteBodyEl.classList.contains("hidden")) {
    decorateDiagramExpandControls(noteBodyEl);
  }
}

function initDiagramExpandDialog() {
  if (!diagramExpandDialog || !diagramExpandScaled || !diagramExpandClose) return;
  diagramExpandClose.addEventListener("click", () => diagramExpandDialog.close());
  diagramExpandZoomIn?.addEventListener("click", () => setDiagramExpandZoom(diagramExpandScale * 1.25));
  diagramExpandZoomOut?.addEventListener("click", () => setDiagramExpandZoom(diagramExpandScale / 1.25));
  diagramExpandZoomReset?.addEventListener("click", () => {
    resetDiagramExpandZoom();
    applyDiagramExpandZoomTransform();
  });
  diagramExpandOpenTab?.addEventListener("click", () => {
    if (diagramExpandActiveHost) openDiagramStandaloneFromHost(diagramExpandActiveHost);
  });
  diagramExpandDialog.addEventListener("close", () => {
    diagramExpandScaled.innerHTML = "";
    diagramExpandActiveHost = null;
    resetDiagramExpandZoom();
    if (diagramExpandOpenTab) diagramExpandOpenTab.disabled = true;
    const el = diagramExpandFocusReturn;
    diagramExpandFocusReturn = null;
    if (el && typeof el.focus === "function") {
      try {
        el.focus();
      } catch {
        /* ignore */
      }
    }
  });
}

function isVaultTextLeafPath(p) {
  const lower = String(p || "").toLowerCase();
  return lower.endsWith(".md") || isMermaidVaultPath(p);
}

function getMermaidInlineSourceForWrap(host) {
  if (!host || !host.classList.contains("vault-mermaid-wrap")) return null;
  const key = host.dataset.vaultMermaidSrcKey;
  let source = null;
  if (key) {
    try {
      source = localStorage.getItem(`${VAULT_DIAG_SRC_PREFIX}${key}`);
    } catch {
      /* private mode / storage disabled */
    }
  }
  if (source == null) source = vaultMermaidSrcByWrap.get(host);
  if (
    source == null &&
    currentPath?.toLowerCase().endsWith(".md") &&
    typeof currentSource === "string"
  ) {
    const idx = parseInt(host.dataset.vaultMermaidBlockIndex || "0", 10);
    if (!Number.isNaN(idx)) source = extractMermaidBlockFromMarkdown(currentSource, idx);
  }
  return source;
}

function openVaultPath(p) {
  if (!p) return;
  if (getVaultDiagramKind(p)) {
    void loadVaultDiagramLeaf(p);
    return;
  }
  if (p.toLowerCase().endsWith(".md")) loadNote(p);
}

async function loadVaultLeaf(p) {
  if (!p) return;
  if (getVaultDiagramKind(p)) await loadVaultDiagramLeaf(p);
  else await loadNote(p);
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
        openVaultPath(node.path);
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
    } else if (isVaultTextLeafPath(acc)) {
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
      if (p && isVaultTextLeafPath(p)) openVaultPath(p);
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
      openVaultPath(p);
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
        openVaultPath(item.resolved);
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

async function loadVaultDiagramLeaf(relPath) {
  const kind = getVaultDiagramKind(relPath);
  if (!kind) return;
  if (isEditing && noteEditorEl.value !== currentSource) {
    if (!window.confirm("Discard unsaved changes?")) return;
  }
  exitEditModeSilent();
  currentPath = relPath;
  const baseName = relPath.includes("/") ? relPath.slice(relPath.lastIndexOf("/") + 1) : relPath;
  updateStarButton();
  renderBreadcrumbs(relPath);

  if (kind === "excalidraw") {
    currentSource = "";
    noteTitleEl.textContent = baseName;
    btnEditNote.disabled = true;
    renderNoteTags([]);
    if (badgeReadTime) badgeReadTime.textContent = "";
  } else {
    noteTitleEl.textContent = baseName;
    btnEditNote.disabled = false;
    renderNoteTags([]);
    if (badgeReadTime) badgeReadTime.textContent = "Mermaid";
  }

  const result = await renderVaultDiagramFile(relPath, noteBodyEl);

  if (kind === "mermaid") {
    if (result.fetchFailed) {
      currentSource = "";
      noteTitleEl.textContent = "Error";
      noteBodyEl.innerHTML = `<p>Could not load diagram (${result.status ?? "?"}).</p>`;
      btnEditNote.disabled = true;
      renderNoteTags([]);
      if (badgeReadTime) badgeReadTime.textContent = "";
    } else {
      currentSource = result.source || "";
      noteTitleEl.textContent = result.title || relPath;
      btnEditNote.disabled = false;
      renderNoteTags([]);
      if (badgeReadTime) badgeReadTime.textContent = "Mermaid";
    }
  }

  renderLinkList(backlinkListEl, [], "No backlinks for diagram files");
  renderOutgoing(outgoingListEl, [], "No outgoing links");

  await refreshTree();
  history.replaceState(null, "", `${window.location.pathname}?path=${encodeURIComponent(relPath)}`);
  applyViewMode();
  finalizeDiagramUi();
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
    applyViewMode();
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

  let md = data.previewMarkdown || "";
  md = await preprocessMarkdownMermaidEmbeds(md, relPath);
  let html = marked.parse(md);
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
        openVaultPath(p);
      }
    });
  });

  await refreshTree();
  history.replaceState(null, "", `${window.location.pathname}?path=${encodeURIComponent(relPath)}`);
  applyViewMode();
  finalizeDiagramUi();
}

function enterEditMode() {
  if (!currentPath || typeof currentSource !== "string") {
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
    await loadVaultLeaf(currentPath);
  } catch (e) {
    showFlash(e.message || "Save failed", true);
  }
}

async function cancelEdit() {
  if (noteEditorEl.value !== currentSource) {
    if (!window.confirm("Discard unsaved changes?")) return;
  }
  exitEditModeSilent();
  await loadVaultLeaf(currentPath);
}

btnEditNote.addEventListener("click", () => enterEditMode());
btnSaveNote.addEventListener("click", () => saveNote());
btnCancelEdit.addEventListener("click", () => cancelEdit());

btnToggleSourceView?.addEventListener("click", () => {
  if (!canToggleRenderedSource() || isEditing) return;
  preferSourceView = !preferSourceView;
  localStorage.setItem(VIEW_PREF_KEY, preferSourceView ? "raw" : "rendered");
  applyViewMode();
  finalizeDiagramUi();
});

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

navSideGraph?.addEventListener("click", () => {
  setPanel("graph");
  loadGraphPanel();
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
  showFlash(
    "Search: top bar. Edit: toolbar. Graph: sidebar. Hover diagrams for expand, zoom, or open in a new tab; Escape closes dialogs."
  );
});

btnToggleInspector?.addEventListener("click", () => {
  document.body.classList.toggle("vault-inspector-off");
  const on = !document.body.classList.contains("vault-inspector-off");
  btnToggleInspector.setAttribute("aria-pressed", on ? "true" : "false");
});

/**
 * Re-run Mermaid inside the expand dialog from source so the diagram is complete
 * (cloning nested SVGs / defs from the note body often breaks rendering).
 */
async function tryRenderMermaidInExpandDialog(host) {
  let source = null;
  if (host.classList.contains("vault-mermaid-wrap")) {
    source = getMermaidInlineSourceForWrap(host);
  } else if (host.classList.contains("mermaid") && !host.closest(".vault-mermaid-wrap")) {
    if (isMermaidVaultPath(currentPath)) {
      source = extractMermaidSourceFromFile(currentSource);
    } else if (mermaidGraphHost && mermaidGraphHost.contains(host)) {
      try {
        const res = await fetch("/api/vault/graph");
        const data = await res.json();
        const graph = data.graph || { nodes: [], edges: [] };
        if (graph.nodes?.length) source = graphMermaidSource(graph);
      } catch {
        return false;
      }
    }
  }
  if (source == null || String(source).trim() === "") return false;

  const text = String(source).trim();
  const r = await renderMermaidSvgInto(diagramExpandScaled, text);
  return r.ok;
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
  const run = await runMermaidOnElements([pre]);
  if (run.ok) {
    decorateDiagramExpandControls(mermaidGraphHost);
  } else {
    const msg = run.error?.message || String(run.error);
    mermaidGraphHost.innerHTML = `<p class="vault-link-broken">Graph layout failed: ${escapeAttr(msg)}</p><pre class="vault-graph-error-pre">${escapeAttr(src)}</pre>`;
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
  initDiagramExpandDialog();
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
    else if (getVaultDiagramKind(pathParam)) await loadVaultDiagramLeaf(pathParam);
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
