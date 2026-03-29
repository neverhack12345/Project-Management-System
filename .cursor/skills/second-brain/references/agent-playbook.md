# Agent Playbook

This playbook defines the default operating protocol for AI agents using this repository through MCP and CLI.

## Audience and scope

- Audience: autonomous coding/ops agents and assistant copilots.
- Scope: safe project triage, controlled writes, ops execution, and verification.
- Primary interfaces:
  - MCP (`src/mcp-server.js`)
  - CLI (`npm run ...` scripts)

## Core operating policy

1. Prefer read-only discovery first.
2. Use `dryRun` whenever a tool supports it before applying side effects.
3. For write operations, always use fresh `versionToken` from `get_project` (or UI/API project response).
4. After side effects, verify outcome via read-back (`get_project`, `get_alerts`, `get_actionable_playbook`, `get_ops_state`).
5. If conflicts occur (`VERSION_CONFLICT`), re-read latest state and retry once with current token.

## Tool selection policy

- Use MCP when:
  - you need structured data and safe, typed tool execution
  - you need one-call playbook flows (`playbook_*`)
  - you need to mutate project markdown with token checks
- Use CLI when:
  - you need batch reporting/ops artifacts in `reports/`
  - you are executing full cadence bundles (`ops:*`)
  - you need local script flags not surfaced by MCP playbooks
  - you need vault file CRUD without MCP (see `npm run vault:crud` in `docs/CLI_OPS_REFERENCE.md`)
- Use HTTP (`npm run dev`) when:
  - integrating with the dashboard or notes UI, or calling `GET`/`POST`/`PUT`/`DELETE` `/api/vault/*` from tooling that already speaks HTTP

## Vault and second brain

- Markdown notes live under `vault/`; browse at `/notes.html` when the dev server is running.
- Prefer MCP tools `vault_*` for tree, read, create, update, delete, and move; they use the same validation as the API (`normalizeVaultRelPath`, allowed extensions).
- Full CRUD index: `docs/CRUD_REFERENCE.md` or MCP resource `resource://docs/crud`.

## Standard workflows

## Read-only daily triage

1. `get_today_brief`
2. `get_health`
3. `get_alerts`
4. `get_actionable_playbook`
5. `get_ops_state`

Decision output:
- safe actions available -> run `resolve_safe_playbook_actions` (`dryRun` first)
- manual actions remain -> produce human decision queue

## Controlled mutation flow

1. `get_project` (fetch fresh `versionToken`)
2. `update_project_status` or `update_project_meta` or `add_project_task`
3. If error code is `VERSION_CONFLICT`:
   - repeat step 1
   - reapply update with new token
4. verify with `get_project`

## Incoming event processing

1. `enqueue_incoming_event` (title required)
2. `process_incoming_events` with `{ "dryRun": true, "maxEvents": N }`
3. re-run with `dryRun: false`
4. `list_incoming_events` to verify resolution state

## Safe playbook resolution

1. `get_actionable_playbook`
2. `resolve_safe_playbook_actions` with `{ "dryRun": true, "maxActions": N }`
3. re-run with `dryRun: false`
4. `get_actionable_playbook` and capture remaining manual actions

## Weekly ops flow

Option A (MCP playbook):
- `playbook_weekly_review` (`dryRun` optional)

Option B (CLI):
- `npm run migrate:schema`
- `npm run validate`
- `npm run impact`
- `npm run pr:summary`
- `npm run alerts`
- `npm run review:weekly`

## Error handling protocol

- `TOKEN_REQUIRED`:
  - fetch current token from `get_project`
  - retry write with token
- `VERSION_CONFLICT`:
  - refresh project
  - rebase intended patch on latest state
  - retry once
- validation failures:
  - run `run_validate` or `npm run validate`
  - correct frontmatter fields in project README/milestones
- auto-ops failures:
  - inspect `get_ops_state` (`lastRunError`, `lastRunTasks`)
  - check stale lock (`reports/ops-state.lock`) only if run is clearly stuck

## Verification checklist (post-change)

- Write target reflects intended update (`get_project`)
- Alerts regenerated if risk-related edits were made (`run_alerts` or `npm run alerts`)
- Action queue refreshed for triage-affecting edits (`get_actionable_playbook`)
- Ops state healthy (`get_ops_state`, status `ok` or expected run state)

## Minimal command set for agents

- Daily one-shot:
  - `npm run ops:triage -- --dryRun --maxEvents 20 --maxActions 20`
  - `npm run ops:triage -- --maxEvents 20 --maxActions 20`
- Intake-only:
  - `npm run ops:intake -- --dryRun --maxEvents 20`
  - `npm run ops:intake -- --maxEvents 20`
