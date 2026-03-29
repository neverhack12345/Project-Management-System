import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { atomicWrite } from "./markdown-store.js";
import { CACHE_DIR, ROOT, VAULT_DIR, VAULT_GRAPH_CACHE } from "./constants.js";

const posix = path.posix;

/** @returns {string|null} forward-slash relative path inside vault, or null if unsafe */
export function normalizeVaultRelPath(p) {
  const s = String(p || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  if (!s || s.includes("\0")) return null;
  const parts = s.split("/").filter((x) => x && x !== ".");
  for (const part of parts) {
    if (part === "..") return null;
  }
  return parts.join("/");
}

const BAD_SEGMENT_CHARS = /[<>:"|?*\x00-\x1f]/;

/**
 * @param {string} norm normalized vault-relative path
 * @returns {void}
 */
function isVaultTextLeafExt(lowerPath) {
  return (
    lowerPath.endsWith(".md") ||
    lowerPath.endsWith(".mmd") ||
    lowerPath.endsWith(".mermaid")
  );
}

export function assertVaultPathWritable(norm) {
  if (!norm || !isVaultTextLeafExt(norm.toLowerCase())) {
    const err = new Error("Invalid vault path");
    err.code = "VAULT_PATH_INVALID";
    throw err;
  }
  const parts = norm.split("/");
  for (const part of parts) {
    if (!part || part === "." || part === "..") {
      const err = new Error("Invalid vault path segment");
      err.code = "VAULT_PATH_INVALID";
      throw err;
    }
    if (BAD_SEGMENT_CHARS.test(part)) {
      const err = new Error("Invalid characters in path");
      err.code = "VAULT_PATH_INVALID";
      throw err;
    }
  }
}

/** @returns {string|null} absolute filesystem path to a vault text leaf (.md, .mmd, .mermaid) under VAULT_DIR */
export function resolveVaultAbs(relPath) {
  const norm = normalizeVaultRelPath(relPath);
  if (!norm || !isVaultTextLeafExt(norm.toLowerCase())) return null;
  const root = path.resolve(VAULT_DIR);
  const abs = path.resolve(root, norm);
  const relative = path.relative(root, abs);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return abs;
}

/** @param {string|null|undefined} norm normalized vault-relative path */
export function isExcalidrawVaultRelPath(norm) {
  if (!norm) return false;
  const l = norm.toLowerCase();
  if (l.endsWith(".excalidraw.json")) return true;
  return l.endsWith(".excalidraw");
}

/** @returns {string|null} absolute path under VAULT_DIR for an Excalidraw asset */
export function resolveVaultExcalidrawAbs(relPath) {
  const norm = normalizeVaultRelPath(relPath);
  if (!norm || !isExcalidrawVaultRelPath(norm)) return null;
  const root = path.resolve(VAULT_DIR);
  const abs = path.resolve(root, norm);
  const relative = path.relative(root, abs);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return abs;
}

export async function ensureVaultDir() {
  await fs.mkdir(VAULT_DIR, { recursive: true });
}

async function walkMarkdownFiles(dir, base = "") {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkMarkdownFiles(full, rel)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      out.push(rel.split(path.sep).join("/"));
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export async function listVaultMarkdownRelPaths() {
  await ensureVaultDir();
  return walkMarkdownFiles(VAULT_DIR);
}

async function walkExcalidrawFiles(dir, base = "") {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkExcalidrawFiles(full, rel)));
    } else if (entry.isFile()) {
      const low = entry.name.toLowerCase();
      if (low.endsWith(".excalidraw.json") || low.endsWith(".excalidraw")) {
        out.push(rel.split(path.sep).join("/"));
      }
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export async function listVaultExcalidrawRelPaths() {
  await ensureVaultDir();
  return walkExcalidrawFiles(VAULT_DIR);
}

async function walkMermaidDiagramFiles(dir, base = "") {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkMermaidDiagramFiles(full, rel)));
    } else if (entry.isFile()) {
      const low = entry.name.toLowerCase();
      if (low.endsWith(".mmd") || low.endsWith(".mermaid")) {
        out.push(rel.split(path.sep).join("/"));
      }
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

export async function listVaultMermaidDiagramRelPaths() {
  await ensureVaultDir();
  return walkMermaidDiagramFiles(VAULT_DIR);
}

/** Markdown + Mermaid diagram files + Excalidraw leaves for the file tree (sorted, de-duplicated). */
export async function listVaultTreeRelPaths() {
  await ensureVaultDir();
  const md = await walkMarkdownFiles(VAULT_DIR);
  const mermaid = await walkMermaidDiagramFiles(VAULT_DIR);
  const ex = await walkExcalidrawFiles(VAULT_DIR);
  return [...new Set([...md, ...mermaid, ...ex])].sort((a, b) => a.localeCompare(b));
}

function firstMarkdownHeading(content) {
  const m = String(content || "").match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "";
}

function fileStem(relPath) {
  const base = relPath.split("/").pop() || "";
  return base.replace(/\.(md|mmd|mermaid)$/i, "");
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function registerLookup(lookup, key, relPath) {
  const k = String(key || "")
    .toLowerCase()
    .trim();
  if (!k) return;
  const cur = lookup.get(k);
  if (cur === undefined) {
    lookup.set(k, relPath);
  } else if (cur !== relPath) {
    const arr = Array.isArray(cur) ? cur : [cur];
    if (!arr.includes(relPath)) arr.push(relPath);
    lookup.set(k, arr.length === 1 ? arr[0] : arr);
  }
}

function buildLookup(pathSet, metaByPath) {
  const lookup = new Map();
  for (const rel of pathSet) {
    const stem = fileStem(rel).toLowerCase();
    registerLookup(lookup, stem, rel);
    registerLookup(lookup, slugify(fileStem(rel)), rel);
    const m = metaByPath.get(rel);
    if (m?.title) {
      registerLookup(lookup, m.title, rel);
      registerLookup(lookup, slugify(m.title), rel);
    }
    for (const a of m?.aliases || []) {
      registerLookup(lookup, a, rel);
      registerLookup(lookup, slugify(a), rel);
    }
  }
  return lookup;
}

/**
 * Wiki link target that clearly names a non-markdown file (e.g. [[img.png]]).
 * Bare names without an extension are still treated as notes (title/path resolution).
 */
function isWikiLinkToNonMarkdownFile(pathPart) {
  const p = String(pathPart || "").trim();
  if (!p || /\.md$/i.test(p)) return false;
  const seg = p.split("/").pop() || p;
  const dot = seg.lastIndexOf(".");
  if (dot <= 0) return false;
  const ext = seg.slice(dot).toLowerCase();
  if (ext === ".md") return false;
  return /^\.[a-z0-9]+$/i.test(ext);
}

/** @param {string} body */
function extractWikiLinkParts(body) {
  const out = [];
  const re = /(?<!!)\[\[([^\]]+)\]\]/g;
  let m;
  while ((m = re.exec(body))) {
    const inner = m[1].trim();
    const pipe = inner.indexOf("|");
    const target = (pipe >= 0 ? inner.slice(0, pipe) : inner).trim();
    const hashIdx = target.indexOf("#");
    const pathPart = hashIdx >= 0 ? target.slice(0, hashIdx).trim() : target;
    if (pathPart) out.push({ pathPart, kind: "wiki" });
  }
  return out;
}

/** @param {string} body */
function extractMarkdownFileLinks(body) {
  const out = [];
  const re = /(?<!!)\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let m;
  while ((m = re.exec(body))) {
    let dest = m[2].trim();
    if (/^(https?:|mailto:|#)/i.test(dest)) continue;
    try {
      dest = decodeURIComponent(dest);
    } catch {
      continue;
    }
    const beforeHash = dest.split("#")[0];
    if (!/\.md$/i.test(beforeHash)) continue;
    out.push({ pathPart: beforeHash, kind: "md" });
  }
  return out;
}

/**
 * @param {string} fromRel
 * @param {string} pathPart
 * @param {Set<string>} pathSet
 * @param {Map<string, string|string[]>} lookup
 */
function resolveLinkTarget(fromRel, pathPart, pathSet, lookup) {
  const pp = pathPart.trim();
  if (!pp) return { resolved: null, ambiguous: false, candidates: undefined };

  let withMd = pp;
  if (!/\.md$/i.test(withMd)) withMd = `${withMd}.md`;

  const fromDir = posix.dirname(fromRel);
  const relJoin = normalizeVaultRelPath(posix.normalize(posix.join(fromDir, withMd)));
  if (relJoin && pathSet.has(relJoin)) {
    return { resolved: relJoin, ambiguous: false, candidates: undefined };
  }

  const fromRoot = normalizeVaultRelPath(posix.normalize(withMd));
  if (fromRoot && pathSet.has(fromRoot)) {
    return { resolved: fromRoot, ambiguous: false, candidates: undefined };
  }

  const noSlash = !pp.includes("/") && !pp.startsWith(".");
  if (noSlash) {
    const bare = pp.replace(/\.md$/i, "").toLowerCase();
    const hit = lookup.get(bare);
    if (Array.isArray(hit)) {
      return { resolved: null, ambiguous: true, candidates: hit };
    }
    if (hit) return { resolved: hit, ambiguous: false, candidates: undefined };

    const slugHit = lookup.get(slugify(pp.replace(/\.md$/i, "")));
    if (Array.isArray(slugHit)) {
      return { resolved: null, ambiguous: true, candidates: slugHit };
    }
    if (slugHit) return { resolved: slugHit, ambiguous: false, candidates: undefined };
  }

  return { resolved: null, ambiguous: false, candidates: undefined };
}

function excalidrawFileStem(relPath) {
  const base = relPath.split("/").pop() || "";
  const l = base.toLowerCase();
  if (l.endsWith(".excalidraw.json")) return base.slice(0, -".excalidraw.json".length);
  if (l.endsWith(".excalidraw")) return base.slice(0, -".excalidraw".length);
  return base.replace(/\.[^/.]+$/, "");
}

function buildExcalidrawLookup(exSet) {
  const lookup = new Map();
  for (const rel of exSet) {
    const stem = excalidrawFileStem(rel).toLowerCase();
    registerLookup(lookup, stem, rel);
    registerLookup(lookup, slugify(stem), rel);
    const base = rel.split("/").pop() || "";
    registerLookup(lookup, base.toLowerCase(), rel);
  }
  return lookup;
}

/**
 * @param {string} fromRel
 * @param {string} pathPart
 * @param {Set<string>} exSet
 * @param {Map<string, string|string[]>} lookup
 */
function resolveExcalidrawTarget(fromRel, pathPart, exSet, lookup) {
  const pp = pathPart.trim();
  if (!pp) return { resolved: null, ambiguous: false, candidates: undefined };

  const fromDir = posix.dirname(fromRel);
  const tryList = [];
  const addTry = (rel) => {
    const n = normalizeVaultRelPath(posix.normalize(rel));
    if (n && exSet.has(n) && !tryList.includes(n)) tryList.push(n);
  };

  addTry(posix.join(fromDir, pp));
  addTry(posix.join(fromDir, `${pp}.excalidraw`));
  addTry(posix.join(fromDir, `${pp}.excalidraw.json`));
  addTry(pp);
  addTry(`${pp}.excalidraw`);
  addTry(`${pp}.excalidraw.json`);

  if (tryList.length === 1) return { resolved: tryList[0], ambiguous: false, candidates: undefined };
  if (tryList.length > 1) return { resolved: null, ambiguous: true, candidates: tryList };

  const noSlash = !pp.includes("/") && !pp.startsWith(".");
  if (noSlash) {
    const withoutExt = pp.replace(/\.excalidraw\.json$/i, "").replace(/\.excalidraw$/i, "").toLowerCase();
    const hit = lookup.get(withoutExt);
    if (Array.isArray(hit)) return { resolved: null, ambiguous: true, candidates: hit };
    if (hit) return { resolved: hit, ambiguous: false, candidates: undefined };

    const slugHit = lookup.get(slugify(withoutExt));
    if (Array.isArray(slugHit)) return { resolved: null, ambiguous: true, candidates: slugHit };
    if (slugHit) return { resolved: slugHit, ambiguous: false, candidates: undefined };

    const fullHit = lookup.get(pp.toLowerCase());
    if (Array.isArray(fullHit)) return { resolved: null, ambiguous: true, candidates: fullHit };
    if (fullHit) return { resolved: fullHit, ambiguous: false, candidates: undefined };
  }

  return { resolved: null, ambiguous: false, candidates: undefined };
}

function escapeAttrForVaultHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * ```excalidraw\nrelative/path.excalidraw\n``` → embed div (resolved paths only).
 */
export function expandExcalidrawFenceEmbeds(body, fromRel, exSet, lookup) {
  return String(body || "").replace(/```excalidraw\s*\n([\s\S]*?)```/gi, (full, inner) => {
    const rel = inner.trim().split(/\n/)[0]?.trim() || "";
    if (!rel) return full;
    const { resolved, ambiguous } = resolveExcalidrawTarget(fromRel, rel, exSet, lookup);
    if (resolved && !ambiguous) {
      return `\n\n<div class="vault-excalidraw" data-vault-excalidraw="${escapeAttrForVaultHtml(resolved)}"></div>\n\n`;
    }
    return full;
  });
}

/** Obsidian-style ![[diagram.excalidraw]] embeds → HTML div. */
export function expandExcalidrawImageEmbeds(body, fromRel, exSet, lookup) {
  return String(body || "").replace(/!\[\[([^\]]+)\]\]/g, (full, inner) => {
    const trimmed = inner.trim();
    const pipe = trimmed.indexOf("|");
    const target = (pipe >= 0 ? trimmed.slice(0, pipe) : trimmed).trim();
    const hashIdx = target.indexOf("#");
    const pathPart = hashIdx >= 0 ? target.slice(0, hashIdx).trim() : target;
    if (!pathPart) return full;
    const { resolved, ambiguous } = resolveExcalidrawTarget(fromRel, pathPart, exSet, lookup);
    if (resolved && !ambiguous) {
      return `\n\n<div class="vault-excalidraw" data-vault-excalidraw="${escapeAttrForVaultHtml(resolved)}"></div>\n\n`;
    }
    return full;
  });
}

function mermaidFileStem(relPath) {
  const base = relPath.split("/").pop() || "";
  const l = base.toLowerCase();
  if (l.endsWith(".mermaid")) return base.slice(0, -".mermaid".length);
  if (l.endsWith(".mmd")) return base.slice(0, -".mmd".length);
  return base.replace(/\.[^/.]+$/, "");
}

function buildMermaidLookup(mmdSet) {
  const lookup = new Map();
  for (const rel of mmdSet) {
    const stem = mermaidFileStem(rel).toLowerCase();
    registerLookup(lookup, stem, rel);
    registerLookup(lookup, slugify(stem), rel);
    const base = rel.split("/").pop() || "";
    registerLookup(lookup, base.toLowerCase(), rel);
  }
  return lookup;
}

/**
 * @param {string} fromRel
 * @param {string} pathPart
 * @param {Set<string>} mmdSet
 * @param {Map<string, string|string[]>} lookup
 */
function resolveMermaidTarget(fromRel, pathPart, mmdSet, lookup) {
  const pp = pathPart.trim();
  if (!pp) return { resolved: null, ambiguous: false, candidates: undefined };

  const fromDir = posix.dirname(fromRel);
  const tryList = [];
  const addTry = (rel) => {
    const n = normalizeVaultRelPath(posix.normalize(rel));
    if (n && mmdSet.has(n) && !tryList.includes(n)) tryList.push(n);
  };

  addTry(posix.join(fromDir, pp));
  addTry(posix.join(fromDir, `${pp}.mmd`));
  addTry(posix.join(fromDir, `${pp}.mermaid`));
  addTry(pp);
  addTry(`${pp}.mmd`);
  addTry(`${pp}.mermaid`);

  if (tryList.length === 1) return { resolved: tryList[0], ambiguous: false, candidates: undefined };
  if (tryList.length > 1) return { resolved: null, ambiguous: true, candidates: tryList };

  const noSlash = !pp.includes("/") && !pp.startsWith(".");
  if (noSlash) {
    const withoutExt = pp.replace(/\.mermaid$/i, "").replace(/\.mmd$/i, "").toLowerCase();
    const hit = lookup.get(withoutExt);
    if (Array.isArray(hit)) return { resolved: null, ambiguous: true, candidates: hit };
    if (hit) return { resolved: hit, ambiguous: false, candidates: undefined };

    const slugHit = lookup.get(slugify(withoutExt));
    if (Array.isArray(slugHit)) return { resolved: null, ambiguous: true, candidates: slugHit };
    if (slugHit) return { resolved: slugHit, ambiguous: false, candidates: undefined };

    const fullHit = lookup.get(pp.toLowerCase());
    if (Array.isArray(fullHit)) return { resolved: null, ambiguous: true, candidates: fullHit };
    if (fullHit) return { resolved: fullHit, ambiguous: false, candidates: undefined };
  }

  return { resolved: null, ambiguous: false, candidates: undefined };
}

/** Same rules as client extractMermaidSourceFromFile — normalize .mmd file body for a fenced block. */
function extractMermaidSourceForPreview(text) {
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

/**
 * Obsidian-style ![[diagram.mmd]] / ![[diagram.mermaid]] → fenced ```mermaid for client render.
 */
export async function expandMermaidImageEmbeds(body, fromRel, mmdSet, lookup) {
  const s = String(body || "");
  const re = /!\[\[([^\]]+)\]\]/g;
  let m;
  let last = 0;
  const chunks = [];
  while ((m = re.exec(s)) !== null) {
    chunks.push(s.slice(last, m.index));
    const trimmed = m[1].trim();
    const pipe = trimmed.indexOf("|");
    const target = (pipe >= 0 ? trimmed.slice(0, pipe) : trimmed).trim();
    const hashIdx = target.indexOf("#");
    const pathPart = hashIdx >= 0 ? target.slice(0, hashIdx).trim() : target;
    if (!pathPart) {
      chunks.push(m[0]);
    } else {
      const { resolved, ambiguous } = resolveMermaidTarget(fromRel, pathPart, mmdSet, lookup);
      if (resolved && !ambiguous) {
        try {
          const { source } = await readVaultPlainTextLeaf(resolved);
          const diagram = extractMermaidSourceForPreview(source);
          chunks.push(`\n\n\`\`\`mermaid\n${diagram}\n\`\`\`\n\n`);
        } catch {
          chunks.push(
            `\n\n<p class="vault-link-broken">Could not load Mermaid diagram <code>${escapeAttrForVaultHtml(resolved)}</code></p>\n\n`
          );
        }
      } else {
        chunks.push(m[0]);
      }
    }
    last = m.index + m[0].length;
  }
  chunks.push(s.slice(last));
  return chunks.join("");
}

export async function readVaultExcalidrawJson(relPath) {
  const norm = normalizeVaultRelPath(relPath);
  if (!norm || !isExcalidrawVaultRelPath(norm)) {
    const err = new Error("Invalid vault path");
    err.code = "VAULT_PATH_INVALID";
    throw err;
  }
  const abs = resolveVaultExcalidrawAbs(norm);
  if (!abs) {
    const err = new Error("Invalid vault path");
    err.code = "VAULT_PATH_INVALID";
    throw err;
  }
  let raw;
  try {
    raw = await fs.readFile(abs, "utf8");
  } catch (e) {
    if (e && e.code === "ENOENT") {
      const err = new Error("Note not found");
      err.code = "VAULT_NOT_FOUND";
      throw err;
    }
    throw e;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const err = new Error("Invalid Excalidraw JSON");
    err.code = "VAULT_EXCALIDRAW_INVALID";
    throw err;
  }
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.elements)) {
    const err = new Error("Invalid Excalidraw JSON");
    err.code = "VAULT_EXCALIDRAW_INVALID";
    throw err;
  }
  if (parsed.type != null && parsed.type !== "excalidraw") {
    const err = new Error("Invalid Excalidraw JSON");
    err.code = "VAULT_EXCALIDRAW_INVALID";
    throw err;
  }
  return { path: norm, scene: parsed };
}

