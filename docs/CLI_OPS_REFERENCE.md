# CLI Ops Reference

Authoritative CLI command and script reference from `package.json` and `scripts/`.

## App lifecycle

- `npm run dev` -> start dashboard/API server (`src/server.js`)
- `npm run start` -> same as dev server command

## Project bootstrap

- `npm run new:project -- --name "Project Name" --owner "you" [--dueDays 30]`
  - Creates project folder from templates in `projects/<slug>/`.
- `npm run project:delete -- --slug <slug> --confirm-slug <same-as-slug>`
  - Permanently deletes `projects/<slug>/` (destructive; confirmation token must match).

## Project facts (research registry + task links)

Runs against `projects/<slug>/` without starting the HTTP server. Registry lives in `research.md`; task links are `[facts:...]` lines in `tasks.md`. Uses README `versionToken` (mtime) before writes, same as the API.

- `npm run project:facts -- list --slug <slug> [--unassigned]`
  - Prints JSON: each fact includes `assignedToTaskIds`. With `--unassigned`, only facts not referenced by any task in that project.
- `npm run project:facts -- create --slug <slug> --statement "..." [--status <s>] [--source <url>] [--verificationNote "..."]`
  - Appends a fact to the registry (`verified` requires source + verification note).
- `npm run project:facts -- update --slug <slug> --factId <id> [--statement "..."] [--status <s>] [--sources "a,b"] [--verificationNote "..."]`
  - Patches one fact; omitted flags keep existing field values.
- `npm run project:facts -- assign --slug <slug> --taskId <id> --factId <id>`
  - Merges one fact onto a task (equivalent to dashboard “assign” / `PATCH .../tasks/:id/facts` with merged list).

## Vault (second brain) CLI

Runs against `vault/` without starting the HTTP server:

- `npm run vault:crud -- tree` — list all vault paths and nested tree JSON
- `npm run vault:crud -- get --path <vault-relative-path>` — dump `getVaultFilePayload` JSON
- `npm run vault:crud -- create --path path/to/Note.md [--title "Title"] [--file body.md]` — create markdown note
- `npm run vault:crud -- update --path path/to/Note.md --file full-source.md` — overwrite note source
- `npm run vault:crud -- delete --path path/to/Note.md` — delete file
- `npm run vault:crud -- move --from a.md --to folder/b.md [--overwrite]` — rename or move within vault

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
