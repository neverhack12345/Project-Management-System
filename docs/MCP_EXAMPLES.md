# MCP Examples

## 1) List projects and top risks

1. Call `list_projects`.
2. Call `get_health`.
3. Use `topAtRisk` for triage order.

## 2) Update blocked reason safely

1. Call `get_project` with `slug`.
2. Read `versionToken` from result.
3. Call `update_project_meta` with:
   - `slug`
   - `blockedReason`
   - `versionToken`

If conflict occurs (`VERSION_CONFLICT`), re-read project and retry with latest token.

## 3) Generate weekly summary and alerts

1. `run_validate`
2. `run_weekly_review`
3. `run_alerts`
4. Read resources:
   - `resource://reports/latest-weekly`
   - `resource://reports/alerts`

## 4) Rebuild index and run impact scan

1. `run_search_index`
2. `run_impact_check`
3. `generate_pr_summary`

## 5) One-call daily standup

1. Call `playbook_daily_standup`.
2. Read the returned `topRisks` and script outputs.

## 6) One-call weekly review workflow

1. Call `playbook_weekly_review`.
2. Confirm outputs from validation, weekly review, impact check, and PR summary.

## 7) Check auto-ops state from MCP

1. Call `get_ops_state`.
2. Inspect:
   - `lastRunStatus` for success/error
   - `lastRunTasks` for what executed
   - `lastRunError` when troubleshooting

## 8) Trigger auto-ops opportunistically

1. Use any MCP tool call (for example `list_projects`).
2. Auto-ops due-check runs in the background.
3. Call `get_ops_state` to confirm whether daily/weekly/monthly tasks executed.
