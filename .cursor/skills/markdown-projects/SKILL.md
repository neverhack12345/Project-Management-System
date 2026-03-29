---
name: markdown-projects
description: >-
  Operates the markdown-first portfolio under projects/: README frontmatter, milestones, tasks.md tokens
  (id, due, state, deps, facts, recur), research facts registry, Kanban lanes. Uses MCP tools
  (list_projects, get_project, create_project, add_project_task, update_project_task,
  remove_project_task, delete_project, facts, milestones, playbooks) and npm scripts (new:project,
  project:delete, validate, ops:*). Use when the user asks about project management, tasks, milestones,
  portfolio dashboard, versionToken conflicts, or paths under projects/. Not for vault notes — use the
  second-brain skill for vault/ and vault_* tools.
compatibility: >-
  Node.js 18+ and npm, repository root as cwd for scripts. Optional MCP stdio (node src/mcp-server.js).
  Optional npm run dev for HTTP API and dashboard at /.
metadata:
  skill-spec: https://agentskills.io/specification
  repository-domain: projects
---

# Markdown projects portfolio

Follow [Agent Skills best practices](https://agentskills.io/skill-creation/best-practices): default to MCP `get_project` / write tools; use **`references/REFERENCE.md`** only when you need deeper docs (schema, exact tool args, npm scripts).

## Instructions

1. **Schema** — For frontmatter, task line format, and fact rules, read [`references/schema.md`](references/schema.md) when validating or editing markdown (live MCP: `resource://schema`).
2. **Writes** — Except `create_project` and `delete_project`, every mutating tool needs a fresh `versionToken` from `get_project`. On `VERSION_CONFLICT`, re-read and retry once with `currentToken`.
3. **Create project** — MCP `create_project` or `npm run new:project -- --name "..." --owner "..."`. Slug is derived from the name.
4. **Tasks** — Add with `add_project_task` (ISO `YYYY-MM-DD` due). Update fields with `update_project_task`. Remove with `remove_project_task` only if no task in **any** project lists this task in `[deps:...]`.
5. **Done gating** — `move_project_task_lane` or `update_project_task` to `done` is blocked while linked facts are unresolved; fix `research.md` / facts first.
6. **Delete project** — MCP `delete_project` or `npm run project:delete -- --slug <s> --confirm-slug <s>` (must match); removes `projects/<slug>/`.
7. **Ops / UI** — Reporting: see [`references/cli-ops-reference.md`](references/cli-ops-reference.md). Dashboard: `/` when `npm run dev` is running.

## Examples

- Meta: `get_project` → `update_project_meta` (`blockedReason`, `nextAction`, `versionToken`) → `get_project`.
- Task: `get_project` → `add_project_task` (`slug`, `task`, `dueDate`, optional `dependsOn`, `factRefs`, `versionToken`).

## Gotchas

- **`versionToken` is derived from `README.md` mtime**, not `tasks.md`. Unusual races are possible if multiple processes write different files; always refresh from `get_project` before writes.
- **`remove_project_task` scans all projects** — a dependency in another project’s `tasks.md` blocks deletion.
- **`delete_project`** — `confirmSlug` must equal `slug` exactly (case-sensitive match to stored slug string).

## Boundaries

Vault notes, wiki graph, and `vault/` belong to **[second-brain](../second-brain/SKILL.md)** — do not use `vault_*` MCP tools or `npm run vault:crud` under this skill.

## References

- **[references/REFERENCE.md](references/REFERENCE.md)** — when to load each duplicated doc (progressive disclosure).
- **Related skill:** [second-brain](../second-brain/SKILL.md).

Spec: [agentskills.io/specification](https://agentskills.io/specification). Optional validator: [`skills-ref validate`](https://github.com/agentskills/agentskills/tree/main/skills-ref).
