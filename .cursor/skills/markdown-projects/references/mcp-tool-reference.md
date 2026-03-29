# MCP Tool Reference

Authoritative reference for tools/resources exposed by `src/mcp-server.js`.

## Connection

- Command: `node`
- Args: `["src/mcp-server.js"]`
- CWD: repository root

## Safety model

- Write tools require `versionToken`.
- Common write errors:
  - `TOKEN_REQUIRED`
  - `VERSION_CONFLICT` (contains `currentToken`)
- Many ops/playbook tools accept `dryRun`.
- MCP calls trigger background auto-ops due checks.

## Read/query tools

- `list_projects()`
- `get_project({ slug })`
- `get_timeline()`
- `get_project_facts({ slug })` — fact registry only; combine with `get_project` to see `tasks[].factRefs` and compute unassigned facts
- `get_activity({ limit?, skip? })`
- `get_health()`
- `get_dependencies()`
- `get_portfolio_summary()`
- `get_alerts()`
- `get_today_brief()`
- `get_trends({ days? })`
- `get_ops_state()`
- `get_actionable_playbook()`
- `list_incoming_events({ limit? })`

## Project lifecycle tools

- `create_project({ name, owner?, dueDays?, dryRun? })`
  - Runs `scripts/new-project.mjs`; creates `projects/<slug>/` from templates.
- `delete_project({ slug, confirmSlug })`
  - Destructive: removes entire project directory. `confirmSlug` must equal `slug`.

## Vault (second brain) tools

Paths are vault-relative (forward slashes), extensions `.md`, `.mmd`, or `.mermaid` for writes.

- `vault_list_tree()` — `{ paths, tree }`
- `vault_get_note({ path })` — same shape as HTTP `GET /api/vault/file`
- `vault_create_note({ path, title?, content?, source? })`
- `vault_update_note({ path, content })` — full file source including frontmatter
- `vault_delete_note({ path })`
- `vault_move_note({ from, to, overwrite? })` — default rejects existing destination unless `overwrite: true`

## Intake and playbook automation tools

- `enqueue_incoming_event({ title, description?, owner?, urgency?, dueDays?, estimateHours?, projectSlug?, recurrence?, kind? })`
  - Queues one incoming event into `reports/incoming-events.ndjson`.
- `process_incoming_events({ dryRun?, maxEvents? })`
  - Processes pending queue rows into task/project actions.
- `run_playbook_action({ actionId, versionToken?, dryRun? })`
  - Executes one safe action (manual actions are rejected).
- `resolve_safe_playbook_actions({ dryRun?, maxActions? })`
  - Batch executes all safe queue actions up to max.

## Write/update tools

- `update_project_status({ slug, status, versionToken })`
- `add_project_task({ slug, task, dueDate, dependsOn?, factRefs?, recurrence?, versionToken })`
  - `dependsOn` supports `["task-id"]` (same project) and `["other-project:task-id"]` (cross-project)
  - `factRefs` supports `["fact-id"]` and `["other-project:fact-id"]`
- `update_project_task({ slug, taskId, versionToken, title?, dueDate?, dependsOn?, factRefs?, recurrence?, state?, done? })`
  - Setting `state: "done"` or `done: true` uses the same unresolved-fact gating as `move_project_task_lane`.
- `remove_project_task({ slug, taskId, versionToken })`
  - Fails if any task in any project lists this task in `[deps:...]` (cross-project safe).
- `add_project_fact({ slug, statement, status?, sources?, verificationNote?, verifiedBy?, verifiedAt?, versionToken })` — create in registry (step 1); does not attach to tasks
- `update_project_fact({ slug, factId, statement?, status?, sources?, verificationNote?, verifiedBy?, verifiedAt?, versionToken })` — update statement / status / sources (step 3)
- `update_task_fact_refs({ slug, taskId, factRefs, versionToken })` — replace task’s fact list (step 2); pass complete merged array of fact ids (`slug:factId` or local id)
- `move_project_task_lane({ slug, taskId, state, versionToken })`
  - moving to `done` is rejected when linked fact refs are unresolved.
- `update_project_meta({ slug, blockedReason?, nextAction?, priority?, versionToken })`
- `update_milestone({ slug, milestoneId, name?, status?, startDate?, dueDate?, versionToken })`

## Ops/admin tools

- `run_validate({ dryRun? })`
- `run_weekly_review({ dryRun? })`
- `run_alerts({ dryRun? })`
- `run_search_index({ dryRun? })`
- `run_impact_check({ dryRun? })`
- `run_schema_migration({ dryRun? })`
- `generate_pr_summary({ dryRun? })`

## Playbook shortcut tools

- `playbook_daily_standup({ dryRun? })`
- `playbook_unblock_scan({ dryRun? })`
- `playbook_weekly_review({ dryRun? })`

## Resource reference

- `resource://schema` -> `docs/SCHEMA.md`
- `resource://readme` -> `README.md`
- `resource://scripts` -> script catalog summary
- `resource://docs/crud` -> `docs/CRUD_REFERENCE.md`
- `resource://reports/latest-weekly` -> latest weekly report markdown
- `resource://reports/alerts` -> latest alerts json

## Research facts workflow (create → assign → update)

1. `get_project({ slug })` → `versionToken`, `tasks[].id`, `tasks[].factRefs`, existing `facts` on project payload.
2. `add_project_fact({ slug, statement, status, versionToken, ... })` → new `factId` in registry.
3. `get_project` again → fresh `versionToken`, then `update_task_fact_refs({ slug, taskId, factRefs: [...existing local ids..., newId], versionToken })` (merge client-side from step 1).
4. `get_project` → `versionToken`, then `update_project_fact({ slug, factId, status, sources, verificationNote, versionToken })` when verifying (`verified` requires non-empty `sources` and `verificationNote`).

CLI equivalent: `npm run project:facts --` with `create`, `assign`, `update` subcommands (see `docs/CLI_OPS_REFERENCE.md`). Dashboard: **Facts** tab and task detail dialog.

## Recommended call sequences

## Safe task field update

1. `get_project({ slug })` -> `versionToken` and `tasks[].id`
2. `update_project_task({ slug, taskId, versionToken, title?, dueDate?, ... })`
3. `get_project({ slug })` verify change

## Vault note update

1. `vault_get_note({ path })` -> full `content`
2. Edit source locally, then `vault_update_note({ path, content })`
3. `vault_get_note({ path })` verify

## Safe project metadata update

1. `get_project({ slug })` -> read `versionToken`
2. `update_project_meta({ slug, nextAction, versionToken })`
3. `get_project({ slug })` verify change

## Safe queue automation

1. `get_actionable_playbook()`
2. `resolve_safe_playbook_actions({ dryRun: true, maxActions: 20 })`
3. `resolve_safe_playbook_actions({ dryRun: false, maxActions: 20 })`
4. `get_actionable_playbook()` for remaining manual items

## Incoming queue automation

1. `enqueue_incoming_event({ title, ... })`
2. `process_incoming_events({ dryRun: true, maxEvents: 20 })`
3. `process_incoming_events({ dryRun: false, maxEvents: 20 })`
4. `list_incoming_events({ limit: 50 })`
