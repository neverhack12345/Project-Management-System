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
- [ ] Define non-functional requirements [id:t-ab12cd] [due:2026-04-02] [state:todo] [facts:f-market-size]
- [x] Create project brief
```

Open tasks must include a due token in ISO format:
- `[due:YYYY-MM-DD]`

Open tasks created by the app include an ID token:
- `[id:<task-id>]`

Optional multi-dependency token:
- `[deps:task-id-1,task-id-2,...]` (same project)
- `[deps:other-project:task-id,...]` (cross-project dependency)

Optional fact reference token:
- `[facts:fact-id-1,fact-id-2,...]` (same project)
- `[facts:other-project:fact-id,...]` (cross-project reference)

Optional recurrence token:
- `[recur:daily]`, `[recur:weekly]`, `[recur:monthly]`

Optional task lane token for Kanban:
- `[state:backlog]`, `[state:todo]`, `[state:in-progress]`, `[state:done]`

## `projects/<slug>/research.md` fact registry

Use the facts registry block to track verification state:

```md
## Facts Registry

<!-- facts-registry:start -->
[
  {
    "factId": "f-market-size",
    "statement": "Addressable market estimate is 12M users.",
    "status": "in-review",
    "sources": ["https://example.com/report"],
    "verificationNote": "Waiting analyst confirmation",
    "verifiedAt": "",
    "verifiedBy": ""
  }
]
<!-- facts-registry:end -->
```

Fact status enum:
- `unknown`
- `unverified`
- `in-review`
- `verified`

Verification rule:
- setting `status: verified` requires at least one source and a non-empty `verificationNote`

## Date format

All dates must be ISO `YYYY-MM-DD`.

## Ops state files

The automation layer also writes operational state files under `reports/`:

- `ops-state.json` - last daily/weekly/monthly run metadata and error status.
- `ops-state.lock` - transient lock file preventing concurrent auto-ops execution.

These files are operational metadata and not part of per-project frontmatter schema.
