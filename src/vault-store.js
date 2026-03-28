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
export function assertVaultPathWritable(norm) {
  if (!norm || !norm.toLowerCase().endsWith(".md")) {
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

/** @returns {string|null} absolute filesystem path to a .md file under VAULT_DIR */
export function resolveVaultAbs(relPath) {
  const norm = normalizeVaultRelPath(relPath);
  if (!norm || !norm.toLowerCase().endsWith(".md")) return null;
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

function firstMarkdownHeading(content) {
  const m = String(content || "").match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "";
}

function fileStem(relPath) {
  const base = relPath.split("/").pop() || "";
  return base.replace(/\.md$/i, "");
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

/** @param {string} body */
function extractWikiLinkParts(body) {
  const out = [];
  const re = /\[\[([^\]]+)\]\]/g;
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
        edges.push({ from: rel, to: resolved, ok: true });
      } else {
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

export async function getVaultFilePayload(relPath) {
  const norm = normalizeVaultRelPath(relPath);
  if (!norm || !norm.toLowerCase().endsWith(".md")) {
    const err = new Error("Invalid vault path");
    err.code = "VAULT_PATH_INVALID";
    throw err;
  }
  const note = await readVaultMarkdown(norm);
  const index = await getVaultIndexCached();
  const pathSet = new Set(index.paths);
  const metaByPath = new Map(index.paths.map((p) => [p, index.notes[p]]));
  const lookup = buildLookup(pathSet, metaByPath);
  const previewMarkdown = expandWikiLinksForPreview(note.content, norm, pathSet, lookup);
  return {
    path: note.path,
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
 * @param {{ title?: string, content?: string, source?: string }} [opts]
 */
export async function createVaultNote(relPath, opts = {}) {
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

/** Nested tree: { name, path?, children? }[] */
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
      path: rel
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
  const paths = await listVaultMarkdownRelPaths();
  let max = 0;
  for (const rel of paths) {
    const abs = resolveVaultAbs(rel);
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
  return String(body || "").replace(/\[\[([^\]]+)\]\]/g, (full, inner) => {
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
