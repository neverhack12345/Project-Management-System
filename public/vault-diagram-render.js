import mermaid from "https://esm.sh/mermaid@11.4.1";

let mermaidInitialized = false;

export function initVaultMermaid() {
  if (mermaidInitialized) return;
  mermaidInitialized = true;
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    securityLevel: "strict"
  });
}

export function isMermaidVaultPath(p) {
  const lower = String(p || "").toLowerCase();
  return lower.endsWith(".mmd") || lower.endsWith(".mermaid");
}

export function isExcalidrawVaultPath(p) {
  const lower = String(p || "").toLowerCase();
  if (lower.endsWith(".excalidraw.json")) return true;
  return lower.endsWith(".excalidraw");
}

/** @returns {"mermaid" | "excalidraw" | null} */
export function getVaultDiagramKind(path) {
  if (isMermaidVaultPath(path)) return "mermaid";
  if (isExcalidrawVaultPath(path)) return "excalidraw";
  return null;
}

/** Strip optional ```mermaid fenced block so file body is valid Mermaid syntax. */
export function extractMermaidSourceFromFile(text) {
  const s = String(text || "").trim();
  const fenced = s.match(/^```mermaid\s*\r?\n([\s\S]*?)\r?\n```\s*$/i);
  if (fenced) return fenced[1].trim();
  const generic = s.match(/^```\s*\r?\n([\s\S]*?)\r?\n```\s*$/);
  if (generic) {
    const inner = generic[1].trim();
    if (
      /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram-v2|stateDiagram|erDiagram|journey|gantt|pie|mindmap|timeline|sankey-beta|quadrantChart|gitgraph|C4Context|block-beta)/i.test(
        inner
      )
    ) {
      return inner;
    }
  }
  return s;
}

/** Nth ```mermaid fenced block (0-based) from markdown — fallback when storage misses inline source. */
export function extractMermaidBlockFromMarkdown(md, blockIndex) {
  const s = String(md || "");
  const re = /```mermaid\s*\r?\n([\s\S]*?)\r?\n```/gi;
  let m;
  let i = 0;
  while ((m = re.exec(s)) !== null) {
    if (i === blockIndex) return m[1].trim();
    i++;
  }
  return null;
}

export function graphMermaidSource(graph) {
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

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function runMermaidOnElements(nodes) {
  initVaultMermaid();
  const list = [...nodes];
  if (!list.length) return { ok: true };
  try {
    await mermaid.run({ nodes: list });
    return { ok: true };
  } catch (e) {
    console.warn("Mermaid render:", e);
    return { ok: false, error: e };
  }
}

/**
 * Renders Mermaid text into host (expand dialog, standalone). Pass host so strict mode uses iframe under host, not body.
 * @returns {{ ok: true } | { ok: false, error: Error }}
 */
export async function renderMermaidSvgInto(hostElement, diagramText) {
  initVaultMermaid();
  if (!hostElement) return { ok: false, error: new Error("No host") };
  const text = String(diagramText || "").trim();
  if (!text) return { ok: false, error: new Error("Empty diagram") };
  const renderId = `mmd-exp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  try {
    const { svg, bindFunctions } = await mermaid.render(renderId, text, hostElement);
    if (!svg) {
      hostElement.innerHTML = "";
      return { ok: false, error: new Error("Empty SVG") };
    }
    hostElement.innerHTML = svg;
    if (typeof bindFunctions === "function") bindFunctions(hostElement);
    /* Mermaid often emits width="100%"; in dialog/flex that resolves to 0. Use viewBox pixel size. */
    for (const el of hostElement.querySelectorAll("svg")) {
      el.style.removeProperty("max-width");
      const vb = el.viewBox?.baseVal;
      if (vb && vb.width > 0 && vb.height > 0) {
        el.setAttribute("width", String(vb.width));
        el.setAttribute("height", String(vb.height));
      } else {
        el.removeAttribute("width");
        el.removeAttribute("height");
      }
    }
    return { ok: true };
  } catch (e) {
    console.warn("Mermaid expand render:", e);
    hostElement.innerHTML = "";
    return { ok: false, error: e };
  }
}

/** @returns {{ ok: true, scene: object } | { ok: false, error: string }} */
export async function fetchVaultExcalidrawScene(path) {
  const res = await fetch(`/api/vault/excalidraw?path=${encodeURIComponent(path)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data.error || `Failed (${res.status})` };
  }
  const scene = data.scene;
  if (!scene || !Array.isArray(scene.elements)) {
    return { ok: false, error: "Invalid diagram data" };
  }
  return { ok: true, scene };
}

