# UI User Guide

Guide for human operators using the dashboard at `http://localhost:3000`.

## Who this is for

- Operator: runs daily triage and keeps portfolio healthy.
- Project editor: updates project status/tasks/meta.
- Maintainer: uses automation and migration tools from UI.

## First session (10 minutes)

1. Start app: `npm run dev`.
2. Open dashboard in browser.
3. Confirm these cards load:
   - Auto Ops Status
   - Today Brief
   - Alerts
   - Action Queue
4. In Projects section:
   - open one card
   - change status to `active` and save
   - add one quick task
5. Use Refresh button to confirm state updates.

## Daily operator workflow

1. Review **Today Brief** counts (top risks, overdue, blocked, stale).
2. Review **Alerts** and **Action Queue**.
3. Apply low-risk actions:
   - click `Run` on safe action queue items
   - or update project cards directly (status/meta/task)
4. Use focus buttons:
   - `DueSoon`, `Blocked`, `Overdue`, `NeedsUpdate`
5. Log work in **Time Entries**.

## Filters and saved views

- Use search + status + priority + overdue to narrow projects.
- Save a filtered set:
  1. click `Save View`
  2. name the view
  3. select from dropdown later
- Delete unused saved view with `Delete View`.

## Project card actions

- `Save` status:
  - if setting `blocked` or `done`, decision note is required
- `Add Task`:
  - supports recurrence: daily/weekly/monthly
- `Save Meta`:
  - currently saves blocked reason metadata
- `Open History`:
  - loads latest git commit history for that project

## Bulk updates

1. Select projects individually or use `Select all visible`.
2. Choose `Bulk status` and/or `Bulk priority`.
3. Click `Apply Bulk`.
4. Read flash result:
   - success
   - partial failures count
5. Re-run with narrower selection for failed items.

## Intake forms and automation cards

## Intake Forms card

- Select form type from dropdown.
- Enter JSON payload in the input.
- Click `Submit`.

Example payloads:

- quick task:
```json
{"slug":"my-project","task":"Review scope changes","recurrence":"weekly"}
```

- quick project:
```json
{"name":"Q2 Launch","owner":"you","dueDays":30,"nextAction":"Define milestone 1","estimateHours":12}
```

- incoming event:
```json
{"title":"Customer escalation: export timeout","description":"Exports fail above 5k rows","urgency":"high","owner":"unassigned"}
```

## Automation Rules card

- `Run Dry` -> evaluate automation without writes
- `Run` -> execute enabled automation rule actions
- `Export Snapshot` -> writes workspace snapshot file path shown in flash
- `Preview Migration` -> validates migration input before applying anything

Migration input example:
```json
[{"title":"Backlog cleanup","state":"todo","owner":"you","due":"2026-04-20"}]
```

## Command palette

- Open with `Ctrl/Cmd + K`.
- Supports:
  - project slug/name search
  - `status:<value>` (example: `status:blocked`)
  - `focus:<name>` (example: `focus:Blocked`)

## Conflict and error recovery

- Version conflict:
  - UI may show conflict in flash area.
  - click Refresh, reopen card, re-apply with current values.
- Bad JSON in intake/migration:
  - fix JSON syntax and resubmit.
- Bulk partial failures:
  - retry only failed slugs using individual card actions.
- Empty cards:
  - run `npm run validate`, then `npm run alerts`, then Refresh.

## Operational notes

- UI/API requests trigger auto-ops due checks in background.
- Auto-ops state is visible in **Auto Ops Status**.
- For deeper maintenance, use CLI runbooks:
  - `npm run ops:triage`
  - `npm run ops:weekly`
