# CLI Ops Reference

Authoritative CLI command and script reference from `package.json` and `scripts/`.

## App lifecycle

- `npm run dev` -> start dashboard/API server (`src/server.js`)
- `npm run start` -> same as dev server command

## Project bootstrap

- `npm run new:project -- --name "Project Name" --owner "you" [--dueDays 30]`
  - Creates project folder from templates in `projects/<slug>/`.

## Validation and reporting

- `npm run validate`
  - Validates frontmatter required fields, status enum, date format, and milestone dependency refs.
- `npm run stale [-- --days 14]`
  - Prints stale projects older than threshold days.
- `npm run review:weekly`
  - Writes weekly markdown report to `reports/weekly-review-YYYY-MM-DD.md`.
- `npm run alerts [-- --staleDays 14 --preStaleEarlyDays 7 --preStaleLateDays 12 --dueInDays 7 --blockedDays 3]`
  - Writes `reports/alerts-latest.json`.
- `npm run impact [-- --since HEAD~5]`
  - Writes `reports/impact-latest.json` from git file changes.
- `npm run pr:summary`
  - Writes `reports/pr-summary.md` (uses impact report if present).
- `npm run snapshot`
  - Writes metrics snapshot to `reports/snapshots/YYYY-MM-DD.json`.
- `npm run search:index`
  - Rebuilds local cache index at `.cache/search-index.json`.
- `npm run migrate:schema`
  - Sets `schemaVersion: 1` for project READMEs missing the field.

## Ops bundles

- `npm run ops:daily`
  - Runs: validate -> alerts -> weekly-review -> snapshot
- `npm run ops:weekly`
  - Runs: migrate-schema -> validate -> impact-check -> pr-summary -> alerts -> weekly-review -> snapshot
- `npm run ops:intake [-- --dryRun --maxEvents 25]`
  - Processes incoming event queue (`reports/incoming-events.ndjson`).
- `npm run ops:triage [-- --dryRun --maxEvents 25 --maxActions 999]`
  - Runs validate, incoming event processing, alerts, safe playbook resolution, alerts, weekly review.

## MCP server tooling

- `npm run mcp:start`
  - Starts stdio MCP server.
- `npm run mcp:dev`
  - Alias for MCP start.
- `npm run mcp:smoke`
  - Runs MCP tool/resource availability smoke test.

## Operational artifact map

- `reports/alerts-latest.json` -> alerts output
- `reports/action-queue-latest.json` -> generated actionable playbook queue
- `reports/ops-state.json` -> auto-ops run state and errors
- `reports/incoming-events.ndjson` -> queued + resolved/failed intake events
- `reports/weekly-review-*.md` -> weekly human-readable report
- `reports/impact-latest.json` -> impact analysis from git changes
- `reports/pr-summary.md` -> PR summary scaffold
- `reports/snapshots/*.json` -> trend snapshots
- `.cache/search-index.json` -> local search cache

## Production operator defaults

- Morning:
  - `npm run ops:triage -- --maxEvents 20 --maxActions 20`
- Weekly maintenance:
  - `npm run ops:weekly`
- Safe preview mode before changes:
  - append `-- --dryRun` to `ops:intake` or `ops:triage`
