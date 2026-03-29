# CRUD reference

Single index for creating, reading, updating, and deleting **projects** (`projects/`), **tasks** (inside each project’s `tasks.md`), and **vault notes** (`vault/`). Use MCP, CLI, or HTTP depending on your client; assistants should follow `.cursor/skills/markdown-projects/SKILL.md` and `.cursor/skills/second-brain/SKILL.md`. CLI works without the HTTP server; HTTP is used by the dashboard and notes UI.

## Safety

- **Project/task writes** (except `create_project` and `delete_project`) require a fresh `versionToken` from `get_project` (or the API). Stale tokens return `VERSION_CONFLICT` with `currentToken`.
- **`delete_project`** requires `confirmSlug` to exactly match `slug` (destructive).
- **Vault paths** must be vault-relative forward-slash paths; allowed writable leaves: `.md`, `.mmd`, `.mermaid` (see `assertVaultPathWritable` in `src/vault-store.js`). No `..` segments.
- **Task done**: moving or marking a task `done` is blocked while linked facts are unresolved (same rules as Kanban).

## Matrix

### Projects

| Operation | MCP | CLI | HTTP | Files |
|-----------|-----|-----|------|--------|
| Create | `create_project` | `npm run new:project -- --name "..." --owner "..."` | — | Templates → `projects/<slug>/` |
| Read list | `list_projects` | — | `GET /api/projects` | `projects/*/README.md` |
| Read one | `get_project` | — | (via list + slug) | `projects/<slug>/*.md` |
| Update status/meta/milestones | `update_project_status`, `update_project_meta`, `update_milestone` | — | `PATCH /api/projects/...` | README, milestones.md |
| Delete | `delete_project` | `npm run project:delete -- --slug <s> --confirm-slug <s>` | — | Removes `projects/<slug>/` |

### Tasks

| Operation | MCP | CLI | HTTP | Files |
|-----------|-----|-----|------|--------|
| Create | `add_project_task` | — | `POST /api/projects/:slug/tasks` | `tasks.md` |
| Read | `get_project` | — | board/list APIs | `tasks.md` |
| Update lane | `move_project_task_lane` | — | `PATCH .../tasks/:id/state` | `tasks.md` |
| Update fields | `update_project_task` | — | — | `tasks.md` |
| Update fact refs | `update_task_fact_refs` | — | `PATCH .../facts` | `tasks.md` |
| Delete | `remove_project_task` | — | — | `tasks.md` |

### Vault (second brain)

| Operation | MCP | CLI | HTTP | Files |
|-----------|-----|-----|------|--------|
| Tree / structure | `vault_list_tree` | `npm run vault:crud -- tree` | `GET /api/vault/tree` | `vault/**` |
| Read | `vault_get_note` | `npm run vault:crud -- get --path ...` | `GET /api/vault/file?path=...` | `vault/...` |
| Create | `vault_create_note` | `npm run vault:crud -- create --path ...` | `POST /api/vault/file` | `vault/...` |
| Update body | `vault_update_note` | `npm run vault:crud -- update --path ... --file ...` | `PUT /api/vault/file` | `vault/...` |
| Delete | `vault_delete_note` | `npm run vault:crud -- delete --path ...` | `DELETE /api/vault/file?path=...` | `vault/...` |
| Move/rename | `vault_move_note` | `npm run vault:crud -- move --from ... --to ...` | `POST /api/vault/move` JSON `{ from, to, overwrite? }` | `vault/...` |

## Related docs

- Schema: `docs/SCHEMA.md`
- MCP tools: `docs/MCP_TOOL_REFERENCE.md`
- MCP setup: `docs/MCP_USAGE.md`
- CLI: `docs/CLI_OPS_REFERENCE.md`
