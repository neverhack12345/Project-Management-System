#!/usr/bin/env node
/**
 * Research facts CLI (no HTTP server). Registry: projects/<slug>/research.md.
 * Uses README versionToken (same as API) before writes.
 */
import {
  assertVersionToken,
  createProjectFact,
  loadProject,
  updateProjectFact,
  updateTaskFactRefs
} from "../src/markdown-store.js";

const [, , cmd, ...rest] = process.argv;

function arg(name, fallback = "") {
  const idx = rest.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  return rest[idx + 1] ?? fallback;
}

function hasFlag(name) {
  return rest.includes(`--${name}`);
}

function usage() {
  console.error(`Usage (repo root):
  node scripts/project-facts.mjs list --slug <slug> [--unassigned]
  node scripts/project-facts.mjs create --slug <slug> --statement "..." [--status <s>] [--source <url>] [--verificationNote "..." ]
  node scripts/project-facts.mjs update --slug <slug> --factId <id> [--statement "..."] [--status <s>] [--sources "a,b"] [--verificationNote "..."]
  node scripts/project-facts.mjs assign --slug <slug> --taskId <id> --factId <id>

  list: prints facts with assignedToTaskIds. --unassigned: only facts not on any task [facts:...] line.
  create: adds to facts registry (optional factId via store auto-id if omitted).
  update: patches one fact; omitted fields keep existing values.
  assign: merges fact onto task (same as dashboard / PATCH .../tasks/:id/facts).
  verified status requires at least one source and verificationNote (API parity).`);
  process.exit(1);
}

function collectUsedRefs(project) {
  const used = new Set();
  for (const t of project.tasks || []) {
    for (const r of t.factRefs || []) used.add(r);
  }
  return used;
}

if (!cmd) usage();

try {
  switch (cmd) {
    case "list": {
      const slug = arg("slug");
      if (!slug) usage();
      const project = await loadProject(slug);
      const used = collectUsedRefs(project);
      let facts = project.facts || [];
      if (hasFlag("unassigned")) {
        facts = facts.filter((f) => !used.has(f.ref));
      }
      const payload = facts.map((f) => ({
        factId: f.factId,
        ref: f.ref,
        statement: f.statement,
        status: f.status,
        sources: f.sources,
        verificationNote: f.verificationNote,
        assignedToTaskIds: (project.tasks || [])
          .filter((t) => (t.factRefs || []).includes(f.ref))
          .map((t) => t.id)
      }));
      console.log(JSON.stringify({ slug, filter: hasFlag("unassigned") ? "unassigned" : "all", facts: payload }, null, 2));
      break;
    }
    case "create": {
      const slug = arg("slug");
      const statement = arg("statement");
      if (!slug || !statement) usage();
      const project = await loadProject(slug);
      await assertVersionToken(slug, project.versionToken);
      const status = arg("status", "unknown");
      const source = arg("source");
      const verificationNote = arg("verificationNote") || arg("note", "");
      const sources = source
        ? [source]
        : arg("sources", "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
      const result = await createProjectFact(slug, {
        statement,
        status,
        sources,
        verificationNote
      });
      console.log(JSON.stringify({ ok: true, fact: result.fact, updatedFile: result.updatedFile }, null, 2));
      break;
    }
    case "update": {
      const slug = arg("slug");
      const factId = arg("factId");
      if (!slug || !factId) usage();
      const project = await loadProject(slug);
      const existing = (project.facts || []).find((f) => f.factId === factId);
      if (!existing) {
        console.error(`Fact not found: ${slug}:${factId}`);
        process.exit(1);
      }
      await assertVersionToken(slug, project.versionToken);
      const statementArg = arg("statement");
      const statusArg = arg("status");
      const sourcesArg = arg("sources");
      const noteArg = arg("verificationNote") || arg("note");
      const patch = {
        statement: statementArg !== "" ? statementArg : existing.statement,
        status: statusArg !== "" ? statusArg : existing.status,
        sources:
          sourcesArg !== ""
            ? sourcesArg
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : existing.sources,
        verificationNote: noteArg !== "" ? noteArg : existing.verificationNote
      };
      const result = await updateProjectFact(slug, factId, patch);
      console.log(JSON.stringify({ ok: true, fact: result.fact, updatedFile: result.updatedFile }, null, 2));
      break;
    }
    case "assign": {
      const slug = arg("slug");
      const taskId = arg("taskId");
      const factId = arg("factId");
      if (!slug || !taskId || !factId) usage();
      const project = await loadProject(slug);
      const task = (project.tasks || []).find((t) => t.id === taskId);
      if (!task) {
        console.error(`Task not found: ${slug}:${taskId}`);
        process.exit(1);
      }
      const known = new Set((project.facts || []).map((f) => f.factId));
      if (!known.has(factId)) {
        console.error(`Unknown fact id for this project: ${factId}`);
        process.exit(1);
      }
      await assertVersionToken(slug, project.versionToken);
      const ids = [
        ...new Set(
          [...(task.factRefs || [])].map((r) => (r.includes(":") ? r.split(":").pop() : r)).concat(factId)
        )
      ];
      const result = await updateTaskFactRefs(slug, taskId, ids);
      console.log(JSON.stringify({ ok: true, taskId, factRefs: ids, updatedFile: result.updatedFile }, null, 2));
      break;
    }
    default:
      usage();
  }
} catch (e) {
  if (e.code === "VERSION_CONFLICT") {
    console.error(e.message, `(currentToken: ${e.currentToken})`);
  } else {
    console.error(e.message || String(e));
  }
  process.exit(1);
}
