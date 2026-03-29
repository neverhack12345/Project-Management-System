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

## 9) Queue and process incoming events

1. Call `enqueue_incoming_event`:
   - `title`: `"Customer escalation: export timeout"`
   - `description`: `"Exports fail above 5k rows"`
   - `urgency`: `"high"`
   - `owner`: `"unassigned"`
2. Call `process_incoming_events` with `{ "dryRun": true, "maxEvents": 20 }`.
3. Re-run with `{ "dryRun": false, "maxEvents": 20 }`.
4. Call `list_incoming_events` to inspect `pending`, `resolved`, and `failed` rows.

## 10) Resolve safe playbook actions in batch

1. Call `resolve_safe_playbook_actions` with `{ "dryRun": true, "maxActions": 20 }`.
2. Review `results` and `remaining`.
3. Re-run with `{ "dryRun": false, "maxActions": 20 }`.
4. Call `get_actionable_playbook` to confirm remaining manual actions.

## 11) Research facts: create → assign → update

Use this order for the full workflow (matches dashboard **Facts** tab and `npm run project:facts --`).

1. `get_project({ slug })` → `versionToken`, `tasks[].id`, `tasks[].factRefs`, and `facts` (if you need unassigned: refs not appearing in any task’s `factRefs`).
2. `add_project_fact({ slug, statement, status: "unverified", versionToken })` → registry entry.
3. `get_project` again → new `versionToken`. Build merged `factRefs` = existing task ids + new `factId` (local id or `slug:factId`). Call `update_task_fact_refs({ slug, taskId, factRefs: merged, versionToken })`.
4. When ready to verify: `get_project` → `update_project_fact({ slug, factId, status: "verified", sources: ["https://..."], verificationNote: "...", versionToken })`.

## 12) Add and verify a project fact (minimal)

1. Call `get_project` with `slug` and capture `versionToken`.
2. Call `add_project_fact` with:
   - `slug`
   - `statement`
   - `status`: `"unverified"`
   - `versionToken`
3. Call `get_project_facts` and choose a `factId`.
4. Call `update_project_fact` with:
   - `slug`
   - `factId`
   - `status`: `"verified"`
   - `sources`: `["https://example.com/source"]`
   - `verificationNote`: `"Checked against source and confirmed"`
   - `versionToken`

## 13) Link fact refs to a task

1. Call `get_project` and read `versionToken` and the task’s current `factRefs` (merge before replace).
2. Call `update_task_fact_refs` with:
   - `slug`
   - `taskId`
   - `factRefs`: `["f-market-size", "other-project:f-legal-approved"]`
   - `versionToken`

## 14) Move task lanes with verification gating

1. Call `get_project` and read `versionToken`.
2. Call `move_project_task_lane` with:
   - `slug`
   - `taskId`
   - `state`: `"done"`
   - `versionToken`
3. If blocked, verify or relink unresolved facts and retry.

## 15) Create a new project from MCP

1. Call `create_project` with:
   - `name`: `"Q2 Reliability"`
   - `owner`: `"you"`
   - `dueDays`: `45`
2. Call `list_projects` or `get_project` with the new slug (derived from the name) to confirm files exist.

## 16) Vault note create, link, move, delete

1. `vault_list_tree` to see existing paths.
2. `vault_create_note` with `path`: `"Ideas/Scratch.md"`, `title`: `"Scratch"`, optional `content` body with `[[Welcome]]` wiki links.
3. `vault_get_note` with `path`: `"Ideas/Scratch.md"` to read back `content` / `previewMarkdown`.
4. `vault_move_note` with `from`: `"Ideas/Scratch.md"`, `to`: `"Archive/Scratch.md"`.
5. `vault_delete_note` with `path`: `"Archive/Scratch.md"` when finished (destructive).

## 17) Edit and remove a task

1. `get_project` → `versionToken` and `tasks[].id`.
2. `update_project_task` with `slug`, `taskId`, `versionToken`, and patches such as `title`, `dueDate`, or `dependsOn`.
3. To remove: `remove_project_task` with `slug`, `taskId`, `versionToken` (fails if another task depends on this one).

## 18) Delete a project (destructive)

1. Confirm the slug is correct.
2. `delete_project` with `slug` and `confirmSlug` set to the same value (e.g. both `"old-initiative"`).
