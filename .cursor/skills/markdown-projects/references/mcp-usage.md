# MCP Usage (Local Stdio, Full Admin)

This project exposes a local MCP server at `src/mcp-server.js`.

## Start server

- `npm run mcp:start`

Use this command as the stdio command for your MCP client (Cursor, Claude Desktop, etc.).

## Recommended client registration

Command:

```json
{
  "command": "node",
  "args": ["src/mcp-server.js"],
  "cwd": "<repository-root>"
}
```

Replace `<repository-root>` with the absolute path to this repository on your machine.

## Tool groups

- Read/query:
  - `list_projects`, `get_project`, `get_timeline`, `get_activity`, `get_health`, `get_dependencies`, `get_portfolio_summary`, `get_alerts`, `get_today_brief`, `get_trends`, `get_ops_state`
  - `get_actionable_playbook`, `list_incoming_events`
- Project lifecycle:
  - `create_project` (from templates; optional `dryRun`)
  - `delete_project` (`confirmSlug` must match `slug`)
- Write/update (projects/tasks):
  - `update_project_status`, `add_project_task`, `update_project_task`, `remove_project_task`, `update_project_meta`, `update_milestone`
  - `get_project_facts`, `add_project_fact`, `update_project_fact`, `update_task_fact_refs`, `move_project_task_lane`
  - `run_playbook_action` (safe actions only, requires `versionToken` when executing)
- Vault (second brain, `vault/`):
  - `vault_list_tree`, `vault_get_note`, `vault_create_note`, `vault_update_note`, `vault_delete_note`, `vault_move_note`
- Intake automation:
  - `enqueue_incoming_event` (queue incoming work)
  - `process_incoming_events` (`dryRun`, `maxEvents`)
- Playbook automation:
  - `resolve_safe_playbook_actions` (`dryRun`, `maxActions`)
- Ops/admin:
  - `run_validate`, `run_weekly_review`, `run_alerts`, `run_search_index`, `run_impact_check`, `run_schema_migration`, `generate_pr_summary`
  - `playbook_daily_standup`, `playbook_unblock_scan`, `playbook_weekly_review`

## Safety rules

- Write tools require `versionToken` and return structured conflict info when stale:
  - `code: VERSION_CONFLICT` with `currentToken`
  - `code: TOKEN_REQUIRED` when missing token
- Admin tools support `dryRun` for no-side-effect execution.
- Keep `ENABLE_AUTO_COMMIT` off unless explicitly needed.
- MCP requests trigger file/flag auto-ops due checks. State is tracked in `reports/ops-state.json`.
- Auto-ops due order is monthly -> weekly -> daily.
- Actionable playbook queue is persisted at `reports/action-queue-latest.json`.
- Incoming event queue is persisted at `reports/incoming-events.ndjson`.

## MCP resources

- `resource://schema` -> markdown schema reference
- `resource://readme` -> project README content
- `resource://scripts` -> script capability summary
- `resource://docs/crud` -> CRUD index (`docs/CRUD_REFERENCE.md`)
- `resource://reports/latest-weekly` -> most recent weekly report
- `resource://reports/alerts` -> latest alerts JSON

## Assistant-oriented workflows

Step-by-step MCP sequences (daily triage, playbooks, intake, CRUD, vault, facts) live with the **Agent Skills** packages — see [.cursor/skills/markdown-projects/references/mcp-examples.md](../.cursor/skills/markdown-projects/references/mcp-examples.md) (same content as the second-brain skill copy). Operating policy (MCP vs CLI vs HTTP, token retry) is in each skill’s `SKILL.md` and [references/agent-playbook.md](../.cursor/skills/markdown-projects/references/agent-playbook.md).

## Fact verification constraints

- Fact status enum: `unknown`, `unverified`, `in-review`, `verified`.
- `verified` requires:
  - at least one `sources` entry
  - non-empty `verificationNote`
- `move_project_task_lane` to `done` is blocked if linked fact refs are unresolved.
- `update_project_status` to `done` is blocked if project has unresolved facts.

## Ops state visibility

- Query current state with `get_ops_state`.
- Key fields:
  - `lastDailyRun`, `lastWeeklyRun`, `lastMonthlyRun`
  - `lastRunStatus`, `lastRunError`
  - `lastRunAt`, `lastRunSource`, `lastRunTasks`