export async function getVaultExcalidrawPayload(relPath) {
  const { path, scene } = await readVaultExcalidrawJson(relPath);
  return {
    path,
    scene: {
      type: scene.type ?? "excalidraw",
      version: scene.version ?? 2,
      source: scene.source,
      elements: scene.elements,
      appState: scene.appState ?? {},
      files: scene.files ?? {}
    }
  };
}

export async function readVaultMarkdown(relPath) {
  const abs = resolveVaultAbs(relPath);
  if (!abs) {
    const err = new Error("Invalid vault path");
    err.code = "VAULT_PATH_INVALID";
    throw err;
  }
  let raw;
  try {
    raw = await fs.readFile(abs, "utf8");
  } catch (e) {
    if (e && e.code === "ENOENT") {
      const err = new Error("Note not found");
      err.code = "VAULT_NOT_FOUND";
      throw err;
    }
    throw e;
  }
  const parsed = matter(raw);
  const title =
    (typeof parsed.data?.title === "string" && parsed.data.title.trim()) ||
    firstMarkdownHeading(parsed.content) ||
    fileStem(relPath);
  const aliases = Array.isArray(parsed.data?.aliases)
    ? parsed.data.aliases.map((x) => String(x).trim()).filter(Boolean)
    : typeof parsed.data?.aliases === "string"
      ? [parsed.data.aliases.trim()].filter(Boolean)
      : [];
  return {
    path: relPath,
    content: parsed.content,
    data: parsed.data,
    title,
    aliases,
    source: raw
  };
}

