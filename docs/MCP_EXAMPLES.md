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
