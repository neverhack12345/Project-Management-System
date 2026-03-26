# Markdown Schema

This app treats markdown files as the source of truth.

## Schema version

Add this field to `projects/<slug>/README.md` frontmatter:

```yaml
schemaVersion: 1
```

## Status enum

- `idea`
- `planning`
- `active`
- `blocked`
- `done`

## `projects/<slug>/README.md`

Required frontmatter:

```yaml
---
slug: sample-project
name: Sample Project
status: active
priority: high
owner: never
tags:
  - internal
startDate: 2026-03-20
dueDate: 2026-04-30
lastUpdated: 2026-03-26
nextAction: Draft milestone brief
---
```

Required fields:
- `slug`, `name`, `status`, `owner`, `startDate`, `dueDate`, `lastUpdated`, `nextAction`

Optional fields:
- `priority`, `tags`, `description`, `riskLevel`, `blockedReason`, `schemaVersion`

## `projects/<slug>/milestones.md`

Frontmatter:

```yaml
---
milestones:
  - id: m1
    name: Requirements complete
    status: active
    startDate: 2026-03-22
    dueDate: 2026-03-29
    dependsOn: []
  - id: m2
    name: MVP shipped
    status: planning
    startDate: 2026-04-01
    dueDate: 2026-04-20
    dependsOn:
      - m1
---
```

Each milestone requires:
- `id`, `name`, `status`, `startDate`, `dueDate`

## `projects/<slug>/tasks.md`

Use markdown checkboxes:

```md
- [ ] Define non-functional requirements
- [x] Create project brief
```

## Date format

All dates must be ISO `YYYY-MM-DD`.

## Ops state files

The automation layer also writes operational state files under `reports/`:

- `ops-state.json` - last daily/weekly/monthly run metadata and error status.
- `ops-state.lock` - transient lock file preventing concurrent auto-ops execution.

These files are operational metadata and not part of per-project frontmatter schema.