/**
 * Full vault scan: metadata, outgoing links, backlinks, graph.
 * @returns {Promise<{
 *   generatedAt: string,
 *   paths: string[],
 *   notes: Record<string, { title: string, aliases: string[] }>,
 *   outgoing: Record<string, Array<{ pathPart: string, resolved: string|null, ambiguous: boolean, candidates?: string[] }>>,
 *   backlinks: Record<string, string[]>,
 *   graph: { nodes: Array<{ id: string, title: string }>, edges: Array<{ from: string, to: string, ok: boolean }> }
 * }>}
 */
export async function buildVaultIndex() {
  await ensureVaultDir();
  const paths = await listVaultMarkdownRelPaths();
  const pathSet = new Set(paths);
  const metaByPath = new Map();

  for (const rel of paths) {
    try {
      const note = await readVaultMarkdown(rel);
      metaByPath.set(rel, { title: note.title, aliases: note.aliases });
    } catch {
      metaByPath.set(rel, { title: fileStem(rel), aliases: [] });
    }
  }

  const lookup = buildLookup(pathSet, metaByPath);
  const outgoing = {};
  const backlinks = {};
  const edges = [];
  const seenOkEdge = new Set();
  const seenBrokenEdge = new Set();

  for (const rel of paths) {
    outgoing[rel] = [];
    let body;
    try {
      const note = await readVaultMarkdown(rel);
      body = note.content;
    } catch {
      body = "";
    }

    const parts = [...extractWikiLinkParts(body), ...extractMarkdownFileLinks(body)];
    for (const { pathPart, kind } of parts) {
      if (kind === "wiki" && isWikiLinkToNonMarkdownFile(pathPart)) continue;

      const { resolved, ambiguous, candidates } = resolveLinkTarget(rel, pathPart, pathSet, lookup);
      outgoing[rel].push({
        pathPart,
        kind,
        resolved,
        ambiguous,
        candidates
      });
      if (resolved) {
        if (!backlinks[resolved]) backlinks[resolved] = [];
        if (!backlinks[resolved].includes(rel)) backlinks[resolved].push(rel);
        const okKey = `${rel}\0${resolved}`;
        if (!seenOkEdge.has(okKey)) {
          seenOkEdge.add(okKey);
          edges.push({ from: rel, to: resolved, ok: true });
        }
      } else {
        const brKey = `${rel}\0${pathPart}\0${ambiguous ? "1" : "0"}`;
        if (!seenBrokenEdge.has(brKey)) {
          seenBrokenEdge.add(brKey);
          edges.push({
            from: rel,
            to: pathPart,
            ok: false,
            ambiguous,
            candidates
          });
        }
      }
    }
  }

  const nodes = paths.map((id) => ({
    id,
    title: metaByPath.get(id)?.title || fileStem(id)
  }));

  return {
    generatedAt: new Date().toISOString(),
    paths,
    notes: Object.fromEntries(
      paths.map((p) => [
        p,
        {
          title: metaByPath.get(p)?.title || fileStem(p),
          aliases: metaByPath.get(p)?.aliases || []
        }
      ])
    ),
    outgoing,
    backlinks,
    graph: { nodes, edges }
  };
}

