# Project Management System

Markdown-first project and milestone tracker with dashboard UI, automation playbooks, and local MCP support.

## Highlights

- Project-assigned tasks with deadlines and recurring options.
- Cross-project task dependency tracking.
- Drag-and-drop Kanban (`backlog`, `todo`, `in-progress`, `done`).
- Fact verification workflow (fact registry + task fact refs + done-gating).

## Quick Start

1. `npm install`
2. `npm run new:project -- --name "My Project" --owner "You"`
   - Delete a project folder: `npm run project:delete -- --slug <slug> --confirm-slug <slug>`
   - Vault CLI (no server): `npm run vault:crud -- tree` (see `docs/CLI_OPS_REFERENCE.md`)
3. `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000)

## Production Documentation

- Start here: `docs/PRODUCTION_HANDBOOK.md`
- Assistants (Cursor / MCP): `.cursor/skills/markdown-projects/SKILL.md`, `.cursor/skills/second-brain/SKILL.md` and each `references/` folder ([Agent Skills layout](https://agentskills.io/specification))
- MCP contracts: `docs/MCP_TOOL_REFERENCE.md`
- CRUD index (projects, tasks, vault): `docs/CRUD_REFERENCE.md`
- MCP setup and safety: `docs/MCP_USAGE.md`; numbered MCP examples: `docs/MCP_EXAMPLES.md` (links into skill `references/`)
- CLI ops commands: `docs/CLI_OPS_REFERENCE.md`
- Human UI usage: `docs/UI_USER_GUIDE.md`
- User stories: `docs/USER_STORIES.md`
- Operations runbook: `docs/OPS_RUNBOOK.md`

## Role-Based Navigation

- Assistant / MCP client:
  - `.cursor/skills/markdown-projects/SKILL.md`, `.cursor/skills/second-brain/SKILL.md` and each `references/` tree (workflows, examples, duplicated `docs/` snapshots)
  - `docs/MCP_USAGE.md`, `docs/MCP_TOOL_REFERENCE.md`, `docs/CRUD_REFERENCE.md`, `docs/MCP_EXAMPLES.md` (pointer to examples inside skills)
- Operator (UI):
  - `docs/UI_USER_GUIDE.md`
- Maintainer/on-call:
  - `docs/OPS_RUNBOOK.md`
  - `docs/CLI_OPS_REFERENCE.md`

## Core Commands

- `npm run validate` -> schema/date/status validation
- `npm run review:weekly` -> weekly markdown report
- `npm run alerts` -> threshold-based alert report
- `npm run impact` -> impact report from git diffs
- `npm run search:index` -> rebuild local search index (projects + vault notes)
- `npm run vault:graph` -> refresh cached vault link graph (`.cache/vault-graph.json`)
- `npm run migrate:schema` -> normalize schema version fields
- `npm run pr:summary` -> generate project-focused PR summary
- `npm run snapshot` -> write daily trend snapshot
- `npm run ops:daily` -> daily automation bundle
- `npm run ops:weekly` -> weekly automation bundle
- `npm run ops:triage` -> validate + intake processing + safe playbook resolution + reports
- `npm run ops:intake` -> process pending incoming events
- `npm run mcp:start` -> start local stdio MCP server
- `npm run mcp:smoke` -> MCP smoke validation

## Data and Layout

- `vault/**/*.md` -> personal second-brain notes (wiki links, Mermaid, backlinks). Browse at [http://localhost:3000/notes.html](http://localhost:3000/notes.html) while `npm run dev` is running; use **New note** / **Edit** / **Save** in the UI, or open `vault/` in Obsidian. Embed Excalidraw diagrams in preview with Obsidian-style `![[path/to/file.excalidraw]]` (or a fenced ` ```excalidraw` block with a vault-relative path on the first line).
- `projects/<project-slug>/README.md` -> canonical metadata
- `projects/<project-slug>/spec.md` -> requirements/spec
- `projects/<project-slug>/research.md` -> research notes
- `projects/<project-slug>/milestones.md` -> milestones and dependencies
- `projects/<project-slug>/tasks.md` -> task list
- `reports/` -> ops outputs, queues, snapshots

References:
- `docs/SCHEMA.md`
- `docs/COMPETITIVE_GAP_ANALYSIS.md`

## Fast Operational Loops

- Daily low-friction:
  - `npm run ops:triage -- --maxEvents 20 --maxActions 20`
- Dry-run preview:
  - `npm run ops:triage -- --dryRun --maxEvents 20 --maxActions 20`
- Intake-only:
  - `npm run ops:intake -- --maxEvents 20`

## Troubleshooting (Quick)

- Validation issues:
  - `npm run migrate:schema`
  - `npm run validate`
- UI data stale:
  - `npm run alerts`
  - `npm run review:weekly`
  - refresh browser
- MCP issues:
  - `npm run mcp:smoke`
  - `npm run mcp:start`
- Auto-ops issues:
  - inspect `reports/ops-state.json`
  - if confirmed stale and no run active, remove `reports/ops-state.lock`