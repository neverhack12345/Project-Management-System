# Project Management System

Markdown-first project and milestone tracker with:
- project folders as source of truth
- dashboard search, calendar, gantt, dependency, and health views
- markdown write APIs with conflict protection (`versionToken`)
- operational reports (weekly review, alerts, impact, PR summary)
- local stdio MCP server for AI agents (full-admin tool surface)

## Quick start

1. `npm install`
2. `npm run new:project -- --name "My Project" --owner "You"`
3. `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000)

## Project layout

- `projects/<project-slug>/README.md` - canonical metadata
- `projects/<project-slug>/spec.md` - requirements/spec
- `projects/<project-slug>/research.md` - research notes
- `projects/<project-slug>/milestones.md` - milestones and dependencies
- `projects/<project-slug>/tasks.md` - task list

Schema reference: `docs/SCHEMA.md`

Strategy reference: `docs/COMPETITIVE_GAP_ANALYSIS.md`

## MCP for AI agents

- Start server: `npm run mcp:start`
- Smoke test: `npm run mcp:smoke`
- Docs:
  - `docs/MCP_USAGE.md`
  - `docs/MCP_EXAMPLES.md`

## Core scripts

- `npm run validate` - schema/date/status validation
- `npm run review:weekly` - weekly markdown summary
- `npm run alerts` - threshold-based alert report
- `npm run impact` - impact report from git diffs
- `npm run search:index` - rebuild local search index
- `npm run migrate:schema` - normalize schema version fields
- `npm run pr:summary` - generate project-focused PR summary
- `npm run stale` - stale project report
- `npm run snapshot` - write daily metrics snapshot for trend tracking
- `npm run ops:daily` - run daily automation bundle
- `npm run ops:weekly` - run weekly automation bundle
- `npm run mcp:start` - start local stdio MCP server
- `npm run mcp:smoke` - run MCP smoke validation

## File/flag auto-ops trigger model

- State file: `reports/ops-state.json`
- Lock file: `reports/ops-state.lock`
- Daily/weekly/monthly tasks run automatically when the website/API or MCP server is accessed.
- Runs are throttled with a cooldown window to avoid repeated executions on every request.
- If a run fails, error details are persisted in `ops-state.json` and services continue running.
- Ops status is visible in:
  - dashboard card: **Auto Ops Status**
  - API: `GET /api/ops-state`
  - MCP tool: `get_ops_state`
- Run order when due: monthly -> weekly -> daily.

## Actionable Alert Playbooks

- API: `GET /api/playbook/actions`
- Dashboard: **Action Queue** card with one-click execution for safe actions
- MCP:
  - `get_actionable_playbook`
  - `run_playbook_action` (`dryRun` supported)
- Report artifact: `reports/action-queue-latest.json`

Playbook actions are generated from existing alert and dependency signals and prioritized for execution. Safe actions reuse existing write APIs and require `versionToken` protection to prevent stale writes.

## Ops cadence

| Cadence | Core commands | Outcome |
|---|---|---|
| Daily | `npm run validate`<br>`npm run alerts`<br>`npm run review:weekly` | Up-to-date status and risk visibility |
| Weekly | `npm run migrate:schema`<br>`npm run validate`<br>`npm run impact`<br>`npm run pr:summary` | Strong data quality and collaboration context |
| Monthly | `npm run search:index`<br>`npm run alerts`<br>`npm run review:weekly`<br>portfolio/archive cleanup | Reduced drift and improved signal quality |

## New teammate quick start (15 min)

1. `npm install` and `npm run validate`
2. `npm run dev` and review dashboard
3. `npm run alerts` and `npm run review:weekly`
4. `npm run mcp:smoke` (if using agent workflows)
5. Read:
   - `docs/SCHEMA.md`
   - `docs/MCP_USAGE.md`
   - `docs/MCP_EXAMPLES.md`

## Troubleshooting

- **Validation fails with missing metadata**
  - Run `npm run migrate:schema`, then `npm run validate`.
  - Confirm required fields in `projects/<slug>/README.md` match `docs/SCHEMA.md`.

- **No alerts or weekly report output**
  - Run `npm run alerts` and `npm run review:weekly`.
  - Check generated files in `reports/`.

- **Impact script fails on shallow git history**
  - Run `npm run impact` again (script falls back to `HEAD` diff).
  - If needed, provide a custom range in the script invocation flow.

- **Dashboard not loading or stale data**
  - Restart server: `npm run dev`.
  - Rebuild index if needed: `npm run search:index`.

- **MCP smoke test fails**
  - Ensure dependencies are installed: `npm install`.
  - Re-run: `npm run mcp:smoke`.
  - Start server directly for debugging: `npm run mcp:start`.

- **Auto ops not running**
  - Inspect `reports/ops-state.json` (`lastRunStatus`, `lastRunError`, timestamps).
  - If present, remove stale lock file `reports/ops-state.lock`.
  - Trigger checks by visiting `/api/ops-state` or calling MCP `get_ops_state`.