let indexMemo = null;
let indexMemoAt = 0;
const INDEX_TTL_MS = 2000;

async function getVaultIndexFresh() {
  return buildVaultIndex();
}

export async function getVaultIndexCached() {
  const now = Date.now();
  if (indexMemo && now - indexMemoAt < INDEX_TTL_MS) {
    return indexMemo;
  }
  indexMemo = await getVaultIndexFresh();
  indexMemoAt = now;
  return indexMemo;
}

export function invalidateVaultIndexCache() {
  indexMemo = null;
  indexMemoAt = 0;
}

export async function getVaultBacklinksFor(relPath) {
  const norm = normalizeVaultRelPath(relPath);
  if (!norm) return [];
  const index = await getVaultIndexCached();
  return index.backlinks[norm] || [];
}

export async function getVaultOutgoingFor(relPath) {
  const norm = normalizeVaultRelPath(relPath);
  if (!norm) return [];
  const index = await getVaultIndexCached();
  return index.outgoing[norm] || [];
}

async function readVaultPlainTextLeaf(norm) {
  const abs = resolveVaultAbs(norm);
  if (!abs) {
    const err = new Error("Invalid vault path");
    err.code = "VAULT_PATH_INVALID";
    throw err;
  }
  let raw;
  try {
    raw = await fs.readFile(abs, "utf8");
  } catch (e) {
    if (e && e.code === "ENOENT") {
      const err = new Error("Note not found");
      err.code = "VAULT_NOT_FOUND";
      throw err;
    }
    throw e;
  }
  return { path: norm, source: raw };
}

