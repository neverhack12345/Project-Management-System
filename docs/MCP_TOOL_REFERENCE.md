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
- `add_project_task({ slug, task, versionToken })`
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
- `resource://reports/latest-weekly` -> latest weekly report markdown
- `resource://reports/alerts` -> latest alerts json

## Recommended call sequences

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
