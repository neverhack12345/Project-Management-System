# Production Handbook

Central index for production-ready operation, agent usage, CLI/MCP playbooks, and human UI workflows.

## Start here by role

- Agent operator:
  - `docs/AGENT_PLAYBOOK.md`
  - `docs/MCP_TOOL_REFERENCE.md`
  - `docs/CLI_OPS_REFERENCE.md`
- Human dashboard operator:
  - `docs/UI_USER_GUIDE.md`
- Maintainer/on-call:
  - `docs/OPS_RUNBOOK.md`

## System overview

- Source of truth: markdown projects in `projects/`
- Runtime surfaces:
  - UI/API server (`npm run start`)
  - MCP server (`npm run mcp:start`)
- Automation surfaces:
  - CLI ops bundles (`ops:*`)
  - MCP playbook and intake tools
- Operational artifacts: `reports/`, `.cache/`

## Golden workflows

## Daily

- Human/UI path:
  - follow `docs/UI_USER_GUIDE.md` daily triage
- CLI path:
  - `npm run ops:triage -- --maxEvents 20 --maxActions 20`
- MCP path:
  - `get_today_brief` -> `get_alerts` -> `resolve_safe_playbook_actions` -> verify

## Weekly

- `npm run ops:weekly`
- review:
  - `reports/impact-latest.json`
  - `reports/pr-summary.md`
  - latest weekly review

## Incident

- Follow `docs/OPS_RUNBOOK.md` severity and recovery process.

## Governance checkpoints

- Command/tool docs match code:
  - `package.json`
  - `src/mcp-server.js`
  - `src/server.js`
- Safety controls remain documented:
  - `versionToken`
  - `dryRun`
  - conflict retry behavior
- Artifacts remain consumable and current:
  - alerts, action queue, ops state, weekly reports, trend snapshots

## Reference map

- Core readme and onboarding:
  - `README.md`
- Data schema:
  - `docs/SCHEMA.md`
- MCP usage and examples:
  - `docs/MCP_USAGE.md`
  - `docs/MCP_EXAMPLES.md`