export async function getVaultFilePayload(relPath) {
  const norm = normalizeVaultRelPath(relPath);
  if (!norm) {
    const err = new Error("Invalid vault path");
    err.code = "VAULT_PATH_INVALID";
    throw err;
  }
  const lower = norm.toLowerCase();
  if (lower.endsWith(".mmd") || lower.endsWith(".mermaid")) {
    const { path, source } = await readVaultPlainTextLeaf(norm);
    return {
      path,
      kind: "mermaid",
      content: source,
      source,
      previewMarkdown: "",
      data: {},
      title: fileStem(norm),
      aliases: [],
      outgoing: [],
      backlinks: []
    };
  }
  if (!lower.endsWith(".md")) {
    const err = new Error("Invalid vault path");
    err.code = "VAULT_PATH_INVALID";
    throw err;
  }
  const note = await readVaultMarkdown(norm);
  const index = await getVaultIndexCached();
  const pathSet = new Set(index.paths);
  const metaByPath = new Map(index.paths.map((p) => [p, index.notes[p]]));
  const lookup = buildLookup(pathSet, metaByPath);
  const excalidrawPaths = await listVaultExcalidrawRelPaths();
  const exSet = new Set(excalidrawPaths);
  const exLookup = buildExcalidrawLookup(exSet);
  const mermaidPaths = await listVaultMermaidDiagramRelPaths();
  const mmdSet = new Set(mermaidPaths);
  const mmdLookup = buildMermaidLookup(mmdSet);
  let previewBody = note.content;
  previewBody = expandExcalidrawFenceEmbeds(previewBody, norm, exSet, exLookup);
  previewBody = await expandMermaidImageEmbeds(previewBody, norm, mmdSet, mmdLookup);
  previewBody = expandExcalidrawImageEmbeds(previewBody, norm, exSet, exLookup);
  const previewMarkdown = expandWikiLinksForPreview(previewBody, norm, pathSet, lookup);
  return {
    path: note.path,
    kind: "markdown",
    content: note.content,
    source: note.source,
    previewMarkdown,
    data: note.data,
    title: note.title,
    aliases: note.aliases,
    outgoing: index.outgoing[norm] || [],
    backlinks: index.backlinks[norm] || []
  };
}

