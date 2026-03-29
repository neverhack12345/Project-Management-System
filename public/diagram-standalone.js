import {
  initVaultMermaid,
  graphMermaidSource,
  renderMermaidSvgInto,
  fetchVaultExcalidrawScene,
  renderExcalidrawSceneToSvgElement,
  renderVaultDiagramFile
} from "./vault-diagram-render.js";

const dsScaled = document.getElementById("dsScaled");
const dsMessage = document.getElementById("dsMessage");
const dsTitle = document.getElementById("dsTitle");
const dsZoomIn = document.getElementById("dsZoomIn");
const dsZoomOut = document.getElementById("dsZoomOut");
const dsZoomReset = document.getElementById("dsZoomReset");
const dsZoomLabel = document.getElementById("dsZoomLabel");

let scale = 1;

function applyZoom() {
  if (!dsScaled) return;
  dsScaled.style.zoom = "";
  dsScaled.style.transform = scale === 1 ? "" : `scale(${scale})`;
  if (dsZoomLabel) dsZoomLabel.textContent = `${Math.round(scale * 100)}%`;
}

function setZoom(next) {
  scale = Math.min(4, Math.max(0.25, next));
  applyZoom();
}

function resetZoom() {
  scale = 1;
  if (dsScaled) {
    dsScaled.style.zoom = "";
    dsScaled.style.transform = "";
  }
  if (dsZoomLabel) dsZoomLabel.textContent = "100%";
}

function showError(msg) {
  if (dsScaled) {
    dsScaled.innerHTML = "";
    dsScaled.hidden = true;
  }
  if (dsMessage) {
    dsMessage.hidden = false;
    dsMessage.textContent = msg;
    dsMessage.className = "ds-error";
  }
}

function showDiagram(svgEl) {
  if (dsMessage) dsMessage.hidden = true;
  if (!dsScaled) return;
  dsScaled.hidden = false;
  dsScaled.innerHTML = "";
  resetZoom();
  applyZoom();
  dsScaled.appendChild(svgEl);
}

async function renderMermaidWithText(diagramText, titleLabel) {
  if (!dsScaled) return;
  if (dsMessage) dsMessage.hidden = true;
  dsScaled.hidden = false;
  dsScaled.innerHTML = "";
  resetZoom();
  applyZoom();
  const r = await renderMermaidSvgInto(dsScaled, diagramText);
  if (!r.ok) {
    showError(r.error?.message || String(r.error));
    return;
  }
  if (dsTitle && titleLabel) dsTitle.textContent = titleLabel;
}

async function renderExcalidraw(path) {
  const sceneRes = await fetchVaultExcalidrawScene(path);
  if (!sceneRes.ok) {
    showError(sceneRes.error);
    return;
  }
  const svgRes = await renderExcalidrawSceneToSvgElement(sceneRes.scene);
  if (!svgRes.ok) {
    showError(svgRes.error);
    return;
  }
  showDiagram(svgRes.svg);
  if (dsTitle) dsTitle.textContent = path.includes("/") ? path.slice(path.lastIndexOf("/") + 1) : path;
}

async function renderMermaidFile(path) {
  if (!dsScaled) return;
  if (dsMessage) dsMessage.hidden = true;
  dsScaled.hidden = false;
  const result = await renderVaultDiagramFile(path, dsScaled);
  if (result.fetchFailed) {
    showError(result.message || "Failed to load file");
    return;
  }
  if (!result.ok) {
    showError(result.message || "Mermaid render failed");
    return;
  }
  if (dsMessage) dsMessage.hidden = true;
  const label = path.includes("/") ? path.slice(path.lastIndexOf("/") + 1) : path;
  if (dsTitle) dsTitle.textContent = label;
  resetZoom();
  applyZoom();
}

async function renderGraph() {
  const res = await fetch("/api/vault/graph");
  const data = await res.json().catch(() => ({}));
  const graph = data.graph || { nodes: [], edges: [] };
  if (!graph.nodes?.length) {
    showError("No notes in vault — graph is empty.");
    return;
  }
  const src = graphMermaidSource(graph);
  await renderMermaidWithText(src, "Link graph");
}

async function boot() {
  initVaultMermaid();

  dsZoomIn?.addEventListener("click", () => setZoom(scale * 1.25));
  dsZoomOut?.addEventListener("click", () => setZoom(scale / 1.25));
  dsZoomReset?.addEventListener("click", () => {
    resetZoom();
    applyZoom();
  });

  const params = new URLSearchParams(window.location.search);
  const token = params.get("t");
  if (!token) {
    showError('Missing token. Use “open in new tab” from the expanded diagram in notes.');
    return;
  }
  const key = `vaultDiagOpen:${token}`;
  const raw = localStorage.getItem(key);
  localStorage.removeItem(key);
  if (!raw) {
    showError("This link has expired or was already used. Expand the diagram again from notes.");
    return;
  }
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    showError("Invalid diagram data.");
    return;
  }
  if (!payload || payload.v !== 1 || !payload.kind) {
    showError("Invalid diagram payload.");
    return;
  }

  try {
    if (payload.kind === "excalidraw") {
      await renderExcalidraw(payload.path);
    } else if (payload.kind === "mermaidFile") {
      await renderMermaidFile(payload.path);
    } else if (payload.kind === "mermaidSource") {
      await renderMermaidWithText(String(payload.source || ""), "Mermaid");
    } else if (payload.kind === "graph") {
      await renderGraph();
    } else {
      showError("Unknown diagram type.");
    }
  } catch (e) {
    showError(e.message || String(e));
  }
}

boot();
