# Ops Runbook

Operational procedures for production-like operation of this repository.

## Service model

- App/API server: `src/server.js` (`npm run dev` / `npm run start`)
- MCP server: `src/mcp-server.js` (`npm run mcp:start`)
- Data store: markdown files in `projects/`
- Operational artifacts: `reports/` and `.cache/`

## Startup checklist

1. Install dependencies: `npm install`
2. Baseline validation: `npm run validate`
3. Start app server: `npm run start`
4. (Optional) start MCP server: `npm run mcp:start`
5. Smoke checks:
   - open `/` in browser
   - run `npm run mcp:smoke`
   - query `/api/ops-state`

## Shutdown checklist

1. Stop app and MCP processes.
2. Confirm no active writes are in progress.
3. Ensure no stale lock remains:
   - `reports/ops-state.lock` should not persist after normal exits.

## Daily operations

- Preferred command:
  - `npm run ops:triage -- --maxEvents 20 --maxActions 20`
- Review outputs:
  - `reports/alerts-latest.json`
  - `reports/action-queue-latest.json`
  - latest `reports/weekly-review-*.md`
  - `reports/ops-state.json`

## Weekly operations

- Run:
  - `npm run ops:weekly`
- Verify artifacts:
  - `reports/impact-latest.json`
  - `reports/pr-summary.md`
  - `reports/alerts-latest.json`
  - latest weekly review

## Release checklist

1. `npm run validate`
2. `npm run mcp:smoke`
3. `npm run ops:triage -- --dryRun --maxEvents 20 --maxActions 20`
4. `npm run ops:weekly`
5. Review changed `reports/` artifacts for anomalies.
6. Confirm README/docs and MCP/CLI references still match implementation.

## Rollback procedure

If a release/regression occurs:

1. Identify last known good commit.
2. Deploy/restart from good commit.
3. Re-run:
   - `npm run validate`
   - `npm run alerts`
   - `npm run review:weekly`
4. Capture incident summary and root cause in team notes.

Note: use standard git rollback process for your environment; avoid destructive local resets unless explicitly approved.

## Incident response

## Severity levels

- Sev1: system unusable or data corruption risk.
- Sev2: major workflow blocked (e.g., write path failures, MCP unavailable).
- Sev3: degraded but operational (partial automation failures).

## Response flow

1. Detect and classify severity.
2. Stabilize:
   - stop risky writes if needed
   - preserve current artifacts/log context
3. Diagnose using:
   - `reports/ops-state.json`
   - `npm run validate`
   - `npm run mcp:smoke`
   - `/api/ops-state`
4. Recover:
   - clear stale lock only when confirmed stuck (`reports/ops-state.lock`)
   - rerun affected ops command
5. Verify:
   - alerts/queue/weekly outputs are regenerated
   - UI/API/MCP reads are healthy

## Backup and restore

## What to back up

- `projects/` (source-of-truth content)
- `reports/` (operational history and snapshots)
- `config/automation-rules.json`
- `forms/intake.json`

## Backup cadence

- Daily backup of `projects/` and `config/`.
- Daily or weekly backup of `reports/` based on retention policy.

## Restore drill (minimum)

1. Restore `projects/` and `config/`.
2. Start app server.
3. Run:
   - `npm run validate`
   - `npm run alerts`
   - `npm run review:weekly`
   - `npm run search:index`
4. Confirm dashboard and MCP smoke pass.

## Observability minimums

- Monitor:
  - `reports/ops-state.json` (`lastRunStatus`, `lastRunError`, timestamps)
  - alerts count and risk trends
  - weekly review generation status
- Keep latest trend snapshots fresh via `npm run snapshot`.

## Quick diagnostics matrix

- Validation failing:
  - run `npm run migrate:schema`, then `npm run validate`
- MCP unavailable:
  - run `npm run mcp:smoke`, restart MCP server
- Auto-ops not progressing:
  - inspect `reports/ops-state.json`
  - remove stale lock only if no run is active
- UI stale data:
  - run `npm run alerts` and `npm run review:weekly`, refresh browser