/**
 * @param {string} relPath
 * @param {string} fullSource complete file contents (incl. frontmatter)
 */
export async function writeVaultNote(relPath, fullSource) {
  const norm = normalizeVaultRelPath(relPath);
  assertVaultPathWritable(norm || "");
  const abs = resolveVaultAbs(norm);
  if (!abs) {
    const err = new Error("Invalid vault path");
    err.code = "VAULT_PATH_INVALID";
    throw err;
  }
  let exists;
  try {
    await fs.access(abs);
    exists = true;
  } catch {
    exists = false;
  }
  if (!exists) {
    const err = new Error("Note not found");
    err.code = "VAULT_NOT_FOUND";
    throw err;
  }
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await atomicWrite(abs, String(fullSource ?? ""));
  invalidateVaultIndexCache();
  try {
    await fs.unlink(VAULT_GRAPH_CACHE);
  } catch {
    /* optional */
  }
  return { path: norm, abs, updatedFile: path.relative(ROOT, abs).split(path.sep).join("/") };
}

/**
 * @param {string} relPath
 */
export async function deleteVaultNote(relPath) {
  const norm = normalizeVaultRelPath(relPath);
  assertVaultPathWritable(norm || "");
  const abs = resolveVaultAbs(norm);
  if (!abs) {
    const err = new Error("Invalid vault path");
    err.code = "VAULT_PATH_INVALID";
    throw err;
  }
  try {
    await fs.access(abs);
  } catch {
    const err = new Error("Note not found");
    err.code = "VAULT_NOT_FOUND";
    throw err;
  }
  await fs.unlink(abs);
  invalidateVaultIndexCache();
  try {
    await fs.unlink(VAULT_GRAPH_CACHE);
  } catch {
    /* optional */
  }
  return { path: norm, updatedFile: path.relative(ROOT, abs).split(path.sep).join("/") };
}

