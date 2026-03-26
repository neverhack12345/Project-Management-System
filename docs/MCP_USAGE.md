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
  "cwd": "C:/Users/never/Documents/git/Project-Management-System"
}
```

## Tool groups

- Read/query:
  - `list_projects`, `get_project`, `get_timeline`, `get_activity`, `get_health`, `get_dependencies`, `get_portfolio_summary`, `get_alerts`, `get_today_brief`, `get_trends`, `get_ops_state`
  - `get_actionable_playbook`, `list_incoming_events`
- Write/update:
  - `update_project_status`, `add_project_task`, `update_project_meta`, `update_milestone`
  - `run_playbook_action` (safe actions only, requires `versionToken` when executing)
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
- `resource://reports/latest-weekly` -> most recent weekly report
- `resource://reports/alerts` -> latest alerts JSON

## Agent workflow examples

- Daily:
  1. `list_projects`
  2. `get_health`
  3. `get_alerts`
- Weekly:
  1. `run_validate`
  2. `run_weekly_review`
  3. `run_alerts`
- Unblock review:
  1. `get_dependencies`
  2. `get_activity`
  3. `update_project_meta` (blocked reason / next action)

- Playbook shortcuts:
  1. `playbook_daily_standup` for validate + alerts + top risks
  2. `playbook_unblock_scan` for blocked/dependency risk review
  3. `playbook_weekly_review` for validate + weekly review + impact + PR summary

- Action queue workflow:
  1. `get_actionable_playbook`
  2. choose `safeExecute: true` action
  3. `run_playbook_action` with `actionId` and current `versionToken` (`dryRun` first recommended)

- Bulk safe-action workflow:
  1. `resolve_safe_playbook_actions` with `dryRun: true`
  2. re-run with `dryRun: false` once output is acceptable
  3. verify remaining items with `get_actionable_playbook`

- Incoming-event workflow:
  1. `enqueue_incoming_event` with title/description/urgency/owner
  2. `process_incoming_events` with `dryRun: true`
  3. re-run with `dryRun: false`
  4. inspect results using `list_incoming_events`

## Ops state visibility

- Query current state with `get_ops_state`.
- Key fields:
  - `lastDailyRun`, `lastWeeklyRun`, `lastMonthlyRun`
  - `lastRunStatus`, `lastRunError`
  - `lastRunAt`, `lastRunSource`, `lastRunTasks`