/** @returns {{ ok: true, svg: SVGElement } | { ok: false, error: string }} */
export async function renderExcalidrawSceneToSvgElement(scene) {
  const exportToSvg = globalThis.ExcalidrawUtils?.exportToSvg;
  if (typeof exportToSvg !== "function") {
    return { ok: false, error: "Excalidraw library failed to load." };
  }
  try {
    const svg = await exportToSvg({
      elements: scene.elements,
      appState: scene.appState || {},
      files: scene.files || {}
    });
    if (!svg || String(svg.nodeName || "").toLowerCase() !== "svg") {
      return { ok: false, error: "Could not render diagram" };
    }
    return { ok: true, svg };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

async function renderExcalidrawEmbedInto(el, vaultPath) {
  const p = vaultPath || el.getAttribute("data-vault-excalidraw");
  if (!p) return;
  el.innerHTML = '<p class="muted">Loading diagram…</p>';
  const sceneRes = await fetchVaultExcalidrawScene(p);
  if (!sceneRes.ok) {
    el.innerHTML = `<p class="vault-excalidraw-error">${escapeHtml(sceneRes.error)}</p>`;
    return;
  }
  const svgRes = await renderExcalidrawSceneToSvgElement(sceneRes.scene);
  if (!svgRes.ok) {
    el.innerHTML = `<p class="vault-excalidraw-error">${escapeHtml(svgRes.error)}</p>`;
    return;
  }
  el.innerHTML = "";
  el.appendChild(svgRes.svg);
}

export async function hydrateExcalidrawEmbeds(rootEl) {
  const nodes = rootEl.querySelectorAll("[data-vault-excalidraw]");
  if (!nodes.length) return;
  const exportToSvg = globalThis.ExcalidrawUtils?.exportToSvg;
  if (typeof exportToSvg !== "function") {
    for (const el of nodes) {
      el.innerHTML = '<p class="vault-excalidraw-error">Excalidraw library failed to load.</p>';
    }
    return;
  }
  for (const el of nodes) {
    const p = el.getAttribute("data-vault-excalidraw");
    if (!p) continue;
    await renderExcalidrawEmbedInto(el, p);
  }
}

/**
 * Load a vault diagram leaf (.mmd / .mermaid / .excalidraw) into containerEl.
 * @returns {Promise<{ ok: true, kind: "mermaid", source: string, title?: string } | { ok: true, kind: "excalidraw" } | { ok: false, kind: string | null, message?: string, fetchFailed?: boolean, renderFailed?: boolean, status?: number, diagramText?: string, source?: string, title?: string }>}
 */
export async function renderVaultDiagramFile(path, containerEl) {
  if (!path || !containerEl) {
    return { ok: false, kind: null, message: "Invalid arguments" };
  }
  if (isMermaidVaultPath(path)) {
    initVaultMermaid();
    const url = `/api/vault/file?path=${encodeURIComponent(path)}`;
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        kind: "mermaid",
        fetchFailed: true,
        message: data.error || `Could not load diagram (${res.status})`,
        status: res.status
      };
    }
    const raw = typeof data.source === "string" ? data.source : "";
    const diagramText = extractMermaidSourceFromFile(raw);
    containerEl.innerHTML = "";
    const pre = document.createElement("pre");
    pre.className = "mermaid";
    pre.textContent = diagramText;
    containerEl.appendChild(pre);
    const run = await runMermaidOnElements([pre]);
    if (!run.ok) {
      const msg = run.error?.message || String(run.error);
      containerEl.innerHTML = `<p class="vault-link-broken">Mermaid render failed: ${escapeHtml(msg)}</p><pre class="vault-graph-error-pre">${escapeHtml(diagramText)}</pre>`;
      return {
        ok: false,
        kind: "mermaid",
        renderFailed: true,
        message: msg,
        diagramText,
        source: raw,
        title: data.title
      };
    }
    return { ok: true, kind: "mermaid", source: raw, title: data.title };
  }
  if (isExcalidrawVaultPath(path)) {
    containerEl.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "vault-excalidraw vault-excalidraw-viewer";
    wrap.setAttribute("data-vault-excalidraw", path);
    containerEl.appendChild(wrap);
    await hydrateExcalidrawEmbeds(containerEl);
    const err = wrap.querySelector(".vault-excalidraw-error");
    if (err) {
      return { ok: false, kind: "excalidraw", message: err.textContent || "Excalidraw failed" };
    }
    return { ok: true, kind: "excalidraw" };
  }
  return { ok: false, kind: null, message: "Not a diagram file" };
}