/**
 * @param {string} fromRel
 * @param {string} toRel
 * @param {{ overwrite?: boolean }} [opts]
 */
export async function moveVaultNote(fromRel, toRel, opts = {}) {
  const fromNorm = normalizeVaultRelPath(fromRel);
  const toNorm = normalizeVaultRelPath(toRel);
  assertVaultPathWritable(fromNorm || "");
  assertVaultPathWritable(toNorm || "");
  const fromAbs = resolveVaultAbs(fromNorm);
  const toAbs = resolveVaultAbs(toNorm);
  if (!fromAbs || !toAbs) {
    const err = new Error("Invalid vault path");
    err.code = "VAULT_PATH_INVALID";
    throw err;
  }
  try {
    await fs.access(fromAbs);
  } catch {
    const err = new Error("Note not found");
    err.code = "VAULT_NOT_FOUND";
    throw err;
  }
  let destExists = false;
  try {
    await fs.access(toAbs);
    destExists = true;
  } catch {
    destExists = false;
  }
  if (destExists && !opts.overwrite) {
    const err = new Error("Destination already exists");
    err.code = "VAULT_EXISTS";
    throw err;
  }
  await fs.mkdir(path.dirname(toAbs), { recursive: true });
  if (destExists && opts.overwrite) {
    await fs.unlink(toAbs);
  }
  await fs.rename(fromAbs, toAbs);
  invalidateVaultIndexCache();
  try {
    await fs.unlink(VAULT_GRAPH_CACHE);
  } catch {
    /* optional */
  }
  return {
    from: fromNorm,
    to: toNorm,
    updatedFile: path.relative(ROOT, toAbs).split(path.sep).join("/")
  };
}

/**
 * @param {string} relPath
 * @param {{ title?: string, content?: string, source?: string }} [opts]
 */
export async function createVaultNote(relPath, opts = {}) {
  const norm = normalizeVaultRelPath(relPath);
  if (!norm || !norm.toLowerCase().endsWith(".md")) {
    const err = new Error("Invalid vault path");
    err.code = "VAULT_PATH_INVALID";
    throw err;
  }
  assertVaultPathWritable(norm || "");
  const abs = resolveVaultAbs(norm);
  if (!abs) {
    const err = new Error("Invalid vault path");
    err.code = "VAULT_PATH_INVALID";
    throw err;
  }
  try {
    await fs.access(abs);
    const err = new Error("Note already exists");
    err.code = "VAULT_EXISTS";
    throw err;
  } catch (e) {
    if (e && e.code === "VAULT_EXISTS") throw e;
    if (e && e.code !== "ENOENT") throw e;
  }
  let fullSource;
  if (typeof opts.source === "string" && opts.source.length > 0) {
    fullSource = opts.source;
  } else {
    const stem = fileStem(norm);
    const title = typeof opts.title === "string" && opts.title.trim() ? opts.title.trim() : stem;
    const body =
      typeof opts.content === "string"
        ? opts.content
        : `# ${title}\n\n`;
    fullSource = matter.stringify(body, { title });
  }
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await atomicWrite(abs, fullSource);
  invalidateVaultIndexCache();
  try {
    await fs.unlink(VAULT_GRAPH_CACHE);
  } catch {
    /* optional */
  }
  return { path: norm, abs, updatedFile: path.relative(ROOT, abs).split(path.sep).join("/") };
}

/** @param {string} relPath */
export function vaultLeafKind(relPath) {
  const l = relPath.toLowerCase();
  if (l.endsWith(".excalidraw.json") || l.endsWith(".excalidraw")) return "excalidraw";
  if (l.endsWith(".mmd") || l.endsWith(".mermaid")) return "mermaid";
  return "md";
}

/** Nested tree: { name, path?, kind?, children? }[] */
export function buildVaultTree(paths) {
  const root = { name: "", children: [] };

  function ensure(parts, parent) {
    if (parts.length === 0) return parent;
    const [head, ...rest] = parts;
    let child = parent.children.find((c) => c.name === head && c.children);
    if (!child) {
      child = { name: head, children: [] };
      parent.children.push(child);
    }
    return ensure(rest, child);
  }

  for (const rel of paths) {
    const parts = rel.split("/");
    const fileName = parts.pop();
    const folder = parts;
    const parent = folder.length ? ensure(folder, root) : root;
    parent.children.push({
      name: fileName,
      path: rel,
      kind: vaultLeafKind(rel)
    });
  }

  function sortTree(node) {
    if (!node.children) return;
    node.children.sort((a, b) => {
      const aDir = Boolean(a.children);
      const bDir = Boolean(b.children);
      if (aDir !== bDir) return aDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const c of node.children) sortTree(c);
  }
  sortTree(root);
  return root.children;
}

async function maxVaultMtimeMs() {
  const paths = await listVaultTreeRelPaths();
  let max = 0;
  for (const rel of paths) {
    const rl = rel.toLowerCase();
    const abs =
      rl.endsWith(".excalidraw.json") || rl.endsWith(".excalidraw")
        ? resolveVaultExcalidrawAbs(rel)
        : resolveVaultAbs(rel);
    if (!abs) continue;
    try {
      const st = await fs.stat(abs);
      if (st.mtimeMs > max) max = st.mtimeMs;
    } catch {
      /* skip */
    }
  }
  return max;
}

export async function getVaultGraphWithOptionalDiskCache() {
  try {
    const raw = await fs.readFile(VAULT_GRAPH_CACHE, "utf8");
    const cached = JSON.parse(raw);
    const vaultMtime = await maxVaultMtimeMs();
    const cachedAt = new Date(cached.generatedAt || 0).getTime();
    if (cached.graph && vaultMtime <= cachedAt + 2000) {
      return { graph: cached.graph, generatedAt: cached.generatedAt, cached: true };
    }
  } catch {
    /* rebuild */
  }

  const index = await getVaultIndexFresh();
  const graph = index.graph;
  const payload = { generatedAt: index.generatedAt, graph };
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(VAULT_GRAPH_CACHE, JSON.stringify(payload, null, 2), "utf8");
  } catch {
    /* optional cache */
  }
  invalidateVaultIndexCache();
  return { graph, generatedAt: index.generatedAt, cached: false };
}

/**
 * Replace [[wiki]] with [label](vpath:rel) or [label](vpath-broken:raw) for client markdown renderers.
 * @param {string} body
 * @param {string} fromRel
 * @param {Set<string>} pathSet
 * @param {Map<string, string|string[]>} lookup
 */
export function expandWikiLinksForPreview(body, fromRel, pathSet, lookup) {
  return String(body || "").replace(/(?<!!)\[\[([^\]]+)\]\]/g, (full, inner) => {
    const trimmed = inner.trim();
    const pipe = trimmed.indexOf("|");
    const target = (pipe >= 0 ? trimmed.slice(0, pipe) : trimmed).trim();
    const labelPart = pipe >= 0 ? trimmed.slice(pipe + 1).trim() : "";
    const hashIdx = target.indexOf("#");
    const pathPart = hashIdx >= 0 ? target.slice(0, hashIdx).trim() : target;
    const frag = hashIdx >= 0 ? target.slice(hashIdx) : "";
    const display = (labelPart || pathPart).replace(/\n/g, " ") || pathPart;
    const { resolved, ambiguous } = resolveLinkTarget(fromRel, pathPart, pathSet, lookup);
    if (resolved && !ambiguous) {
      return `[${display}](vpath:${encodeURIComponent(resolved + frag)})`;
    }
    return `[${display}](vpath-broken:${encodeURIComponent(pathPart + frag)})`;
  });
}

export async function searchVaultNotes(query, limit = 50) {
  const q = String(query || "")
    .toLowerCase()
    .trim();
  if (!q) return [];
  const paths = await listVaultMarkdownRelPaths();
  const hits = [];
  for (const rel of paths) {
    try {
      const note = await readVaultMarkdown(rel);
      const hay = `${rel}\n${note.title}\n${note.aliases.join("\n")}\n${note.content}`.toLowerCase();
      if (hay.includes(q)) {
        hits.push({
          path: rel,
          title: note.title,
          snippet: note.content.replace(/\s+/g, " ").trim().slice(0, 160)
        });
      }
    } catch {
      /* skip */
    }
    if (hits.length >= limit) break;
  }
  return hits.slice(0, limit);
}
